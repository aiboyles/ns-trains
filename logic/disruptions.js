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

var url = "https://webservices.ns.nl/ns-api-storingen?actual=true&unplanned=true";
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
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function dbCheck() {
            //console.log("I am in checkDisruptions");
            var results = [];
            var outDated = true;
            
            //console.log("I am in checkDisruptions pre-connect");
    
            var db = pgp(connectionString);
            //console.log("post-connect");
            db.query("SELECT * FROM disruptions ORDER BY timestamp DESC limit 1", true)
                .then(function (data) {
                    console.log(data); // print data;
                }, function (reason) {
                    console.log(reason); // print error;
                });
    
    
    
    /*
            pg.connect(connectionString, function(err, client, done) {
                console.log("error is " + err);
                console.log("I am in checkDisruptions2");
                // SQL Query > Select Data
                var query = client.query("SELECT * FROM disruptions ORDER BY timestamp DESC limit 1;");

                // Stream results back one row at a time
                query.on('row', function(row) {
                    console.log("in checkDisruptions row " + row.route);
                    var d = new Date();
                    console.log("d.gettime is " + d.getTime() + " and row.timestamp is " + row.timestamp);
                    if ((d.getTime() - row.timestamp) < 120000) {
                        console.log("in if loop");
                        console.log("d.gettime is " + d.getTime() + " and row.timestamp is " + row.timestamp);
                        console.log("outdated is : " + outDated);
                        // grab values from db and return in disruptions
                        var disruptions = [];
                        var iterator = 0;
                        query = client.query("SELECT * FROM disruptions ORDER BY id ASC;");
                        query.on('row', function(row) {
                            disruptions[iterator] = {
                                type: row.type,
                                date: '',
                                period: '',
                                route: row.route,
                                reason: '',
                                advice: '',
                                message: row.message
                            };
                            iterator++;
                        });
                        done();
                        query.on('end', function() {
                            client.end();
                        });
                        console.log("just before callbackFinal" + row.route);
                        tempCallback = disruptions;
                    }
                });
                // After all data is returned, close connection and return results
                query.on('end', function() {
                    client.end();
                });
            });*/
    //console.log("tempCallback is : " + tempCallback);
    return tempCallback;
}

module.exports = function(callbackFinal) {
    async.waterfall([
        
        // pull disruptions information from NS API
        function makeRequest(callbackMakeRequest) {
            //console.log("I'm in makeRequest");
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    //console.log("in else");
                    var $ = cheerio.load(body, {
                    xmlMode: true
                    });
                    callbackMakeRequest(null, $);
                }
            }); 
        },
        
        // process the unplanned events from NS API
        function processUnplannedEvents($, callback) {
            //console.log("I'm in processUnplannedEvents");
            var disruptions = [];
            var iterator = 0;
            $('Ongepland').children().each(function(i, elm) {
                disruptions[iterator] = {
                                type: 'unplanned',
                                date: $(this).find('Datum').text(),
                                period: '',
                                route: $(this).find('Traject').text(),
                                reason: $(this).find('Reden').text(),
                                advice: '',
                                message: $(this).find('Bericht').text()
                            };
                iterator++;
            });
            callback(null, $, disruptions);
        },
        
        // then process the planned events
        function processPlannedEvents($, disruptions, callback) {
            //console.log("just before planned");
            // next, handle the planned disruptions
            var iterator = disruptions.length;
            
            $('Gepland').children().each(function(i, elm) {
                // tempArray splits the id string to parse out the start date for the disruption
                var tempArray = (($(this).find('id').text()).split('_')).slice(-2);
                var startDateString = "";
                var startDate;
                var arrMatches = tempArray[0].match(/\d+/g);
            
                // does the first string in tempArray have any digits? (i.e. the date)
                if (arrMatches !== null) {
                    // does it ALSO have any letters? (i.e. the month)
                    if (tempArray[0].match(/[a-z](.*)/)) { // yes, it has letters and numbers (the month AND date)
                        startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + (Number(months[(tempArray[0].match(/[a-z](.*)/))[0]]) + 1)
                                        + '-' + (tempArray[0].match(/\d+/g))[0];
                        startDate = new Date(startDateString);
                    }
                    else { // it only provides the date; we must grab the month from the second string in tempArray
                        startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + (Number(months[(tempArray[1].match(/[a-z](.*)/))[0]]) + 1)
                                        + '-' + (tempArray[0].match(/\d+/g))[0];
                        startDate = new Date(startDateString);
                    }
                }
                else { // the first string has no digits (the disruption is only one day; grab all info from second string in tempArray)
                    startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + (Number(months[(tempArray[1].match(/[a-z](.*)/))[0]]) + 1)
                                        + '-' + (tempArray[1].match(/\d+/g))[0];
                    startDate = new Date(startDateString);
                }
            
                // is the start date for this disruption before or on today's date?
                // if not, we do not need to worry about it
                // note: existingids is used to track whether or not I've added this disruption already,
                // as the NS API appears to sometimes repeat itself when listing disruptions
                if ((startDate <= today) && (existingids.indexOf($(this).find('id').text()) < 0)) {
                    disruptions[iterator] = {
                                type: 'planned',
                                date: startDate,
                                period: $(this).find('Periode').text(),
                                route: $(this).find('Traject').text(),
                                reason: $(this).find('Reden').text(),
                                advice: $(this).find('Advies').text(),
                                message: $(this).find('Bericht').text()
                            };
                    iterator++;
                    existingids.push($(this).find('id').text());
                }
            });
            callback(null, disruptions);
        }
        
        /*function insertIntoDb(disruptions, callback) {
            console.log("in insertIntoDB");

            // enter everything in disruptions in the database
                var tempDay = new Date();
                var tempTimeStamp = tempDay.getTime();
                pg.connect(connectionString, function(err, client, done) {
                    console.log("I am in pg.connect and length is " + disruptions.length);
                    // first remove everything from the table
                    client.query("DELETE * FROM disruptions");
                    console.log("deletion complete");
                    // SQL Query > Select Data
                    for (j=0; j < disruptions.length; j++)
                    {
                        console.log("route is : " + disruptions[j].route);
                        client.query("INSERT INTO disruptions(type, route, message, timestamp) values($1, $2, $3, $4)", [disruptions[j].type, disruptions[j].route, disruptions[j].message, tempTimeStamp]);
                    }
                    console.log("I have finished the loop");
                    client.end();
                    
                    // Handle Errors
                    if(err) {
                        console.log(err);
                    }
                });
            console.log("i have finished insertIntoDB");
            callback(null, disruptions);
        }  */            
    ], function (err, result) {
        //console.log("at end of waterfall");
        callbackFinal(result);
    });

}