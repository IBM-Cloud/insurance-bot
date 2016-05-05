/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var path = require('path');
var appdata = require('./data.json');


// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

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

    app.set('json spaces', 6);

    //Cloudant Initialization code 
    require('dotenv').load();
    // Load the Cloudant library.
    var Cloudant = require('cloudant');
    var username = process.env.cloudant_username;
    var password = process.env.cloudant_password;

    // Initialize the library with CloudCo account.
    var cloudant = Cloudant({
        account: username,
        password: password
    });
    //("https://6808d18c-e663-41e7-8129-7f24a68593f0-bluemix:cf36bcf4f9cb3c5cafc13e20bb08c57e4b81b4526fcad06fb98dddd07684c059@6808d18c-e663-41e7-8129-7f24a68593f0-bluemix.cloudant.com");

    cloudant.db.list(function (err, allDbs) {
        console.log('All my databases: %s', allDbs)
    });

    //use Insurance DB
    var db = cloudant.db.use("insurance");

    //Create Index
    /*var payer_name = {name:'payer-name', type:'json', index:{fields:['payer_name']}}
    db.index(payer_name, function(er, response) {
      if (er) {
        throw er;
      }

      console.log('Index creation result: %s', response.result);
    });*/

    //Indexes
    app.get("/", function (req, res) {

        db.index(function (er, result) {
            if (er) {
                throw er;
            }

            console.log('The database has %d indexes', result.indexes.length);
            for (var i = 0; i < result.indexes.length; i++) {
                console.log('  %s (%s): %j', result.indexes[i].name, result.indexes[i].type, result.indexes[i].def);
            }

            //res.json(result.indexes);
            res.render('index', {
                title: 'Home',
                page: 'home',
                jsonres: JSON.stringify(result.indexes)
            });

        });
    });


    //personal
    app.get("/member", function (req, res)
    {
        var mypolicy = [];
        var mypolicies = [];

        mypolicies = appdata.policy;
        appdata.policy.forEach(function(item){
            mypolicy = mypolicy.concat(item.work);
        });


        res.render('member', {
            title: 'Policy Member',
            page: 'member',
            policyDetails: mypolicies
        });
    });



    //Quering
    app.get("/insurance/query", function (req, res) {
        db.find({
            selector: {
                payer_name: 'John Appleseed'
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                console.log('  Doc id: %s', result.docs[i]._id);
            }
            res.json(result.docs);

        });
    });


});