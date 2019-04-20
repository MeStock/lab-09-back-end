# City-Explorer

**Author**: Melissa Stock, Pratiibh Bassi, Denevan Pettie, Joseph Hangarter, Jon Ramer
**Version**: 0.0.5

## Overview
<p>This app will request data from different APIs, search the data for requested information, and return it the the user. Information includes weather, movies, restaurants, and maps. In addition, data will be stored into a database and given to the user before making an unnecessary API request - saving time and reducing costs.</p>

## Getting Started
1. Create Repository
2. Create and deploy Heroku
3. Organize Trello
4. Build and sync server
5. Build and sync /location route
    <ul>a. create constructor function to build objects with the following information:
        <li>User search</li>
        <li>Address</li>
        <li>Latitude</li>
        <li>Longitude</li>
    </ul>
6. Build and sync /weather route
    <ul>a. create constructor function to build objects with the following information:
        <li>Forecast</li>
        <li>Time</li>
     </ul>   
7. Build and sync /movie route
    <ul>a. create constructor function to build objects with the following information:
        <li>Tiitle</li>
        <li>Average Votes</li>
        <li>Total Votes</li>
        <li>Image URL</li>
        <li>Popularirty</li>
        <li>Release Date</li>
    </ul>
8. Build and sync /yelp route
    <ul>a. create constructor function to build objects with the following information:
        <li>Name</li>
        <li>Image URL</li>
        <li>Price</li>
        <li>Rating</li>
        <li>URL</li>
    </ul>
9. Create a function to add data, remove data, and check for data inside a SQL database
10. Add a feature to alert the user if an invalid search is made
11. Add a feature to refresh stored data if it is outdated

## Architecture
Provide a detailed description of the application design. What technologies (languages, libraries, etc) you're using, and any other relevant design information. 
1. Languages: JavaScript, HTML, CSS, SQL
2. Libraires: express, cors, dotenv, superagent, pg
3. Tools: Github, Heroku, Trello


## Change Log
Use this area to document the iterative changes made to your application as each feature is successfully implemented. Use time stamps. Here's an examples:

04-16-2019 10:20am - Application now has a fully-functional express server, with a GET route for the location resource.

04-16-2019 10:44am - Application now has fully-functional object rendering.

04-16-2019 11:10am - Location route is synced and fully-functional and re-deployed.

04-16-2019 12:45pm - Application now has fully-functional weather route, data, response.

04-16-2019 1:10pm - Weather route is synced, constructor function created objects with proper rendering. Site is redployed.

04-17-2019 10:00am - Made 3 improvements:
    <ul>
        <li>Added comments for readability</li>
        <li>Fixed location error bug</li>
        <li>Made code more dry</li>
    </ul>

04-17-2019 10:35am - Implemented map method for Weather search to make code more dry.

04-17-2019 11:00am - Geocode API fully functional

04-17-2019 12:50pm - Weather API fully functional; implemented a route utilizing superagent, and sort using map method

04-17-2019 01:00pm - Updated READme

04-18-2019 09:30am - Connected postgres to our server

04-18-2019 10:30am - Finished code review

04-18-2019 11:30am - Added database, storing and removing information

04-18-2019 12:25pm - Check database and use existing information

04-18-2019 12:30pm - Updated readme and deployed site

04-19-2019 10:20am - Code Review - made 3 changes to reduce code - implementing dry practices

04-19-2019 12:30pm - Completed feature to refresh weather data if it was older than 15sec

04-19-2019 1:15pm - Added fully functional Movie data (storing data into database and linking it with locations table)

04-19-2019 1:30pm - Updated readme and deployed site

04-19-2019 9:30pm - Added yelp constructor and yelp API search

04-20-2019 12:00pm - Code Review - made 3 changes to reduce code - implementing dry practices

04-20-2019 1:20pm - Completed Yelp functionality. (storing data into database and linking it with locations table)

04-20-2019 1:40pm - Code Review - Organized code to add readability, refactored functions where applicable.

04-20-2019 2:00pm - Updated readme and deployed site

## Credits and Collaborations

TA - Jeniffer Piper and Chris Chapman

Instructor - Nicholas Carignan