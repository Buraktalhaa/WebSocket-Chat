// All imports
import { WebSocketServer } from "ws";
import pkg from 'pg';
const {Pool} = pkg;


const pool = new Pool({
    user: 'postgres',
    password: '267126', 
    host: 'localhost',
    port: 5432,
    database: 'chat_app',
  })

const ws = new WebSocketServer({ port: 8080 });

const clients = {};

// Required for access from anywhere
let channelId;
let userId;
let channelNameForClose;
let personNameForClose;


console.log("Server open now...")

// Websocket connection 
ws.on('connection', function (ws) {
    console.log("Websocket connection start" );

    ws.on('error', console.error);

    // First message but with no text.
    ws.once('message', (data) => {  
        const { personName, channelName } = JSON.parse(data.toString());  //
        if (!personName || !channelName) {
            console.error("Name or channel missing in the data.");
            return;
        }
        
        channelNameForClose = channelName;
        personNameForClose = personName;

        // Create channel.
        if (!clients[channelName]) {
            clients[channelName] = new Set();
        }


        // CHECK IF THERE IS A CHANNEL ON THE CHANNEL
        async function checkChannel(){
            const query = ('SELECT * FROM channel where channel_name = $1 LIMIT 1')
            const value = [channelName];

            const result = await pool.query(query , value)
            
            if(result.rows.length > 0){
                console.log('Channel exists in database.')
                return result.rows[0].id;
            }
            else{
                const addQuery = ('INSERT INTO channel (channel_name) VALUES ($1) RETURNING id');
                const addValue = [channelName];
                const addDb = await pool.query(addQuery , addValue);
                console.log('Channel has been created in the database.')
                return addDb.rows[0].id;
            }
        }
        async function channelDbId() {
            channelId = await checkChannel();
            console.log("Channel id => ", channelId);
        }
        
        channelDbId();
        

        // Add user to channel
        clients[channelName].add(ws); 
        console.log(`${personName}, joined the ${channelName} channel.`);     

        ws.send(JSON.stringify({
            from: "Server",
            text: `Hello ${personName}, welcome to ${channelName}!`     
        }));

        // TO CHECK IF THE USER EXISTS ALREADY
        // Return id value whether it exists or not
        async function checkPerson() {

            const checkNameQuery = ('SELECT * FROM users WHERE person_name = $1');
            const checkNameValue = [personName];
            const addDbPerson = await pool.query(checkNameQuery , checkNameValue);

            // If it doesn't exist, add it to the database.
            if(addDbPerson.rows.length < 1){
                const addUserQuery = ('INSERT INTO users (person_name) VALUES ($1) RETURNING id');
                const addUserValue = [personName]; 

                const addUserDb = await pool.query(addUserQuery , addUserValue);
                console.log(`User = ${personName}, created.`) 
                return addUserDb.rows[0].id;
            }
            else{
                console.log("The user exists in the database.")
                return addDbPerson.rows[0].id;
            }
        }

        // Required for asynchronous operation
        async function userDbId(){
            userId = await checkPerson();
            console.log("User id => " , userId)
        }
        
        userDbId();


        // The messaging process between clients
        ws.on("message", (message) => {
            try {
                // console.log("Data arrived:", data.toString());       // To check if the channel and name data are correct, remove the comment line
                // console.log("Message => " , message.toString())       // To check if the text data is correct, remove the comment line.
                const text = message.toString();

                console.log(`[${channelName}] ${personName}: ${text}`);

                // If there is 1 or less person in the conversation, the message will not be sent.
                if(clients[channelName].size > 1){
                    
                    // Send messages to other users in the same channel
                    clients[channelName].forEach(client => {
                    if (client !== ws && client.readyState === 1) { 
                        client.send(JSON.stringify({ from: personName, text }));
                        }
                    })
                    // Place to add messages to database
                    async function addMessages(){
                        const queryMessage = ('INSERT INTO messages(channel_id , person_id , message_text) VALUES ($1 , $2 , $3) RETURNING message_text');
                        const valueMessage = [channelId , userId , text];

                        const addMessageDb = await pool.query(queryMessage , valueMessage);
                        return addMessageDb.rows[0].message_text;
                    }

                    async function lastMessage(){
                        const lastMessageValue = await addMessages();
                        console.log("Last sent message => ", lastMessageValue);
                    }
                    lastMessage()
                }
                else{
                    ws.send(JSON.stringify({from : "Server" , text : "You are the only one in the chat, so the message didn't go to anyone."}))
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
                console.log(`Client removed from the channel => ${channel}.`);
                
                
                clients[channelNameForClose].forEach(client => {
                    if (client !== ws && client.readyState === 1) { 
                        const clientConEndMes = `[Server] Client: ${personNameForClose} , channel: ${channel} left the channel. `
                        client.send(clientConEndMes);
                    }
                })    
            }
        });
        console.log(`The ${personNameForClose}'s connection has ended..`);
    });

});