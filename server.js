/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable indent */
'use strict';


require('dotenv').config();



//------------------------GLOBAL CONSTANTS---------------------------------
const PORT = process.env.PORT || 3000;
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

//-------------------POSTGRES CLIENT-----------------------------------------
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => console.error(error))


//-----------------------------SERVER DEFINITION-----------------------------
const app = express();
app.use(cors());


app.get('/location', searchLocationData);
app.get('/weather', searchWeatherData);
app.get('/movies', searchMovieData);
app.get('/yelp', searchYelpData);

app.use('*', (request, response) => {
  response.send('Our server runs.');
})

//-----------------------------SQL COMMANDS----------------------------
const SQL_CMDS = {};
SQL_CMDS.getLocation = 'SELECT * FROM locations WHERE search_query=$1'
SQL_CMDS.insertLocation = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *;'
SQL_CMDS.getWeather = 'SELECT * FROM weathers WHERE location_id=$1;'
SQL_CMDS.insertWeather = 'INSERT INTO weathers (forecast, time, location_id, created_at) VALUES ($1, $2, $3, $4);'
SQL_CMDS.deleteWeather = 'DELETE FROM weathers WHERE location_id=$1;'

SQL_CMDS.getMovies = 'SELECT * FROM movies WHERE location_id=$1;'
SQL_CMDS.insertMovies = 'INSERT INTO movies (title, overview, average_votes, total_votes, image_url, popularity, released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);'
SQL_CMDS.deleteMovie = 'DELETE FROM movies WHERE location_id=$1;'


SQL_CMDS.getRestaurants = 'SELECT * FROM restaurants WHERE location_id=$1;'
SQL_CMDS.insertRestaurants = 'INSERT INTO restaurants (name, image_url, price, rating, url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);'
SQL_CMDS.deleteRestaurant = 'DELETE FROM restaurants WHERE location_id=$1;'





//----------------CONSTRUCTOR FUNCTIONS-----------------------------------

function LocationData(search_query, formatted_query, latitude, longitude) {
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
}

function WeatherData(summary, time, location_id) {
  this.forecast = summary;
	this.time = time;
	this.location_id = location_id;
	this.created_at = Date.now();

}

function MovieData(title, overview, average_votes, total_votes, img_url, popularity, released_on, location_id){
	this.title = title;
	this.overview = overview;
	this.average_votes = average_votes;	this.total_votes = total_votes;
	this.image_url = img_url;
	this.popularity = popularity;
	this.released_on = released_on;
	this.location_id = location_id;
	this.created_at = Date.now();
}

function YelpData(name, image_url, price, rating, url, location_id){
	this.name = name;
	this.image_url = image_url;
	this.price = price;
	this.rating = rating;
	this.url = url;
	this.location_id = location_id;
	this.created_at = Date.now();
}

//----------------------OTHER FUNCTIONS----------------------

//----------------------CHECK DATABASE------------------------
function checkLocationDatabase(search_query, response) {
  return client.query(SQL_CMDS.getLocation, [search_query]).then(result => {
    if (result.rows.length) {
			response.send(result.rows[0]);
    }else {
      return 'NOT IN DATABASE';
    }
  });
}
function checkDatabase(location_id, response, SQL_get, SQL_delete, timeToRefresh) {
		return client.query(SQL_get, [location_id]).then(result => {
			if (result.rows.length){
				if(Date.now() - result.rows[0].created_at > timeToRefresh){
					client.query(SQL_delete, [location_id]);
					return 'NOT IN DATABASE';
				}
				response.send(result.rows);
			}else {
				return 'NOT IN DATABASE';
			}
		});
	}

	// function checkMovieDatabase(location_id, response){
	// 	return client.query(SQL_CMDS.getRestaurants, [location_id]).then(result => {
	// 		if (result.rows.length){
	// 			//update every year
	// 			if(Date.now() - result.rows[0].created_at > 31536000000){
	// 				client.query(SQL_CMDS.deleteMovie, [location_id])
	// 				return 'NOT IN DATABASE';
	// 			}
	// 			response.send(result.rows);
	// 		}else {
	// 			return 'NOT IN DATABASE';
	// 		}
	// 	});
	// }

	// function checkRestaurantDatabase(location_id, response){
	// 	return client.query(SQL_CMDS.getRestaurants, [location_id]).then(result => {
	// 		if (result.rows.length){
	// 			//update every week
	// 			if(Date.now() - result.rows[0].created_at > 604800000){
	// 				client.query(SQL_CMDS.deleteRestaurant, [location_id])
	// 				return 'NOT IN DATABASE';
	// 			}
	// 			response.send(result.rows);
	// 		}else {
	// 			return 'NOT IN DATABASE';
	// 		}
	// 	});
	// }

//-------------------GEOCODE----------------------------------
function searchLocationData(request, response) {
  //stores user input
  const search_query = request.query.data;
  checkLocationDatabase(search_query, response).then(result => {
    if (result === 'NOT IN DATABASE') {

      const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${search_query}&key=${process.env.GEOCODE_API_KEY}`;
      superagent.get(URL).then(result => {
        if (result.body.status === 'ZERO_RESULTS') {
          response.status(500).send('Sorry, something went wrong');
          return;
        }
        const searchedResult = result.body.results[0];
        const formatted_query = searchedResult.formatted_address;

        const latitude = searchedResult.geometry.location.lat;
        const longitude = searchedResult.geometry.location.lng;
        const responseDataObject = new LocationData(search_query, formatted_query, latitude, longitude);

        client.query(SQL_CMDS.insertLocation, [responseDataObject.search_query, responseDataObject.formatted_query, responseDataObject.latitude, responseDataObject.longitude]).then(result => {
					
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
	let location_id = request.query.data.id;

	checkDatabase(location_id, response, SQL_CMDS.getWeather, SQL_CMDS.deleteWeather, 15000).then(result => {
		if(result === 'NOT IN DATABASE'){
			superagent.get(URL).then(result => {
				if (result.body.latitude === Number(request.query.data.latitude) && result.body.longitude === Number(request.query.data.longitude)){
					let dailyData = result.body.daily.data;
					const dailyWeather = dailyData.map((dailyDataObj) => {
					let summary = dailyDataObj.summary;
					let time = new Date(dailyDataObj.time * 1000).toString().slice(0, 15);
		
					const responseWeatherData = new WeatherData(summary, time, location_id);
						
					client.query(SQL_CMDS.insertWeather, [responseWeatherData.forecast, responseWeatherData.time, responseWeatherData.location_id, responseWeatherData.created_at]);
		
					return responseWeatherData;
					});
					response.send(dailyWeather);
				}
			});
    }
  });
}
//-------------------MOVIES----------------------------------
function searchMovieData(request, response){
	const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${request.query.data.search_query}`;
	let location_id = request.query.data.id;

	checkDatabase(location_id, response, SQL_CMDS.getMovies, SQL_CMDS.deleteMovie, 31536000000).then(result => {
		if(result === 'NOT IN DATABASE'){
			superagent.get(URL).then(result => {
				let movieResults = result.body.results;
				let topMovies = movieResults.map(movieObj => {
					let title = movieObj.title;
					let overview = movieObj.overview;
					let average_votes = movieObj.vote_average;
					let total_votes = movieObj.vote_count;
					let img_url = movieObj.poster_path;
					let popularity = movieObj.popularity;
					let released_on = movieObj.release_date;
					
					const responseMovieObject = new MovieData(title, overview, average_votes, total_votes, img_url, popularity, released_on, location_id);
		
					client.query(SQL_CMDS.insertMovies, [responseMovieObject.title, responseMovieObject.overview, responseMovieObject.average_votes, responseMovieObject.total_votes, responseMovieObject.image_url, responseMovieObject.popularity, responseMovieObject.released_on, responseMovieObject.created_at, responseMovieObject.location_id]);
		
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
	let location_id = request.query.data.id;

	checkDatabase(location_id, response, SQL_CMDS.getRestaurants, SQL_CMDS.deleteRestaurant, 604800000).then(result => {
		if(result === 'NOT IN DATABASE'){
			superagent.get(URL).set('Authorization', `Bearer ${process.env.YELP_API_KEY}`).then(result => 	{
				let yelpResults = JSON.parse(result.text).businesses;
				let topRestaurants = yelpResults.map(restaurantObj => {
		
					let name = restaurantObj.name;
					let image_url = restaurantObj.image_url;
					let price = restaurantObj.price;
					let rating = restaurantObj.rating;
					let url = restaurantObj.url;		
			
					let responseRestaurantObject = new YelpData(name, image_url, price, rating, url, location_id);
		
					client.query(SQL_CMDS.insertRestaurants, [responseRestaurantObject.name, responseRestaurantObject.image_url, responseRestaurantObject.price, responseRestaurantObject.rating, responseRestaurantObject.url, responseRestaurantObject.created_at, responseRestaurantObject.location_id]);
		
					return responseRestaurantObject;
				});
				response.send(topRestaurants);
				}
			);
		}
	});


}



//---------------------------INITIATE SERVER---------------------------------
app.listen(PORT, () => {
  console.log(`app is up on PORT ${PORT}`)
})
