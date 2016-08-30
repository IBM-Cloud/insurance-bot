var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var LogSchema = mongoose.Schema({
	owner: String,
    date: Date,
    conversation: String,
	lastContext: {},
    logs: []
});

module.exports = mongoose.model('Log', LogSchema);