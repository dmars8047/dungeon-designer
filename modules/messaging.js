export const MessageType = {
    Information: 0,
    Warning: 1,
    Error: 2,
    Critical: 3
}

export function DisplayMessage(message, duration = 2500, messageType = 0) {
    let messageContainer = document.createElement("div");
    let messageContent = document.createElement("p");
    messageContent.innerHTML = message;
    messageContainer.appendChild(messageContent);

    if (messageType === MessageType.Error) {
        messageContainer.setAttribute("style", "width:60vw;padding:12px;margin:auto;position:absolute;left:0;right:0;top:45%;text-align:center;background-color:#f44336;color:white;");
    }
    else if (messageType === MessageType.Critical) {
        console.error("Critical Error: " + message);
        alert(message);
    }
    else if (messageType === MessageType.Warning) {
        messageContainer.setAttribute("style", "width:60vw;padding:12px;margin:auto;position:absolute;left:0;right:0;top:45%;text-align:center;background-color:#f9d339;color:black;");
    }
    else if (messageType === MessageType.Information) {
        messageContainer.setAttribute("style", "width:60vw;padding:12px;margin:auto;position:absolute;left:0;right:0;top:45%;text-align:center;background-color:#4e84fa;color:white;");
    }
    else {
        console.error("Unknown message type...");
        return;
    }

    setTimeout(function () {
        messageContainer.parentNode.removeChild(messageContainer);
    }, duration);
    document.body.appendChild(messageContainer);
}