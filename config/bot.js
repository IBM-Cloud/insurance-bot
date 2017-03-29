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
var fs = require('fs');

// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};

var conversationWorkspace, conversation;

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

    if (appEnv.services.conversation) {
        initConversation();
    } else {
        console.error("No Watson conversation service exists");
    }
}

// =====================================
// CLOUDANT SETUP ======================
// =====================================
//var cloudantURL = process.env.CLOUDANT_URL;
var dbname = "logs";
var Logs;

function initCloudant() {
    var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("insurance-bot-db").url;
    var Cloudant = require('cloudant')({
      url: cloudantURL,
      plugin: 'retry',
      retryAttempts: 10,
      retryTimeout: 500
    });
    // Create the accounts Logs if it doesn't exist
    Cloudant.db.create(dbname, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dbname);
        } else {
            console.log("New database created: ", dbname);
        }
    });
    Logs = Cloudant.db.use(dbname);
}

// =====================================
// CREATE THE SERVICE WRAPPER ==========
// =====================================
// Create the service wrapper
function initConversation() {

    var conversationCredentials = appEnv.getServiceCreds("insurance-bot-conversation");
    console.log(conversationCredentials);
    var conversationUsername = process.env.CONVERSATION_USERNAME || conversationCredentials.username;
    var conversationPassword = process.env.CONVERSATION_PASSWORD || conversationCredentials.password;
    var conversationURL = process.env.CONVERSATION_URL || conversationCredentials.url;

    conversation = watson.conversation({
        url: conversationURL,
        username: conversationUsername,
        password: conversationPassword,
        version_date: '2016-07-11',
        version: 'v1'
    });

    // check if the workspace ID is specified in the environment
    conversationWorkspace = process.env.CONVERSATION_WORKSPACE;

    // if not, look it up by name or create one
    if (!conversationWorkspace) {
      const workspaceName = 'Ana';
      console.log('No conversation workspace configured in the environment.');
      console.log(`Looking for a workspace named '${workspaceName}'...`);
      conversation.listWorkspaces((err, result) => {
        if (err) {
          console.log('Failed to query workspaces. Conversation will not work.', err);
        } else {
          const workspace = result.workspaces.find(workspace => workspace.name === workspaceName);
          if (workspace) {
            conversationWorkspace = workspace.workspace_id;
            console.log("Using Watson Conversation with username", conversationUsername, "and workspace", conversationWorkspace);
          } else {
            console.log('Importing workspace from ./conversation/Ana.json');
            // create the workspace
            const anaWorkspace = JSON.parse(fs.readFileSync('./conversation/Ana.json'));
            // force the name to our expected name
            anaWorkspace.name = workspaceName;
            conversation.createWorkspace(anaWorkspace, (createErr, workspace) => {
              if (createErr) {
                console.log('Failed to create workspace', err);
              } else {
                conversationWorkspace = workspace.workspace_id;
                console.log(`Successfully created the workspace '${workspaceName}'`);
                console.log("Using Watson Conversation with username", conversationUsername, "and workspace", conversationWorkspace);
              }
            });
          }
        }
      });
    } else {
      console.log('Workspace ID was specified as an environment variable.');
      console.log("Using Watson Conversation with username", conversationUsername, "and workspace", conversationWorkspace);
    }
}

// =====================================
// REQUEST FOR ANA =====================
// =====================================
// Allow clients to interact with Ana
var chatbot = {
    sendMessage: function(req, callback) {
        var userPolicy = req.session.userPolicy;
        var owner = req.user.username;

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

                chatLogs(owner, conv, res, () => {
                  return callback(null, res);
                });

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
                            chatLogs(owner, conv, res, () => {
                              return callback(null, res);
                            });
                        } else {
                          return callback(null, res);
                        }
                    });
                });
            }

        });
    }
};

// ===============================================
// LOG MANAGEMENT FOR USER INPUT FOR ANA =========
// ===============================================
function chatLogs(owner, conversation, response, callback) {

    console.log("Response object is: ", response);

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
    var doc = {};

    Logs.find({
        selector: {
            'conversation': conversation
        }
    }, function(err, result) {
        if (err) {
            console.log("Couldn't find logs.");
            callback(null);
        } else {
            doc = result.docs[0];

            if (result.docs.length === 0) {
                console.log("No log. Creating new one.");

                doc = {
                    owner: owner,
                    date: date,
                    conversation: conversation,
                    lastContext: response.context,
                    logs: []
                };

                doc.logs.push(logFile);

                Logs.insert(doc, function(err, body) {
                    if (err) {
                        console.log("There was an error creating the log: ", err);
                    } else {
                        console.log("Log successfull created: ", body);
                    }
                    callback(null);
                });
            } else {
                doc.lastContext = response.context;
                doc.logs.push(logFile);

                Logs.insert(doc, function(err, body) {
                    if (err) {
                        console.log("There was an error updating the log: ", err);
                    } else {
                        console.log("Log successfull updated: ", body);
                    }
                    callback(null);
                });
            }
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
    var userTime = req.body.user_time;
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
            if (userTime) {
                console.log("Using user local time as reference for relative operations");
                cDate = new Date(userTime);
            }

            console.log("Reference date:", cDate);
            userDate = chrono.parseDate(date, cDate);

            // If the date is NaN reprompt for correct format
            if (isNaN(userDate)) {
                reprompt.message = "That doesn't look like a date. Please try again.";
                return callback(null, reprompt);
            } else if (userDate) {
                userDate.setHours(cDate.getHours());
                userDate.setMinutes(cDate.getMinutes());
                userDate.setSeconds(cDate.getSeconds());
                userDate.setMilliseconds(cDate.getMilliseconds());
                console.log("Date:", userDate);
                // If user tries to claim a date in the future
                if (userDate.getTime() > cDate.getTime()) {
                    reprompt.message = "Sorry, Marty McFly, you can't make a claim in the future. Please try the date again.";
                    return callback(null, reprompt);
                } else { // Otherwise format the date to YYYY-MM-DD - Ana will also verify
                    var month = '' + (userDate.getUTCMonth() + 1),
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
            fname: req.user.fname,
            lname: req.user.lname
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
