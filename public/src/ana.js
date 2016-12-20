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

            userMessage(text);

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
    params.user_time = new Date();
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

        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };

    console.log(JSON.stringify(params));
    xhr.send(JSON.stringify(params));
}

function getTimestamp() {
    var d = new Date();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
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
      var name = "Ana";
      bubble.innerHTML = "<div class='anaTitle'>" + name + " | " + getTimestamp() + "</div><div class='ana'>" + text + "</div>";
    } else {
        var name = "John";
        if(context && context.fname && context.fname.length > 0){
          name = context.fname;
        }
        bubble.innerHTML = "<div class='userTitle'>" + name + " | " + getTimestamp() + "</div><div class='user'>" + text + "</div>";
    }

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight; // Move chat down to the last message displayed
    document.getElementById('chatMessage').focus();
}
