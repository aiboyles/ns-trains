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
            callbackApiCall(body);
        }
    }); 
};

function asyncWhilst(stationArray, callbackWhilst) {
    var apiArray = [];
    var count = 0; 
    
    async.whilst(
        function () {
            return count < stationArray.length;
        },
        function (callbackInner) {
            options.url = 'https://webservices.ns.nl/ns-api-avt?station=' + stationArray[count].code; 
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    var $ = cheerio.load(body, {
                    xmlMode: true
                    });
                    // add a node identifying the origin station
                    $('ActueleVertrekTijden').children().each(function(i, elm) {
                        $(this).append("<stationid>" + stationArray[count].code + "</stationid>");
                        $(this).append("<stationname>" + stationArray[count].name + "</stationname>");
                    });
                    apiArray.push($);
                    count++;
                    callbackInner();
                }
            });
        },
        function (err) {
            callbackWhilst(apiArray);
        });
}
    
module.exports = function(stations, callbackFinal) {
    async.waterfall([
        // splits station list into array
        function splitStations(callbackSplitStations) {
            var ca = stations.split(';');
            var cookieArray = [];
            for (var i=0; i< ca.length; i++) {
                var c = ca[i].split('=');
                var newObj = {
                                name: c[0].trim(),
                                code: c[1].trim()
                }
                cookieArray.push(newObj);
            }
            callbackSplitStations(null, cookieArray);
        },
             
        // pull departures information from NS API
        function makeRequest(stationArray, callbackMakeRequest) {
            asyncWhilst(stationArray, function (data) {
                callbackMakeRequest(null, data);
            });       
        },
                            
        // process the departure times
        function processApiResults(data, callbackApiResults) {
            var departures = [];
            var count = 0;
            var iterator = 0;
            
            async.whilst(
                function () {
                    return count < data.length;
                },
                function (callbackInner) {
                    var $ = data[count];
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
        callbackFinal(result);
    });
}