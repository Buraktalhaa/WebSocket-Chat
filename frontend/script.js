const newUserButton = document.querySelector("#newUserButton");

const textInput = document.querySelector("#textInput")     // Text(message) input
textInput.disabled = true;

const sendText = document.querySelector("#sendText");   // Button for send text
sendText.disabled = true;

newUserButton.addEventListener("click", (event) => {
     
    // Just 1 user
    newUserButton.disabled = true;



    // Add form as HTML 
    const formHTML = `
        <div class="form-container">
            <form action="/submit" method="POST" id="userForm">
                <div>
                    <div class="input-wrapper">
                        <input type="text" placeholder="Name.." name="personName" id="personName" required>
                    </div>
                    <div class="input-wrapper">
                        <input type="text" placeholder="Channel.." name="channelName" id="channelName" required>
                    </div>
                </div>
                <div>
                    <button class="sendBtn" type="button" id="cancelBtn">
                        <span class="sendBtn-content">Cancel</span>
                    </button>
                    <button class="sendBtn" type="submit" id="sendDataBtn">
                        <span class="sendBtn-content">Send</span>
                    </button>
                </div>
            </form>
        </div>
    `;


    // Adding the form just above the chat section
    const contentContainer = document.querySelector("#contentContainer");
    contentContainer.insertAdjacentHTML('beforeend', formHTML);

    const userName = document.querySelector("#personName");
    const channelName = document.querySelector("#channelName");
    const sendButton = document.querySelector("#sendDataBtn");
    const cancelButton = document.querySelector("#cancelBtn");

    //
    sendButton.addEventListener('click', (event) => {
        event.preventDefault();  

        // DISABLED PROCESS IS REMOVED
        textInput.disabled = false;
        sendText.disabled = false;

        if (!userName.value || !channelName.value) {
            console.log('Please make sure you have filled in all fields.');
            return; 
        }

        userName.disabled = true;        // User name input disabled
        channelName.disabled = true;     // Channel name input disabled
        sendButton.disabled = true;      // Send button disabled
        cancelButton.disabled = true;    // Cancel button disabled

        const data = {
            personName: userName.value,
            channelName: channelName.value
        };

        // Check data
        console.log("Form data => :", data); 

        // Create WebSocket connection
        const ws = new WebSocket('ws://localhost:8080'); 

        ws.onopen = () => {
            ws.send(JSON.stringify(data)); 
            console.log('Data sent via WebSocket:', data);
        };

        ws.onmessage = (event) => {

            try {
                console.log('WebSocket message received', event.data);
                const {from , text} = JSON.parse(event.data.toString());
                console.log(from , text)


                // MESSAGES FROM THE SERVER
                if(from === "Server"){
                    const messageBox = document.querySelector("#messageBox");
                    const messageElement = document.createElement('li');
                    messageElement.textContent = `[${from}]: ${text}`;
                    messageElement.classList.add('text-server')
                    messageBox.appendChild(messageElement)
                }

                // MESSAGES FROM THE CLIENTS
                else{
                    const messageBox = document.querySelector("#messageBox");
                    const messageElement = document.createElement('li');
                    messageElement.textContent = `[${from}]: ${text}`;
                    messageElement.classList.add('text-client')
                    messageBox.appendChild(messageElement)
                }
    
                
            } catch (error) {
                if(error instanceof SyntaxError){
                    
                    // WARNING MESSAGES
                    console.log(event.data)
                    const messageBox = document.querySelector("#messageBox");
                    const messageElement = document.createElement('li');
                    messageElement.textContent = event.data;
                    messageElement.classList.add('text-server')
                    messageBox.appendChild(messageElement)
                }
                else{
                    console.error;
                }
            }
        };

    
        sendText.addEventListener('click' , () => {


            // Messages from other users
            const messageBox = document.querySelector("#messageBox");
            const messageElement = document.createElement('li');
            
            // Send new message to server
            const message = textInput.value;
            ws.send(message)
            textInput.value = "";
            console.log("script message =>" , message)
            
            // MY OWN MESSAGES
            messageElement.textContent = `[Me]: ${message}`
            messageElement.classList.add('text-my-message')
            messageBox.appendChild(messageElement);
        })
    });
});
