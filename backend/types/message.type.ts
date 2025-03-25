export type MessageType = {
    editedMes: string,
    sender: string,
    channelName:string,
    name:string,
    command:string,
    personName:string,
    messageText:string,
    messageId:number
}

export type ClientsType ={
    clients:Record<string, Set<WebSocket>>
}