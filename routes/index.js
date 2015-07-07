var express = require('express');
var disruptions = require('../logic/disruptions');
var router = express.Router();
var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/annboyles';
var pgpLib = require('pg-promise');
var pgp = pgpLib();
var promise = require('bluebird');

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
}
/*
router.disruptionsdbread = function(req, res) {

    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM disruptions ORDER BY id ASC;");

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