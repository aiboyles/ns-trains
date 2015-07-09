//includes
var util = require('util');
var config = require('../config');
var request = require('request');
var cheerio = require('cheerio');
var S = require('string');
var async = require('async');
var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/annboyles';

var pgpLib = require('pg-promise');
var pgp = pgpLib();
var promise = require('bluebird');
var request = require('sync-request')

var url = "https://webservices.ns.nl/ns-api-avt?station=";
var today = new Date();
//var disruptions = []; // disruptions array stores all relevant disruptions
var iterator = 0;

var months = {'jan':'0', 'feb':'1', 'mrt':'2', 'apr':'3', 'mei':'4', 'jun':'5', 'jul':'6', 'aug':'7', 'sep':'8', 'okt':'9', 'nov':'10', 'dec':'11'};
var existingids = [];
var outDated = false;

var configValues = {
        username: config.gebruikers_naam,
        access_token: config.wachtwoord
};

var options = {
    url: url,
    auth: {
        user: configValues.username,
        password: configValues.access_token
    }
    //headers: configValues.username + ":" + configValues.access_token
}

function dbCheck() {
            console.log("I am in checkDepartures");
            var results = [];
            var outDated = true;
            
            console.log("I am in checkDisruptions pre-connect");
    
            var db = pgp(connectionString);
            console.log("post-connect");
            db.query("SELECT * FROM disruptions ORDER BY timestamp DESC limit 1", true)
                .then(function (data) {
                    console.log(data); // print data;
                }, function (reason) {
                    console.log(reason); // print error;
                });
    console.log("tempCallback is : " + tempCallback);
    return tempCallback;
}

module.exports = function(stations, callbackFinal) {
    async.waterfall([
        // splits station list into array
        function splitStations(callbackSplitStations) {
            console.log("I'm in splitStations");
            var ca = stations.split(';');
            console.log("ca 1 is " + ca[0]);
            var cookieArray = [];
            for (var i=0; i< ca.length; i++) {
                var c = ca[i].split('=');
                var newObj = {
                                name: c[0].trim(),
                                code: c[1].trim()
                }
                console.log("newObj done");
                cookieArray.push(newObj);
                console.log("code is " + newObj.code + " station is " + newObj.name);
            }
            callbackSplitStations(null, cookieArray);
        },
             
        // pull departures information from NS API
        function makeRequest(stationArray, callbackMakeRequest) {
            console.log("I'm in makeRequestDep");
            var $ = '';
            var count = 0;
            async.whilst(
                function testLength() {
                    return count < stationArray.length;
                },
                function stationLoop (callbackInner) {
                    
                    console.log("in stationArray loop " + count + " " + stationArray[count].code);
                    options.url = 'https://webservices.ns.nl/ns-api-avt?station=' + stationArray[count].code;
                    console.log("before request");
                    
                    var res = request('GET', options.url, options.headers);
                    console.log("yep " + res.getBody());
                }
                    
                    
                    /*
                request(options, function (err, res, body) {
                    console.log("I'm in the request");
                    if (err) {
                        console.log("REQUEST NO GOOD");
                        console.log(err);
                    } else {
                        // read XML results into cheerio
                        console.log("SUCCESSFUL request");
                        var temp$ = cheerio.load(body, {
                        xmlMode: true
                        });
                        console.log("temp$ is : " + temp$);
                        // add a node identifying the origin station
                        var x = temp$.getElementsByTagName("VertrekkendeTrein");
                        for (k = 0; k < x.length; k++) {
                            var newel = temp$.createElement("stationid");
                            var newtext = temp$.createTextNode(stationArray[count].code);
                            newel.appendChild(newtext);
                            x[k].appendChild(newel);
                            var newel2 = temp$.createElement("stationname");
                            var newtext2 = temp$.createTextNode(stationArray[count].name);
                            newel2.appendChild(newtext2);
                            x[k].appendChild(newel2);
                        }
                        console.log("$ is : " + $);
                        $.append(temp$);
                        }
                    });
                    count++;
                    callbackInner();
                },
                function (err) {
                    console.log("OOPS ERROR WHILST " + err);
                }*/
            );
            console.log("at end of Make Request and data is : " + $);
            callbackMakeRequest(null, $);
        },
        
        // process the departure times
        function processApiResults($, callbackApiResults) {
            console.log("I'm in processApiResults");
            var departures = [];
            var iterator = 0;
            
            $('VertrekkendeTrein').children().each(function(i, elm) {
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
            callbackApiResults(null, departures);
        }          
    ], function (err, result) {
        console.log("at end of waterfall results is " + result);
        callbackFinal(result);
    });
}
