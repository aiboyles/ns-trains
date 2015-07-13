var express = require('express');
var disruptions = require('../logic/disruptions');
var departures = require('../logic/departures');
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

router.index = function(req, res) {
  res.render('index', {
    title: 'NS Trein App'
  });
}

// DISRUPTIONS routes

router.disruptions = function(req, res) {
    disruptions(function (data) {
        res.json(data);
    });
};

router.disruptionsdb = function(req, res) {
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
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
};

router.disruptionsdbinsert = function(req, res) {
    var tempDay = new Date();
    var tempTimeStamp = tempDay.getTime();
    var disruptions = JSON.parse(req.body.data);
    var db = pgp(connectionString);
    
    function factory(idx) {
        if (idx < req.body.datalength) {
            //console.log("disruptions[idx].route " + disruptions[idx].route);
            return this.none("INSERT INTO disruptions(type, route, message, timestamp) values($1, $2, $3, $4)", 
                             [disruptions[idx].type, disruptions[idx].route, 
                              disruptions[idx].message, tempTimeStamp]);
        }
    }
    
    // execute sequence of database inserts
    db.tx(function () {
        return promise.all([
            this.none('DELETE FROM disruptions'),
            this.sequence(factory)
                ]);
        })
        .then(function () {
            console.log("success! disruptions db insert");
        }, function (reason) {
            console.log(reason); // print error;
        });
    
    return res.json("disruptionsdbsuccess");
};

// STATIONS routes

router.stationlist = function(req, res) {
    var results = [];

    async.waterfall([
        function makeApiCall(callback) {
            request(options, function (err, res, body) {
                if (err) {
                    console.log(err);
                } else {
                    // read XML results into cheerio
                    //console.log("in else");
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
    }
        ], function (err, result) {
        callback("stations successfully inserted");
    });
    res.json("stations successfully inserted");
};

router.stationlistcheck = function(req, res) {
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
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }
    });
};

// DEPARTURES related

router.departures = function(req, res) {
    departures(req.body.data, function (data) {
        return res.json(data);
    });
};


router.departuresdb = function(req, res) {
    console.log("in departuresdb " + req.body.data);
    departures.depDb(req.body.data, function (data) {
        console.log("back from depDb + " + data.length);
        return res.json(data);
    });
};

router.departuresdbdelete = function(req, res) {
    console.log("in departuresdbdelete");
    pg.connect(connectionString, function(err, client, done) {
        // SQL Query > Select Data
        client.query('DELETE FROM departures', function(err, result) {
        //call `done()` to release the client back to the pool
            done();
            return res.json("successful deletion");
        });
    // Handle Errors
    if(err) {
        console.log(err);
    }
    });
};

router.departuresdbinsert = function(req, res) {
    console.log("in departuresdbinsert");
    var tempDay = new Date();
    var tempTimeStamp = tempDay.getTime();
    var departures = JSON.parse(req.body.data);
    var singlestation = req.body.singlestation;
    console.log("departures length is " + departures.length + " " + departures[0].stationid);
    console.log("single station? : " + singlestation);
    var deleteLength = 1;
    if (!singlestation) {
        deleteLength = departures.length;
    }
    
    console.log("departures[0].destination" + departures[0].destination);
    var db = pgp(connectionString);
    
    function factory(idx) {
        if (idx < req.body.datalength) {
            console.log("departures[idx].stationid " + departures[idx].stationid);
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
            //console.log("departures[idx].stationid " + departures[idx].stationid);
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
    return res.json("successfully inserted in departures db");
};


module.exports = router;