// Handling for interactions in chat dialog and messages to Watson Conversation

// Define selectors for chat display
var watson = 'Ana';
var user = '';
var context = {};

var params = {
	input: '',
	context: '',
};

function initChat(){
	console.log("Initializing the chat.");
	
	userMessage('');
}

function userMessage(message){
	
	params.input = { text:message };
	params.context = context;
	
	var xhr = new XMLHttpRequest();
	var uri = '/api/ana';
	
	xhr.open('POST', uri, true);
	xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status === 200 && xhr.responseText) {
		  
        var response = JSON.parse(xhr.responseText);
		var text = response.output.text[0];
        context = response.context;
		
		console.log("Got response from Ana: ",response.output.text[0]);
	
		displayMessage(text,watson);
		
      } else {
        console.error('Server error for Conversation');
      }
    };
	
    xhr.onerror = function() {
      console.error('Network error trying to send message!');
    };
	
	console.log(JSON.stringify(params));
	
	xhr.send(JSON.stringify(params));
}

// Display message to the user with formatting depending on if the message is user or Ana
function displayMessage(text,user){
	var chat = document.getElementById('chatBox');
	
	var dom;
	
	var bubble = document.createElement('div');
	bubble.className = 'message';
	
	if(user===watson){
		bubble.innerHTML="<div class='ana'>"+text+"</div>";
	} else {
		bubble.innerHTML = "<div class='user'>"+text+"</div>";
	}
	
	chat.appendChild(bubble);
	chat.scrollTop = chat.scrollHeight;
	
	document.getElementById('chatMessage').focus();
	
	return null;
	
}

// Enter is pressed
function newEvent(e) {
	if (e.which === 13 || e.keyCode === 13){
		console.log("Got user message.");
		
		var userInput = document.getElementById('chatMessage');
		var text = userInput.value;
		text = text.replace(/(\r\n|\n|\r)/gm,"");
		
		if(text){
			
			displayMessage(text,user);
			userInput.value = '';
			userMessage(text);
			
		} else {
			
			console.error("No message.");
			userInput.value = '';
			
			return false;
		}
	}
}