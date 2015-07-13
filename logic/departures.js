//includes
var util = require('util');
var config = require('../config');
var request = require('request');
var cheerio = require('cheerio');
var S = require('string');
var async = require('async');
var pg = require('pg');
var jsdom = require('jsdom').jsdom;
var S = require('string');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/annboyles';

var pgpLib = require('pg-promise');
var pgp = pgpLib();
var promise = require('bluebird');
var rp = require('request-promise');

var url = "https://webservices.ns.nl/ns-api-avt?station=";
var today = new Date();
var iterator = 0;

var configValues = {
        username: config.gebruikers_naam,
        access_token: config.wachtwoord
};

var options = {
    url: url,
    auth: {
        user: configValues.username,
        pass: configValues.access_token
    }
}

function makeApiCall(callbackApiCall) {
    request(options, function (err, res, body) {
        if (err) {
            console.log(err);
        } else {
            // read XML results into cheerio
            var data = cheerio.load(body, {
            xmlMode: true
            });
            callbackApiCall(data);
        }
    }); 
};

function makeDbCall(stationId, callbackDb) {
    var results = [];
    console.log("in MakeDbCall");
    pg.connect(connectionString, function(err, client, done) {
            // SQL Query > Select Data
            console.log("stationId " + stationId);
                var query = client.query("SELECT * FROM departures WHERE stationid=$1 ORDER BY departuretime", [stationId]);
                // Stream results back one row at a time
                query.on('row', function(row) {
                    results.push(row);
                });

                // After all data is returned, close connection and return results
                query.on('end', function() {
                    client.end();
                    callbackDb(results);
                });

                // Handle Errors
                if(err) {
                    console.log(err);
                }
            });
}
    
function appendStationId($, code, name, apiArray, count, callback) {
    $('ActueleVertrekTijden').children().each(function(i, elm) {
        $(this).append("<stationid>" + code + "</stationid>");
        $(this).append("<stationname>" + name + "</stationname>");
        console.log("inside Asyncwhilst 4.5 " + $(this).find('EindBestemming').text());
    });
    apiArray[count] = $;
    callback(apiArray);
}

function asyncWhilst(stationArray, callbackWhilst) {
    var apiArray = [];
    var count = 0; 
    
    async.whilst(
        function () {
            return count < stationArray.length;
        },
        function (callbackInner) {
            console.log("in asyncWhilst and count is " + count);
            console.log("stationArray[count].code " + stationArray[count].code);
            options.url = 'https://webservices.ns.nl/ns-api-avt?station=' + stationArray[count].code; 
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    var $ = cheerio.load(body, {
                    xmlMode: true
                    });
                    //console.log("$ first is " + $.xml());
                    // add a node identifying the origin station
                    $('ActueleVertrekTijden').children().each(function(i, elm) {
                        $(this).append("<stationid>" + stationArray[count].code + "</stationid>");
                        $(this).append("<stationname>" + stationArray[count].name + "</stationname>");
                        //console.log(" route is " + $(this).find('RouteTekst').text());
                    });
                    apiArray.push($);
                    //console.log("$ is " + $);
                    //console.log("apiArray[count] = " + apiArray[count]);
                    count++;
                    callbackInner();
                }
            });
        },
        function (err) {
            //console.log("apiArray[0] = " + apiArray[0]);
            callbackWhilst(apiArray);
        });
}


function asyncWhilstDb(statArray, callbackWhilst) {
    var results = [];
    var count = 0; 
    var stationArray = statArray;
    console.log("in asyncWhilstDb " + stationArray[0] + " " + stationArray[1]);
    var db = pgp(connectionString);
    async.whilst(
        function () {
            return count < stationArray.length;
        },
        function (callbackInner) {
            console.log("in callbackInner");
            
            makeDbCall(stationArray[count], function (data) {
                for (j=0; j<data.length; j++)
                {
                    results.push(data[j]);
                }
                count++;
                callbackInner();
            });
            
            // Get a Postgres client from the connection pool
        },
        function (err) {
            callbackWhilst(results);
        });
}
    
module.exports = function(stationsJson, callbackFinal) {
    var stations = JSON.parse(stationsJson);
    console.log("in departures " + stations[0].code);
    //console.log("stations is " + stationsString);
    //console.log("stations parsed is " + JSON.parse(stationsString));
    console.log("PARSED");
    
    async.waterfall([
        // pull departures information from NS API
        function makeRequest(callbackMakeRequest) {
            console.log("In makeRequest");
            asyncWhilst(stations, function (data) {
                callbackMakeRequest(null, data);
            });       
        },
                            
        // process the departure times
        function processApiResults(data, callbackApiResults) {
            //console.log("in process api results" + data.length);
            var departures = [];
            var count = 0;
            var iterator = 0;
            
            var dataLength = 10;
            if (data.length < 10) {
                dataLength = data.length;
            }
            
            async.whilst(
                function () {
                    return count < dataLength;
                },
                function (callbackInner) {
                    var $ = data[count];
                    //console.log("data[count] is " + data[count]);
                    $('ActueleVertrekTijden').children().each(function(i, elm) {
                    departures[iterator] = {
                                stationid: $(this).find('stationid').text(),
                                stationname: $(this).find('stationname').text(),
                                destination: $(this).find('EindBestemming').text(),
                                departuretime: $(this).find('VertrekTijd').text(),
                                traintype: $(this).find('TreinSoort').text(),
                                route: $(this).find('RouteTekst').text(),
                                platform: $(this).find('VertrekSpoor').text(),
                                platformchange: $(this).find('VertrekSpoor').attr('wijziging'),
                                delay: $(this).find('VertrekVertragingTekst').text()
                            };
                        //console.log("inside actuele vertrektijden " + departures[iterator].traintype);
                        iterator++;
                        
                    });
                    count++;
                    callbackInner();
                },
                function (err) {
                    callbackApiResults(null, departures);
                });
        }],
        function (err, result) {
        console.log("result length is : " + result.length);
        callbackFinal(result);
    });
}

module.exports.depDb = function (stations, callbackFinal) {
    console.log("I am in depDb!" + stations);
    async.waterfall([
        function createStationArray(callbackStation) {
            //console.log("in departuresdb");
            var ca = stations.split(';');
            //console.log("in departuresdb2");
            var cookieArray = [];
            for (var i=0; i< ca.length; i++) {
                var c = ca[i].split('=');
                //console.log("in departuresdb3 " + c[1]);
                cookieArray.push(c[1].trim());
            }
            //console.log("indeparturesdb4.5");
            callbackStation(null, cookieArray);
        },
        
        // pull departures information from NS API
        function makeRequest(stationArray, callbackMakeRequest) {
            //console.log("in departures 4.9 " + stationArray[0] + " " + stationArray[1]);
            asyncWhilstDb(stationArray, function (data) {
             //   console.log("returned from asyncWhilstdb");
                callbackMakeRequest(null, data);
            });       
            //console.log("in departures 5.1");
        }
    ], function (err, result) {
        //console.log("in departuresdb8");
        callbackFinal(result);
    });
    //console.log("in departuresdb9");
    //return res.json("disruptionsdbsuccess");
}