import { checkChannel, checkPerson, addMessagesToDb, getChannelList, deleteMessageInDb, editMessage, deleteForMeDb, lastId, getMessagesForUser } from "./database/helpers.js";
import { WebSocket } from "ws";
import { MessageType , ClientsType } from "./types/message.type.js";



class MessageHandler {
    async handleMessage(ws:WebSocket, data:MessageType , clients:ClientsType) {
        console.log(data)
        const editedText = data.editedMes;
        const sender = data.sender;
        const channelName = data.channelName;
        const name = data.personName;
        const command = data.command;
        const messageId = data.messageId;
        const messageText = data.messageText;

        
        switch (command) {
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
                const personName = data.name;
                if (!personName) {
                    console.error("Name missing.");
                    return;
                } else {
                    // Check if the user exists in the database
                    const userId = await checkPerson(personName);
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
                // Create channel
                createChannel(channelName, clients);
                // Check if the channel exists
                const channelId = await checkChannel(channelName);
                // Add user to the channel
                addUserToChannel(ws, channelName, name, clients);
                // Send a welcome message to the user
                sendMessage(ws, "message_server", "Server", `Hello ${name}, welcome to ${channelName}!`, false, undefined);
                break;
        
            // Bring old messages from the database
            case "bringOldMessages":
                const channelIdForMessage = await checkChannel(channelName);
                const allMessages = await getMessagesForUser(channelIdForMessage, name);
                console.log(allMessages);
                ws.send(JSON.stringify({ serverCommand: "oldMessagesCame",  allMes: allMessages }));
                break;
        
            // Send message from frontend to database
            case "send_text":
                const text = messageText;
                const channelId2 = await checkChannel(channelName);
                console.log("kontrol", channelName)
                const userId2 = await checkPerson(name);
        
                // If there is 1 or less person in the conversation, the message will not be sent
                if (clients[channelName].size > 1) {
                    const { messageText, messageId } = await addMessagesToDb(channelId2, userId2, text);
        
                    // Send messages to other users in the same channel
                    findOtherClient(ws, channelName, name, text,clients, messageId);
        
                    // For my messages
                    ws.send(JSON.stringify({ serverCommand: "myMessages", from: name, text: text, messageId:messageId, deleted: false }));
                } else {
                    // You are alone in the channel
                    const aloneText = "You are the only one in the chat, so the message didn't go to anyone.";
                    sendMessage(ws, "alone_command", "Server", aloneText, false, undefined);
                }
                break;
        
            // Delete for All
            case "deleteMessage":
                const deletedMes = await deleteMessageInDb(messageId);
                if(deletedMes === undefined){
                    return 
                }
        
                if (deletedMes.command === "Deleted") {
                    sendToAllClient(name, channelName, messageId, clients);
                } else if (deletedMes.command === "Not deleted") {
                    sendTimeError(ws);
                }
                break;
        
            // Edit message
            case "editMessage":
                const edited = await editMessage(messageId, editedText);
                sendToAllClientEditedMes(edited, channelName, messageId, sender, clients);
                break;
        
            // Delete the message for the sender only (mark it as deleted for the specific user)
            case "deleteForMe":
                const deletedMessageId = data.messageId;
        
                const deletedForMe = await deleteForMeDb(deletedMessageId, sender);
                ws.send(JSON.stringify({
                    serverCommand: "deletedForMe",
                    messageId: deletedMessageId
                }));
                break;
        
            // Default case for unknown commands
            default:
                console.log("Unknown command:", data.command);
                break;
        }
        
    }    
}

export { MessageHandler };

// Create channel.
function createChannel(channelName:string, clients:ClientsType) {
    if (!clients[channelName]) {
        clients[channelName] = new Set();
    }
    else {
        console.log("Kanal hazirda var")
    }
}

// To add user to channel
function addUserToChannel(ws:WebSocket, channelName:string, personName:string, clients:ClientsType) {
    clients[channelName].add(ws);
    console.log(`${personName}, joined the ${channelName} channel.`);
}

// Send message
function sendMessage(ws:WebSocket, serverCommand:string, fromValue:string, textValue:string, deleted:boolean, messageId?:number ) {
    ws.send(JSON.stringify({ serverCommand, from: fromValue, text: textValue , messageId , deleted}))
}

// To find other clients
function findOtherClient(ws:WebSocket, channelName:string, personName:string, text:string, clients:ClientsType, messageId?:number) {
    clients[channelName].forEach(client => {
        if (client !== ws && client.readyState === 1) {
            const serverCommand = "other_clients";
            console.log("other client => " ,personName)
            sendMessage(client, serverCommand, personName, text ,false, messageId);   
        }
    })
}

// Deleted message return to everyone
function sendToAllClient(personNameForClose:string, channelName:string , value:number, clients:ClientsType){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({serverCommand: "deletedMessage" , from: personNameForClose , text:"" , messageId: value , deleted: true}))
    })
}

// Edited message return to everyone
function sendToAllClientEditedMes(edited:string , channelName:string , value:number , sender:string, clients:ClientsType){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({serverCommand: "editedMessage" , messageId:value , text: edited , sender:sender}))
    })
}

// Delete message if it has been 1 minute since the message was sent
function sendTimeError(ws:WebSocket){
    ws.send(JSON.stringify({serverCommand:"timeError"}));
}