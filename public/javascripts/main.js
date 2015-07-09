// functions for populating tabs

function parseData(data) {
    console.log("I'm in parseData");
    
    $('#disruptions-tab').html(''); 
    
    var myAppendTable = "<div class='panel-group' id='accordion'>";

        for (var i = 0; i < data.length; i++) {
            var t = data[i].type,
                r = data[i].route,
                m = data[i].message;
            
                // add bootstrap accordion to disruptions tab
                myAppendTable += "<div class='panel panel-default'><div class='panel-heading'><h4 class='panel-title'>"
                            + "<a data-toggle='collapse' data-parent='#accordion' href='#collapse" + i.toString() + "'>"
                            + r + "</a></h4></div><div id='collapse" + i.toString() + "' class='panel-collapse collapse'>"
                            + "<div class='panel-body'><p>" + m + "</div></div></div>";
            };
        
        myAppendTable += "</div>";
        $('#disruptions-tab').html(myAppendTable);
}

function parseStationData(data) {
    console.log("I'm in parseDataStation");
    
    $('#add-inner').html(''); 
    
    var myAppendTable = "<div class='input group'><span class='input-group-addon'>Filter</span>" +
                    "<input id='filter' type='text' class='form-control' placeholder='Search...'></div>"  +
            "<div id='searchlist' class='list-group'>";
    
    // loop through the disruptions
        for (var i = 0; i < data.length; i++) {
            var n = data[i].name,
                c = data[i].code;
            
                // add bootstrap accordion to disruptions tab
                myAppendTable += "<a href='#' class='list-group-item' id='" + c + "'>" + n + "</a>";
        };
        
        myAppendTable += "</div>";
        $('#tab-3').html(myAppendTable);
        //$('#searchlist').btsListFilter('#searchinput', {itemChild: 'span'});
}

function parseTime(timeString) {
    var temp = timeString.substr(11, 15);
    if (temp[0] == '0')
    {
        temp = temp.substr(1, 4);
    }
    return temp;
}

function parseDeparturesData(data) {
    console.log("I'm in populateDepartures");
    
    var cookies = getCookie();
    
    $('#tab-1').html(''); 
    
    var myAppendTable = "<div class='panel-group' id='accordion'>";

        for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i].code,
                n = cookies[i].name;
            
            var depArray = $.grep(data, function(n, i){
                        return (n.stationid == c);
                    });
            
            var str = ""
            for (var j = 0; j < depArray.length; j++) {
                str += parseTime(depArray[j].departuretime) + " " + n + " " + depArray[j].platform + "<br>";
            }
            
                // add bootstrap accordion to departures tab
                myAppendTable += "<div class='panel panel-default'><div class='panel-heading'><h4 class='panel-title'>"
                            + "<a data-toggle='collapse' data-parent='#accordion' href='#collapse" + i.toString() + "'>"
                            + "<table border=1 style='width:100%'><tr><td>" + n + "</td><td>"
                            + "<table border=0 style='width:100%'><tr><td style='text-align:right'>1 BALH</td></tr><tr><td style='text-align:right'>2 BLOB</td></tr>" 
                            + "<tr><td style='text-align:right'>3 BLIP</td></tr></table></td></tr></table>"
                            + "</a></h4></div><div id='collapse" + i.toString() + "' class='panel-collapse collapse'>"
                            + "<div class='panel-body'><p>" + str + "</p></div></div></div>";
            };
        
        myAppendTable += "</div>";
        $('#tab-1').html(myAppendTable);
}

// AJAX call functions

// DISRUPTIONS related
function checkDisruptionsDb(callback) {
    console.log("I'm in checkDisruptionsDb");
        $.ajax({
            type: 'GET',
            url: '../disruptionsdb',
            success: callback,
            error: oops
        });
}

function populateDisruptions(callback) {
    console.log("I'm in populateDisruptions");
        $.ajax({
            type: 'GET',
            url: '../disruptions',
            success: callback,
            error: oops
        });
}

function insertDisruptionsDb(results, callback) {
    console.log("I'm in insertDisruptionsDb");
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
    console.log("I'm in checkDeparturesDb");
        $.ajax({
            type: 'GET',
            url: '../departuresdb',
            success: callback,
            error: oops
        });
}

function populateDepartures(callback) {
    console.log("I'm in populateDepartures about to fire");
        $.ajax({
            type: 'POST',
            url: '../departures',
            data: {data: document.cookie},
            success: callback,
            error: oops
        });
}

function insertDeparturesDb(results, callback) {
    console.log("I'm in insertDeparturesDb and results is " + results);
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
    console.log("I'm in checkStationList");
        $.ajax({
            type: 'GET',
            url: '../stationlistcheck',
            success: callback,
            error: oops
        });
}

function populateStationList(callback) {
    console.log("I'm in populateStationlist");
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
        //var c = ca[i];
        var c = ca[i].split('=');
        deleteCookie(c[0]);
    }
}

function deleteCookie(name) {
    document.cookie = name +
        '=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
}

function setCookie(cname, cvalue1, cvalue2) {
    var d = new Date();
    d.setTime(d.getTime() + (1825*24*60*60*1000)); // expires in 5 years
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue1 + "; " + expires;
}

function getCookie() {
    //console.log("IN GET COOKIE");
    //var name = cname + "=";
    console.log("cookie is " + document.cookie);
    var ca = document.cookie.split(';');
    var cookieArray = [];
    for (var i=0; i< ca.length; i++) {
        //var c = ca[i];
        var c = ca[i].split('=');
        var stationItem = { code : c[0],
                            name : c[1] };
        cookieArray.push(stationItem);
        console.log("code is " + c[0].trim() + " station is " + c[1].trim());
        /*while (c.charAt(0)==' ') {
            c = c.substring(1);
            console.log("c is " + c);
        if (c.indexOf(name) == 0) {
            console.log("c.substring" + c.substring(name.length,c.length));
            return c.substring(name.length,c.length);
        }
        }*/
    }
    return cookieArray;
}

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

$(document).ready(function() {
        
    console.log("I'm in doc ready");
    var d = new Date();
    $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE');
    
    //populateDepartures();
    //clearCookie();
    
    checkDeparturesDb(function(data)
    {
        console.log("I'm in check departures");
        console.log("departures db is " + data);
        
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 120000)) {
                console.log("NOT outdated departures!");
                parseDeparturesData(data);
                //$('#disruptions').html('LOADINGLOADINGOUTSIDEHERE2');
        }
        else {
            console.log("YES outdated departures");
            populateDepartures(function(data)
            {
                console.log("I'm back from populate Departures " + data);
                parseDeparturesData(data);
                insertDeparturesDb(data, function(results) {
                    console.log("insert COMPLETED departures" + results);
                });
            });
        }
        $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE3');
    });
    
    
    checkDisruptionsDb(function(data)
    {
        //console.log("I'm in check disruptions");
        //console.log(data);
        
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 120000)) {
                //console.log("NOT outdated!");
                //$('#disruptions').html('LOADINGLOADINGOUTSIDEHERE');
                parseData(data);
                //console.log("I've now finished parseData");
                $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE2');
        }
        else {
            //console.log("YES outdated");
            populateDisruptions(function(data)
            {
                //console.log("I'm in popDisrup");
                parseData(data);
                insertDisruptionsDb(data, function(results) {
                    console.log("insert COMPLETED" + results);
                });
            });
        }
        $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE3');
    });
    
    checkStationList(function(data) {
        if ((d.getTime() - data[0].timestamp) < 86400000) {
            console.log("NOT outdated STATIONS!");
            parseStationData(data);
        }
        else {
            console.log("YES outdated STATIONS");
            populateStationList(function(data)
            {
                console.log("backfrom populateStationlist");
            });
        }
    });
    
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