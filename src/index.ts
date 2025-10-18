import { setUser, readConfig } from "src/config";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from "postgres";
import { createUser, deleteAllUsers, getAllUsers, getUserByName } from "./db/queries/users";
import { createFeed, getAllFeedsWithUsers, getFeedByURL, getNextFeedToFetch, markFeedFetched, deleteFeedById } from "./db/queries/feeds";
import { createFeedFollow, deleteFeedFollow, getFeedFollowByUser } from "./db/queries/feed_follows";
import { XMLParser } from "fast-xml-parser";
import { z } from 'zod'
import * as schema from "./db/schema";
import { sql } from "drizzle-orm";
import { db } from "src/db/index";
import { get } from "http";
import { User } from "./db/schema";

const config = readConfig();



type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

const middlewareLoggedIn = (handler: UserCommandHandler): CommandHandler => {
    return async (cmdName: string, ...args: string[]) => {
        const currentUserName = config.currentUserName;
        console.log("Current user from config:", currentUserName);
        if (!currentUserName) {
            throw new Error("No user is currently logged in. Please login first.");
        }
        const user = await getUserByName(currentUserName);
        if (!user) {
            throw new Error(`User ${currentUserName} does not exist. Please register first.`);
        }
        await handler(cmdName, user, ...args);
    }
};





/**
 * A registry object that maps command names (string keys)
 * to their corresponding CommandHandler functions.
*/
type CommandsRegistry = Record<string, CommandHandler>;
async function main() {
    const commands: CommandsRegistry = {};
    registerCommand(commands, 'login', loginHandler);
    registerCommand(commands, 'register', registerHandler);
    registerCommand(commands, 'reset', resetHandler);
    registerCommand(commands, 'users', usersHandler);
    registerCommand(commands, 'agg', middlewareLoggedIn(aggHandler));
    registerCommand(commands, 'addfeed', middlewareLoggedIn(addfeedHandler));
    registerCommand(commands, 'deletefeed', middlewareLoggedIn(deleteFeedHandler));
    registerCommand(commands, 'checkdb', checkDbConnection);
    registerCommand(commands, 'feeds', feedsHandler);
    registerCommand(commands, 'follow', middlewareLoggedIn(followHandler));
    registerCommand(commands, 'following', middlewareLoggedIn(followingHandler));
    registerCommand(commands, 'unfollow', middlewareLoggedIn(unfollowHandler));
    
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("not enough arguments were provided. No command provided.");
        process.exit(1);
    }
    const [cmd, ...cmd_args] = args;
    try {
        await runCommand(commands, cmd, ...cmd_args);
    } catch (error : any) {
        console.error("Error:", error.message);
        process.exit(1);
    }
    process.exit(0)
}

main();


function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler;
}


async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    const handler = registry[cmdName];
    if (handler) {
        await handler(cmdName, ...args);
    } else {
        throw new Error(`Unknown command: ${cmdName}`);
    }
}
/**
 * Represents a function that handles a CLI command.
 * @param args - An optional array of string arguments passed to the command.
 * @returns Promise<void>.
 */
async function loginHandler(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        console.error("Username is required for login.");
        return;
    }
    const user = await getUserByName(args[0]);
    if (!user) {
        console.error(`User ${args[0]} does not exist. Please register first.`);
        return;
    }
    setUser(user.name);
    console.log(`User set to ${user.name}`);
}
async function registerHandler(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        console.error("Username is required for registration.");
        return;
    }
    const newUser = await createUser(args[0]);
    setUser(newUser.name);
    console.log(`User set to ${newUser.name}`);
    console.log(newUser);
}
async function resetHandler(cmdName: string, ...args: string[]): Promise<void> {
    await deleteAllUsers();
    console.log("All users deleted.");
}

async function usersHandler(cmdName: string, ...args: string[]): Promise<void> {
    const allUsers = await getAllUsers();
    allUsers.forEach(user => {
        console.log(`* ${user.name}` + (user.name === config.currentUserName ? " (current)" : ""));
    });
}

const RSSItemSchema = z.object({
  title: z.string(),
  link: z.url(),
  description: z.string(),
  pubDate: z.string(),
});

type RSSItem = z.infer<typeof RSSItemSchema>

const RSSFeedSchema = z.object({
    channel: z.object({
        title: z.string(),
        link: z.string().url(),
        description: z.string(),
        item: RSSItemSchema.array(),
    })
});

type RSSFeed = z.infer<typeof RSSFeedSchema>


/**
 * fetch a feed from the given URL, and, assuming that nothing goes wrong, return a filled-out RSSFeed object.
 * 
 * @param feedURL the url that would be used to fill the RSSFeed Object
 * @returns RSSFeed object
 */
async function fetchFeed(feedURL: string) {
    const res = await fetch(feedURL, {
        method: 'GET',
        headers: {
            'User-Agent': 'gator',
        },
    });
    const data = await res.text();
    const xmlParser = new XMLParser(); 
    let parsed = xmlParser.parse(data);
    parsed = parsed.rss;
    if (!parsed.channel) {
        throw new Error("Invalid RSS feed format: missing channel");
    }

    if (!parsed.channel.title || !parsed.channel.link || !parsed.channel.description) {
        throw new Error("Invalid RSS feed format: missing required fields");
    }
    const rssFeed: RSSFeed = new Object() as RSSFeed;
    rssFeed.channel = new Object() as RSSFeed['channel'];
    rssFeed.channel.title = parsed.channel.title;
    rssFeed.channel.link = parsed.channel.link;
    rssFeed.channel.description = parsed.channel.description;
    rssFeed.channel.item = [] as RSSItem[];
    if (parsed.channel.item) {
        parsed.channel.item = Array.isArray(parsed.channel.item) ? parsed.channel.item : [];
        for (const item of parsed.channel.item) {
            if (!item.title || !item.link || !item.description || !item.pubDate) {
                continue; // skip invalid items 
            }
            rssFeed.channel.item.push(RSSItemSchema.parse(item));
        }
    }

    return rssFeed;
}

function parseDuration(durationStr: string): number {
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);
   if (!match) {
       throw new Error("Invalid duration format.");
   }
   const value = parseInt(match[1], 10);
   const unit = match[2];
   switch (unit) {
       case "ms":
           return value;
       case "s":
           return value * 1000;
       case "m":
           return value * 1000 * 60;
       case "h":
           return value * 1000 * 60 * 60;
       default:
           throw new Error("Invalid duration unit.");
   }
}

async function aggHandler(cmdName: string, user: User, ...args: string[]) {
    if (args.length < 1) {
        throw new Error("time between fetches is required.");
    }
    const durationMs = parseDuration(args[0]);
    const interval = setInterval(() => {
        scrapeFeeds(user).catch(handleError);
    }, durationMs);

    await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
            console.log("Shutting down feed aggregator...");
            clearInterval(interval);
            resolve();
        });
    });

}

function handleError(error: any) {
    console.error("Error during feed scraping:", error);
}

async function addfeedHandler(cmdName: string, user: User, ...args: string[]) {
    if (args.length < 2) {
        throw new Error("Feed URL and name are required to add a feed.");
    }
    const [feedName, feedURL] = args;

    const newFeed = await createFeed(feedName, user.id, feedURL.trim());
    await createFeedFollow(user.id, newFeed.id);
    printFeed(newFeed, user);
}

async function printFeed(feed:schema.Feed, user: schema.User) {
    console.log(`Feed: ${feed.name} (URL: ${feed.url}) for User: ${user.name}`);
}


async function checkDbConnection(cmdName: string, ...args: string[]) {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection is healthy.');
  } catch (error: any) {
    console.error('❌ Database connection failed:', error);
  }
}

/**
 * a way to inspect all the feeds in the database.
 * @param cmdName the command name
 * @param args here it's empty
 */
async function feedsHandler(cmdName: string, ...args: string[]) {
    const allFeeds = await getAllFeedsWithUsers();
    allFeeds.forEach(({ feeds, users }) => {
        console.log(`Feed: ${feeds.name} (URL: ${feeds.url}) for User: ${users.name}`);
    });
}

/**
 * 
 * It takes a single url argument and creates a new feed follow record for the current user.
 */
async function followHandler(cmdName: string, user: User, ...args: string[]) {
    if (args.length < 1) {
        throw new Error("Feed URL is required to follow a feed.");
    }
    const feedURL = args[0];
    const feed = await getFeedByURL(feedURL.trim());
    if (!feed) {
        throw new Error(`Feed with URL ${feedURL} does not exist. Please add the feed first.`);
    }
    const newFeedFollow = await createFeedFollow(user.id, feed.id);
    console.log(`User ${newFeedFollow.users.name} is now following feed ${newFeedFollow.feeds.name}`);
}


async function followingHandler(cmdName: string, user: User, ...args: string[] ) {
    const feedFollows = await getFeedFollowByUser(user.id);
    console.log(`Feed follows for user ${user.name}:`);
    feedFollows.forEach(feedFollow => {
        console.log(`* feed: ${feedFollow.feeds.name} (URL: ${feedFollow.feeds.url})`);
    });

}

async function unfollowHandler(cmdName: string, user: User, ...args: string[] ) {
    if (args.length < 1) {
        throw new Error("Feed URL is required to unfollow a feed.");
    }
    const feedURL = args[0];
    const feed = await getFeedByURL(feedURL.trim());
    if (!feed) {
        throw new Error(`Feed with URL ${feedURL} does not exist.`);
    }
    await deleteFeedFollow(user.id, feed.id);
    console.log(`Deleted feed follow for user ${user.name}: ${feed.name}`);
}


async function scrapeFeeds(user: User) {
        const res = await getNextFeedToFetch(user.id);
        await markFeedFetched(res.id);
        const feedData = await fetchFeed(res.url);
        console.log();
        console.log(`feed from: ${res.url}`);
        feedData.channel.item.forEach(item => {
            console.log(`- ${item.title}`);
        });
}

async function deleteFeedHandler(cmdName: string, user: User, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        throw new Error("Feed URL is required to remove a feed.");
    }
    const feedURL = args[0];
    const feed = await getFeedByURL(feedURL.trim());
    if (!feed) {
        throw new Error(`Feed with URL ${feedURL} does not exist.`);
    }
    await deleteFeedById(feed.id);
    console.log(`Deleted feed for user ${user.name}: ${feed.name}`);
}
