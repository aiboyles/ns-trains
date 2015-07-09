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
//var request = require('sync-request')

var url = "https://webservices.ns.nl/ns-api-avt?station=";
var today = new Date();
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
        pass: configValues.access_token
    }
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

function makeApiCall(callbackApiCall) {
            console.log("I'm in makeApiCall");
            console.log("options are: " + options);
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    console.log("in else");
                    //console.log("response is " + body);
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
    
    
    
    console.log("stationArray length is " + stationArray.length);
            async.whilst(
                function () {
                    return count < stationArray.length;
                },
                function (callbackInner) {
                    
                    console.log("in stationArray loop " + count + " " + stationArray[count].code);
                    options.url = 'https://webservices.ns.nl/ns-api-avt?station=' + stationArray[count].code;
                    console.log("before request " + options.url);
                    
                    /*makeApiCall(function(data)
                    {
                        console.log("returned from makeApiCall");
                        //count++;
                        console.log("result from count is " + count + data.substr(0, 35));
                        string2 += data;
                        count++;
                        callbackInner(null);
                        //callbackMakeRequest(null, string2);
                    });*/
                    
                    
                    request(options, function (err, res, body) {
                        if (err) {
                            console.log(err);
                        } else {
                        // read XML results into cheerio
                        console.log("in else " + body.substr(0, 35));
                        //console.log("response is " + body);
                        var $ = cheerio.load(body, {
                        xmlMode: true
                        });
                        //var xmlData = jsdom(data, {
                        //    features: {
                        //        QuerySelector: true
                        //    }
                        //});
                        // add a node identifying the origin station
                        $('ActueleVertrekTijden').children().each(function(i, elm) {
                            $(this).append("<stationid>" + stationArray[count].code + "</stationid>");
                            $(this).append("<stationname>" + stationArray[count].name + "</stationname>");
                            console.log("stationname internal : " + $(this).find('stationname').text());
                        });
                            
                        /*   console.log("xml read in cheerio");
                        var x = xmlData.getElementsByTagName("VertrekkendeTrein");
                        for (k = 0; k < x.length; k++) {
                            var newel = xmlData.createElement("stationid");
                            var newtext = xmlData.createTextNode(stationArray[count].code);
                            newel.appendChild(newtext);
                            x[k].appendChild(newel);
                            var newel2 = xmlData.createElement("stationname");
                            var newtext2 = xmlData.createTextNode(stationArray[count].name);
                            newel2.appendChild(newtext2);
                            x[k].appendChild(newel2);
                        }
                        //console.log("$ is : " + $);
                            //console.log(xmlData.getElementsByTagName("VertrekkendeTrein"));
                            //console.log(apiArray);*/
                                
                        //console.log($);
                        apiArray.push($);
                        count++;
                        callbackInner();
                        }
                    });
                    
                    //count++;
                    console.log("at end of stationLoop and and count is: " + count);
                    //callbackInner(string2);
            
                },
                function (err) {
                    console.log("I am in error bit");
                    callbackWhilst(apiArray);
                    // 5 seconds have passed
                });
}
    

//function asyncWhilst(


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
            console.log("I'm in makeRequestDep station.Array length " + stationArray.length);
            var string2 = '';
            var count = 0; 
            
            asyncWhilst(stationArray, function (data) {
                //console.log("returned data from asyncWhilst is: ");
                console.log("returned data from asyncWhilst is: " + data.length);
                callbackMakeRequest(null, data);
            });
            
        },
                            
        
        // process the departure times
        function processApiResults(data, callbackApiResults) {
            console.log("I'm in processApiResults");
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
                    //console.log("i is " + i);
                    console.log("within VertrekkendeTrein" + $(this).find('stationname').text());
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
                    console.log("I am in error bit " + departures[0].stationid);
                    callbackApiResults(null, departures);
                    // 5 seconds have passed
                });
            }          
    ], function (err, result) {
        console.log("at end of waterfall results is " + result[0].destination + " " + result[0].route);
        callbackFinal(result);
    });
}
