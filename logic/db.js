var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/ns-trains'); 

var Schema = mongoose.Schema;

var Disruptions = new Schema({
    id         : String,
    timestamp   : Date,
    date        : Date,
    route       : String,
    message     : String
});