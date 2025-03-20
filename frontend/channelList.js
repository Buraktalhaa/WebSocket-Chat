
let channelList =[]

const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    ws.send(JSON.stringify({ command: "request_channel_list" }));
}


ws.onmessage = (event) => {
    const channels = JSON.parse(event.data.toString());
    let buttonId = 0;
    if (channels.command === "requestedChannelList") {
        channels.channelList.forEach(element => {
            channelList.push(element)
            const button = document.createElement('button');
            button.textContent = element;
            button.id = buttonId;

            document.body.appendChild(button)
            const selectChannel = document.getElementById(buttonId)
            selectChannel.addEventListener("click" , () => {
                console.log(selectChannel.textContent)
            })

            buttonId++;
        });
        console.log(channelList)
    }
}



// Veriler geldi artik channellari bolcez
