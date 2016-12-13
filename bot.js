/**
 * This file contains all of the web and hybrid functions for interacting with
 * Ana and the Watson Conversation service. When API calls are not needed, the
 * functions also do basic messaging between the client and the server.
 *
 * @summary   Functions for Ana Chat Bot.
 *
 * @link      cloudco.mybluemix.net
 * @since     0.0.3
 * @requires  app.js
 *
 */
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var chrono = require('chrono-node');

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

// =====================================
// CREATE THE SERVICE WRAPPER ==========
// =====================================
// Create the service wrapper
var conversationCredentials = appEnv.getServiceCreds("insurance-bot-conversation");
var conversationUsername = process.env.CONVERSATION_USERNAME || conversationCredentials.username;
var conversationPassword = process.env.CONVERSATION_PASSWORD || conversationCredentials.password;
var conversationWorkspace = process.env.CONVERSATION_WORKSPACE;
console.log("Using Watson Conversation with username", conversationUsername, "and workspace", conversationWorkspace);

var conversation = watson.conversation({
    url: conversationCredentials.url,
    username: conversationUsername,
    password: conversationPassword,
    version_date: '2016-07-11',
    version: 'v1'
});

if (!conversationWorkspace) {
    console.log("No workspace detected. Cannot run the Watson Conversation service.");
}

var Log = require('./models/log');

// =====================================
// REQUEST FOR ANA =====================
// =====================================
// Allow clients to interact with Ana
var chatbot = {
    sendMessage: function(req, callback) {
        var userPolicy = req.session.userPolicy;
        var owner = req.user.local.email;

        buildContextObject(req, function(err, params) {

            if (err) {
                console.log("Error in building the parameters object: ", err);
                return callback(err);
            }

            if (params.message) {
                var conv = req.body.context.conversation_id;
                var context = req.body.context;

                var res = {
                    intents: [],
                    entities: [],
                    input: req.body.text,
                    output: {
                        text: params.message
                    },
                    context: context
                };

                chatLogs(owner, conv, res);

                return callback(null, res);
            } else if (params) {
                // Send message to the conversation service with the current context
                conversation.message(params, function(err, data) {

                    if (err) {
                        console.log("Error in sending message: ", err);
                        return callback(err);
                    }
                    var conv = data.context.conversation_id;

                    console.log("Got response from Ana: ", JSON.stringify(data));

                    updateContextObject(data, userPolicy, function(err, res) {

                        if (data.context.system.dialog_turn_counter > 1) {
                            chatLogs(owner, conv, res);
                        }

                        return callback(null, res);
                    });
                });
            }

        });
    }
};

// ===============================================
// LOG MANAGEMENT FOR USER INPUT FOR ANA =========
// ===============================================
function chatLogs(owner, conversation, response) {

    console.log("response object is: ", response);

    // Blank log file to parse down the response object
    var logFile = {
        inputText: '',
        responseText: '',
        entities: {},
        intents: {},
    };

    logFile.inputText = response.input.text;
    logFile.responseText = response.output.text;
    logFile.entities = response.entities;
    logFile.intents = response.intents;
    logFile.date = new Date();

    var date = new Date();

    var update = {
        $set: {
            lastContext: response.context,
        },
        $push: {
            logs: logFile
        },
        $setOnInsert: {
            owner: owner,
            date: date,
            conversation: conversation,
        }
    };

    var options = {
        safe: true,
        upsert: true,
        new: true,
        w: 'majority'
    };

    var query = {
        'conversation': conversation
    };

    Log.findOneAndUpdate(query, update, options, function(err, doc) {
        if (err) {
            console.log("Error with log: ", err);
        }

        if (doc) {
            console.log("Log update success for conversation id of ", conversation);
        }
    });
}

// ===============================================
// UTILITY FUNCTIONS FOR CHATBOT AND LOGS ========
// ===============================================
/**
 * @summary Form the parameter object to be sent to the service
 *
 * Update the context object based on the user state in the conversation and
 * the existence of variables.
 *
 * @function buildContextObject
 * @param {Object} req - Req by user sent in POST with session and user message
 */
function buildContextObject(req, callback) {

    var message = req.body.text;
    var context;
    var userPolicy;

    if (!message) {
        message = '';
    }

    if (req.session.userPolicy) {
        userPolicy = req.session.userPolicy;
    }

    // Null out the parameter object to start building
    var params = {
        workspace_id: conversationWorkspace,
        input: {},
        context: {}
    };
    var reprompt = {
        message: '',
    };

    if (req.body.context) {
        context = req.body.context;
        params.context = context;

        if (context.claim_step === "amount") {
            // Strip any non-numerics out
            message = message.replace(/[^0-9.]/g, "");

            if (message && message !== '') {
                // Strip decimals down to two
                message = parseFloat(message);
                message = message.toFixed(2);
                message = message.toString();
            } else {
                reprompt.message = "You didn't enter a valid amount. Please enter the amount paid for the procedure.";
                return callback(null, reprompt);
            }
        } else if (context.claim_step === "date") {
            var date = message;

            // Set current date for checking if user is trying to claim in the future
            var cDate = new Date();
            var userDate = chrono.parseDate(date);

            console.log("Date: ", userDate);

            // If the date is NaN reprompt for correct format
            if (isNaN(userDate)) {
                reprompt.message = "That doesn't look like a date. Please try again.";
                return callback(null, reprompt);
            } else if (userDate) {
                if (userDate > cDate) { // If user tries to claim a date in the future
                    reprompt.message = "Sorry, Marty McFly, you can't make a claim in the future. Please try the date again.";
                    return callback(null, reprompt);
                } else { // Otherwise format the date to YYYY-MM-DD - Ana will also verify
                    var month = '' + (userDate.getUTCMonth()+1),
                        day = '' + (userDate.getUTCDate()),
                        year = userDate.getFullYear();

                    if (month.length < 2) {
                        month = '0' + month;
                    }
                    if (day.length < 2) {
                        day = '0' + day;
                    }

                    message = [year, month, day].join('-');
                }
            } else {
                reprompt.message = "That doesn't look like a valid date. Please try again.";
                return callback(null, reprompt);
            }
        }
    } else {
        context = '';
    }

    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message // User defined text to be sent to service
    };

    // This is the first message, add the user's name and get their healthcare object
    if ((!message || message === '') && !context) {
        params.context = {
            fname: req.user.local.fname,
            lname: req.user.local.lname
        };

        parsePolicyTitles(userPolicy, function(services, procedures) {
            params.context.services = services;
            params.context.procedures = procedures;
        });

    }

    return callback(null, params);
}

/**
 * @summary Arrays for Policy Areas and the Procedures for each.
 *
 * Dynamically generate an array of the available subjects to query on for the
 * #list_options intent. This is to anticipate a scenario in which a user doesn't
 * have coverage for an area such as vision or dental.
 *
 * @function parsePolicyTitles
 * @param {Object} doc - Policy document to search through.
 */
function parsePolicyTitles(doc, callback) {

    var policies = doc.policies;
    var currentService = '';
    var policyServices = [];
    var policyProcedures = [];
    var proc = [];

    policies.forEach(function(policy) {

        if (policy.type === currentService) {
            proc.push(policy.title);
        } else {
            currentService = policy.type;
            policyServices.push(policy.type);

            if (proc.length > 0) {
                policyProcedures.push(proc);

                proc = [];
            }

            proc.push(policy.title);
        }
    });

    // Push the last array into the procedures array
    policyProcedures.push(proc);

    return callback(policyServices, policyProcedures);
}

/**
 * @summary Update the response object with parsed details
 *
 * Update the response object when Ana assigns a chosen variables or
 * when updating the text to display detailed policy information.
 *
 * @function updateContextObject
 * @param {Object} response - JSON response from the conversation service
 */
function updateContextObject(response, userPolicy, callback) {

    var context = response.context; // Store the context for next round of questions

    var services = context.services;
    var procedures = context.procedures;
    var procedure = '';
    var detail = '';
    var procedure_details = {};
    var text = '';

    text = response.output.text[0]; // Only display the first response
    response.output.text = '';

    // Store the user selected detail to narrow down the info
    if (context.chosen_service) {
        var service = context.chosen_service;
        var procedureList;

        console.log("Service: ", service);

        var i = services.indexOf(service);
        procedureList = procedures[i].join(", ");
        context.procedureList = procedureList;
    }

    // Store the user selected procedure to query and create object of details
    if (context.chosen_procedure) {
        procedure = context.chosen_procedure;
        console.log("Procedure:", procedure);
        var policies = userPolicy.policies;

        for (var n = 0; n < policies.length; n++) {
            // ignore case when comparing as procedure in conversation model is all lowercase
            // but the display value for policies has a mixed case.
            if (policies[n].title.toUpperCase() === procedure.toUpperCase()) {
                procedure_details = {
                    "limit": "$" + policies[n].claimLimit,
                    "claimed": "$" + policies[n].amountClaimed,
                    "coverage": policies[n].percentCovered + "%",
                    "term": policies[n].scope,
                    "start": policies[n].startDate,
                    "end": policies[n].endDate,
                    "code": policies[n].code,
                    "claims": policies[n].claims
                };
            }
        }

        context.procedure_details = procedure_details;
    }

    // Do manual conversation for displaying procedure details
    if (context.chosen_detail && context.chosen_procedure) {
        detail = context.chosen_detail;
        procedure_details = context.procedure_details;

        text = "Your " + detail + " for " + procedure + " is " + procedure_details[detail];

        // Also display the amount already claimed when showing coverage detail
        if (detail === "coverage") {
            text = text + " and you have claimed " + procedure_details.claimed + " of " + procedure_details.limit;
        }

        // Null out the chosen variables in context to reset the conversation options
        context.chosen_service = '';
        context.chosen_procedure = '';
        context.chosen_detail = '';

        response.output.text = text;
    }

    response.output.text = text;
    response.context = context;

    return callback(null, response);
}

module.exports = chatbot;
