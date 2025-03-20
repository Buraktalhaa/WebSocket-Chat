// All imports
import { WebSocketServer } from "ws";
import { checkChannel, checkPerson, addMessagesToDb, getChannelList , deleteMessageInDb, editMessage , deleteForMeDb , lastId} from "./database/helpers.js"

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

        // console.log("deneme", JSON.parse(message.toString()))


        if (listeningMessage.command === "request_channel_list") {
            const channelList = await getChannelList();
            ws.send(JSON.stringify({command: "requestedChannelList" , channelList: channelList}));
            console.log("Request channel list calisti");
        }


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


        else if(listeningMessage.command === 'sendLastChannelId'){
            const lastChannelId = await lastId();
            console.log("son id" , lastChannelId)
            ws.send(JSON.stringify({command: "requestedLastChannelId" ,lastId: lastChannelId }))
        }



        else if(listeningMessage.command === "sendChannelName"){
            
            const channelName = listeningMessage.channelName;
            if (!channelName) {
                console.error("Channel name missing.");
                return;
            }

            channelNameForClose = channelName;

            // Create channel.
            createChannel(channelName);   


            // CHECK IF THERE IS A CHANNEL ON THE CHANNEL
            channelId = await checkChannel(channelName);   

            // Channel id dogru mu kontrol etmek icin.
            console.log("Channel id => ", channelId);  


            // Add user to channel
            addUserToChannel(ws, channelName, personNameForClose);  

            sendMessage(ws, "message_server", "Server", `Hello ${personNameForClose}, welcome to ${channelName}!` , null , false)    //1
        }

        // else if(listeningMessage.command === "bringOldMessages"){
        //     function bringOldMessages(){
        //         const query = 
        //         const value = 
        //     }
        // }


        else if(listeningMessage.command === "send_text"){
            const text = listeningMessage.message.toString();


            // If there is 1 or less person in the conversation, the message will not be sent.
            if (clients[channelNameForClose].size > 1) {
                
                const {messageText , messageId} = await addMessagesToDb(channelId, userId, text);

                // Send messages to other users in the same channel
                findOtherClient(ws, channelNameForClose, personNameForClose, text , messageId);
                
                // For my messages
                ws.send(JSON.stringify({command_from: "myMessages" ,from: personNameForClose , text: text , messageId: messageId , deleted: false}))

                // console.log("Last sent message => ", messageText , messageId);
            }
            else {
                // Kanalda sadece sen varsin mesaji gonder.
                sendMessage(ws, "alone_command", "Server", aloneText , null ,false)
            }
        }

        // Delete for All
        else if(listeningMessage.command === "deleteMessage"){
            const value = listeningMessage.messageId;
            const deletedMes = await deleteMessageInDb(value);
            console.log("Databaseden gelen silindi mesaji => " , deletedMes)
            if (deletedMes.command ==="Silindi") {
                sendToAllClient(personNameForClose, channelNameForClose , value)
            }
            else if(deletedMes.command === "Silinemedi"){
                function sendTimeError(){
                    ws.send(JSON.stringify({command:"timeError"}));
                }
            }
        }


        // Mesaji editleme
        else if(listeningMessage.command === "editMessage"){
            // const sender = listeningMessage.sender;
            // console.log("Sender => " , sender);
            const editedText = listeningMessage.editedMes;
            const editedTextId = listeningMessage.messageId;
            const sender = listeningMessage.sender;

            const edited = await editMessage(editedTextId , editedText);
            sendToAllClientEditedMes(edited ,channelNameForClose , editedTextId ,sender);
        }


        // Mesaji kendinden silme
        else if(listeningMessage.command === "deleteForMe"){
            const deletedMessageId = listeningMessage.messageId;
            const sender = listeningMessage.sender;

            const deletedForMe = await deleteForMeDb(deletedMessageId ,sender);
            ws.send(JSON.stringify({ command_from: "deletedForMe", messageId: deletedMessageId}));
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
function sendMessage(ws, command_from, fromValue, textValue , messageId , deleted) {
    ws.send(JSON.stringify({ command_from, from: fromValue, text: textValue , messageId , deleted}))
}



// To find other clients
function findOtherClient(ws, channelName, personName, text , messageId) {
    clients[channelName].forEach(client => {
        if (client !== ws && client.readyState === 1) {
            const command = "other_clients";
            sendMessage(client, command, personName, text , messageId , false);   
        }
    })
}


function sendToAllClient(personNameForClose, channelName , value){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({command_from: "deletedMessage" , from: personNameForClose , text:"" , messageId: value , deleted: true}))
    })
}


function sendToAllClientEditedMes(edited , channelName , value , sender){
    clients[channelName].forEach(client => {
        client.send(JSON.stringify({command_from: "editedMessage" , messageId:value , text: edited , sender:sender}))
    })
}