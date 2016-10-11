// server.js
// set up ======================================================================
// get all the tools we need
var express = require('express');
var app = express();
var cfenv = require('cfenv');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var request = require('request');
var io = require('socket.io')();
var watson = require('watson-developer-cloud');

require('./config/passport')(passport);

var Account = require('./models/account');
var Benefits = require('./models/benefit');
var chatbot = require('./bot.js');

var Log = require('./models/log');

// configuration ===============================================================
// load local VCAP configuration
var vcapLocal = null
try {
    vcapLocal = require("./vcap-local.json");
    console.log("Loaded local VCAP", vcapLocal);
} catch (e) {
    console.error(e);
}

// get the app environment from Cloud Foundry, defaulting to local VCAP
var appEnvOpts = vcapLocal ? {
    vcap: vcapLocal
} : {}
var appEnv = cfenv.getAppEnv(appEnvOpts);

var appName;
if (appEnv.isLocal) {
    require('dotenv').load();
}
var catalog_url = process.env.CATALOG_URL;
var orders_url = process.env.ORDERS_URL;
console.log("Catalog URL is", catalog_url);
console.log("Orders URL is", orders_url);

var mongoDbUrl, mongoDbOptions = {};
var mongoDbCredentials = appEnv.getServiceCreds("insurance-bot-db") || appEnv.services["compose-for-mongodb"][0].credentials;
if (mongoDbCredentials) {
    var ca = [new Buffer(mongoDbCredentials.ca_certificate_base64, 'base64')];
    mongoDbUrl = mongoDbCredentials.uri;
    mongoDbOptions = {
        mongos: {
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            poolSize: 1,
            reconnectTries: 1
        }
    };
} else if (process.env.MONGODB_URL) {
    mongoDbUrl = process.env.MONGODB_URL;
} else {
    console.error("No MongoDB connection configured!");
}
console.log("Connecting to", mongoDbUrl);
mongoose.connect(mongoDbUrl, mongoDbOptions); // connect to our database

app.use(express.static(__dirname + '/public'));

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

app.set('view engine', 'html');

// required for passport
app.use(session({
    secret: 'ana-insurance-bot',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

var bcrypt = require('bcrypt-nodejs');

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/login');
}

app.get('/login', function(req, res) {
    res.sendfile('./public/login.html');
});

// process the login form
app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/loginSuccess', // redirect to the secure profile section
    failureRedirect: '/loginFailure', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
}));

app.get('/loginSuccess', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        username: req.user.local.email,
        fname: req.user.local.fname,
        lname: req.user.local.lname,
        outcome: 'success'
    }, null, 3));
})

app.get('/loginFailure', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        outcome: 'failure'
    }, null, 3));
})

app.get('/signupSuccess', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        username: req.user.local.email,
        fname: req.user.local.fname,
        lname: req.user.local.lname,
        outcome: 'success'
    }, null, 3));
})

app.get('/signupFailure', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        outcome: 'failure'
    }, null, 3));
})

app.get('/isLoggedIn', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var result = {
        outcome: 'failure'
    };

    if (req.isAuthenticated()) {
        result.outcome = 'success';
        result.username = req.user.local.email;
        result.fname = req.user.local.fname;
        result.lname = req.user.local.lname;
    }

    res.send(JSON.stringify(result, null, 3));
})

// =====================================
// SIGNUP ==============================
// =====================================
// show the signup form

app.get('/signup', function(req, res) {
    res.sendfile('./public/signup.html');
});

// process the signup form
app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/signupSuccess', // redirect to the secure profile section
    failureRedirect: '/signupFailure', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
}));

// =====================================
// CLAIMS ==============================
// =====================================
// show the signup form

app.get('/claims', isLoggedIn, function(req, res) {
    res.sendfile('./public/claims.html');
});

app.get('/history', isLoggedIn, function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    Benefits.findOne({
        owner: req.user.local.email
    }, function(err, doc) {

        var allclaims = [];

        doc.policies.forEach(function(policy) {

            if (policy.claims.length > 0) {
                policy.claims.forEach(function(claim) {
                    var detailedclaim = new Object();
                    detailedclaim.date = claim.date;
                    detailedclaim.amount = claim.amount;
                    detailedclaim.provider = claim.provider;
                    detailedclaim.payment = claim.payment;
                    detailedclaim.outcome = claim.outcome;
                    detailedclaim.policy = policy.title;
                    detailedclaim.icon = policy.icon;
                    allclaims.push(detailedclaim);
                })
            }
        })

        var output = {
            owner: req.user.local.email,
            fname: req.user.local.fname,
            lname: req.user.local.lname,
            claims: allclaims
        };

        var responseString = JSON.stringify(output, null, 3);

        console.log(responseString);

        res.send(responseString);
    })
});


// submit a claim
app.post('/submitClaim', function(req, res) {

    var claim = req.body;

    if (req.isAuthenticated()) {
        Benefits.findOne({
            owner: req.user.local.email
        }, function(err, doc) {

            doc.policies.forEach(function(policy) {

                if (policy.title === claim.benefit) {

                    /* default */

                    claim.outcome = 'DENIED';
                    claim.payment = 0;

                    var possibleEligibility = claim.amount * policy.percentCovered / 100;

                    var amountAvailable = policy.claimLimit - policy.amountClaimed;

                    console.log('eligibility: ' + possibleEligibility);
                    console.log('available: ' + amountAvailable);

                    if (policy.amountClaimed > amountAvailable && amountAvailable > 0) {
                        claim.outcome = 'PARTIAL';
                        claim.payment = policy.Limit - policy.amountClaimed;
                        policy.amountClaimed = policy.Limit;
                    }

                    if (possibleEligibility < amountAvailable) {
                        claim.outcome = 'FULL';
                        claim.payment = possibleEligibility;
                        policy.amountClaimed = policy.amountClaimed + possibleEligibility;
                    }

                    policy.claims.push(claim);

                    doc.save(function(err) {

                        res.setHeader('Content-Type', 'application/json');

                        var result = {
                            outcome: 'failure'
                        };

                        if (err) {
                            throw err;
                        } else {
                            result.outcome = 'success';
                        }

                        var responseString = JSON.stringify(result, null, 3);
                        res.send(responseString);
                    });
                }
            });
        });
    }
});


// =====================================
// PROFILE SECTION =====================
// =====================================
// we will want this protected so you have to be logged in to visit
// we will use route middleware to verify this (the isLoggedIn function)

app.get('/profile', isLoggedIn, function(req, res) {
    res.sendfile('./public/index.html');
});

app.get('/health', function(req, res) {
    req.session.lastPage = "/health";

    if (req.isAuthenticated()) {
        res.sendfile('./public/health.html');
    } else {
        res.sendfile('./public/login.html');
    }

});

app.get('/soon', function(req, res) {
    res.sendfile('./public/soon.html');
});

app.get('/about', function(req, res) {
    res.redirect("https://github.com/IBM-Bluemix/insurance-bot/wiki");
});

app.get('/healthBenefits', isLoggedIn, function(req, res) {

    res.setHeader('Content-Type', 'application/json');

    if (req.session.userPolicy) {
        res.send(JSON.stringify(req.session.userPolicy, null, 3));
    } else {
        getUserPolicy(req, function(err, doc) {
            if (err) {
                res.send(err);
            } else {
                res.send(JSON.stringify(doc, null, 3));
            }
        });
    }
});

function getUserPolicy(req, callback) {

    Benefits.findOne({
        owner: req.user.local.email
    }, function(err, doc) {
        if (err) {
            console.error("Error retrieving user policy: ", err);
            return callback(err);
        } else {
            req.session.userPolicy = doc;
            return callback(null, doc);
        }
    });
}

// =====================================
// LOGOUT ==============================
// =====================================

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/', function(req, res) {
    req.session.lastPage = "/";

    res.render('index.html');
});


// =====================================
// WATSON TRADEOFF TRAVEL ==============
// =====================================

function makePostRequest(payload, url, res) {
    var options = {
        body: payload,
        json: true,
        url: url
    };

    request.post(options, function(err, response) {
        if (err) {
            return res.json(err);
        } else {
            return res.json(response.body);
        }
    });
}

/**
 * Constructs a URL for an insurance microservice
 */

// Allow clients to make policy tradeoff calculations
app.post('/api/tradeoff', function(req, res, next) {
    return makePostRequest(req.body, catalog_url + '/tradeoff', res);
});

// Allow clients to create new policy orders
app.post('/api/orders', function(req, res, next) {
    return makePostRequest(req.body, orders_url + '/orders', res);
});

// =====================================
// WATSON CONVERSATION FOR ANA =========
// =====================================
app.post('/api/ana', function(req, res) {
    if (!req.body.context || !req.body.context.system) {
        getUserPolicy(req, function(err, doc) {
            if (err) {
                res.send(err);
            } else {
                req.session.userPolicy = doc;
            }
        });
    }

    chatbot.sendMessage(req, function(err, data) {
        if (err) {
            console.log("Error in sending message: ", err);
            return res.status(err.code || 500).json(err);
        } else {

            Log.findOne({
                'conversation': req.body.conversation_id
            }, function(err, doc) {
                if (err) {
                    console.log("Cannot find log for conversation id of ", req.body.conversation_id);
                } else {
                    console.log("Sending log updates to dashboard");
                    io.sockets.emit('logDoc', doc);
                }
            });

            return res.json(data);
        }
    });

}); // End app.post 'api/ana'


// launch ======================================================================

io.on('connection', function(socket) {
    console.log("Sockets connected.");

    // Whenever a new client connects send them the latest data

    socket.on('disconnect', function() {
        console.log("Socket disconnected.");
    });
});
io.listen(app.listen(appEnv.port, "0.0.0.0", function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
}));