var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Claim = require('../models/claim');

var PolicySchema = mongoose.Schema({
    type: String,
    description: String,
    claimLimit: Number,
    startDate: Date,
    endDate: Date,
    entitlements: Number,
    scope: String,
    amountClaimed: Number,
    percentCovered: Number,
    code: Number,
    claims: [Claim.schema]
})

module.exports = mongoose.model('Policy', PolicySchema);