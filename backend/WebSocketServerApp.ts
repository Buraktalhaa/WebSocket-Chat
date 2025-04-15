import { WebSocketServer, WebSocket} from "ws";
import { MessageHandler } from "./MessageHandler.js";
import { ClientsType } from "./types/message.type.js";
import { config } from "./config/config.js";

class WebSocketServerApp {
    private port: number;
    public wss: WebSocketServer;
    public clients:ClientsType ;
    public messageHandler: MessageHandler;

    constructor(port: number) {
        console.log("WebSocketServerApp start");
        this.port = port;
        this.wss = new WebSocketServer({ port: this.port });
        this.clients = {}; 
        this.messageHandler = new MessageHandler(); 

        console.log(`Server started on port ${this.port}`);

        this.wss.on("connection", (ws) => this.onConnection(ws));
    }

    onConnection(ws:WebSocket) {
        console.log("New client connected");
        ws.on("message", (message:string) => {
            this.onMessage(ws, message)}
        );

        ws.on("close", () => {
            this.onClose(ws)});

        ws.on("error", console.error);
    }

    onMessage(ws:WebSocket, message:string) {
        try {
            const data = JSON.parse(message.toString());
            this.messageHandler.handleMessage(ws, data, this.clients);
        } catch (err) {
            console.error("Error parsing message:", err);
            ws.send(JSON.stringify({ serverCommand: "error", message: "Invalid message format" }));
        }
    }
    

    onClose(ws: WebSocket) {
        Object.keys(this.clients).forEach(channel => {
            if (this.clients[channel].has(ws)) {
                this.clients[channel].delete(ws);
                console.log(`Client disconnected from ${channel}`);
            }
        });
    }
}

export { WebSocketServerApp };
