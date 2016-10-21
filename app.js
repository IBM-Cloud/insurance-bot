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

//---Deployment Tracker---------------------------------------------------------
require("cf-deployment-tracker-client").track();

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
        var owner = req.user.local.email;
        
        res.setHeader('Content-Type', 'application/json');

        fileClaim(owner, claim, function(err, result) {
            if (err) {
                console.log("Error filing claim: ", err);
                res.status(500).json(err);
            } else if (result) {
                console.log("Claim filed");
                res.status(200).json(JSON.stringify(result, null, 3));
            }
        });

    }
});

function fileClaim(owner, claim, callback) {

    if (owner && claim) {
        Benefits.findOne({
            owner: owner
        }, function(err, doc) {

            doc.policies.forEach(function(policy) {
                var message = '';

                if (policy.title === claim.benefit) {

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
                        message = "You have reached max coverage. Remaining $"+ amountAvailable + "of policy limit applied.";
                    } 
                    
                    if (amountAvailable <= 0) {
                        claim.outcome = 'NONE';
                        claim.payment = 0;
                        message = "Sorry, you reached your claim limit. So none of the amount could be covered by your insurance.";
                    }
                    
                    if (possibleEligibility < amountAvailable) {
                        claim.outcome = 'FULL';
                        claim.payment = possibleEligibility;
                        policy.amountClaimed = policy.amountClaimed + possibleEligibility;
                        message = "$" + possibleEligibility + " was covered by your insurance!";
                    }

                    policy.claims.push(claim);
                    console.log("Claim is: ",claim);

                    doc.save(function(err) {

                        var result = {
                            outcome: 'failure',
                            message: message
                        };

                        if (err) {
                            return callback(err);
                        } else {
                            result.outcome = 'success';
                        }

                        console.log(JSON.stringify(result, null, 3));
                        return callback(null, result);
                    });
                }
            });
        });
    }

}


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
    res.redirect("https://github.com/IBM-Bluemix/cloudco-insurance/wiki");
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

    // ensure user policies are loaded
    if (!req.body.context || !req.body.context.system) {
        getUserPolicy(req, function(err, doc) {
            if (err) {
                res.status(err.code || 500).json(err);
            } else {
                processChatMessage(req, res);
            }
        });
    } else {
        processChatMessage(req, res);
    }
}); // End app.post 'api/ana'

function processChatMessage(req, res) {
    chatbot.sendMessage(req, function(err, data) {
        if (err) {
            console.log("Error in sending message: ", err);
            res.status(err.code || 500).json(err);
        } else {
            
            Log.findOne({
                'conversation': data.context.conversation_id
            }, function(err, doc) {
                if (err) {
                    console.log("Cannot find log for conversation id of ", data.context.conversation_id);
                } else {
                    console.log("Sending log updates to dashboard");
                    //console.log("doc: ", doc);
                    io.sockets.emit('logDoc', doc);
                }
            });

            var context = data.context;
            var amount = context.claim_amount;
            var owner = req.user.local.email;

            // File a claim for the user
            if (context.claim_step === "verify") {
                var claimFile = {
                    date: null,
                    benefit: null,
                    provider: null,
                    amount: null
                };

                claimFile.date = context.claim_date;
                claimFile.benefit = context.claim_procedure;
                claimFile.provider = context.claim_provider;
                claimFile.amount = context.claim_amount;
                
                console.log("Filing data: "+owner+ " claimFile: " + JSON.stringify(claimFile));

                fileClaim(owner, claimFile, function(err, reply) {
                    
                    data.output.text = '';
                    data.context.claim_step = '';
                    
                    console.log("Reply for claim file: ",reply);

                    if (reply && reply.outcome === 'success') {
                        data.output.text = "Your " + context.claim_procedure + " claim for " + amount + " was successfully filed! "+reply.message;
                        res.status(200).json(data);

                    } else {
                        res.status(500).json(err);
                    }

                });

            } else {
                res.status(200).json(data);
            }
        }
    });
}


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