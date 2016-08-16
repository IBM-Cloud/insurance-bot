// Handling for interactions in chat dialog and messages to Watson Conversation
// Define selectors for chat display
var watson = 'Ana';
var user = '';
var context;

// Null out stored variables for user selected options in chat
var procedures;
var service = '';
var procedure = '';
var procedure_details;

var params = {
    input: '',
    context: '',
};

console.log(services);

function initChat() {

    console.log("Initializing the chat.");
    userMessage('');
}

function userMessage(message) {
    message = message.toLowerCase();

    // Set paramters for payload to Watson Conversation
    params.input = {
        text: message
    }; // User defined text

    // Add variables to the context as more options are chosen
	if(context){
		params.context = context; // Previously defined context object 
	}
    if (message) {
        params.context.services = policyTypes.join(", ");
    }
    if (procedures) {
        params.context.procedures = procedures;
    }
    if (procedure) {
        params.context.details = policyDetails.join(", ");
    }

    var xhr = new XMLHttpRequest();
    var uri = '/api/ana';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            var text = response.output.text[0]; // Only display the first response in conversation loops
            context = response.context; // Store the context for next round of questions

            // Store the user selected service to query and create array of procedures from policyProcedures
            if (context.chosen_service) {
                service = context.chosen_service;

                console.log("Service: ", service);

                var i = policyTypes.indexOf(service);
                procedures = policyProcedures[i].join(", ");

            }

            // Store the user selected procedure to query and create array of details from userPolicy
            if (context.procedure) {
                procedure = context.procedure;
                console.log("Procedure:", procedure);

                var policies = userPolicy.policies;

                for (var n = 0; n < policies.length; n++) {

                    if (policies[n].title === procedure) {
                        procedure_details = {
                            "limit": "$" + policies[n].claimLimit,
                            "claimed": "$" + policies[n].amountClaimed,
                            "coverage": policies[n].percentCovered + "%",
                            "term": policies[n].scope,
                            "start": policies[n].startDate,
                            "end": policies[n].endDate,
                            "code": policies[n].code
                        };
                    }

                }
            }

            console.log("Got response from Ana: ", JSON.stringify(response));

            displayMessage(text, watson);

            if (context.chosen_detail) {
                var detail = context.chosen_detail;
                var text = "Your " + detail + " is " + procedure_details[detail];

                displayMessage(text, watson);
            }

        } else {
            console.error('Server error for Conversation. Return status of: ',xhr.statusText);
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

// Enter is pressed
function newEvent(e) {
    if (e.which === 13 || e.keyCode === 13) {

        var userInput = document.getElementById('chatMessage');
        var text = userInput.value;
        text = text.replace(/(\r\n|\n|\r)/gm, "");

        if (text) {

            displayMessage(text, user);
            userInput.value = '';
            userMessage(text);

        } else {

            console.error("No message.");
            userInput.value = '';

            return false;
        }
    }
}
