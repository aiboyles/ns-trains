var express = require('express');
var disruptions = require('../logic/disruptions');
var departures = require('../logic/departures');
var stations = require('../logic/stations');
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

router.index = function(req, res) {
  res.render('index', {
    title: 'NS Trein App'
  });
}

// DISRUPTIONS routes

// pulls disruptions from NS API
router.disruptions = function(req, res) {
    disruptions(function (data) {
        res.json(data);
    });
};

// pulls disruptions info from database
router.disruptionsdb = function(req, res) {
    disruptions.disruptionsdb(function (data) {
        res.json(data);
    });
};

// inserts provided disruptions info into database
router.disruptionsdbinsert = function(req, res) {
    disruptions.disruptionsdbinsert(req.body.data, function (data) {
        return res.json(data);
    });
};

// STATIONS routes

// grabs the full list of stations from NS API
router.stationlist = function(req, res) {
    stations(function (data) {
        return res.json(data);
    });
};

// checks the stationlist currently in the database to see if it is out of date
router.stationlistcheck = function(req, res) {
    stations.stationlistcheck(function (data) {
        return res.json(data);
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