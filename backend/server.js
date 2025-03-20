// All imports
import { WebSocketServer } from "ws";
import { checkChannel, checkPerson, addMessagesToDb, getChannelList , deleteMessageInDb, editMessage , deleteForMeDb , lastId , getMessagesForUser} from "./database/helpers.js"

const wss = new WebSocketServer({ port: 8080 });

const clients = {};

// Required for access from anywhere
let aloneText = "You are the only one in the chat, so the message didn't go to anyone.";


console.log("Server open now...")

// Websocket connection 
wss.on('connection', async function (ws) {
    console.log("Websocket connection start");

    ws.on('error', console.error);

    let channelId;
    let userId;
    let channelNameForClose;
    let personNameForClose;

    // The messaging process between clients
    ws.on("message", async (message) => {

        const listeningMessage = JSON.parse(message.toString());

        // Retrieve old channels from database
        if (listeningMessage.command === "request_channel_list") {
            const channelList = await getChannelList();
            ws.send(JSON.stringify({serverCommand: "requestedChannelList" , channelList: channelList}));
        }

        // Get the name parameter from the frontend and check if the person is in the database.
        else if (listeningMessage.command === "sendName") {
            const personName = listeningMessage.name;
            if (!personName) {
                console.error("Name missing.");
                return;
            }
            
            personNameForClose = personName;

            // User in databasede olup olmadigini kontrol et
            userId = await checkPerson(personName);
            console.log("User id => ", userId)
        } 

        // Last channel id sent
        else if(listeningMessage.command === 'sendLastChannelId'){
            const lastChannelId = await lastId();
            ws.send(JSON.stringify({serverCommand: "requestedLastChannelId" ,lastId: lastChannelId }))
        }

        // Get the channelName parameter from the frontend and check if the channel is in the database.
        else if(listeningMessage.command === "sendChannelName"){
            const channelName = listeningMessage.channelName;
            if (!channelName) {
                console.error("Channel name missing.");
                return;
            }

            channelNameForClose = channelName;

            // Create channel.
            createChannel(channelName);   

            // Check if there is a channel on the channel
            channelId = await checkChannel(channelName);  

            // Add user to channel
            addUserToChannel(ws, channelName, personNameForClose);  

            // send welcome message to user
            sendMessage(ws, "message_server", "Server", `Hello ${personNameForClose}, welcome to ${channelName}!` , null , false)    //1
        }

        // Bring old message from database 
        else if(listeningMessage.command === "bringOldMessages"){

            const channelNameForMessage = listeningMessage.channelName;
            const channelIdForMessage = await checkChannel(channelNameForMessage);

            const allMessages = await getMessagesForUser(channelIdForMessage , personNameForClose); //channelId ve username gonderilcek 
            console.log(allMessages)
            ws.send(JSON.stringify({serverCommand: "oldMessagesCame" , allMes: allMessages}))
        }

        // Send message from frontend to database
        else if(listeningMessage.command === "send_text"){
            const text = listeningMessage.message.toString();


            // If there is 1 or less person in the conversation, the message will not be sent.
            if (clients[channelNameForClose].size > 1) {
                
                const {messageText , messageId} = await addMessagesToDb(channelId, userId, text);

                // Send messages to other users in the same channel
                findOtherClient(ws, channelNameForClose, personNameForClose, text , messageId);
                
                // For my messages
                ws.send(JSON.stringify({serverCommand: "myMessages" ,from: personNameForClose , text: text , messageId: messageId , deleted: false}))
            }
            else {
                // You are alone in channel 
                sendMessage(ws, "alone_command", "Server", aloneText , null ,false)
            }
        }

        // Delete for All
        else if(listeningMessage.command === "deleteMessage"){
            const value = listeningMessage.messageId;
            const deletedMes = await deleteMessageInDb(value);

            if (deletedMes.command ==="Deleted") {
                sendToAllClient(personNameForClose, channelNameForClose , value)
            }
            else if(deletedMes.command === "Not deleted"){
                sendTimeError();
            }
        }


        // Edit message
        else if(listeningMessage.command === "editMessage"){
            const editedText = listeningMessage.editedMes;
            const editedTextId = listeningMessage.messageId;
            const sender = listeningMessage.sender;

            const edited = await editMessage(editedTextId , editedText);
            sendToAllClientEditedMes(edited ,channelNameForClose , editedTextId ,sender);
        }


        // Delete the message for the sender only (mark it as deleted for the specific user)
        else if(listeningMessage.command === "deleteForMe"){
            const deletedMessageId = listeningMessage.messageId;
            const sender = listeningMessage.sender;  

            const deletedForMe = await deleteForMeDb(deletedMessageId ,sender);
            ws.send(JSON.stringify({ serverCommand: "deletedForMe", messageId: deletedMessageId}));
        }
    });

    ws.on('close', () => {
        Object.keys(clients).forEach(channel => {
            if (clients[channel].has(ws)) {
                clients[channel].delete(ws);
    
                let closeText = `Client: ${personNameForClose} , channel: ${channel} left the channel.`
                findOtherClient(ws, channel, "Server", closeText);
            }
        });
        console.log(`The ${personNameForClose}'s connection has ended..`);
    });
});




// Create channel.
function createChannel(channelName) {
    if (!clients[channelName]) {
        clients[channelName] = new Set();
    }
    else {
        console.log("Kanal hazirda var")
    }
}


// To add user to channel
function addUserToChannel(ws, channelName, personName) {
    clients[channelName].add(ws);
    console.log(`${personName}, joined the ${channelName} channel.`);
}



// Send message
function sendMessage(ws, serverCommand, fromValue, textValue , messageId , deleted) {
    ws.send(JSON.stringify({ serverCommand, from: fromValue, text: textValue , messageId , deleted}))
}



// To find other clients
function findOtherClient(ws, channelName, personName, text , messageId) {
    clients[channelName].forEach(client => {
        if (client !== ws && client.readyState === 1) {
            const serverCommand = "other_clients";
            console.log("orher client => " ,personName)
            sendMessage(client, serverCommand, personName, text , messageId , false);   
        }
    })
}


// Deleted message return to everyone
function sendToAllClient(personNameForClose, channelName , value){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({serverCommand: "deletedMessage" , from: personNameForClose , text:"" , messageId: value , deleted: true}))
    })
}

// Edited message return to everyone
function sendToAllClientEditedMes(edited , channelName , value , sender){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({serverCommand: "editedMessage" , messageId:value , text: edited , sender:sender}))
    })
}


// Delete message if it has been 1 minute since the message was sent
function sendTimeError(){
    ws.send(JSON.stringify({serverCommand:"timeError"}));
}