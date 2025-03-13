import { WebSocket } from "ws";
import readline from "readline";

// We receive data from the user with the Readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ws = new WebSocket('ws://localhost:8080');

ws.on('error', console.error);

// Send message when connection is established.
ws.on('open', () => {
    console.log("Sunucuya bağlandim.");


    rl.question("Enter your username: ", (name) => {
        rl.question("Which channel would you like to talk to? ", (channel) => {
            // Ilk mesaj 
            const message = JSON.stringify({ personName : name, channelName : channel , text: `I connected to the server. I'm talking on the ${channel} channel...` });
            ws.send(message); 

            // Messages
            rl.on('line', (input) => {
                const message = input ;
                ws.send(message);
            });
        });
    });
});

// Receive incoming message.
ws.on("message", (event) => {
    
    try {
        const message = JSON.parse(event.toString());
        console.log(`${message.from}: ${message.text}`);
    
    }catch (error) {
        if(error instanceof SyntaxError){
            console.log(event.toString())
        }
        else{
            console.log("The message format was incorrect.");
        }
    }
});
