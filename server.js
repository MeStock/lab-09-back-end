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

app.use('*', (request, response) => {
  response.send('Our server runs.');
})

//sql commands 
const SQL_CMDS = {};
SQL_CMDS.getLocation = 'SELECT * FROM locations WHERE search_query=$1'
// SQL_CMDS.getLocation = 'SELECT * FROM $1 WHERE search_query=$2'
SQL_CMDS.insertLocation = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *'
SQL_CMDS.getWeather = 'SELECT * FROM weathers WHERE location_id=$1'
SQL_CMDS.insertWeather = 'INSERT INTO weathers (forecast, time, location_id) VALUES ($1, $2, $3)'
SQL_CMDS.deleteWeather = 'DELETE FROM weathers WHERE location_id=$1'

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

//Other Functions
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
				console.log(result.rows[0]);
				if(Date.now() - result.rows[0].created_at > 15000){
					client.query(SQL_CMDS.deleteWeather, [location_id]);
					console.log(Date.now() - result.rows[0].created_at);
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
					client.query(SQL_CMDS.insertWeather, [responseWeatherData.forecast, responseWeatherData.time, responseWeatherData.location_id]);
		
						return responseWeatherData;
					});
					//send data to front end
					response.send(dailyWeather);
				}
			});
    }
  });
}





// server start
app.listen(PORT, () => {
  console.log(`app is up on PORT ${PORT}`)
})
