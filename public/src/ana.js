"use strict";

// Handling for interactions in chat dialog and messages to Watson Conversation
// Define selectors for chat display
var watson = 'Ana';
var user = '';
var context;

// Variables for the logs
var chat = [];
var logs = {
    owner: '',
    date: null,
    conversation: '',
    lastContext: {},
    logs: []
};
var responses = [];

// Null out stored variables for user selected options in chat
var procedures;
var service = '';
var procedure = '';
var detail = '';
var procedure_details;

var params = {
    input: '',
    context: '',
};

function initChat() {

    console.log("Initializing the chat.");
    userMessage('');
}

function formatPolicy(procedure) {
    var policies = userPolicy.policies;

    for (var i = 0; i < policies.length; i++) {
        if (policies[i].title === procedure) {
            procedure_details = {
                "limit": "$" + policies[i].claimLimit,
                "claimed": "$" + policies[i].amountClaimed,
                "coverage": policies[i].percentCovered + "%",
                "term": policies[i].scope,
                "start": policies[i].startDate,
                "end": policies[i].endDate,
                "code": policies[i].code,
                "claims": policies[i].claims
            };
        }
    }
}

function userMessage(message) {

    message = message.toLowerCase();

    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message
    }; // User defined text

    // Add variables to the context as more options are chosen
    if (context) {
        params.context = context; // Previously defined context object 
    }
    if (message) {
        params.context.services = "vision, dental, mental, and physical";
    }
    if (procedures) {
        params.context.procedures = procedures;
    }
    if (procedure) {
        params.context.details = "limit, claimed, coverage, term, start, end, and code";
    }

    var xhr = new XMLHttpRequest();
    var uri = '/api/ana';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            var text = response.output.text[0]; // Only display the first response
            context = response.context; // Store the context for next round of questions

            // Store the user selected detail to narrow down the info
            if (context.chosen_service) {
                service = context.chosen_service;

                console.log("Service: ", service);

                var i = policyTypes.indexOf(service);
                procedures = policyProcedures[i].join(", ");
            }

            // Store the user selected procedure to query and create array of details
            if (context.chosen_procedure) {
                procedure = context.chosen_procedure;
                console.log("Procedure:", procedure);

                formatPolicy(procedure);
            }

            console.log("Got response from Ana: ", JSON.stringify(response));

            // Start a log file for the conversation and update with each new user input
            if (response.input.text) {
                formatLog(response);
            }

            // Do manual conversation for things that don't need to route back to the service
            if (context.chosen_detail) {
                detail = context.chosen_detail;
                text = "Your " + detail + " for " + procedure + " is " + procedure_details[detail];

                if (detail === "coverage") {
                    text = text + " and you have claimed " + procedure_details.claimed + " of " + procedure_details.limit;
                }

                // Null out the context to reset the conversation options
                context = '';
                procedure = '';

                displayMessage(text, watson);
            } else {
                displayMessage(text, watson);
            }

        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    console.log(JSON.stringify(params));

    xhr.send(JSON.stringify(params));
}

// Display message to the user with formatting depending on if the message is user or Ana
function displayMessage(text, user) {

    var chat = document.getElementById('chatBox');
    var bubble = document.createElement('div');
    bubble.className = 'message';

    if (user === watson) {
        bubble.innerHTML = "<div class='ana'>" + text + "</div>";
    } else {
        bubble.innerHTML = "<div class='user'>" + text + "</div>";
    }

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;

    document.getElementById('chatMessage').focus();

    return null;
}

function formatLog(response) {

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

    responses.push(logFile);

    logs.lastContext = context;
    logs.logs = responses;

    if (chat.length === 1) {
        startLogs();
    } else if (chat.length > 1) {
        updateLogs();
    }
}

function startLogs() {

    // Set attributes for new log file with user details
    logs.owner = userPolicy.owner;
    logs.date = new Date();
    logs.conversation = context.conversation_id;

    var xhr = new XMLHttpRequest();
    var uri = '/api/chatlogs';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {

            console.log("Log created");

        } else if (xhr.status !== 200) {
            console.error("Failed to create a new log file in MongoDB. Check server.");
        }
    };
	
    xhr.send(JSON.stringify(logs));

    return;
}

function updateLogs() {

    var xhr = new XMLHttpRequest();
    var uri = '/api/chatlogs';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {

            console.log("Log file updated");

        } else if (xhr.status !== 200) {
            console.error("Failed to update log file in MongoDB. Check server.");
        }
    };

    xhr.send(JSON.stringify(logs));

    return;
}

// Enter is pressed
function newEvent(e) {
    if (e.which === 13 || e.keyCode === 13) {

        var userInput = document.getElementById('chatMessage');
        var text = userInput.value;
        text = text.replace(/(\r\n|\n|\r)/gm, "");

        if (text) {

            displayMessage(text, user);
            userInput.value = '';
            chat.push(text);

            userMessage(text);

        } else {

            console.error("No message.");
            userInput.value = '';

            return false;
        }
    }
}