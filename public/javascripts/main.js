// HELPER functions

// parses a timestamp from the NS API and format it for display
function parseTime(timeString) {
    var temp = timeString.substr(11, 5);
    if (temp[0] === '0') {
        temp = temp.substr(1, 4);
    }
    return temp;
}

// checks to see if a station code is in an array
function checkInArray(array, val) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].code == val)
            return i;
    }
    return -1;
}

// filters list of stations dynamically as the user types on keyboard
$(document).keyup(function (event) {
    var rex = new RegExp($('#filter').val(), 'i');
    $('.list-group-item').hide();
    $('.list-group-item').filter(function () {
        return rex.test($(this).text());
    }).show();
});

function oops(data) {
    console.log("ERROR");
}

// TAB POPULATING functions

// parses array of disruptions info and populates the disruptions tab
function parseDisruptionsData(data) {
    var glyphs = [];

    glyphs['unplanned'] = "<span class='glyphicon glyphicon-alert' aria-hidden='true'></span>";
    glyphs['planned'] = "<span class='glyphicon glyphicon-info-sign' aria-hidden='true'></span>";

    $('#disruptions-tab').html('');

    $('li#disruptionstab').html('<a data-toggle="tab" href="#disruptions-tab">Disruptions ' 
                                + '<span class="badge">' + data.length + '</span></a></li>');

    var appendDiv = "<div class='panel-group' id='accordion'>";

    for (var i = 0; i < data.length; i++) {
        var t = data[i].type,
            r = data[i].route,
            m = data[i].message;

        // add bootstrap accordion to disruptions tab
        appendDiv += "<div class='panel panel-default'><div class='panel-heading'>"
            + "<h3 class='panel-title'>" + "<a data-toggle='collapse' data-parent='#accordion' href='#collapsedis" 
            + i.toString() + "'>" + glyphs[t] + " " + r + "</a></h3></div><div id='collapsedis" 
            + i.toString() + "' class='panel-collapse collapse'>" + "<div class='panel-body'>" 
            + m + "</div></div></div>";
    };

    appendDiv += "</div>";
    $('#disruptions-tab').html(appendDiv);
}

// parses array of stations and populates the "add station" tab
function parseStationData(data) {
    $('#add-inner').html('');

    var appendDiv = "<div class='input group'><span class='input-group-addon'>Filter</span>" 
        + "<input id='filter' type='text' class='form-control' placeholder='Search...'></div>" 
        + "<div id='searchlist' class='list-group'>";

    // loop through the stations
    for (var i = 0; i < data.length; i++) {
        var n = data[i].name,
            c = data[i].code;

        // add bootstrap accordion to 'add stations' tab
        appendDiv += "<a href='#' class='list-group-item' id='" + c + "'>" + n + "</a>";
    };

    appendDiv += "</div>";
    $('#tab-3').html(appendDiv);
}

// has to populates the departures tab AND "edit" tab
function parseDeparturesData(data) {
    var cookies = getCookie();
    $('#tab-1').html('');
    $('#tab-2').html('');
    var appendDiv = "<div class='panel-group' id='accordion'>";
    var editDiv = "<button class='btn btn-danger' id='deletebutton' type='button'>Delete</button><hr>";
    var departuresLength = 10;

    for (var i = 0; i < cookies.length; i++) {
        var co = cookies[i].code,
            na = cookies[i].name;

        var depArray = $.grep(data, function (n, i) {
            return (n.stationid == co);
        });
        if (depArray.length < departuresLength) {
            departuresLength = depArray.length;
        }

        var str = '';
        var strHeading = '';
        var innerCount = 0;
        var routeStr = '';
        // putting together all of the departure times
        for (var j = 0; j < departuresLength; j++) {
            if (depArray[j].route !== "") {
                routeStr = "via " + depArray[j].route;
            } else {
                routeStr = '';
            }

            str += '<table style="border: 1px solid grey; width:100%; margin:2px">'
                + '<tr><td style="width:15%; padding-left:2px">' + '<table style="border:0px"><tr><td>' 
                + parseTime(depArray[j].departuretime) + '</td></tr><tr>' 
                + '<td style="color:#FF0000; background-color=#ffffff; font-size:10px">' + depArray[j].delay 
                + '</td></tr></table></td><td><table style="border:0px"><tr><td colspan=2><b>' 
                + depArray[j].destination + '</b></td></tr><tr><td style="color:#AFAFAF; background-color=#ffffff">' 
                + depArray[j].traintype 
                + '</td><td style="font-size:11px; color:#AFAFAF; background-color=#ffffff; padding-left:5px">' 
                + routeStr + '</td></tr></table></td>' 
                + '<td style="font-size: 18px; width:10%; padding-right:2px; text-align:right;';
            
            if (depArray[j].platformchange === "true") {
                str += ' color:#FF0000; background-color=#ffffff';
            }
            str += '">' + depArray[j].platform + '</td></tr></table>';

            if (innerCount < 3) {
                strHeading += '<tr><td style="text-align:left; width:15%">' 
                    + parseTime(depArray[j].departuretime) + '</td><td style="padding-left:2px">' 
                    + depArray[j].destination + '</td></tr>';
                if (depArray[j].delay !== "") {
                    strHeading += '<tr><td colspan="2" style="color:#FF0000; background-color=#ffffff; padding-left:10px">' 
                        + depArray[j].delay.substr(1, 10) + ' delayed</td></tr>';
                    innerCount++;
                }
                if (depArray[j].platformchange === "true") {
                    strHeading += '<tr><td colspan="2" style="color:#FF0000; background-color=#ffffff; padding-left:10px">' 
                        + 'Departs from platform ' + depArray[j].platform + '</td></tr>';
                    innerCount++;
                }

                innerCount++;
            }
        }

        // add bootstrap accordion to departures tab
        appendDiv += '<div class="panel panel-default" name="' + co + '">'
            + '<div class="panel-heading panel-custom"><h4 class="panel-title">' 
            + '<a data-toggle="collapse" data-parent="#accordion" href="#collapse' 
            + i.toString() + '">' + '<table style="width:100%"><tr><td style="padding-right:15px">' 
            + na + '</td><td style="width:50%">' + '<table border=0 style="width:100%; font-size:12px; content-align:right">' 
            + strHeading + '</table></td></tr></table>' + '</a></h4></div><div id="collapse' + i.toString() 
            + '" class="panel-collapse collapse">' + '<div class="panel-body" style="padding:2px; margin-top:0px">' 
            + str + '</div></div></div>';

        editDiv += '<div name=' + co + '><input type="checkbox" class="deletelist" name="' 
            + na + '" code="' + co + '"> ' + na + '<br></div>';
    };

    appendDiv += "</div>";
    if (cookies.length > 0) {
        $('#tab-1').html(appendDiv);
        $("#tab-2").html(editDiv);
    }
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
        data: {
            data: JSON.stringify(results, null, 2),
            datalength: results.length
        },
        success: callback,
        error: oops
    });
}

// DEPARTURES related
function checkDeparturesDb(callback) {
    $.ajax({
        type: 'POST',
        url: '../departuresdb',
        data: {
            data: document.cookie
        },
        success: callback,
        error: oops
    });
}

function populateDepartures(stationList, callback) {
    $.ajax({
        type: 'POST',
        url: '../departures',
        data: {
            data: JSON.stringify(stationList, null, 2)
        },
        success: callback,
        error: oops
    });
}

function insertDeparturesDb(results, single, callback) {
    $.ajax({
        type: 'POST',
        url: '../departuresdbinsert',
        data: {
            data: JSON.stringify(results, null, 2),
            singlestation: single,
            datalength: results.length
        },
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
function clearCookie() {
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].split('=');
        deleteCookie(c[0]);
    }
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
}

function setCookie(cname, cvalue1, cvalue2) {
    var d = new Date();
    d.setTime(d.getTime() + (1825 * 24 * 60 * 60 * 1000)); // expires in 5 years
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue1 + "; " + expires;
}

function getCookie() {
    var ca = document.cookie.split(';');
    var cookieArray = [];
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].split('=');
        var stationItem = {
            name: c[0],
            code: c[1]
        };
        cookieArray.push(stationItem);
    }
    return cookieArray;
}

function populateDeparturesFromCookie() {
    populateDepartures(getCookie(), function (dataFromApi) {
        parseDeparturesData(dataFromApi);
        insertDeparturesDb(dataFromApi, false, function (results) {
            console.log("inserted completed departures" + results);
        });
    });
}

function parseDepartureDbResults(data, departuresArray, callback) {
    var d = new Date();
    var cookies = getCookie();
    var count = 0;

    async.whilst(
        function () {
            return count < cookies.length;
        },
        function (callbackInner) {
            var co = cookies[count].code,
                na = cookies[count].name;

            // check to see if the station is in the departures db
            var checkDbEntryArray = $.grep(data, function (n, i) {
                return (n.stationid == co);
            });

            // if it is already in the departures db, then check if it is outdated or not
            if (checkDbEntryArray.length > 0) {
                if ((d.getTime() - checkDbEntryArray[0].timestamp) < 60000) {
                    departuresArray.push.apply(departuresArray, checkDbEntryArray);
                    count++;
                    callbackInner();
                } else {
                    var singleStation = new Array();
                    singleStation.push(cookies[count]);
                    populateDepartures(singleStation, function (dataFromApi) {
                        departuresArray.push.apply(departuresArray, dataFromApi);
                        count++;
                        callbackInner();
                        insertDeparturesDb(dataFromApi, true, function (results) {
                            console.log("inserted completed departures" + results);
                        });
                    });
                }
            } else {
                var singleStation = new Array();
                singleStation.push(cookies[count]);
                populateDepartures(singleStation, function (dataFromApi) {
                    departuresArray.push.apply(departuresArray, dataFromApi);
                    count++;
                    callbackInner();
                    insertDeparturesDb(dataFromApi, true, function (results) {
                        console.log("inserted completed departures" + results);
                    });
                });
            }
        },
        function (err) {
            callback(departuresArray);
        });
}



$(document).ready(function () {
    var d = new Date();
    var departuresArray = [];

    // check the departure times in the database
    checkDeparturesDb(function (data) {
        if (data.length > 0) {
            parseDepartureDbResults(data, departuresArray, function (data) {
                parseDeparturesData(data);
            });
        } else {
            populateDepartures(getCookie(), function (dataFromApi) {
                parseDeparturesData(dataFromApi);
                insertDeparturesDb(dataFromApi, false, function (results) {
                    console.log("inserted completed departures" + results);
                });
            });
        }
    });

    checkDisruptionsDb(function (data) {
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 120000)) {
            parseDisruptionsData(data);
        } else {
            populateDisruptions(function (data) {
                parseDisruptionsData(data);
                insertDisruptionsDb(data, function (results) {
                    console.log("insert COMPLETED" + results);
                });
            });
        }
    });

    checkStationList(function (data) {
        if ((data.length > 0) && ((d.getTime() - data[0].timestamp) < 86400000)) {
            parseStationData(data);
        } else {
            populateStationList(function (data) {
                parseStationData(data);
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
        $('#tab-1').prepend('<div style="font-size: 18px"><p>Refreshing...</p></div>');
        $('#tab-1').addClass('current');
        $('#filter').val('');
        $('.list-group-item').show();
        // TO FIX
        populateDeparturesFromCookie(function (data) {
            console.log("completed from cookie");
        });
    });

    // switches tabs in the inner nested tabs on click
    $('ul.tabs li').click(function () {
        var tab_id = $(this).attr('data-tab');
        $('ul.tabs li').removeClass('current');
        $('.sub-tab-content').removeClass('current');
        $(this).addClass('current');
        $("#" + tab_id).addClass('current');
    });

    // handles a click on the 'delete' button in the edit station tab
    $('div#tab-2').on('click', 'button.btn', function () {
        var checkArray = new Array();
        var codeArray = new Array();
        var count = 0;
        $('input[type=checkbox]').each(function () {
            console.log($(this).attr('code').trim());
            if ($(this).is(' :checked')) {
                console.log("name " + typeof ($(this).attr('name').trim()));
                checkArray[count] = $(this).attr('name').trim();
                codeArray[count] = $(this).attr('code').trim()
                count++;
            }
        });
        for (j = 0; j < checkArray.length; j++) {
            console.log("name is " + checkArray[j]);
            deleteCookie(checkArray[j]);
            var depTimesList = $('#tab-1 div[name=' + codeArray[j] + ']');
            var editList = $('#tab-2 div[name=' + codeArray[j] + ']');
            depTimesList.each(function () {
                console.log($(this));
                $(this).remove();
            });
            editList.each(function () {
                console.log($(this));
                $(this).remove();
            });
        }

        $('ul.tabs li').removeClass('current');
        $('.sub-tab-content').removeClass('current');
        $('[data-tab="tab-1"]').addClass('current');
        $('#tab-1').addClass('current');
    });

});