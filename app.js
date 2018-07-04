// server.js
// set up ======================================================================
// get all the tools we need
var express = require('express');
var app = express();
var cfenv = require('cfenv');
var passport = require('passport');
var flash = require('connect-flash');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var request = require('request');
var io = require('socket.io')();
var watson = require('watson-developer-cloud');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
//const userProfileManager = require("ibmcloud-appid").UserProfileManager;
const SelfServiceManager = require("ibmcloud-appid").SelfServiceManager;


//require('./config/passport')(passport);
var chatbot = require('./config/bot.js');

// configuration ===============================================================
// load local VCAP configuration
var vcapLocal = null
if (require('fs').existsSync('./vcap-local.json')) {
    try {
        vcapLocal = require("./vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
    } catch (e) {
        console.error(e);
    }
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

// Configure passport with App ID, application environment is needed
require('./config/passport')(passport,appEnv);
// userProfileManager currently not used
//userProfileManager.init({profilesUrl: appEnv.services.AppID[0].credentials.profilesUrl, oauthServerUrl: appEnv.services.AppID[0].credentials.oauthServerUrl});

// Initialize App ID self service manager - used for user signup
let selfServiceManager = new SelfServiceManager({
	iamApiKey: appEnv.services.AppID[0].credentials.apikey,
	managementUrl: appEnv.services.AppID[0].credentials.managementUrl
});

// Cloudant
var Logs, Benefits;
var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("insurance-bot-db").url;
var Cloudant = require('@cloudant/cloudant')({
  url: cloudantURL,
  plugin: 'retry',
  retryAttempts: 10,
  retryTimeout: 500
});

if (cloudantURL) {

    Logs = Cloudant.db.use('logs');
    Benefits = Cloudant.db.use('benefits');

} else {
    console.error("No Cloudant connection configured!");
}

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

// =====================================
// REGISTER/SIGNUP =====================
// =====================================
app.get('/', function(req, res) {
    req.session.lastPage = "/";

    res.render('index.html');
});

app.get('/login', function(req, res) {
    res.sendfile('./public/login.html');
});

app.get('/sociallogin', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
	successRedirect: '/redirect',
	forceLogin: true
}));

// redirect without any additional processing - came here from App ID
app.get('/redirect', function(req, res) {
  res.redirect('/health');
});


app.get('/logout',
    function(req, res) {
        req.logout();
        res.redirect('/');
    });

app.get('/signup', function(req, res) {
    res.sendfile('./public/signup.html');
});


app.post('/login', function(req, res, next) {
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
successRedirect: '/health',
failureRedirect: '/login',
failureFlash : true // allow flash messages
}, function(err, user, info) {
        if (err || info) {
            res.status(500).json({
                'message': info
            });
        } else {
            req.logIn(user, function(err) {
                if (err) {
                    res.status(500).json({
                        'message': 'Error logging in. Contact admin.'
                    });
                } else {
                    res.status(200).json({
                        'username': user.email,
                        'name': user.name,
                        'fname': user.fname,
                        'lname': user.lname
                    });
                }
            });
        }
    })(req, res, next);
});

function _generateUserScim(body) {
	let userScim = {};
	if (body.password) {
		userScim.password = body.password;
	}
	userScim.emails = [];
	userScim.emails[0] = {
		value: body.username,
		primary: true
	};
	if (body.lname || body.lname) {
		userScim.name = {};
		if (body.fname) {
			userScim.name.givenName = body.fname;
		}
		if (body.lname) {
			userScim.name.familyName = body.lname;
		}
	}
	return userScim;
};

app.post('/signup', function(req, res) {
	let userData = _generateUserScim(req.body);
	let language = 'en';
	let password = req.body.password;
	selfServiceManager.signUp(userData, language).then(function (user) {
			console.log('user created successfully '+JSON.stringify(user));
      createAccountBenefits(user.emails[0].value);
      res.status(200).json({
                        'username': user.emails[0].value,
                        'fname': user.name.givenName,
                        'lname': user.name.familyName
                    });
		}).catch(function (err) {
			if (err && err.code) {
				console.error("error code:" + err.code + " ,bad sign up input: " + err.message);
			} else {
				console.error(err);
				res.status(500).send('Something went wrong');
			}
		});
});

app.get('/isLoggedIn', function(req, res) {
    var result = {
        outcome: 'failure'
    };

    if (req.isAuthenticated()) {
      // retrieve more user profile attributes - seems to be currently empty
      // userProfileManager.getAllAttributes(req.session[WebAppStrategy.AUTH_CONTEXT].accessToken).then(function (attributes) {
      //    console.error("attributes: "+JSON.stringify(attributes));
      //   });
        result.outcome = 'success';
        result.username = req.user.username;
        result.email = req.user.email;
        result.name = req.user.name;
        result.fname = req.user.fname;
        result.lname = req.user.lname;
    }

    res.send(JSON.stringify(result, null, 3));
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }

    // if they aren't redirect them to the home page
    res.redirect('/login');
}

// =====================================
// CLAIMS ==============================
// =====================================
// show the signup form

app.get('/claims', isLoggedIn, function(req, res) {
    res.sendfile('./public/claims.html');
});

app.get('/history', isLoggedIn, function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    Benefits.find({ selector: {
        '_id': req.user.username
    }}, function(err, result) {

        if (err) {
            console.log("There was an error finding benefits: " + err);
            return (err);
        } else if (result.docs.length > 0) {
            var doc = result.docs[0];

            var allclaims = [];

            doc.policies.forEach(function(policy) {

                if (policy.claims.length > 0) {
                    policy.claims.forEach(function(claim) {
                        var detailedclaim = {};
                        detailedclaim.date = claim.date;
                        detailedclaim.amount = claim.amount;
                        detailedclaim.provider = claim.provider;
                        detailedclaim.payment = claim.payment;
                        detailedclaim.outcome = claim.outcome;
                        detailedclaim.policy = policy.title;
                        detailedclaim.icon = policy.icon;
                        allclaims.push(detailedclaim);
                    });
                }
            });

            var output = {
                owner: req.user.username,
                fname: req.user.fname,
                lname: req.user.lname,
                claims: allclaims
            };

            var responseString = JSON.stringify(output, null, 3);

            console.log(responseString);

            res.send(responseString);
        }
    });
});


// submit a claim
app.post('/submitClaim', function(req, res) {

    var claim = req.body;

    if (req.isAuthenticated()) {
        var owner = req.user.email;

        res.setHeader('Content-Type', 'application/json');

        fileClaim(owner, claim, function(err, result) {
            if (err) {
                console.log("Error filing claim: ", err);
                res.status(500).json(err);
            } else if (result) {
                console.log("Claim filed");
                res.status(200).json(result);
            }
        });

    }
});

function fileClaim(owner, claim, callback) {

    if (owner && claim) {
        Benefits.find({ selector: {
            '_id': owner
        }}, function(err, result) {

            if (err) {
                console.log("There was an error finding benefits: " + err);
                return (err);
            } else if (result.docs.length > 0) {
                var doc = result.docs[0];
                var policyFound = false;

                doc.policies.forEach(function(policy) {
                    var message = '';

                    if (policy.title === claim.benefit) {
                        policyFound = true;

                        claim.outcome = 'DENIED';
                        claim.payment = 0;

                        var possibleEligibility = claim.amount * policy.percentCovered / 100;

                        var amountAvailable = policy.claimLimit - policy.amountClaimed;

                        if (isNaN(amountAvailable)) {
                            amountAvailable = 0;
                        }

                        console.log('Eligibility: ' + possibleEligibility);
                        console.log('Available: ' + amountAvailable);

                        if (amountAvailable <= 0) {
                            claim.outcome = 'NONE';
                            claim.payment = 0;
                            message = "Sorry, you reached your claim limit. So none of the amount could be covered by your insurance.";
                        }

                        if (policy.amountClaimed > amountAvailable && amountAvailable > 0) {
                            claim.outcome = 'PARTIAL';
                            claim.payment = amountAvailable;
                            policy.amountClaimed = policy.Limit;
                            message = "You have reached max coverage. Remaining $" + amountAvailable + " of policy limit applied.";
                        }

                        if (possibleEligibility < amountAvailable) {
                            claim.outcome = 'FULL';
                            claim.payment = possibleEligibility;
                            policy.amountClaimed = policy.amountClaimed + possibleEligibility;
                            message = "$" + possibleEligibility + " was covered by your insurance!";
                        }

                        policy.claims.push(claim);

                        Benefits.insert(doc, function(err, body) {

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

                if (!policyFound) {
                    callback(new Error("policy not found"));
                }
            } // End else if results.docs.length > 0
        }); // End Benefits.find
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
    res.redirect("https://github.com/IBM-Cloud/cloudco-insurance/wiki");
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


function createAccountBenefits(account) {
  var healthBenefits;
  if (require('fs').existsSync('./config/default-policy.json')) {
      try {
          healthBenefits = require("./config/default-policy.json");
      } catch (e) {
          console.error(e);
      }
  }
  healthBenefits._id = account;
  healthBenefits.owner = account;

  Benefits.insert(healthBenefits, function(err) {
    if (err) {
      throw err;
    }
  });
}



function getUserPolicy(req, callback) {
    //console.log(req);

    Benefits.find({ selector: {
        '_id': req.user.email
    }}, function(err, result) {
        if (err) {
            console.error("Error retrieving user policy: ", err);
            return callback(err);
        } else if (result.docs.length > 0) {
            var doc = result.docs[0];
            req.session.userPolicy = doc;
            return callback(null, doc);
        } else {
            console.error("No user policy found.");
            return callback("No user policy found.");
        }
    });
}

/**
 * Constructs a URL for an insurance microservice
 */

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

            Logs.find({selector: {
                'conversation': data.context.conversation_id
            }}, function(err, result) {
                if (err) {
                    console.log("Cannot find log for conversation id of ", data.context.conversation_id);
                } else if(result.docs.length > 0) {
                    var doc = result.docs[0];
                    console.log("Sending log updates to dashboard");
                    //console.log("doc: ", doc);
                    io.sockets.emit('logDoc', doc);
                } else {
                    console.log("No log file found.");
                }
            });
            var context = data.context;
            var amount = context.claim_amount;
            var owner = req.user.email;

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

                console.log("Filing data: " + owner + " claimFile: " + JSON.stringify(claimFile));

                fileClaim(owner, claimFile, function(err, reply) {

                    data.output.text = '';
                    data.context.claim_step = '';

                    console.log("Reply for claim file: ", reply);

                    if (reply && reply.outcome === 'success') {
                        data.output.text = "Your " + context.claim_procedure + " claim for " + amount + " was successfully filed! " + reply.message;
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
