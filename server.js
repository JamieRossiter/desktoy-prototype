/*  
    DESKTOY EDGE SERVER
        Description: this is a prototype HTTP server for the prototype desktoy that acts as a bridge between the device and the user
        Date Created: 07/06/22.
        Written by: Jamie Rossiter
*/

/* Global Variables */
const MQTT_TOPIC = "/desktoy/message";
const PORT = process.env.PORT || 80;
const IGNORED_EXTENSIONS = [
    ".png",
    ".ico",
    ".gif",
    ".jpg",
    ".jpeg",
    ".xml",
    ".css",
    ".js"
]
let PUBLISH_SUCCESSFUL = false;

/* Imports */
const mqtt = require("mqtt");
const http = require("http");

/* Initialise MQTT client */
const mqttClient = mqtt.connect("mqtt://broker.emqx.io:1883", {
    username: "emqx",
    password: "public"
});

/* Subscribe to generic topic upon connection */
mqttClient.on("connect", () => {
    console.log(`Established connection with MQTT broker on ${PORT}`);
})

mqttClient.on("message", (topic, message) => {
    console.log(`Message from ${topic}: ${message}`);
    PUBLISH_SUCCESSFUL = true;
})

/* Initialise HTTP Server */
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    // Ignore requests from list of extensions
    let ignoredExtMatched = IGNORED_EXTENSIONS.find(ext => { return req.url.includes(ext)});
    if(!ignoredExtMatched){
        if(req.url != "/"){
            let strippedUrl = stripUrl(req.url);
            let sanitisedMsg = sanitiseMessage(strippedUrl);
            let strSanMsg = JSON.stringify(sanitisedMsg);
            // Subscribe to topic for confirmation of publish
            mqttClient.subscribe(MQTT_TOPIC);
            // Publish message to topic
            mqttClient.publish(MQTT_TOPIC, strSanMsg);
            setTimeout(() => {
                if(PUBLISH_SUCCESSFUL){
                    res.write(`<p>${strippedUrl} was successfully published</p>`);
                    PUBLISH_SUCCESSFUL = false;
                    res.end();
                } else {
                    res.write("<p>Message was not published.</p>");
                    res.end();
                }
            }, 500)
            // Confirm sent message
            console.log("Sent message: " + strSanMsg);
        } else {
            res.write("<h1>Desktoy Prototype Bridge Server</h1>");
            res.end();
        }
    }
    // res.end();
}).listen(PORT);

/* Filter URL artefacts */
const stripUrl = url => {
    let stripped = url;
    if(stripped[0] === "/"){
        stripped = stripped.split("/")[1];
    }
    if(stripped.includes("%20")){
        stripped = stripped.replaceAll("%20", " ");
    }
    return stripped;
}

/* Sanitise message so that it is compatible with an LCD 16x2 */
const sanitiseMessage = message => {

    const charLimit = 31; // Message can only be a maximum of 32 characters long.
    const halfCharLimit = Math.round(Math.floor(charLimit / 2)); // 15
    let finalMessage = {line1: "", line2: ""}; // Final message to be sent to the Arduino.

    // Remove potential whitespaces from message
    message = message.trimStart();
    message = message.trimEnd();

    // Check if message is under character limit
    if(!messageUnderCharLimit(message, charLimit)){
        finalMessage.line1 = "ERROR:";
        finalMessage.line2 = "Msg is too long";
        return finalMessage;
    }

    // Check if message exists
    if(!message.trim().length > 0){
        finalMessage.line1 = "ERROR:";
        finalMessage.line2 = "No msg exists";
        return finalMessage;
    }

    // Populate first line
    for(let f = 0; f < halfCharLimit;  f++){
        if(message.charAt(f)){
            finalMessage.line1 += message.charAt(f);
        }
    }

    // Add a dash (-) if the message is longer than half the char limit, the final character is part of a word, and not a white space
    if((message.length > halfCharLimit) && (message[halfCharLimit] != " ")) finalMessage.line1 += "-"; 

    // Populate second line
    if(message.length > halfCharLimit && message.length <= charLimit){
        for(let s = halfCharLimit; s < charLimit; s++){
            if(message.charAt(s)) finalMessage.line2 += message.charAt(s);
        }
    }

    // Remove potential beginning whitespaces from second line
    finalMessage.line2 = finalMessage.line2.trimStart();

    return finalMessage;
    
}

const messageUnderCharLimit = (message, limit) => {
    return message.length < limit;
}

