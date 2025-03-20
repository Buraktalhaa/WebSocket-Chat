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

        ws.send(JSON.stringify({ command: 'sendName', name: userName.value}));
        ws.send(JSON.stringify({ command: "request_channel_list" })); 

        console.log(userName.value);

        userName.style.display = "none";
        sendNameButton.style.display = "none";
        cancelButton.style.display = "none";


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

        // CHANNEL LARI BUTON OLARAK GETIRMEK ICIN
        ws.onmessage = (event) => {
            const parsedValue = JSON.parse(event.data.toString());   // duzenlencek

            if (parsedValue.command === "requestedChannelList") {
                parsedValue.channelList.forEach(element => {
                    channelList.push(element)
                    const button = document.createElement('button');
                    button.classList.add("buttonChannel")
                    button.textContent = element;                        
                    button.id = buttonId;
    
                    document.body.appendChild(button)
                    const selectChannel = document.getElementById(buttonId)
                    selectChannel.addEventListener("click", () => {
                        console.log(selectChannel.textContent)   // Burasi duzenlencek
                       
                        ws.send(JSON.stringify({command: 'sendChannelName', channelName: selectChannel.textContent}));
                        ws.send(JSON.stringify({command: 'sendLastChannelId'}))

                        // CHAT ILE ILGILI MESAJLARI GETIR

                        ws.send(JSON.stringify({command: 'bringOldMessages' , channelName: selectChannel.textContent}));

                        formuYokEt(channelName , sendChannelButton , cancelChannelButton)

                        textInput.disabled = false;      
                        sendText.disabled = false;  

                        chatbox(ws)

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

            // DISABLED PROCESS IS REMOVED
            textInput.disabled = false;      
            sendText.disabled = false;     
            
            console.log(sendChannelButton.value)

            formuYokEt(channelName , sendChannelButton , cancelChannelButton);

            // channel i kendi girerse butonlari kaldir 
            ws.send(JSON.stringify({command: 'sendLastChannelId'}))


            chatbox(ws);


        })



        sendText.addEventListener('click', () => {
            // Send new message to server
            const message = textInput.value;
            ws.send(JSON.stringify({ command: "send_text", message }))
            textInput.value = "";
            console.log("script message =>", message)

        })
    });
});




// FONKSIYONLARA BOLMEYE BASLA
function chatbox(ws){
    ws.onmessage = (event) => {   //BUNDAN IKI TANE VAR 

        try {
            // console.log('WebSocket message received', event.data);
            const { command_from, from, text, messageId, deleted } = JSON.parse(event.data.toString());
            const parsedValue = JSON.parse(event.data.toString());   // duzenlencek
            // const command = parsedValue.command;
            console.log(command_from, from, text, messageId, deleted)
            const messageBox = document.querySelector("#messageBox");
            const messageElement = document.createElement('li');

            let buttonId = 0;


            // Kanallari iste
            if (parsedValue.command === "requestedChannelList") {
                parsedValue.channelList.forEach(element => {
                    channelList.push(element)
                    const button = document.createElement('button');
                    button.textContent = element;                        
                    button.id = buttonId;
    
                    document.body.appendChild(button)
                    const selectChannel = document.getElementById(buttonId)
                    selectChannel.addEventListener("click", () => {
                        console.log(selectChannel.textContent)   // Burasi duzenlencek
                    })
                buttonId++;
                });
                console.log(channelList)
            }

            // Channel olusturma istegi olursa hazir channellari kaldir
            else if(parsedValue.command === "requestedLastChannelId"){
                const lastId = parsedValue.lastId;
                console.log("calisti 123" , lastId )
                function hideAllButtons(totalButtons) {
                    for (let i = 0; i <= totalButtons; i++) {
                        const button = document.getElementById(i.toString());
                        if (button) {
                            button.style.display = "none";  // Butonu görünmez yapar
                        }
                    }
                }
                hideAllButtons(lastId)

            }


            // Message from server
            else if (command_from === "message_server") {
                messageElement.textContent = `[${from}]: ${deleted ? "Mesaj silindi" : text}`;
                messageElement.classList.add('text-server')
                messageBox.appendChild(messageElement)
            }


            // MESSAGES FROM THE CLIENTS
            else if (command_from === "other_clients") {
                messageElement.id = messageId;
                messageElement.appendChild(document.createTextNode(`[${from}]: ${text}`))

                // delete button
                const deleteButtonForMe = document.createElement('button');
                deleteButtonForMe.textContent = "Delete for me";
                deleteButtonForMe.classList.add('send-button')
                messageElement.appendChild(deleteButtonForMe)

                deleteButtonForMe.addEventListener("click", (event) => {
                    ws.send(JSON.stringify({ command: "deleteForMe", messageId: messageId, sender: from }))
                    console.log("Client tarafinda benden sil")
                })

                console.log(`[${from}]: ${text}`)
                messageElement.classList.add('text-client')
                messageBox.appendChild(messageElement)
            }

            // You are alone in channel
            else if (command_from === "alone_command") {
                const eventValue = JSON.parse(event.data.toString());
                messageElement.textContent = `[${from}]: ${eventValue.text}`
                messageElement.classList.add('text-server')
                messageBox.appendChild(messageElement)
            }

            // MY OWN MESSAGES
            else if (command_from === "myMessages") {
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
                })
            }

            // Backendden editlenen veri geldikten sonra
            else if (command_from === 'editedMessage') {
                const editedMes = document.getElementById(`${messageId}`);
                const sender = parsedValue.sender;

                // Edit buton tekrar olusturuluyor
                const editButton = document.createElement('button');
                editButton.textContent = "Edit";
                editButton.classList.add('send-button');

                // delete for all button tekrar olusturuluyor
                const deleteButton = document.createElement('button');
                deleteButton.textContent = "Delete for all";
                deleteButton.classList.add('send-button');

                // Editlendi butonu
                const editedTag = document.createElement('span');
                editedTag.textContent = 'Editlendi';
                editedTag.style.fontSize = '10px';
                editedTag.style.color = 'grey';

                // sadece benden sil
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


                    // Benim icin sil e basilinca
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
            else if (command_from === "deletedMessage") {
                const deletedMes = document.getElementById(`${messageId}`)
                deletedMes.innerText = "Silindi..."
            }

            // Mesaji kendinden silme
            else if (command_from === 'deletedForMe') {
                const deletedMessage = document.getElementById(messageId);
                if (deletedMessage) {
                    deletedMessage.textContent = "Mesaji kendinden sildin.";
                }
            }

            else if (command_from === 'timeError') {

            }

            else {
                console.log("hata")
            }
        } catch (error) {
            console.error;
        }
    };
}




function formuYokEt(channelName , sendChannelButton , cancelChannelButton){
    // channel olusturma formunu yok ettik
    channelName.style.display = "none";
    sendChannelButton.style.display = "none";
    cancelChannelButton.style.display = "none";
}