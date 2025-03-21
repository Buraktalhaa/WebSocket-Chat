// Hide channel creation form
export function hideForm(channelName , sendChannelButton , cancelChannelButton){
    channelName.style.display = "none";
    sendChannelButton.style.display = "none";
    cancelChannelButton.style.display = "none";
}


export function openDisabled(textInput , sendText){
    textInput.disabled = false;      
    sendText.disabled = false;  
}

// Hide channel buttons if a channel is selected
export function hideAllButtons(totalButtons) {
    for (let i = 0; i <= totalButtons; i++) {
        const button = document.getElementById(i.toString());
        if (button) {
            button.style.display = "none";  // Butonu görünmez yapar
        }
    }
}


export function cancelBtn(buttonName , textBoxName){
    buttonName.addEventListener('click' , () => {
        console.log("Cancel a basildi");
        textBoxName.value = "";
    })
}