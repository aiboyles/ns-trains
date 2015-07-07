var express = require('express');
var disruptions = require('../logic/disruptions');
var router = express.Router();
var async = require('async');
var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/annboyles';
var pgpLib = require('pg-promise');
var pgp = pgpLib();
var promise = require('bluebird');
var request = require('request');
var cheerio = require('cheerio');
var config = require('../config');


var url = "http://webservices.ns.nl/ns-api-stations";

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

router.index = function(req, res) {
  res.render('index', {
    title: 'NS Trein App'
  });
}

router.disruptions = function(req, res) {
    disruptions(function (data) {
        console.log("DATA IS :" + data);
        res.json(data);
    });
};

router.disruptionsdb = function(req, res) {
    console.log("I am in disruptionsdb");
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        
        // SQL Query > Select Data
        var query = client.query("SELECT * FROM disruptions ORDER BY id ASC");
console.log("post-query");
        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
            console.log("row is " + row.route);
        });
        console.log("postquery.on");

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            console.log("results is + " + results);
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }

    });
};

router.disruptionsdbinsert = function(req, res) {
    console.log("in routerdisrup");
    var tempDay = new Date();
    var tempTimeStamp = tempDay.getTime();
    console.log("tempDay is : " + tempDay.getTime());
    //console.log(req.body);
    var disruptions = req.body;
    //console.log(req.body);
    console.log("length is : " + req.body.resultslength);
    console.log("something is " + disruptions["results[0][route]"]);
    //console.log(disruptions);
    console.log("I am in disruptionsdbinsert " + disruptions['results[0][route]']);
    
    var db = pgp(connectionString);
    
    function factory(idx) {
        if (idx < req.body.resultslength) {
            var tempString = "results[" + idx + "]";
            return this.none("INSERT INTO disruptions(type, route, message, timestamp) values($1, $2, $3, $4)", [disruptions[tempString + "[type]"], disruptions[tempString + "[route]"], disruptions[tempString + "[message]"], tempTimeStamp]);
        }
    }
    
    db.tx(function () {
        return promise.all([
            this.none('DELETE FROM disruptions'),
            this.sequence(factory)
                ]);
        })
        .then(function () {
            console.log("success!");
        }, function (reason) {
            console.log(reason); // print error;
        });
    
    /*
    pg.connect(connectionString, function(err, client, done) {
        console.log("I am in pg.connect insert and length is " + req.body.resultslength);
        // first remove everything from the table
        client.query("DELETE * FROM disruptions");
        console.log("deletion complete");
        // SQL Query > Select Data
        for (j = 0; j < req.body.resultslength; j++)
        {
            var tempString = "results[" + j + "]";
            console.log("route is : " + disruptions[tempString + "[route]"]);
            client.query("INSERT INTO disruptions(type, route, message, timestamp) values($1, $2, $3, $4)", [disruptions[tempString + "[type]"], disruptions[tempString + "[route]"], disruptions[tempString + "[message]"], tempTimeStamp]);
        }
        console.log("done with that loop");
        
        // SQL Query > Select Data
        /*var query = client.query("SELECT * FROM disruptions ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            console.log("row is " + row.route);
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json(results);
        });
        
        client.end();
                    
        // Handle Errors
        if(err) {
            console.log(err);
        }
    });*/
    console.log("i have finished insertIntoDB");
    return res.json("hurray");
}

router.stationlistcheck = function(req, res) {
    console.log("I am in stationlistcheck");
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        
        // SQL Query > Select Data
        var query = client.query("SELECT * FROM stationlist ORDER BY name ASC");
        console.log("post-query");
        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
            //console.log("row is " + row.route);
        });
        console.log("postquery.on");

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            //console.log("results is + " + results);
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }

    });
};

router.stationlist = function(req, res) {
    var results = [];

    async.waterfall([
        function makeApiCall(callback) {
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    console.log("in else");
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
        callback(null, stationArray);
        },
        
    function insertArray(stationArray, callback) {
            var tempDay = new Date();
        var tempTimeStamp = tempDay.getTime();
        var db = pgp(connectionString);
    
        function factory(idx) {
            if (idx < stationArray.length) {
                return this.none("INSERT INTO stationlist(name, code, timestamp) values($1, $2, $3)", [stationArray[idx].name, stationArray[idx].code, tempTimeStamp]);
            }
        }
    
    db.tx(function () {
        return promise.all([
            this.none('DELETE FROM stationlist'),
            this.sequence(factory)
                ]);
        })
        .then(function () {
            console.log("success!");
        }, function (reason) {
            console.log(reason); // print error;
        });

    }
        ], function (err, result) {
        console.log("at end of waterfall");
        callback("HURRAY STATIONS");
    });
    res.json("HURRAY STATIONS");
};

/*
router.disruptionsdbupdate = function(req, res) {

    var results = [];

    // Grab data from the URL parameters
    var route = req.params.route;

    // Grab data from http request
    var data = {type: req.body.type, message: req.body.message};

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Update Data
        client.query("UPDATE disruptions SET type=($1), message=($2) WHERE route=($3)", [data.type, data.message, route]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM disruptions ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }

    });

};*/


module.exports = router;