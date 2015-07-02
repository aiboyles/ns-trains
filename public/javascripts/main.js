function parseData(data) {
    console.log("in parseData");
    console.log(data);
    
    $('#disruptions').html(''); 
    
    var myAppendTable = "<div class='panel-group' id='accordion'>";
    
    // loop through the analyzed speakers
        for (var i = 0; i < data.length; i++) {
            var t = data[i].type,
                d = data[i].date,
                p = data[i].period,
                r = data[i].route,
                re = data[i].reason,
                a = data[i].advice,
                m = data[i].message;
                console.log("t =" + t + "r = " + r + "re = " + re);
            
                // add html table to main page
                myAppendTable += "<div class='panel panel-default'><div class='panel-heading'><h4 class='panel-title'>"
                            + "<a data-toggle='collapse' data-parent='#accordion' href='#collapse" + i.toString() + "'>"
                            + r + "</a></h4></div><div id='collapse" + i.toString() + "' class='panel-collapse collapse'>"
                            + "<div class='panel-body'><p>" + p + "</p><p>" + m + "</div></div></div>";
        };
        
        myAppendTable += "</div>";
        $('#disruptions').append(myAppendTable);
}

function oops(data) {
    console.log("OOPS");
}

// sends an AJAX call to the search route
function populateDisruptions() {
        $.ajax({
            type: 'GET',
            url: '../disruptions',
            success: parseData,
            error: oops
        });
}

$(document).ready(function() {
        
    populateDisruptions();
        // tab behavior
    $(".tabs-menu a").click(function(event) {
        event.preventDefault();
        $(this).parent().addClass("current");
        $(this).parent().siblings().removeClass("current");
        var tab = $(this).attr("href");
        $(".tab-content").not(tab).css("display", "none");
        $(tab).fadeIn();
    });

});