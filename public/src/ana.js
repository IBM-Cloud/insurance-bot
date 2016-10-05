/**
 * This file contains all of the web and hybrid functions for interacting with 
 * Ana and the Watson Conversation service. When API calls are not needed, the
 * functions also do basic messaging between the client and the server. 
 *
 * @summary   Functions for Ana Chat Bot.
 *
 * @link      cloudco.mybluemix.net
 * @since     0.0.1
 * @requires  cloudco.js
 *
 */
 
"use strict";

// Variables for chat and stored context specific events
var procedures;
var service = '';
var procedure = '';
var detail = '';
var procedure_details;
var params = {  // Object for parameters sent to the Watson Conversation service
    input: '',
    context: '',
};
var watson = 'Ana';
var user = '';
var context;  // Very important. Holds all the data for the current point of the chat.

// Variables for log specific events
var chat = [];
var logs = {
    owner: '',
    date: null,
    conversation: '',
    lastContext: {},
    logs: []
};
var responses = [];

/**
 * @summary Enter Keyboard Event.
 *
 * When a user presses enter in the chat input window it triggers the service interactions.
 *
 * @function newEvent
 * @param {Object} e - Information about the keyboard event. 
 */
function newEvent(e) {
	// Only check for a return/enter press - Event 13
    if (e.which === 13 || e.keyCode === 13) {

        var userInput = document.getElementById('chatMessage');
        var text = userInput.value;  // Using text as a recurring variable through functions
        text = text.replace(/(\r\n|\n|\r)/gm, ""); // Remove erroneous characters

        // If there is any input then check if this is a claim step
		// Some claim steps are handled in newEvent and others are handled in userMessage
		if (text) {
			
			// Display the user's text in the chat box and null out input box
            displayMessage(text, user);
            userInput.value = '';
			
			// Ana is on the provider request step of filing a claim
			// For now set the provider to whatever text they enter
			// @todo Remove special characters to avoid injections
			if(context.claim_step==="provider"){
				context.claim_provider=text;
			}
			
			// Ana is on claim step for date or amount. 
            if (context.claim_step === "date") {
                validateDate(text);
            } else if (context.claim_step === "amount") { 
			    validateAmount(text);
			} else {
                chat.push(text);
                userMessage(text);
            }

        } else {

            // Blank user message. Do nothing.
			console.error("No message.");
            userInput.value = '';

            return false;
        }
    }
}

/**
 * @summary JSON Object for Policy.
 *
 * When the user drills down to information about a specific service within a specific 
 * domain (ex. eye wear in vision) then create an object for easy reference by the chat
 * bot when they need to know about their plan. 
 *
 * @function formatPolicy
 * @param {String} procedure - Specific procedure requested. 
 */
function formatPolicy(procedure) {
	// userPolicy object from cloudco.js
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

/**
 * @summary Main User Interaction with Service.
 *
 * Primary function for parsing the conversation context  object, updating the list of 
 * variables available to Ana, handling when a conversation thread ends and resetting the
 * context, and kicking off log generation. 
 *
 * @function userMessage
 * @param {String} message - Input message from user or page load.  
 */
function userMessage(message) {

    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message // User defined text to be sent to service
    }; 
    
    // Add variables to the context as more options are chosen
    if(message === ''){
        params.context = {
            fname: fname,
            lname: lname
        };
    }
    if (context) {
        params.context = context; // Add a context if there is one previously stored
    }
    if (message) {
        params.context.services = "vision, dental, mental, and physical"; // List of services for Ana
    }
    if (procedures) {
        params.context.procedures = procedures; // Append procedures specific to a service chosen
    }
    if (procedure) {
        params.context.details = "limit, claimed, coverage, term, start, end, and code";
    }

    var xhr = new XMLHttpRequest();
    var uri = '/api/ana';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
		
		// Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            var text = response.output.text[0]; // Only display the first response
            context = response.context; // Store the context for next round of questions

            // Store the user selected detail to narrow down the info
            if (context.chosen_service) {
                service = context.chosen_service;

                console.log("Service: ", service);

                var i = policyTypes.indexOf(service);  // policyTypes defined in cloudco.js
                procedures = policyProcedures[i].join(", "); // policyProcedures defined in cloudco.js
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

            // Do manual conversation for displaying procedure details 
            if (context.chosen_detail) {
                detail = context.chosen_detail;
                text = "Your " + detail + " for " + procedure + " is " + procedure_details[detail];

                // Also display the amount already claimed when showing coverage detail
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
			
			// If the context contains a claim_step of verify then submit a claim
			if(context.claim_step==="verify"){
				submitClaim(watson);
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

/**
 * @summary Display Chat Bubble.
 *
 * Formats the chat bubble element based on if the message is from the user or from Ana.
 *
 * @function displayMessage
 * @param {String} text - Text to be dispalyed in chat box.
 * @param {String} user - Denotes if the message is from Ana or the user. 
 * @return null
 */
function displayMessage(text, user) {

    var chat = document.getElementById('chatBox');
    var bubble = document.createElement('div');
    bubble.className = 'message';  // Wrap the text first in a message class for common formatting

    // Set chat bubble color and position based on the user parameter
	if (user === watson) {
        bubble.innerHTML = "<div class='ana'>" + text + "</div>";
    } else {
        bubble.innerHTML = "<div class='user'>" + text + "</div>";
    }

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;  // Move chat down to the last message displayed
    document.getElementById('chatMessage').focus();

    return null;
}

/**
 * @summary Format Log JSON Object.
 *
 * Creates a logFile object from parsed data from Watson Conversation response object 
 * and then determines if the conversation is new or a continuation. 
 *
 * @function formatLog
 * @param  {Object} response - The entire response object from xhr in userMessage().
 * @return {Object} logFile - The parsed response object with past responses.
 */
function formatLog(response) {

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

    responses.push(logFile);  // Push logFile into global responses array

    // Common between startLogs and updateLogs are context and the updated logs array
    logs.lastContext = context;
    logs.logs = responses;

    // Create a log on the first chat message, update for every message after
    if (chat.length === 1) {
        handleLogs(true);
    } else if (chat.length > 1) {
        handleLogs(false);
    }
	
	return logFile;
}

/**
 * @summary Create and Update Log Documents.
 *
 * Creates a new logs object with owner, current date/time, conversation id, and 
 * the contents of the global responses array. Updates existing logs with new 
 * responses array.
 *
 * @function handleLogs
 * @param  {Boolean} status - True for new log, False for existing.
 * @return null
 */
function handleLogs(status) {
	var errorText = '';
	var successText = '';

	if(status === true) {
		// Set attributes for new log file with user details
        logs.owner = userPolicy.owner;                // Email address of the user
        logs.date = new Date();                       // Rough start date/time of conversation
        logs.conversation = context.conversation_id;  // Current conversation id from context
	
	    successText = 'New log file created for: '+logs.conversation;
		errorText = 'Failed to create a new log file in MongoDB. Check server.';
	} else if(status === false) {
		
		successText = 'Log file updated';
		errorText = 'Failed to update log file in MongoDB. Check server.';
	}

    var xhr = new XMLHttpRequest();
    var uri = '/api/chatlogs';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            console.log(successText);
        } else if (xhr.status !== 200) {
            console.error(errorText);
        }
    };

    xhr.send(JSON.stringify(logs));

    return;
}

/**
 * @summary Validate Date Input.
 *
 * Parses and converts the date down to a YYYY-MM-DD format for creating a 
 * valid claim document. 
 *
 * @function validateDate
 * @param  {String} date - User entered date from chat dialog. 
 * @return {String} text - Formatted string passed to Ana. 
 */
function validateDate(date) {
	
	// Set current date for checking if user is trying to claim in the future
    var cDate = new Date();
	
	// Strip modifiers for dates and the phrase 'of'
	var stripPattern = /(th|rd|nd|st|of)/gi;
	date = date.replace(stripPattern,'');
	
	// Convert most formats to milliseconds
	var userDate = new Date(date);
	
	// If the date is NaN reprompt for correct format
	if(isNaN(userDate)){
		var text = "Invalid date format. Please use YYYY-MM-DD.";
		displayMessage(text,watson);
	} else if (userDate) { // If for some reason there is no date then reprompt
        if (userDate > cDate) { // If user tries to claim a date in the future 
            var text = "Sorry, Marty McFly, you can't make a claim in the future. Please try the date again.";
            displayMessage(text, watson);
        } else { // Otherwise format the date to YYYY-MM-DD - Ana will also verify
            var month = '' + (userDate.getMonth() + 1),
			    day = '' + (userDate.getDate()),
                year = userDate.getFullYear();
  
            if (month.length < 2){
				 month = '0' + month;
			}
            if (day.length < 2){
				day = '0' + day;
			}

            var text = [year, month, day].join('-');
			
			context.claim_date = text; // Store the date for future use
			
            userMessage(text);
			
			return text;
        }
    } else {
		var text = "Not a valid date. Please enter the date is YYYY-MM-DD.";
		displayMessage(text,watson);
	}
}

/**
 * @summary Create Valid Float Type.
 *
 * Trims the user input for the claim amount to a decimal/float type for entry
 * into a claim document. 
 *
 * @function validateAmount
 * @param  {String} amount - User entered claim amount from chat dialog.
 * @return {String} amount - Formatted string for decimal amount passed to Ana. 
 */
function validateAmount(amount) {
	console.log(amount);
	// Strip any non-numerics out
	amount = amount.replace(/[^0-9.]/g,"");
	
	// Strip decimals down to two
	amount = parseFloat(amount);
	amount = amount.toFixed(2);
	amount = amount.toString();
	
	context.claim_amount = amount;
	userMessage(amount);
	
	return amount;
}