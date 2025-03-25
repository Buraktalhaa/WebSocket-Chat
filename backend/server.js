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
        const channelName = listeningMessage.channelName;
        const messageId = listeningMessage.messageId;
        const editedText = listeningMessage.editedMes;
        const sender = listeningMessage.sender;

        switch (listeningMessage.command) {
            // Retrieve old channels from database
            case "request_channel_list":
                const channelList = await getChannelList();
                ws.send(JSON.stringify({
                    serverCommand: "requestedChannelList", 
                    channelList: channelList
                }));
                break;
        
            // Get the name parameter from the frontend and check if the person is in the database
            case "sendName":
                const personName = listeningMessage.name;
                if (!personName) {
                    console.error("Name missing.");
                    return;
                } else {
                    personNameForClose = personName;
                    // Check if the user exists in the database
                    userId = await checkPerson(personName);
                    console.log("User id => ", userId);
                }
                break;
        
            // Last channel ID sent
            case "sendLastChannelId":
                const lastChannelId = await lastId();
                ws.send(JSON.stringify({
                    serverCommand: "requestedLastChannelId", 
                    lastId: lastChannelId
                }));
                break;
            
            // Get the channelName parameter from the frontend and check if the channel is in the database
            case "sendChannelName":
                if (!channelName) {
                    console.error("Channel name missing.");
                    return;
                }
        
                channelNameForClose = channelName;
                // Create channel
                createChannel(channelName);
                // Check if the channel exists
                channelId = await checkChannel(channelName);
                // Add user to the channel
                addUserToChannel(ws, channelName, personNameForClose);
                // Send a welcome message to the user
                sendMessage(ws, "message_server", "Server", `Hello ${personNameForClose}, welcome to ${channelName}!`, null, false);
                break;
        
            // Bring old messages from the database
            case "bringOldMessages":
                const channelIdForMessage = await checkChannel(channelName);
                const allMessages = await getMessagesForUser(channelIdForMessage, personNameForClose);
                console.log(allMessages);
                ws.send(JSON.stringify({
                    serverCommand: "oldMessagesCame", 
                    allMes: allMessages
                }));
                break;
        
            // Send message from frontend to database
            case "send_text":
                const text = listeningMessage.message.toString();
        
                // If there is 1 or less person in the conversation, the message will not be sent
                if (clients[channelNameForClose].size > 1) {
                    const { messageText, messageId } = await addMessagesToDb(channelId, userId, text);
        
                    // Send messages to other users in the same channel
                    findOtherClient(ws, channelNameForClose, personNameForClose, text, messageId);
        
                    // For my messages
                    ws.send(JSON.stringify({
                        serverCommand: "myMessages",
                        from: personNameForClose,
                        text: text,
                        messageId: messageId,
                        deleted: false
                    }));
                } else {
                    // You are alone in the channel
                    const aloneText = "You are the only one in the chat, so the message didn't go to anyone.";
                    sendMessage(ws, "alone_command", "Server", aloneText, null, false);
                }
                break;
        
            // Delete for All
            case "deleteMessage":
                const deletedMes = await deleteMessageInDb(messageId);
        
                if (deletedMes.command === "Deleted") {
                    sendToAllClient(personNameForClose, channelNameForClose, messageId);
                } else if (deletedMes.command === "Not deleted") {
                    sendTimeError();
                }
                break;
        
            // Edit message
            case "editMessage":
                const edited = await editMessage(messageId, editedText);
                sendToAllClientEditedMes(edited, channelNameForClose, messageId, sender);
                break;
        
            // Delete the message for the sender only (mark it as deleted for the specific user)
            case "deleteForMe":
                const deletedMessageId = listeningMessage.messageId;
        
                const deletedForMe = await deleteForMeDb(deletedMessageId, sender);
                ws.send(JSON.stringify({
                    serverCommand: "deletedForMe",
                    messageId: deletedMessageId
                }));
                break;
        
            // Default case for unknown commands
            default:
                console.log("Unknown command:", listeningMessage.command);
                break;
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