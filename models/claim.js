var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var ClaimSchema = mongoose.Schema({
    date: Date,
    amount: Number,
    provider: String,
    payment: Number,
    outcome: String,
    code: Number
})

module.exports = mongoose.model('Claim', ClaimSchema);