var express = require('express');
var disruptions = require('../logic/disruptions');
var router = express.Router();

router.index = function(req, res) {
  res.render('index', {
    title: 'NS Trein App'
  });
}

router.disruptions = function(req, res) {
    disruptions(function (data) {
        res.json(data);
    });
};

module.exports = router;