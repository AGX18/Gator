import { setUser, readConfig } from "src/config";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from "postgres";
import { createUser, deleteAllUsers, getAllUsers, getUserByName } from "./db/queries/users";
import { createFeed } from "./db/queries/feeds";
import { XMLParser } from "fast-xml-parser";
import { z } from 'zod'
import * as schema from "./db/schema";
import { sql } from "drizzle-orm";
import { db } from "src/db/index";

const config = readConfig();


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
    registerCommand(commands, 'agg', aggHandler);
    registerCommand(commands, 'addfeed', addfeedHandler);
    registerCommand(commands, 'checkdb', checkDbConnection);
    
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
type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
async function loginHandler(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        console.error("Username is required for login.");
        return;
    }

    const user = await getUserByName(args[0]);
    if (!user) {
        throw new Error(`User with name ${args[0]} does not exist. Please register first.`);
    }
    setUser(args[0]);
    console.log(`User set to ${args[0]}`);
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


async function aggHandler(cmdName: string, ...args: string[]) {
    const res = await fetchFeed("https://www.wagslane.dev/index.xml");
    res.channel.item.forEach(item => {
        console.log(item);
    });
}

async function addfeedHandler(cmdName: string, ...args: string[]) {
    if (args.length < 2) {
        throw new Error("Feed URL and name are required to add a feed.");
    }
    const [feedURL, feedName] = args;
    const currentUser = await getUserByName(config.currentUserName!);
    if (!currentUser) {
        throw new Error("No current user set. Please login or register first.");
    }

    const newFeed = await createFeed(feedName, currentUser.id, feedURL);
    printFeed(newFeed, currentUser);
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

