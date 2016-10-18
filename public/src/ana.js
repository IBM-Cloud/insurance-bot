"use strict";

// Variables for chat and stored context specific events
var params = {}; // Object for parameters sent to the Watson Conversation service
var watson = 'Ana';
var user = '';
var text = '';
var context;

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
        text = userInput.value; // Using text as a recurring variable through functions
        text = text.replace(/(\r\n|\n|\r)/gm, ""); // Remove erroneous characters

        // If there is any input then check if this is a claim step
        // Some claim steps are handled in newEvent and others are handled in userMessage
        if (text) {

            // Display the user's text in the chat box and null out input box
            displayMessage(text, user);
            userInput.value = '';

            // Ana is on claim step for date or amount. 
            if (context.claim_step === "date") {
                validateDate(text);
            } else if (context.claim_step === "amount") {
                validateAmount(text);
            } else {
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
    params.text = message; // User defined text to be sent to service

    if (context) {
        params.context = context;
    }

    var xhr = new XMLHttpRequest();
    var uri = '/api/ana';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            text = response.output.text; // Only display the first response
            context = response.context; // Store the context for next round of questions

            console.log("Got response from Ana: ", JSON.stringify(response));

            displayMessage(text, watson);

            // File a claim when the step is verify
            if (context.claim_step === "verify") {

                botClaim(context);

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

function botClaim(context) {
    var claimFile = {
        date: null,
        benefit: null,
        provider: null,
        amount: null
    };

    var xhr = new XMLHttpRequest();

    var uri = '/submitClaim';

    claimFile.date = context.claim_date;
    claimFile.benefit = context.claim_procedure;
    claimFile.provider = context.claim_provider;
    claimFile.amount = context.claim_amount;

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function(response) {
        if (xhr.status === 200 && xhr.responseText) {
            var reply = JSON.parse(xhr.responseText);
            console.log("reply is: ", reply);
            if (reply.outcome === 'success') {
                console.log('success');
                displayMessage("Your claim for " + context.claim_amount + " was successfully filed!", watson);
                context.claim_step = '';
                context.claim_date = '';
                context.claim_provider = '';
                context.claim_amount = '';
                context.system = '';
            } else {
                displayMessage("Oh no! Something went wrong. Please try again.", watson);
                context.claim_step = '';
                context.claim_date = '';
                context.claim_provider = '';
                context.claim_amount = '';
                context.system = '';
            }
        } else {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };

    console.log("Submitting claim: ", JSON.stringify(claimFile));
    xhr.send(JSON.stringify(claimFile));
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
    bubble.className = 'message'; // Wrap the text first in a message class for common formatting

    // Set chat bubble color and position based on the user parameter
    if (user === watson) {
        bubble.innerHTML = "<div class='ana'>" + text + "</div>";
    } else {
        bubble.innerHTML = "<div class='user'>" + text + "</div>";
    }

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight; // Move chat down to the last message displayed
    document.getElementById('chatMessage').focus();
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
    date = date.replace(stripPattern, '');

    // Convert most formats to milliseconds
    var userDate = new Date(date);
    console.log(date);

    // If the date is NaN reprompt for correct format
    if (isNaN(userDate)) {
        text = "Invalid date format. Please use YYYY-MM-DD.";
        displayMessage(text, watson);
    } else if (userDate) { // If for some reason there is no date then reprompt
        if (userDate > cDate) { // If user tries to claim a date in the future 
            text = "Sorry, Marty McFly, you can't make a claim in the future. Please try the date again.";
            displayMessage(text, watson);
        } else { // Otherwise format the date to YYYY-MM-DD - Ana will also verify
            var month = '' + (userDate.getMonth() + 1),
                day = '' + (userDate.getUTCDate()),
                year = userDate.getFullYear();

            if (month.length < 2) {
                month = '0' + month;
            }
            if (day.length < 2) {
                day = '0' + day;
            }

            text = [year, month, day].join('-');

            userMessage(text);
        }
    } else {
        text = "Not a valid date. Please enter the date is YYYY-MM-DD.";
        displayMessage(text, watson);
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
 */
function validateAmount(amount) {
    console.log(amount);
    // Strip any non-numerics out
    amount = amount.replace(/[^0-9.]/g, "");

    // Strip decimals down to two
    amount = parseFloat(amount);
    amount = amount.toFixed(2);
    amount = amount.toString();

    userMessage(amount);
}