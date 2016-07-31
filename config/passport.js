// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;

// load up the user model
var User = require('../models/account');
var Health = require('../models/benefit');
var Policy = require('../models/policy');
var Claim = require('../models/claim');


function createPolicies(account) {

    var eyeWear = new Policy();
    eyeWear.type = 'vision';
    eyeWear.title = 'eye wear';
    eyeWear.description = 'Glasses, contact lens, laser treatment, etc';
    eyeWear.claimLimit = 300;
    eyeWear.scope = 'bi-annual';
    eyeWear.startDate = new Date(2016, 1, 1);
    eyeWear.endDate = new Date(2016, 1, 1);
    eyeWear.code = 100;

    var eyeExam = new Policy();
    eyeExam.type = 'vision';
    eyeExam.title = 'eye exams';
    eyeExam.description = 'Eye examinations';
    eyeExam.claimLimit = 100;
    eyeExam.entitlements = 1;
    eyeExam.scope = 'bi-annual';
    eyeExam.startDate = new Date(2016, 1, 1);
    eyeExam.endDate = new Date(2016, 1, 1);
    eyeExam.code = 200;

    var teethCleaning = new Policy();
    teethCleaning.type = 'dental';
    teethCleaning.title = 'teeth cleaning';
    teethCleaning.description = 'Teeth Cleaning';
    teethCleaning.claimLimit = 500;
    teethCleaning.entitlements = 2;
    teethCleaning.scope = 'annual';
    teethCleaning.startDate = new Date(2016, 1, 1);
    teethCleaning.endDate = new Date(2016, 1, 1);
    teethCleaning.code = 300;

    var orthodontics = new Policy();
    orthodontics.type = 'dental';
    orthodontics.title = 'orthodontics';
    orthodontics.description = 'Orthodontics';
    orthodontics.claimLimit = 2000;
    orthodontics.entitlements = 100;
    orthodontics.scope = 'lifetime';
    orthodontics.startDate = new Date(2016, 1, 1);
    orthodontics.endDate = new Date(2016, 1, 1);
    orthodontics.code = 400;

    var teethRepair = new Policy();
    teethRepair.type = 'dental';
    teethRepair.title = 'tooth repair';
    teethRepair.description = 'Teeth repair - fillings, chipped teeth';
    teethRepair.claimLimit = 2000;
    teethRepair.entitlements = 100;
    teethRepair.scope = 'annual';
    teethRepair.startDate = new Date(2016, 1, 1);
    teethRepair.endDate = new Date(2016, 1, 1);
    teethRepair.code = 500;

    var mentalHealth = new Policy();
    mentalHealth.type = 'mental';
    mentalHealth.title = 'mental health';
    mentalHealth.description = 'Psychologist Services';
    mentalHealth.claimLimit = 1400;
    mentalHealth.entitlements = 100;
    mentalHealth.scope = 'annual';
    mentalHealth.startDate = new Date(2016, 1, 1);
    mentalHealth.endDate = new Date(2016, 1, 1);
    mentalHealth.code = 600;

    var healthBenefits = new Health();
    healthBenefits.owner = account;
    healthBenefits.policies.push(eyeWear);
    healthBenefits.policies.push(eyeExam);
    healthBenefits.policies.push(teethCleaning);
    healthBenefits.policies.push(orthodontics);
    healthBenefits.policies.push(teethRepair);
    healthBenefits.policies.push(mentalHealth);

    healthBenefits.save(function (err) {
        if (err) {
            throw err;
        }
    });
}


// expose this function to our app using module.exports
module.exports = function (passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, email, password, done) {

            console.log('signup');

            console.log('passport.js email:' + email);

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({
                    'local.email': email
                }, function (err, user) {
                    // if there are any errors, return the error
                    if (err) {
                        console.log('signup error');
                        return done(err);
                    }

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                        console.log('That email is already taken');
                    } else {

                        console.log('attempting to make an account');

                        // if there is no user with that email
                        // create the user
                        var newUser = new User();


                        // set the user's local credentials
                        newUser.local.email = email;
                        newUser.local.password = newUser.generateHash(password);

                        // save the user
                        newUser.save(function (err) {
                            if (err) {
                                throw err;
                            }

                            createPolicies(email);

                            return done(null, newUser);
                        });

                        console.log('made an account');
                    }

                });

            });

        }));

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({
                'local.email': email
            }, function (err, user) {
                // if there are any errors, return the error before anything else
                if (err) {
                    return done(err);
                }

                // if no user is found, return the message
                if (!user) {
                    console.log('user not found');
                    return done(null, false, req.flash('loginMessage', 'No user found.'));
                } // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                if (!user.validPassword(password)) {

                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                } // create the loginMessage and save it to session as flashdata

                // all is well, return successful user

                console.log('successful login');
                return done(null, user);
            });

        }));
}