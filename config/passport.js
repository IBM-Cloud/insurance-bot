const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
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

var dbb = "benefits";
var Benefits;

function initCloudant() {
    var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("insurance-cloudant").url;
    var Cloudant = require('@cloudant/cloudant')({
      url: cloudantURL,
      plugin: 'retry',
      retryAttempts: 10,
      retryTimeout: 500
    });

    // Create the benefits DB if it doesn't exist
    Cloudant.db.create(dbb, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dbb);
        } else {
            console.log("New database created: ", dbb);
        }
    });
    Benefits = Cloudant.use(dbb);
}


// =====================================
// EXPORT LOGIN & SIGNUP ===============
// =====================================
module.exports = function(passport,appEnv) {

    // Below URLs will be used for App ID OAuth flows
    const LANDING_PAGE_URL = "/health.html";
    const LOGIN_URL = "/login";
    const CALLBACK_URL = "/health"; // needs to be adapted eventually
    const LOGOUT_URL = "/logout";

    var bcrypt = require('bcrypt-nodejs');
    var AppIDCreds = appEnv.services.AppID[0].credentials;

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    passport.serializeUser(function(user, cb) {
      // extract only what we need from the App ID token
      var names=user.name.split(" ");
    	cb(null, {username: user.email, email: user.email, name: user.name, fname: names[0], lname: names[1]});
    });


    // used to deserialize the user
    passport.deserializeUser(function(user, done) {
      done(null, user);
    });

    passport.use(new WebAppStrategy({
    	tenantId: AppIDCreds.tenantId,
    	clientId: AppIDCreds.clientId,
    	secret: AppIDCreds.secret,
    	oauthServerUrl: AppIDCreds.oauthServerUrl,
    	redirectUri: appEnv.url + CALLBACK_URL
    }));



};
