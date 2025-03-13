// All imports
import { WebSocketServer } from "ws";
import {checkChannel , checkPerson , addMessagesToDb} from "./database/helpers.js"

const ws = new WebSocketServer({ port: 8080 });

const clients = {};

// Required for access from anywhere
let channelId;
let userId;
let channelNameForClose;
let personNameForClose;
let aloneText = "You are the only one in the chat, so the message didn't go to anyone.";


console.log("Server open now...")

// Websocket connection 
ws.on('connection', function (ws) {
    console.log("Websocket connection start" );

    ws.on('error', console.error);

    // First message but with no text.
    ws.once('message', async (data) => {  
        const { personName, channelName } = JSON.parse(data.toString());  
        if (!personName || !channelName) {
            console.error("Name or channel missing in the data.");
            return;
        }
        
        channelNameForClose = channelName;
        personNameForClose = personName;


        // Create channel.
        createChannel(channelName);
        

        // CHECK IF THERE IS A CHANNEL ON THE CHANNEL
        channelId = await checkChannel(channelName);

        // Channel id dogru mu kontrol etmek icin.
        console.log("Channel id => ", channelId);

    
        // Add user to channel
        addUserToChannel(ws ,channelName , personName);


        // ilk gonderilen mesaj
        sendMessage(ws , "Server" , `Hello ${personName}, welcome to ${channelName}!`)


        // User in databasede olup olmadigini kontrol et
        userId = await checkPerson(personName);
        console.log("User id => " , userId)
        

        // The messaging process between clients
        ws.on("message", async (message) => {
            try {

                const text = message.toString();

                console.log(`[${channelName}] ${personName}: ${text}`);

                // If there is 1 or less person in the conversation, the message will not be sent.
                if(clients[channelName].size > 1){
                    
                    // Send messages to other users in the same channel
                    findOtherClient(ws , channelName , personName , text);


                    const lastMessageValue = await addMessagesToDb(channelId , userId , text);
                    console.log("Last sent message => ", lastMessageValue);
                }
                else{
                    // Kanalda sadece sen varsin mesaji gonder.
                    sendMessage(ws , "Server" , aloneText)
                }

            } catch (error) {
                console.error("Message parse error: ", error);
            }
        });
    });


    ws.on('close', () => {
        Object.keys(clients).forEach(channel => {
            if (clients[channel].has(ws)) {
                clients[channel].delete(ws);
                 
                let closeText = `Client: ${personNameForClose} , channel: ${channel} left the channel.`
                findOtherClient(ws , channel , "Server" , closeText);  
            }
        });
        console.log(`The ${personNameForClose}'s connection has ended..`);
    });

});



// Create channel.
function createChannel(channelName){
    if (!clients[channelName]) {
        clients[channelName] = new Set();
    }
    else{
        console.log("Kanal hazirda var")
    }
}


// To add user to channel
function addUserToChannel(ws , channelName , personName){
    clients[channelName].add(ws); 
    console.log(`${personName}, joined the ${channelName} channel.`);  
}



// Send message
function sendMessage(ws , fromValue , textValue){
    ws.send(JSON.stringify({from : fromValue , text : textValue}))
}



// To find other clients
function findOtherClient(ws , channelName , personName , text){
    clients[channelName].forEach(client => {
    if (client !== ws && client.readyState === 1) { 
        sendMessage(client , personName , text );
        }
    })  
}