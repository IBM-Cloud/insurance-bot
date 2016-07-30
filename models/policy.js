var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Claim = require('../models/claim');

var PolicySchema = mongoose.Schema({
    type: String,
    description: String,
    claimLimit: Number,
    startDate: Date,
    endDate: Date,
    amountClaimed: Number,
    percentCovered: Number,
    claims: [Claim.schema]
})

module.exports = mongoose.model('Policy', PolicySchema);