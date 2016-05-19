/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var path = require('path');

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var log4js = require('log4js');

var logger = log4js.getLogger('application');

// create a new express server
var app = express();
var http = require('http');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve the files out of ./public as our main files
app.use(express.static(path.join(__dirname, 'public')));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {

    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);

    //Home page
    app.get("/", function (req, res) {
        res.render('index', {
            title: 'Cloud Insurance Co - the one with the AI Bot',
            page: 'homePage',
        });
    });

    app.get("/about", function (req, res) {
        res.render('about', {
            title: 'Cloud Insurance Co - About',
            page: 'homePage',
        });
    })


    //member page
    app.get("/member", function (req, res) {

        var name = req.query.name;

        var db = cloudant.db.use("insurance");


        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                logger.info("Number of accounts: " + count);

                var item;

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        console.log('found: ' + doc.id + ' ' + doc.name);

                        if (doc.name === name) {

                            res.render('member', {
                                title: 'Policy Member',
                                page: 'member',
                                memberData: doc
                            });

                            console.log('found a match');
                        }
                    })
                })
            }
        })

        //        db.find({
        //            selector: {
        //                name: req.query.name
        //            }
        //        }, function (er, result) {
        //            if (er) {
        //                throw er;
        //            }
        //
        //            console.log('Found %d documents', result.docs.length);
        //            for (var i = 0; i < result.docs.length; i++) {
        //                //console.log('  Doc id: %s', result.docs[i]._id);
        //
        //                res.render('member', {
        //                    title: 'Policy Member',
        //                    page: 'member',
        //                    memberData: result.docs[i]
        //                });
        //            }
        //        });
        //        });

    });

    function createAccountData(identifier, name) {

        var data = {
            name: name,
            id: identifier,
            birthday: '',
            gender: '',
            address: {
                number: '',
                street: '',
                state: '',
                country: '',
                postcode: ''
            },
            logins: [],
            policies: [{
                policy: 'health',
                categories: [{
                        category: 'vision',
                        symbol: '',
                        coverage: [{
                                item: 'Eye Test',
                                limit: 100,
                                available: 0,
                                window: 2,
                                instances: 1,
                                begin: '2016-01-01',
                                percentage: 80,
                                claims: [{
                                    date: '2016-05-17',
                                    amount: 80
                        }]
                            },
                            {
                                item: 'Eye Wear',
                                limit: 300,
                                available: 30,
                                window: 2,
                                instances: 'limit',
                                begin: '2016-01-01',
                                percentage: 80,
                                claims: [{
                                    date: '2016-05-17',
                                    amount: 337.50
                        }]
                    }]
                },
                    {
                        category: 'dental',
                        symbol: '',
                        coverage: [{
                            item: 'Cleaning',
                            limit: 'unlimited',
                            window: 1,
                            instances: 6,
                            begin: '2016-01-01',
                            percentage: 90,
                            claims: []
            }, {
                            item: 'Orthodontics',
                            limit: 3000,
                            window: 'lifetime',
                            instances: 'limit',
                            begin: '2016-01-01',
                            percentage: 80,
                            claims: []
            }, {
                            item: 'X-Ray',
                            limit: 'unlimited',
                            window: 1,
                            instances: 1,
                            begin: '2016-01-01',
                            percentage: 90,
                            claims: []
            }]
        }]
    }]
        }

        return data;

    }

    function findAccount(id, name, response, callback) {

        var outcome = false;

        logger.info('Quick Analysis ...');

        var db = cloudant.db.use("insurance");

        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                logger.info("Number of accounts: " + count);

                var item;

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        console.log('found: ' + doc.id + ' ' + doc.name);

                        if (doc.id === id && doc.name === name) {
                            outcome = true;
                            callback(true, response, id, name);

                            console.log('found a match');
                        }
                    })
                })

                if (count === 0 || outcome === false) {
                    callback(outcome, response, id, name);
                }
            }
        })
    }

    function handleAccountOutcome(outcome, response, id, name) {

        console.log(outcome);

        if (outcome === false) {

            /* create a new account */

            var db = cloudant.db.use("insurance");

            var account = createAccountData(id, name);

            db.insert(account, id, function (err, body, header) {
                if (err) {

                    console.log('account insertion failure', err.message)

                    response.end(JSON.stringify({
                        outcome: outcome
                    }));

                } else {
                    console.log('Inserted a new account into the database.');

                    response.end(JSON.stringify({
                        outcome: true
                    }));
                }
            });

        } else {

            console.log('returning a record');
            response.end(JSON.stringify({
                outcome: outcome
            }));
        }
    }

    app.param('id', function (req, res, next, id) {

        var components = id.split('~')

        console.log(id);

        var identifier = components[0];
        var name = components[1];

        console.log('id: ' + identifier);
        console.log('name: ' + name);

        findAccount(identifier, name, res, handleAccountOutcome);
    });

    app.get("/person/:id", function (req, res) {});

    //health page
    app.get("/health", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('health', {
                    title: 'Health Member',
                    page: 'health',
                    memberData: result.docs[i]
                });
            }
        });

    });


    //home insurance page
    app.get("/home", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('home', {
                    title: 'Home Policy',
                    page: 'home',
                    memberData: result.docs[i]
                });
            }
        });

    });

    //car insurance page
    app.get("/auto", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('auto', {
                    title: 'Auto Policy',
                    page: 'auto',
                    memberData: result.docs[i]
                });
            }
        });

    });


    //----------------------------------------------------------------------------------
    // Cloudant connections
    //----------------------------------------------------------------------------------    

    //Added for Json Readability    
    app.set('json spaces', 6);

    //Cloudant Initialization code
    require('dotenv').load();
    // Load the Cloudant library.
    var Cloudant = require('cloudant');
    //using Bluemix VCAP_SERVICES for Cloudant credentials
    if (process.env.VCAP_SERVICES) {
        // Running on Bluemix. Parse the port and host that we've been assigned.
        var env = JSON.parse(process.env.VCAP_SERVICES);
        var host = process.env.VCAP_APP_HOST;
        var port = process.env.VCAP_APP_PORT;
        console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
        // Also parse Cloudant settings.
        var credentials = env['cloudantNoSQLDB'][0]['credentials'];
        username = credentials.username;
        password = credentials.password;

        // Initialize the library with CloudCo account.
        cloudant = Cloudant({
            account: username,
            password: password
        });
    }
    /*  var username = process.env.cloudant_username;
      var password = process.env.cloudant_password;

      // Initialize the library with CloudCo account.
      var cloudant = Cloudant({
          account: username,
          password: password
      });*/

    cloudant.db.create("insurance", function (err, res) {
        if (err) {
            logger.warn('database already created');
        } else {
            logger.info('database created');
        }
    });

    cloudant.db.list(function (err, allDbs) {
        console.log('All my databases: %s', allDbs)
    });

    //use Insurance DB
    var db = cloudant.db.use("insurance");

    //Create Index
    app.post('/insurance/createindex', function (req, res) {

        var payer_name = {
            name: 'payer-name',
            type: 'json',
            index: {
                fields: ['payer_name']
            }
        }
        db.index(payer_name, function (er, response) {
            if (er) {
                throw er;
            }
            console.log('Index creation result: %s', response.result);
            res.send('Index creation result: %s', response.result);
        });

    });


    //Quering with a query string
    // localhost:6001/insurance/query?payername=John+Appleseed -- pass a payername as query string.
    // localhost: 6001 / insurance / query -- Will pick default user for now.
    app.get("/insurance/query", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                console.log('  Doc id: %s', result.docs[i]._id);
            }
            var jsonRES = [];
            jsonRES = result.docs;
            res.json(jsonRES);

        });
    });


});