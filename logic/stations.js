//includes
var util = require('util');
var config = require('../config');
var request = require('request');
var cheerio = require('cheerio');
var S = require('string');
var async = require('async');
var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/nstreins';

var pgpLib = require('pg-promise');
var pgp = pgpLib();
var promise = require('bluebird');
var rp = require('request-promise');

var configValues = {
    username: config.gebruikers_naam,
    access_token: config.wachtwoord
};

var options = {
    url: "http://webservices.ns.nl/ns-api-stations",
    auth: {
        user: configValues.username,
        password: configValues.access_token
    }
}

// grabs the full list of stations from NS API
module.exports = function (callbackFinal) {
    var results = [];

    async.waterfall([
        function makeApiCall(callback) {
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    var $ = cheerio.load(body, {
                    xmlMode: true
                    });
                    callback(null, $);
                }
            });
        },
        
        function createStationArray($, callback) {
            var stationArray = [];
            var iterator = 0;
            $('stations').children().each(function(i, elm) {
                if (($(this).find('name').text() != false) && ($(this).find('country').text() == 'NL')) {
                    stationArray[iterator] = {
                                name: $(this).find('name').text(),
                                code: $(this).find('code').text(),
                            };
                    iterator++;
                }
            });
            console.log("createStationArray " + stationArray.length);
        callback(null, stationArray);
        },
        
    function insertArray(stationArray, callback) {
        var tempDay = new Date();
        var tempTimeStamp = tempDay.getTime();
        var db = pgp(connectionString);
    
        function factory(idx) {
            if (idx < stationArray.length) {
                return this.none("INSERT INTO stationlist(name, code, timestamp) values($1, $2, $3)", 
                                 [stationArray[idx].name, stationArray[idx].code, tempTimeStamp]);
            }
        }
    
        db.tx(function () {
            return promise.all([
                this.none('DELETE FROM stationlist'),
                this.sequence(factory)
            ]);
        })
        .then(function () {
        }, function (reason) {
            console.log(reason); // print error;
        });
        ("insertArray " + stationArray.length);
        callback(null, stationArray)
    }
        ], function (err, result) {
        console.log("callbackFinal " + result.length);
        callbackFinal(result);
    });
}

// checks the stationlist currently in the database to see if it is out of date
module.exports.stationlistcheck = function (callbackFinal) {
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // SQL Query > Select Data
        var query = client.query("SELECT * FROM stationlist ORDER BY name ASC");
        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            callbackFinal(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }
    });
}