/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable indent */
'use strict';


require('dotenv').config();



//global constants
const PORT = process.env.PORT || 3000;
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

//postgres client
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => console.error(error))


//server definition
const app = express();
app.use(cors());

//server is doing this
app.get('/location', searchLocationData);

app.get('/weather', searchWeatherData);

app.get('/movies', searchMovieData);

app.get('/yelp', searchYelpData);

app.use('*', (request, response) => {
  response.send('Our server runs.');
})

//sql commands 
const SQL_CMDS = {};
SQL_CMDS.getLocation = 'SELECT * FROM locations WHERE search_query=$1'
// SQL_CMDS.getLocation = 'SELECT * FROM $1 WHERE search_query=$2'
SQL_CMDS.insertLocation = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *;'
SQL_CMDS.getWeather = 'SELECT * FROM weathers WHERE location_id=$1;'
SQL_CMDS.insertWeather = 'INSERT INTO weathers (forecast, time, location_id, created_at) VALUES ($1, $2, $3, $4);'
SQL_CMDS.deleteWeather = 'DELETE FROM weathers WHERE location_id=$1;'
SQL_CMDS.getMovies = 'SELECT * FROM movies WHERE location_id=$1;'
SQL_CMDS.insertMovies = 'INSERT INTO movies (title, overview, average_votes, total_votes, image_url, popularity, released_on, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);'




//Constructor Functions
//Builds object containing information from google API
function LocationData(search_query, formatted_query, latitude, longitude) {
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
}

//Builds object containing information from weather API
function WeatherData(summary, time, location_id) {
  this.forecast = summary;
	this.time = time;
	this.location_id = location_id;
	this.created_at = Date.now();

}

//Builds object containing information from movie API
function MovieData(title, overview, average_votes, total_votes, image_url, popularity, released_on){
	this.title = title;
	this.overview = overview;
	this.average_votes = average_votes;	this.total_votes = total_votes;
	this.image_url = image_url;
	this.popularity = popularity;
	this.released_on = released_on;
}

//Builds object containing information from yelp API
function YelpData(){

}

//----------------------Other Functions----------------------

//----------------------CHECK DATABASE------------------------
function checkLocationDatabase(search_query, response) {
//return client.query(SQL_CMDS.getLocation, ['locations', search_query]).then(result => {
  return client.query(SQL_CMDS.getLocation, [search_query]).then(result => {
		//if results are in the database
    if (result.rows.length) {
			//send the information to the front end
			response.send(result.rows[0]);
      //if not
    }else {
      //return this statement
      return 'NOT IN DATABASE';
    }
  });
}
function checkWeatherDatabase(location_id, response) {
		return client.query(SQL_CMDS.getWeather, [location_id]).then(result => {
			//if results are in the database
			if (result.rows.length) {
				//check if it is recent enough
				if(Date.now() - result.rows[0].created_at > 15000){
					client.query(SQL_CMDS.deleteWeather, [location_id]);
					return 'NOT IN DATABASE';
				}
				//if data is up to date, send the information to the front end
				response.send(result.rows);
				//if not
			}else {
				//return this statement
				return 'NOT IN DATABASE';
			}
		});
	}

	function checkMovieDatabase(location_id, response){
		return client.query(SQL_CMDS.getMovies, [location_id]).then(result => {
			//if results are in the database
			if (result.rows.length) {
				//send the information to the front end
				response.send(result.rows);
				//if not
			}else {
				//return this statement
				return 'NOT IN DATABASE';
			}
		});
	}

//-------------------GEOCODE----------------------------------
function searchLocationData(request, response) {
  //stores user input
  const search_query = request.query.data;
  //checks database for front end request
  checkLocationDatabase(search_query, response).then(result => {
		//if there is no existing information in the database
		// console.log(result);
    if (result === 'NOT IN DATABASE') {

      const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${search_query}&key=${process.env.GEOCODE_API_KEY}`;
      //got get information from google
      superagent.get(URL).then(result => {
        //if the user inputs nonexisting location
        if (result.body.status === 'ZERO_RESULTS') {
          //respond with an error
          response.status(500).send('Sorry, something went wrong');
          return;
        }
        //if the user enters valid info (that doesn't exist in the db)
        //extract the followig information from google
        const searchedResult = result.body.results[0];
        const formatted_query = searchedResult.formatted_address;

        const latitude = searchedResult.geometry.location.lat;
        const longitude = searchedResult.geometry.location.lng;
        //use the extracted data to create new object
        const responseDataObject = new LocationData(search_query, formatted_query, latitude, longitude);

        //store in database
        client.query(SQL_CMDS.insertLocation, [responseDataObject.search_query, responseDataObject.formatted_query, responseDataObject.latitude, responseDataObject.longitude]).then(result => {
					
					//send information from database to front end
        	response.send(result.rows[0]);
        }
        );
      })
    }
  });
}

//-------------------DARKSKY----------------------------------
function searchWeatherData(request, response) {
	const URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
	checkWeatherDatabase(request.query.data.id, response).then(result => {
		if(result === 'NOT IN DATABASE'){
			superagent.get(URL).then(result => {
				//using google data - find weather for the matching longitude & latitude
				if (result.body.latitude === Number(request.query.data.latitude) && result.body.longitude === Number(request.query.data.longitude)){
					//dailyData = array of daily data objects
					let dailyData = result.body.daily.data;
					const dailyWeather = dailyData.map((dailyDataObj) => {
					let summary = dailyDataObj.summary;
					let time = new Date(dailyDataObj.time * 1000).toString().slice(0, 15);
					let location_id = request.query.data.id;
		
					//For each entry within dailyData array
					//Create new weather object
					const responseWeatherData = new WeatherData(summary, time, location_id);
						
					//store in database
					client.query(SQL_CMDS.insertWeather, [responseWeatherData.forecast, responseWeatherData.time, responseWeatherData.location_id, responseWeatherData.created_at]);
		
						return responseWeatherData;
					});
					//send data to front end
					response.send(dailyWeather);
				}
			});
    }
  });
}
//-------------------MOVIES----------------------------------
function searchMovieData(request, response){
	const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${request.query.data.search_query}`;

	checkMovieDatabase(request.query.data.id, response).then(result => {
		if(result === 'NOT IN DATABASE'){
			superagent.get(URL).then(result => {
				let movieResults = result.body.results;
				let topMovies = movieResults.map(movieObj => {
					let title = movieObj.title;
					let overview = movieObj.overview;
					let average_votes = movieObj.vote_average;
					let total_votes = movieObj.vote_count;
					let image_url = movieObj.poster_path;
					let popularity = movieObj.popularity;
					let released_on = movieObj.release_date;
					let location_id = request.query.data.id;
					
					const responseMovieObject = new MovieData(title, overview, average_votes, total_votes, image_url, popularity, released_on);
		
					client.query(SQL_CMDS.insertMovies, [responseMovieObject.title, responseMovieObject.overview, responseMovieObject.average_votes, responseMovieObject.total_votes, responseMovieObject.image_url, responseMovieObject.popularity, responseMovieObject.released_on, location_id])
		
					return responseMovieObject;
				});
				response.send(topMovies);
		
			});
		}
	});
}

//---------------------YELP-------------------------------------
function searchYelpData(request, response){
	const URL = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;

	superagent.get(URL).set('Authorization', `Bearer ${process.env.YELP_API_KEY}`).then(result => 	{
		console.log(result);
		}
	);
}



// server start
app.listen(PORT, () => {
  console.log(`app is up on PORT ${PORT}`)
})
