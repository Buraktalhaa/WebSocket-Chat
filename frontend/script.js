const newUserButton = document.querySelector("#newUserButton");

const textInput = document.querySelector("#textInput")     // Text(message) input
textInput.disabled = true;

const sendText = document.querySelector("#sendText");   // Button for send text
sendText.disabled = true;

const chatInput = document.querySelector("#chatInput")

let buttonId = 0;
let channelList = []


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
    const sendNameButton = document.querySelector("#sendDataBtn");
    const cancelButton = document.querySelector("#cancelBtn");


    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:8080');

           
    // When click the send button
    sendNameButton.addEventListener('click', (event1) => {
        event1.preventDefault();
          
        if (!userName.value) {
            console.log('Please make sure you have filled in name fiels.');
            return;
        }

        // Send the name value to the server
        ws.send(JSON.stringify({ command: 'sendName', name: userName.value}));

        // Request channels from database
        ws.send(JSON.stringify({ command: "request_channel_list" })); 

        console.log(userName.value);

        // Hide the form after getting the name data
        hideForm(userName , sendNameButton , cancelButton);


        const channelNameForm = `
        <div class="form-container">
            <form action="/submit" method="POST" id="userForm">
                <div>
                    <div class="input-wrapper">
                        <input type="text" placeholder="Channel Name.." name="channelName" id="channelName" required>
                    </div>
                </div>
                <div>
                    <button class="sendBtn" type="button" id="cancelChannelBtn">
                        <span class="sendBtn-content">Cancel</span>
                    </button>
                    <button class="sendBtn" type="submit" id="sendChannelDataBtn">
                        <span class="sendBtn-content">Send</span>
                    </button>
                </div>
            </form>
        </div>
        `;

        const contentContainer = document.querySelector("#contentContainer");
        contentContainer.insertAdjacentHTML('beforeend', channelNameForm);

        const channelName = document.querySelector("#channelName");
        const sendChannelButton = document.querySelector("#sendChannelDataBtn");
        const cancelChannelButton = document.querySelector("#cancelChannelBtn");

        // To display channels as buttons
        ws.onmessage = (event) => {
            const parsedValue = JSON.parse(event.data.toString()); 
            const command = parsedValue.serverCommand;

            // Show channels from database as buttons
            if (command === "requestedChannelList") {
                parsedValue.channelList.forEach(element => {
                    channelList.push(element)
                    const button = document.createElement('button');
                    button.classList.add("buttonChannel")
                    button.textContent = element;                        
                    button.id = buttonId;
                    
                    // add buttons to HTML page
                    document.body.appendChild(button)
                    const selectChannel = document.getElementById(buttonId)
                    selectChannel.addEventListener("click", () => {
                        console.log(selectChannel.textContent) 
                       
                        ws.send(JSON.stringify({command: 'sendChannelName', channelName: selectChannel.textContent}));
                        ws.send(JSON.stringify({command: 'sendLastChannelId'}))

                        // Bring old sent message
                        ws.send(JSON.stringify({command: 'bringOldMessages' , channelName: selectChannel.textContent}));   

                        // Hide the form after getting channel information
                        hideForm(channelName , sendChannelButton , cancelChannelButton)

                        // Disabled process is removed
                        openDisabled(textInput , sendText);
                        
                        chatBox(ws , userName.value)

                    })
                buttonId++;
                });
                console.log(channelList)
            }
        }

        sendChannelButton.addEventListener('click' , (event2) => {
            event2.preventDefault();
            
            if (!channelName.value) {
                console.log('Please make sure you have filled in name fiels.');
                return;
            }

            console.log("ch => " , channelName.value)
            ws.send(JSON.stringify({ command: 'sendChannelName', channelName: channelName.value}));

            //  Disabled process is removed
            openDisabled(textInput , sendText);
    
            // Bring old sent message
            ws.send(JSON.stringify({command: 'bringOldMessages' , channelName: channelName.value}));

            // Hide the form after getting channel information
            hideForm(channelName , sendChannelButton , cancelChannelButton);

            // If the channel information is written by itself, remove the channel buttons
            ws.send(JSON.stringify({command: 'sendLastChannelId'}))

            chatBox(ws , userName.value);
        })

        // SEND MESSAGE
        sendText.addEventListener('click', () => {
            // Send new message to server
            const message = textInput.value;
            ws.send(JSON.stringify({ command: "send_text", message }))
            textInput.value = "";

        })
    });
});


function chatBox(ws ,name){
    ws.onmessage = (event) => {  

        try {
            const { command_from, from, text, messageId, deleted } = JSON.parse(event.data.toString());
            const parsedValue = JSON.parse(event.data.toString());   // duzenlencek

            // Commands came from server
            const command = parsedValue.serverCommand;  

            const messageBox = document.querySelector("#messageBox");
            const messageElement = document.createElement('li');


            // Old message from database
            if(command === "oldMessagesCame"){
                const allMes = parsedValue.allMes; 
                console.log("allmes kontrol" , allMes)
                allMes.forEach(element => {
                    const personName = element.person_name;
                    const messageText = element.message_text;

                    const messageElement = document.createElement("li");
                    messageElement.classList.add('send-button')
                    messageElement.textContent = `[${personName}]: ${messageText}`;
                    messageBox.appendChild(messageElement)
                })
            }

            // If there is a request to create a channel, remove the channel buttons.
            else if(command === "requestedLastChannelId"){
                const lastId = parsedValue.lastId;
                hideAllButtons(lastId)

            }

            // MESSAGE FROM SERVER
            else if (command === "message_server") {
                messageElement.textContent = `[${from}]: ${deleted ? "Mesaj silindi" : text}`;
                messageElement.classList.add('text-server')
                messageBox.appendChild(messageElement)
            }

            // MESSAGES FROM THE CLIENTS
            else if (command === "other_clients") {
                messageElement.id = messageId;
                messageElement.appendChild(document.createTextNode(`[${from}]: ${text}`))

                // delete button
                const deleteButtonForMe = document.createElement('button');
                deleteButtonForMe.textContent = "Delete for me";
                deleteButtonForMe.classList.add('send-button')
                messageElement.appendChild(deleteButtonForMe)

                deleteButtonForMe.addEventListener("click", (event) => {
                    ws.send(JSON.stringify({ command: "deleteForMe", messageId: messageId, sender: name})) // name is paremeter from ws
                })

                console.log(`[${from}]: ${text}`)
                messageElement.classList.add('text-client')
                messageBox.appendChild(messageElement)
            }

            // You are alone in channel
            else if (command === "alone_command") {
                const eventValue = JSON.parse(event.data.toString());
                messageElement.textContent = `[${from}]: ${eventValue.text}`
                messageElement.classList.add('text-server')
                messageBox.appendChild(messageElement)
            }

            // MY OWN MESSAGES
            else if (command === "myMessages") {
                messageElement.id = messageId;
                const sender = from;
                messageElement.appendChild(document.createTextNode(`[Me]: ${text}`))

                // edit  button
                const editButton = document.createElement('button');
                editButton.textContent = "Edit";
                editButton.classList.add('send-button')
                messageElement.appendChild(editButton)

                // Click edit button
                editButton.addEventListener("click", () => {
                    console.log("edit basladi")
                    const editedMes = prompt(`${text}`);
                    ws.send(JSON.stringify({ command: "editMessage", editedMes: editedMes, messageId: messageId, sender: sender }))
                })

                // messageElement.textContent = `[Me]: ${message}`
                messageElement.classList.add('text-my-message')
                messageBox.appendChild(messageElement);


                // delete button for All
                const deleteButton = document.createElement('button');
                deleteButton.textContent = "Delete for all";
                deleteButton.classList.add('send-button')
                messageElement.appendChild(deleteButton)

                // For all
                deleteButton.addEventListener("click", () => {
                    ws.send(JSON.stringify({ command: "deleteMessage", messageId: messageId }))
                    console.log("silmek icin id server a gonderildi", messageId)
                })

                // delete button for me
                const deleteForMeButton = document.createElement('button')
                deleteForMeButton.textContent = "Delete for me";
                deleteForMeButton.classList.add('send-button')
                messageElement.appendChild(deleteForMeButton)

                // For me
                deleteForMeButton.addEventListener('click', () => {
                    ws.send(JSON.stringify({ command: "deleteForMe", messageId: messageId, sender: sender }));
                    console.log("undefined mi kendi mesajlari" , sender)
                })
            }

            // After the edited message comes from the backend
            else if (command === 'editedMessage') {
                const editedMes = document.getElementById(`${messageId}`);
                const sender = parsedValue.sender;

                // Edit button creted after edit
                const editButton = document.createElement('button');
                editButton.textContent = "Edit";
                editButton.classList.add('send-button');

                // Delete for all button creted after edit
                const deleteButton = document.createElement('button');
                deleteButton.textContent = "Delete for all";
                deleteButton.classList.add('send-button');

                // Edit button css
                const editedTag = document.createElement('span');
                editedTag.textContent = 'Editlendi';
                editedTag.style.fontSize = '10px';
                editedTag.style.color = 'grey';

                // Delete for me button creted after edit
                const deleteForMeButton = document.createElement('button');
                deleteForMeButton.textContent = "Delete for me";
                deleteForMeButton.classList.add('send-button');

                // Sender messages
                if (editedMes.classList.contains('text-my-message')) {
                    editedMes.textContent = `[Me]: ${text}`;

                    editedMes.appendChild(editButton);
                    editedMes.appendChild(deleteButton);
                    editedMes.appendChild(deleteForMeButton)
                    editedMes.appendChild(editedTag);

                    // Click edit button
                    editButton.addEventListener("click", () => {
                        const editedMesContent = prompt(`${text}`);
                        ws.send(JSON.stringify({ command: "editMessage", editedMes: editedMesContent, messageId: messageId, sender: sender }));
                    });

                    // Click delete button
                    deleteButton.addEventListener("click", () => {
                        ws.send(JSON.stringify({ command: "deleteMessage", messageId: messageId }));
                    });

                    // Click delete for me
                    deleteForMeButton.addEventListener('click', () => {
                        ws.send(JSON.stringify({ command: "deleteForMe", messageId: messageId, sender: sender }))
                    })
                }

                // Other clients
                else if (editedMes.classList.contains('text-client')) {
                    editedMes.textContent = `[${sender}]: ${text}`;

                    editedMes.appendChild(deleteForMeButton);
                    editedMes.appendChild(editedTag);

                    // Click delete button
                    deleteForMeButton.addEventListener("click", () => {
                        ws.send(JSON.stringify({ command: "deleteForMe", messageId: messageId }));
                    });

                }

                else {
                    console.log("When editing the message , error");
                }

            }
            // 
            else if (command === "deletedMessage") {
                const deletedMes = document.getElementById(`${messageId}`)
                deletedMes.innerText = "Deleted..."
            }

            // Delete for me
            else if (command === 'deletedForMe') {
                const deletedMessage = document.getElementById(messageId);
                if (deletedMessage) {
                    deletedMessage.textContent = "Deleted message for me";
                }
            }

            else if (command === 'timeError') {
                console.log("Time error, message not deleted")
            }

            else {
                console.log("Error")
            }
        } catch (error) {
            console.error;
        }
    };
}



// Hide channel creation form
function hideForm(channelName , sendChannelButton , cancelChannelButton){
    channelName.style.display = "none";
    sendChannelButton.style.display = "none";
    cancelChannelButton.style.display = "none";
}


function openDisabled(textInput , sendText){
    textInput.disabled = false;      
    sendText.disabled = false;  
}

// Hide channel buttons if a channel is selected
function hideAllButtons(totalButtons) {
    for (let i = 0; i <= totalButtons; i++) {
        const button = document.getElementById(i.toString());
        if (button) {
            button.style.display = "none";  // Butonu görünmez yapar
        }
    }
}