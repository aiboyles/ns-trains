function parseData(data) {
    console.log("I'm in parseData");
    console.log(data);
    //console.log(data);
    
    $('#disruptions-tab').html('LOADINGLOADING'); 
    
    $('#trip-planner').html('TRALALALALLAAAAA');
    
    $('#departures').html('bblumbllkdlkj');
    
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
            console.log("in loop " + i);
            };
        
        //console.log(myAppendTable);
        myAppendTable += "</div>";
        console.log(myAppendTable);
        $('#disruptions-tab').html(myAppendTable);
    
        console.log("I've now appended it");
        /*$('li[id=disruptionstab]').html('');
        var tabAppend = "<a data-toggle='tab' href='#disruptions'>Disruptions <span class='badge badge-info'>"
                            + data.length + "</span></a>";
    
        $('li[id=disruptionstab]').html(tabAppend);*/
}

function parseStationData(data) {
    console.log("I'm in parseDataStation");
    //console.log(data);
    //console.log(data);
    
    $('#disruptions').html(''); 
    
    var myAppendTable = "<div class='list-group'>";
    
    // loop through the disruptions
        for (var i = 0; i < data.length; i++) {
            var n = data[i].name,
                c = data[i].code;
            
                // add bootstrap accordion to disruptions tab
                myAppendTable += "<a href='#' class='list-group-item'>" + n + "</a>";
        };
        
        myAppendTable += "</div>";
        $('#edit').append(myAppendTable);
}

function oops(data) {
    console.log("OOPS");
}

// sends an AJAX call to the disruptions route
function populateDisruptions(callback) {
    console.log("I'm in populateDisruptions");
        $.ajax({
            type: 'GET',
            url: '../disruptions',
            success: callback,
            error: oops
        });
}

function checkDisruptionsDb(callback) {
    console.log("I'm in checkDisruptionsDb");
        $.ajax({
            type: 'GET',
            url: '../disruptionsdb',
            success: callback,
            error: oops
        });
}

function checkStationList(callback) {
    console.log("I'm in checkStationList");
        $.ajax({
            type: 'GET',
            url: '../stationlistcheck',
            success: callback,
            error: oops
        });
}

function insertDisruptionsDb(results, callback) {
    console.log("I'm in insertDisruptionsDb");
    console.log("data is: " + results[0].route);
        $.ajax({
            type: 'POST',
            url: '../disruptionsdbinsert',
            data: {results : results,
                   resultslength: results.length},
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

$(document).ready(function() {
        
    console.log("I'm in doc ready");
    var d = new Date();
    $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE');
    
    checkDisruptionsDb(function(data)
    {
        console.log("I'm in check disruptions");
        console.log(data);
        
        
        if ((d.getTime() - data[0].timestamp) < 120000) {
            console.log("NOT outdated!");
            $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE');
            parseData(data);
            console.log("I've now finished parseData");
            $('#disruptions').html('LOADINGLOADINGOUTSIDEHERE2');
        }
        else {
            console.log("YES outdated");
            populateDisruptions(function(data)
            {
                console.log("I'm in popDisrup");
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

    /*
    populateDisruptions(function(data)
    {
        console.log("I'm in document ready");
        parseData(data);                
    });
        // tab behavior
    $(".nav-tabs a").click(function(event) {
        event.preventDefault();
        $(this).parent().addClass("active");
        $(this).parent().siblings().removeClass("active");
        var tab = $(this).attr("href");
        $(".tab-content").not(tab).css("display", "none");
        $(tab).fadeIn();
    });*/

});