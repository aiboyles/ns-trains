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

var configValues = {
    username: config.gebruikers_naam,
    access_token: config.wachtwoord
};

var options = {
    url: "https://webservices.ns.nl/ns-api-avt?station=",
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
    pg.connect(connectionString, function (err, client, done) {
        // SQL Query > Select Data
        var query = client.query("SELECT * FROM departures WHERE stationid=$1 ORDER BY departuretime", [stationId]);
        // Stream results back one row at a time
        query.on('row', function (row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function () {
            client.end();
            callbackDb(results);
        });

        // Handle Errors
        if (err) {
            console.log(err);
        }
    });
}

/*function appendStationId($, code, name, apiArray, count, callback) {
    $('ActueleVertrekTijden').children().each(function (i, elm) {
        $(this).append("<stationid>" + code + "</stationid>");
        $(this).append("<stationname>" + name + "</stationname>");
        console.log("inside Asyncwhilst 4.5 " + $(this).find('EindBestemming').text());
    });
    apiArray[count] = $;
    callback(apiArray);
}*/

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
                    $('ActueleVertrekTijden').children().each(function (i, elm) {
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

function asyncWhilstDb(statArray, callbackWhilst) {
    var results = [];
    var count = 0;
    async.whilst(
        function () {
            return count < statArray.length;
        },
        function (callbackInner) {
            makeDbCall(statArray[count], function (data) {
                for (j = 0; j < data.length; j++) {
                    results.push(data[j]);
                }
                count++;
                callbackInner();
            });
        },
        function (err) {
            callbackWhilst(results);
        });
}

module.exports = function (stationsJson, callbackFinal) {
    var stations = JSON.parse(stationsJson);

    async.waterfall([
        // pull departures information from NS API
        function makeRequest(callbackMakeRequest) {
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

                // only return 10 or fewer departures times per station...
                // displaying more than that gets cluttered
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
                        $('ActueleVertrekTijden').children().each(function (i, elm) {
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

module.exports.departuresdb = function (stations, callbackFinal) {
    async.waterfall([
        function createStationArray(callbackStation) {
            var ca = stations.split(';');
            var cookieArray = [];
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i].split('=');
                cookieArray.push(c[1].trim());
            }
            callbackStation(null, cookieArray);
        },

        // pull departures information from NS API
        function makeRequest(stationArray, callbackMakeRequest) {
            asyncWhilstDb(stationArray, function (data) {
                callbackMakeRequest(null, data);
            });
        }
    ], function (err, result) {
        callbackFinal(result);
    });
}

module.exports.departuresdbinsert = function (depArray, singlestation, callback) {

    var tempDay = new Date();
    var tempTimeStamp = tempDay.getTime();
    var departures = JSON.parse(depArray);
    var deleteLength = 1;
    if (!singlestation) {
        deleteLength = departures.length;
    }
    
    var db = pgp(connectionString);
    
    function factory(idx) {
        if (idx < departures.length) {
            return this.none("INSERT INTO departures(stationid, stationname, destination, departuretime, traintype, "
                             + "route, platform, platformchange, delay, timestamp) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", 
                             [departures[idx].stationid, departures[idx].stationname, 
                              departures[idx].destination, departures[idx].departuretime, 
                              departures[idx].traintype, departures[idx].route, 
                              departures[idx].platform, departures[idx].platformchange, 
                              departures[idx].delay, tempTimeStamp]);
        }
    }
    
    function factory2(idx2) {
        if (idx2 < deleteLength) {
            return this.none("DELETE FROM departures WHERE stationid=$1", [departures[idx2].stationid]);
        }
    }
    
    db.tx(function () {
        return promise.all([
            this.sequence(factory2),
            this.sequence(factory)
                ]);
        })
        .then(function () {
        }, function (reason) {
            console.log(reason); // print error;
        });
}