/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var path = require('path');
//var routes = require('./routes/index');

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


var datetime = require('node-datetime');
var dt = datetime.create();
var fomratted = dt.format('d/m/Y H:M:S');


//bodyparser for POST requests.
var bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// parse application/json
app.use(bodyParser.json());

var manager = require('./account');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve the files out of ./public as our main files
app.use(express.static(path.join(__dirname, 'public')));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {



    //----------------------------------------------------------------------------------
    // Cloudant connections
    //----------------------------------------------------------------------------------

    //Added for Json Readability
    app.set('json spaces', 6);

    //Cloudant Initialization code
    //require('dotenv').load();
    // Load the Cloudant library.
    var Cloudant = require('cloudant');
    //using Bluemix VCAP_SERVICES for Cloudant credentials
    if (process.env.VCAP_SERVICES) {
        // Running on Bluemix. Parse the port and host that we've been assigned.
        var env = JSON.parse(process.env.VCAP_SERVICES);
        var host = process.env.VCAP_APP_HOST;
        var port = process.env.VCAP_APP_PORT;
        //        console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
        // Also parse Cloudant settings.
        var credentials = env['cloudantNoSQLDB'][0]['credentials'];
        username = credentials.username;
        password = credentials.password;

        // Initialize the library with CloudCo account.
        cloudant = Cloudant({
            account: username,
            password: password
        });
    } else {
        console.log('Not using VCAP_SERVICES');
        // To run the app locally comment out above two lines and add your username and password from your Cloudant
        username = '';
        password = '';

        // Initialize the library with CloudCo account.
        var cloudant = Cloudant({
            account: username,
            password: password
        });
    }


    var db = cloudant.db.use("insurance"); //use Insurance DB

    cloudant.db.create("insurance", function (err, res) {
        if (err) {
            logger.warn('database already created');
        } else {
            logger.info('database created successfully');
        }
    });


    // print a message when the server starts listening
    logger.info("server starting on " + appEnv.url);
    //Home page
    app.get("/", function (req, res) {
        res.render('index', {
            title: 'Cloud Insurance Co - the one with the AI Bot',
            page: 'homePage',
        });
    });

    //About page
    app.get("/about", function (req, res) {
        res.render('about', {
            title: 'Cloud Insurance Co - About',
            page: 'homePage',
        });
    })

    //member page
    app.get("/member", function (req, res) {

        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;
                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {

                            res.render('member', {
                                title: 'Policy Member',
                                page: 'member',
                                memberData: doc
                            });
                            var dt01 = datetime.create();
                            var fomratted01 = dt01.format('d/m/Y H:M:S');
                            doc.loginLast = fomratted01;

                            db.insert(doc, function (err, doc) {
                                if (err) {
                                    console.log('Error inserting data\n' + err);
                                    return 500;
                                } else {
                                    return 200;
                                }
                            });


                        }
                    })
                })
            }
        });
    });

    app.param('id', function (req, res, next, id) {

        /* Facebook creds come in like this: id~name */

        var components = id.split('~')

        var identifier = components[0];
        var name = components[1];

        manager.findAccount(identifier, name, res, cloudant, manager.handleAccountOutcome);
    });

    app.get("/person/:id", function (req, res) {});

    //home insurance page
    app.get("/home", function (req, res) {

        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                //logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        console.log('The doc is: ' + doc);
                        if (doc.name === name && doc.id === id) {

                            res.render('home', {
                                title: 'Home Policy',
                                page: 'home',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        });

    });

    //car insurance page
    app.get("/auto", function (req, res) {
        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                //logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {

                            res.render('auto', {
                                title: 'Auto Policy',
                                page: 'auto',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        })

    });

    //health page
    app.get("/health", function (req, res) {
        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                //logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {

                            res.render('health', {
                                title: 'health Policy',
                                page: 'health',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        });
    });

    //editUser page
    app.get("/editUser", function (req, res) {
        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {
            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                //logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */
                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {
                            res.render('editUser', {
                                title: 'Edit User',
                                page: 'editUser',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        });
    });

    //UPDATE User Info
    app.post("/updateuserInfo", function (req, res) {
        var Userid = req.body.userid;
        var UserPerName = req.body.fullName;

        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                var item;
                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {
                        if (doc.id === Userid) {
                            doc.name = req.body.fullName;
                            doc.gender = req.body.gender;
                            doc.birthday = req.body.dateofbirth;
                            doc.address = req.body.address;
                            db.insert(doc, function (err, doc) {
                                if (err) {
                                    console.log('Update01 Error inserting data\n' + err);
                                    return 500;
                                } else {
                                    return 200;
                                }
                            });
                        }
                    })
                })
            }
        });
        res.redirect('/health?name=' + UserPerName + '&&id=' + Userid);
        //res.end();
    });


    //health page
    app.get("/healthClaim", function (req, res) {
        var name = req.query.name;
        var id = req.query.id;
        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                //logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {

                            res.render('healthClaim', {
                                title: 'health Policy',
                                page: 'health',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        });
    });

    //UPDATE User Info
    app.post("/processClaim", function (req, res) {
        var Userid = req.body.userid;
        var UserPerName = req.body.fullName;

        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                var item;
                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {
                        if (doc.id === Userid) {
                            var CCategories = doc.policies[0].categories;
                            var cat_i, cov_i, outPRespond;
                            for(cat_i=0; cat_i<CCategories.length; cat_i++)
                            {
                              for(cov_i=0; cov_i<CCategories[cat_i].coverage.length; cov_i++)
                              {
                                if(CCategories[cat_i].coverage[cov_i].item == req.body.SlectType){
                                  if(CCategories[cat_i].coverage[cov_i].claims[0]){
                                    CCategories[cat_i].coverage[cov_i].claims[0].amount = req.body.claimamount;
                                    CCategories[cat_i].coverage[cov_i].claims[0].date = fomratted;
                                  }else {
                                    console.log('No data there for this cover type!');
                                  }
                                }
                              }
                            }

                            //doc.policies[0].categories[0].coverage[0].claims[0].amount = req.body.claimamount;
                            db.insert(doc, function (err, doc) {
                                if (err) {
                                    console.log('Error inserting data\n' + err);
                                    return 500;
                                } else {
                                    return 200;
                                }
                            });
                        }
                    })
                })
            }
        });
        res.redirect('/health?name=' + UserPerName + '&&id=' + Userid);
        //res.redirect('back');
        //res.end();
    });



    //-------------------------------------------------------------------
    // CRUD operations
    //-------------------------------------------------------------------

    //Create a doc
    function createDocument(req, res) {
        var db = cloudant.db.use(req.body.db);
        var cloudantResponse = this;
        db.insert(req.body.doc, req.body.docname, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response);
                return cloudantResponse;
            }

        });

        res.send(cloudantResponse.result);
        res.end();
    }

    //POST call to create a document.
    app.post("/api/createdoc", createDocument);

    //Read a doc
    function readDocument(req, res) {
        var db = cloudant.db.use(req.query.db);
        var cloudantResponse = this;
        db.get(req.query.docname, {
            revs_info: true
        }, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response);
                return cloudantResponse;
                //res.send(response.result);
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }

    //GET call to read a document.
    app.get("/api/readdoc", readDocument);

    //update a doc
    function updateDocument(req, res) {
        var db = cloudant.db.use(req.body.db);
        var cloudantResponse = this;
        db.insert(req.body.doc, req.body.docname, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response.result);
                return cloudantResponse;
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }

    //PUT call to update a document.
    app.put("/api/updatedoc", updateDocument);

    //Delete a doc
    function deleteDocument(req, res) {
        var db = cloudant.db.use(req.query.db);
        var cloudantResponse = this;
        db.destroy(req.query.docname, req.query.rev, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response.result);
                return cloudantResponse;
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }
    //DELETE call to delete a document.
    app.delete("/api/deletedoc", deleteDocument);


});
