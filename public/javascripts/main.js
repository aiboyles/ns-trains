function parseData(data) {
    console.log("I'm in parseData");
    console.log(data);
    console.log(data);
    
    $('#disruptions').html(''); 
    
    var myAppendTable = "<div class='panel-group' id='accordion'>";
    
    // loop through the disruptions
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
        $('#disruptions').append(myAppendTable);
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

$(document).ready(function() {
        
    console.log("I'm in doc ready");
    var d = new Date();
    
    checkDisruptionsDb(function(data)
    {
        console.log("I'm in check disruptions");
        console.log(data);
        if ((d.getTime() - data[0].timestamp) < 120000) {
            console.log("NOT outdated!");
            parseData(data);
        }
        else {
            console.log("YES outdated");
            populateDisruptions(function(data)
            {
                console.log("I'm in popDisrup");
                parseData(data);
                insertDisruptionsDb(data, function(results) {
                    console.log("insert COMPLETED");
                });
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