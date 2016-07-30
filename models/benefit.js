var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Policy = require('../models/policy');

var BenefitSchema = mongoose.Schema({
    owner: String,
    address: {
        street: String,
        town: String,
        state: String,
        zipcode: String,
        country: String
    },
    policies: [Policy.schema]
});

module.exports = mongoose.model('Benefit', BenefitSchema);