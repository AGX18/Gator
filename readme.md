# Gator

a CLI tool that allows users to:

Add RSS feeds from across the internet to be collected
Store the collected posts in a PostgreSQL database
Follow and unfollow RSS feeds that other users have added
View summaries of the aggregated posts in the terminal, with a link to the full post

- you need an env file that contains the DATABASE_URL
- and a config file that contains the username (it will be created anyway if you register) -- it contains a debrecated db_URL just ignore this part
- the config file name is '.gatorconfig.json' and it is stored in the home directory 
## Commands
- login [username]: needs a username that is stored in the database so that it can logs them in
- register [username]: creates a new user
- reset: deletes all users (actually it deletes everything).
- users: displays all the users
- agg [duration]: retrieves all the posts from the feeds and stores them in the database. after duration passes until you press (CTRL + C)
-  addfeed [feed-name] [feed-url]: add a new feed (requires a feed name and url)
- deletefeed [feed-url]: deletes the feed 
- checkdb: it checks that the db is connected and up and running
- feeds: displays all the feeds
- follow [feed-url]: makes you follow the feed
- following: displays all the feeds that the current user is following
- unfollow [feed-url]:  unfollow the feed
- browse [limit]: displays the number of posts that you requested.