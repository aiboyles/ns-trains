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
var iterator = 0;

var months = {'jan':'0', 'feb':'1', 'mrt':'2', 'apr':'3', 'mei':'4', 'jun':'5', 'jul':'6', 'aug':'7', 'sep':'8', 'okt':'9', 'nov':'10', 'dec':'11'};
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

// helper functions
function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

module.exports = function(callbackFinal) {
    async.waterfall([
        // pull disruptions information from NS API
        function makeRequest(callbackMakeRequest) {
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    var $ = cheerio.load(body, {
                    xmlMode: true
                    });
                    callbackMakeRequest(null, $);
                }
            }); 
        },
        
        // process the unplanned events from NS API
        function processUnplannedEvents($, callback) {
            //console.log("in process Unplanned events");
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
            //var iterator = disruptions.length;
            //console.log("in processPlannedEvents and iterator is ");
            var existingids = [];
            var iterator = disruptions.length;
            $('Gepland').children().each(function(i, elm) {
                // tempArray splits the id string to parse out the start date for the disruption
                //console.log("in Gepland " + $(this).find('id').text());
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
    ], function (err, result) {
        //console.log("In the final callback and result is " + result.length);
        callbackFinal(result);
    });
}