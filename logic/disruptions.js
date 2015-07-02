//includes
var util = require('util');
var config = require('../config');
var request = require('request');
var cheerio = require('cheerio');
var S = require('string');

var url = "https://webservices.ns.nl/ns-api-storingen?actual=true&unplanned=true";
var today = new Date();

var bodyResponse; 
var disruptions = [];
var iterator = 0;

var months = {'jan':'0', 'feb':'1', 'mrt':'2', 'apr':'3', 'mei':'4', 'jun':'5', 'jul':'6', 'aug':'7', 'sep':'8', 'okt':'9', 'nov':'10', 'dec':'11'};
var existingids = [];

var configValues = {
        username: config.gebruikers_naam,
        access_token: config.wachtwoord
};

var options = {
    url: url, //URL to hit
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

module.exports = function(callback) {
    console.log("I am in module.exports");

    
request(options, function (err, res, body) {
    if (err) {
        console.log(err);
    } else {
        console.log("success!");
        var $ = cheerio.load(body, {
          xmlMode: true
        });
        //console.log($('Ongepland Traject').text());
        $('Ongepland').children().each(function(i, elm) {
            //console.log($(this).text()); // for testing do text()
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
        
        $('Gepland').children().each(function(i, elm) {
            console.log("iterator value is " + iterator);
            console.log("I am in the child of " + $(this).find('Traject').text());
            var tempArray = ($(this).find('id').text()).split('_');
            var tempArray = tempArray.slice(-2);
            var startDateString = "";
            var startDate;
            //var rePattern = new RegExp(/\d/);
            var arrMatches = tempArray[0].match(/\d/g);
            // does the first item have any digits?
            if (arrMatches !== null) {
                // does it have any letters?
                if (tempArray[0].match(/[a-z](.*)/)) { // yes, it has letters and numbers
                    var tempNumString = "";
                    for (n = 0; n < tempArray[0].match(/\d/g).length; n++)
                    {
                        tempNumString += tempArray[0].match(/\d/g)[n];
                    }
                    startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + (Number(months[(tempArray[0].match(/[a-z](.*)/))[0]]) + 1)
                                        + '-' + tempNumString;
                    startDate = new Date(startDateString);
                }
                else { // take the month from the latter token
                    var tempMonth = (Number(months[(tempArray[1].match(/[a-z](.*)/))[0]]) + 1);
                    startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + tempMonth
                                        + '-' + (tempArray[0].match(/\d+/g))[0];
                
                    startDate = new Date(startDateString);
                }
            }
            else { // if the first item has no digits
                //console.log("id : " + $(this).find('id').text() + "tempArray[0] is : " + tempArray[0] + "tempArray[1] is : " + tempArray[1]);
                var tempMonth = (Number(months[(tempArray[1].match(/[a-z](.*)/))[0]]) + 1);
                startDateString = (($(this).find('id').text()).split('_'))[0] + '-' + tempMonth
                                        + '-' + (tempArray[1].match(/\d+/g))[0];
                startDate = new Date(startDateString);
                    //console.log("startDate is : " + startDate + " route is: " + $(this).find('Traject').text());
                
            }
            
            if ((startDate <= today) && (existingids.indexOf($(this).find('id').text()) < 0)) {
                console.log("id is " + $(this).find('id').text());
                console.log("existing ids is : " + existingids);
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
                console.log("i am adding this route : " + disruptions[iterator-1].route);
            }
        });
        console.log("iterator value is " + iterator + "disruptions.length is " + disruptions.length);
                                     for (j = 0; j < iterator; j++) {
            
                                         
                                         console.log(disruptions[j].type);
                                         console.log(disruptions[j].route);
            }
        
        //console.log("month is :" + today.getMonth() + "date is: " + today.getDate() + "day is: " + today.getDate());
    }
});
    
    setTimeout(function() {callback(disruptions); }, 2500);
}