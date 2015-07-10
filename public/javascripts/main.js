// helper functions
function parseTime(timeString) {
    var temp = timeString.substr(11, 15);
    if (temp[0] == '0')
    {
        temp = temp.substr(1, 4);
    }
    return temp;
}

// filters list of stations dynamically as user types
$(document).keyup(function(event) {
        var rex = new RegExp($('#filter').val(), 'i');
        $('.list-group-item').hide();
            $('.list-group-item').filter(function() {
                return rex.test($(this).text());
            }).show();
});

function oops(data) {
    console.log("OOPS");
}

// functions for populating tabs
function parseDisruptionsData(data) {
    $('#disruptions-tab').html(''); 
    var appendDiv = "<div class='panel-group' id='accordion'>";
    for (var i = 0; i < data.length; i++) {
        var t = data[i].type,
            r = data[i].route,
            m = data[i].message;
        // add bootstrap accordion to disruptions tab
        appendDiv += "<div class='panel panel-default'><div class='panel-heading'><h4 class='panel-title'>"
                + "<a data-toggle='collapse' data-parent='#accordion' href='#collapse" + i.toString() + "'>"
                + r + "</a></h4></div><div id='collapse" + i.toString() + "' class='panel-collapse collapse'>"
                + "<div class='panel-body'><p>" + m + "</div></div></div>";
    };
        
    appendDiv += "</div>";
    $('#disruptions-tab').html(appendDiv);
}

function parseStationData(data) {
    $('#add-inner').html(''); 
    
    var appendDiv = "<div class='input group'><span class='input-group-addon'>Filter</span>"
                    + "<input id='filter' type='text' class='form-control' placeholder='Search...'></div>"
                    + "<div id='searchlist' class='list-group'>";
    
    // loop through the disruptions
    for (var i = 0; i < data.length; i++) {
        var n = data[i].name,
            c = data[i].code;
            
        // add bootstrap accordion to disruptions tab
        appendDiv += "<a href='#' class='list-group-item' id='" + c + "'>" + n + "</a>";
    };
        
    appendDiv += "</div>";
    $('#tab-3').html(appendDiv);
}

function parseDeparturesData(data) {
    var cookies = getCookie();
    $('#tab-1').html(''); 
    var appendDiv = "<div class='panel-group' id='accordion'>";
    
    for (var i = 0; i < cookies.length; i++) {
        var co = cookies[i].code,
            na = cookies[i].name;
            
        var depArray = $.grep(data, function(n, i) {
                        console.log("n.stationid is " + n.stationid);
                        return (n.stationid == co);
                    });

        var str = "";
        for (var j = 0; j < depArray.length; j++) {
            str += parseTime(depArray[j].departuretime) + " " + na + " " + depArray[j].platform + "<br>";
        }
            
        // add bootstrap accordion to departures tab
        appendDiv += "<div class='panel panel-default'><div class='panel-heading'><h4 class='panel-title'>"
                    + "<a data-toggle='collapse' data-parent='#accordion' href='#collapse" + i.toString() + "'>"
                    + "<table border=1 style='width:100%'><tr><td>" + na + "</td><td>"
                    + "<table border=0 style='width:100%'><tr><td style='text-align:right'>1 BALH</td></tr><tr><td style='text-align:right'>2 BLOB</td></tr>" 
                    + "<tr><td style='text-align:right'>3 BLIP</td></tr></table></td></tr></table>"
                    + "</a></h4></div><div id='collapse" + i.toString() + "' class='panel-collapse collapse'>"
                    + "<div class='panel-body'><p>" + str + "</p></div></div></div>";
    };
        
    appendDiv += "</div>";
    $('#tab-1').html(appendDiv);
}

// AJAX call functions

// DISRUPTIONS related
function checkDisruptionsDb(callback) {
    $.ajax({
        type: 'GET',
        url: '../disruptionsdb',
        success: callback,
        error: oops
    });
}

function populateDisruptions(callback) {
    $.ajax({
        type: 'GET',
        url: '../disruptions',
        success: callback,
        error: oops
    });
}

function insertDisruptionsDb(results, callback) {
    $.ajax({
        type: 'POST',
        url: '../disruptionsdbinsert',
        data: {results : results,
               resultslength: results.length},
        success: callback,
        error: oops
    });
}

// DEPARTURES related

function checkDeparturesDb(callback) {
    $.ajax({
        type: 'GET',
        url: '../departuresdb',
        success: callback,
        error: oops
    });
}

function populateDepartures(callback) {
    $.ajax({
        type: 'POST',
        url: '../departures',
        data: {data: document.cookie},
        success: callback,
        error: oops
    });
}

function insertDeparturesDb(results, callback) {
    $.ajax({
        type: 'POST',
        url: '../departuresdbinsert',
        data: {results : results,
               resultslength: results.length},
        success: callback,
        error: oops
    });
}

// STATIONS related

function checkStationList(callback) {
    $.ajax({
        type: 'GET',
        url: '../stationlistcheck',
        success: callback,
        error: oops
    });
}

function populateStationList(callback) {
    $.ajax({
        type: 'GET',
        url: '../stationlist',
        success: callback,
        error: oops
    });
}

// COOKIE related functions

function clearCookie(){
    var ca = document.cookie.split(';');
    for (var i=0; i< ca.length; i++) {
        var c = ca[i].split('=');
        deleteCookie(c[0]);
    }
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
}

function setCookie(cname, cvalue1, cvalue2) {
    var d = new Date();
    d.setTime(d.getTime() + (1825*24*60*60*1000)); // expires in 5 years
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue1 + "; " + expires;
}

function getCookie() {
    var ca = document.cookie.split(';');
    var cookieArray = [];
    for (var i=0; i< ca.length; i++) {
        var c = ca[i].split('=');
        var stationItem = { name : c[0],
                            code : c[1] };
        cookieArray.push(stationItem);
    }
    return cookieArray;
}

$(document).ready(function() {
    var d = new Date();
    
    checkDeparturesDb(function(data)
    {
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 120000)) {
                parseDeparturesData(data);
        }
        else { // yes, the departure entries in the database are outdated
            populateDepartures(function(data)
            {
                parseDeparturesData(data);
                insertDeparturesDb(data, function(results) {
                    console.log("insert COMPLETED departures" + results);
                });
            });
        }
    });
    
    checkDisruptionsDb(function(data)
    {
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 120000)) {
                parseDisruptionsData(data);
        }
        else {
            populateDisruptions(function(data)
            {
                parseDisruptionsData(data);
                insertDisruptionsDb(data, function(results) {
                    console.log("insert COMPLETED" + results);
                });
            });
        }
    });
    
    checkStationList(function(data) {
        if ((d.getTime() - data[0].timestamp) < 86400000) {
            parseStationData(data);
        }
        else {
            populateStationList(function(data)
            {
                console.log("backfrom populateStationlist");
            });
        }
    });
    
    // switches tabs once a station is selected on the "add stations" tab
    $("div#departures").on('click', 'a.list-group-item', function () {
        console.log("CLICKED " + $(this).text() + " code " + $(this).attr('id'));
        setCookie($(this).text(), $(this).attr('id'));
        $('ul.tabs li').removeClass('current');
		$('.sub-tab-content').removeClass('current');
        $('[data-tab="tab-1"]').addClass('current');
		$('#tab-1').addClass('current');
        $('#filter').val('');
        $('.list-group-item').show();
    });
    
    $('ul.tabs li').click(function(){
		var tab_id = $(this).attr('data-tab');
		$('ul.tabs li').removeClass('current');
		$('.sub-tab-content').removeClass('current');
		$(this).addClass('current');
		$("#"+tab_id).addClass('current');
	});

});