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
    title: 'NS Train App'
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
router.disruptionsdbinsert = function(req) {
    disruptions.disruptionsdbinsert(req.body.data);
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
    departures.departuresdb(req.body.data, function (data) {
        return res.json(data);
    });
};

router.departuresdbinsert = function(req) {
    departures.departuresdbinsert(req.body.data, req.body.singlestation);
};

module.exports = router;