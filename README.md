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


## Features to come:
- [] Add sorting and filtering options to the browse command
- [] Add pagination to the browse command
- [] Add concurrency to the agg command so that it can fetch more frequently
- [] Add a search command that allows for fuzzy searching of posts
- [] Add bookmarking or liking posts
- [] Add a TUI that allows you to select a post in the terminal and view it in a more readable format (either in the terminal or open in a browser)
- [] Add an HTTP API (and authentication/authorization) that allows other users to interact with the service remotely
- [] Write a service manager that keeps the agg command running in the background and restarts it if it crashes