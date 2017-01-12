var LocalStrategy = require('passport-local').Strategy;
var cfenv = require('cfenv');
var fs = require('fs');

// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};

fs.stat('./vcap-local.json', function(err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        console.log('No vcap-local.json');
        initializeAppEnv();
    } else if (err) {
        console.log('Error retrieving local vcap: ', err.code);
    } else {
        vcapLocal = require("../vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
        appEnvOpts = {
            vcap: vcapLocal
        };
        initializeAppEnv();
    }
});

// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv = cfenv.getAppEnv(appEnvOpts);

    if (appEnv.isLocal) {
        require('dotenv').load();
    }

    if (appEnv.services.cloudantNoSQLDB) {
        initCloudant();
    } else {
        console.error("No Cloudant service exists.");
    }
}

// =====================================
// CLOUDANT SETUP ======================
// =====================================
var dba = "account";
var dbb = "benefits";
var Account, Benefits;

function initCloudant() {
    var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("insurance-cloudant").url;
    var Cloudant = require('cloudant')({
      url: cloudantURL,
      plugin: 'retry',
      retryAttempts: 10,
      retryTimeout: 500
    });

    // Create the accounts DB if it doesn't exist
    Cloudant.db.create(dba, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dba);
        } else {
            console.log("New database created: ", dba);
        }
    });
    Cloudant.db.create(dbb, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dbb);
        } else {
            console.log("New database created: ", dbb);
        }
    });
    Account = Cloudant.use(dba);
    Benefits = Cloudant.use(dbb);
}


// =====================================
// POLICY DEFAULTS =====================
// =====================================
function createPolicies(account) {

    var eyeWear = {};
    eyeWear.type = 'vision';
    eyeWear.icon = 'eyewear';
    eyeWear.title = 'eye wear';
    eyeWear.description = 'Glasses, contact lens, laser treatment, etc';
    eyeWear.claimLimit = 300;
    eyeWear.percentCovered = 80;
    eyeWear.amountClaimed = 0;
    eyeWear.scope = 'bi-annual';
    eyeWear.startDate = new Date(2016, 1, 1);
    eyeWear.endDate = new Date(2017, 12, 31);
    eyeWear.code = 100;
    eyeWear.claims = [];

    var eyeExam = {};
    eyeExam.type = 'vision';
    eyeExam.icon = 'eyeexam';
    eyeExam.title = 'eye exam';
    eyeExam.description = 'Eye examinations';
    eyeExam.claimLimit = 100;
    eyeExam.percentCovered = 100;
    eyeExam.amountClaimed = 0;
    eyeExam.entitlements = 1;
    eyeExam.scope = 'bi-annual';
    eyeExam.startDate = new Date(2016, 1, 1);
    eyeExam.endDate = new Date(2017, 12, 31);
    eyeExam.code = 200;
    eyeExam.claims = [];

    var teethCleaning = {};
    teethCleaning.type = 'dental';
    teethCleaning.icon = 'toothbrush';
    teethCleaning.title = 'teeth cleaning';
    teethCleaning.description = 'Teeth Cleaning';
    teethCleaning.claimLimit = 500;
    teethCleaning.percentCovered = 75;
    teethCleaning.amountClaimed = 0;
    teethCleaning.entitlements = 2;
    teethCleaning.scope = 'annual';
    teethCleaning.startDate = new Date(2016, 1, 1);
    teethCleaning.endDate = new Date(2016, 12, 31);
    teethCleaning.code = 300;
    teethCleaning.claims = [];

    var orthodontics = {};
    orthodontics.type = 'dental';
    orthodontics.icon = 'braces';
    orthodontics.title = 'orthodontics';
    orthodontics.description = 'Orthodontics';
    orthodontics.claimLimit = 2000;
    orthodontics.percentCovered = 80;
    orthodontics.amountClaimed = 0;
    orthodontics.entitlements = 100;
    orthodontics.scope = 'lifetime';
    orthodontics.startDate = new Date(2016, 1, 1);
    orthodontics.endDate = new Date(2036, 1, 1);
    orthodontics.code = 400;
    orthodontics.claims = [];

    var teethRepair = {};
    teethRepair.type = 'dental';
    teethRepair.icon = 'tooth';
    teethRepair.title = 'tooth repair';
    teethRepair.description = 'Teeth repair - fillings, chipped teeth';
    teethRepair.claimLimit = 2000;
    teethRepair.percentCovered = 80;
    teethRepair.amountClaimed = 0;
    teethRepair.entitlements = 100;
    teethRepair.scope = 'annual';
    teethRepair.startDate = new Date(2016, 1, 1);
    teethRepair.endDate = new Date(2016, 12, 31);
    teethRepair.code = 500;
    teethRepair.claims = [];

    var mentalHealth = {};
    mentalHealth.type = 'mental';
    mentalHealth.icon = 'talk';
    mentalHealth.title = 'psychologist';
    mentalHealth.description = 'Psychologist';
    mentalHealth.claimLimit = 1400;
    mentalHealth.percentCovered = 70;
    mentalHealth.amountClaimed = 0;
    mentalHealth.entitlements = 100;
    mentalHealth.scope = 'annual';
    mentalHealth.startDate = new Date(2016, 1, 1);
    mentalHealth.endDate = new Date(2016, 12, 31);
    mentalHealth.code = 600;
    mentalHealth.claims = [];

    var physio = {};
    physio.type = 'physical';
    physio.icon = 'body';
    physio.title = 'physiotherapy';
    physio.description = 'Physiotherapy';
    physio.claimLimit = 800;
    physio.percentCovered = 60;
    physio.amountClaimed = 0;
    physio.entitlements = 100;
    physio.scope = 'annual';
    physio.startDate = new Date(2016, 1, 1);
    physio.endDate = new Date(2016, 12, 31);
    physio.code = 800;
    physio.claims = [];

    var chiropractor = {};
    chiropractor.type = 'physical';
    chiropractor.icon = 'spine';
    chiropractor.title = 'chiropractor';
    chiropractor.description = 'Chiropractic Services';
    chiropractor.claimLimit = 400;
    chiropractor.percentCovered = 50;
    chiropractor.amountClaimed = 0;
    chiropractor.entitlements = 100;
    chiropractor.scope = 'annual';
    chiropractor.startDate = new Date(2016, 1, 1);
    chiropractor.endDate = new Date(2016, 12, 31);
    chiropractor.code = 700;
    chiropractor.claims = [];

    var healthBenefits = {};
    healthBenefits._id = account;
    healthBenefits.owner = account;
    healthBenefits.policies = [];
    healthBenefits.policies.push(eyeWear);
    healthBenefits.policies.push(eyeExam);
    healthBenefits.policies.push(teethCleaning);
    healthBenefits.policies.push(orthodontics);
    healthBenefits.policies.push(teethRepair);
    healthBenefits.policies.push(mentalHealth);
    healthBenefits.policies.push(chiropractor);
    healthBenefits.policies.push(physio);

    Benefits.insert(healthBenefits, function(err) {
        if (err) {
            throw err;
        }
    });
}

// =====================================
// EXPORT LOGIN & SIGNUP ===============
// =====================================
module.exports = function(passport) {

    var bcrypt = require('bcrypt-nodejs');

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    // used to deserialize the user
    passport.deserializeUser(function(username, done) {
        Account.find({
            selector: {
                username: username
            }
        }, function(err, result) {
            if (err) {
                return done(err);
            }
            var user = result.docs[0];
            done(null, user);
        });
    });

    passport.use('local-login', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {

            console.log("Got login request");

            // Use Cloudant query to find the user
            Account.find({
                selector: {
                    'username': username
                }
            }, function(err, result) {
                if (err) {
                    console.log("There was an error finding the user: " + err);
                    return done(null, null, err);
                }
                if (result.docs.length === 0) {
                    console.log("Username was not found");
                    return done(null, false, "Username or password incorrect.");
                }

                // user was found, now determine if password matches
                var user = result.docs[0];
                if (bcrypt.compareSync(password, user.password)) {
                    console.log("Password matches");
                    return done(null, user, null);
                } else {
                    console.log("Password is not correct");
                    return done(null, null, "Username or password incorrect.");
                }
            });
        }
    ));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
    passport.use('local-signup', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {
            console.log('Signup for: ', username);

            var firstName = req.body.fname;
            var lastName = req.body.lname;

            // Use Cloudant query to find the user just based on user name
            Account.find({
                selector: {
                    'username': username
                }
            }, function(err, result) {
                if (err) {
                    console.log("There was an error registering the user: " + err);
                    return done(null, null, err);
                } else if (result.docs.length > 0) {
                    console.log("Username was found");
                    return done(null, null, "User already exists. User another username address.");
                }

                // create the new user
                var hash_pass = bcrypt.hashSync(password);
                var user = {
                    "_id": username,
                    "username": username,
                    "password": hash_pass,
                    "fname": firstName,
                    "lname": lastName
                };

                Account.insert(user, function(err, body) {
                    if (err) {
                        console.log("There was an error registering the user: " + err);
                        return done(null, null, err);
                    } else {
                        console.log("User successfully registered.");
                        createPolicies(username);
                        // successful creation of the user
                        return done(null, user, null);
                    }
                });
            });
        }
    ));
};
