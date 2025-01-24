// Initialisation de la connexion avec OBS
const OBS_WEBSOCKET_URL = "ws://localhost:4455";
const OBS_PASSWORD = "pnjbFLehbi9sxyj1";

// Chemins des images
const assets = {
    gardok: {
        portraitOn: "assets/portrait_gardok_on.png",
        portraitOff: "assets/portrait_gardok_off.png",
        frameOn: "assets/frame_on.png",
        frameOff: "assets/frame_off.png",
    },
    meren: {
        portraitOn: "assets/portrait_meren_on.png",
        portraitOff: "assets/portrait_meren_off.png",
        frameOn: "assets/frame_on.png",
        frameOff: "assets/frame_off.png",
    },
};

let socket;

// WebSocket connection
function connectToOBS() {
    socket = new WebSocket(OBS_WEBSOCKET_URL);

    socket.onopen = () => {
        console.log("Connection to OBS WebSocket successful !");
        startAudioMonitoring();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Message received from OBS :", message);
        handleOBSMessage(message);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error :", error);
    };

    socket.onclose = () => {
        console.log("Connection to OBS WebSocket closed. Try to reconnect...");
        setTimeout(connectToOBS, 5000);
    };
}

function handleOBSMessage(message) {
    switch (message.op) {        
        case 5: // OBS events
            console.log("message received :", message)
            if (message.d.eventType === "InputVolumeMeter") {
                handleAudioLevelUpdate(message.d.eventData);
            }
            break;
        
        default:
            console.log("OBS WebSocket message unprocessed :", message);
    }
}

function startAudioMonitoring() {
    // Subscription to audio level events
    const subscribeRequest = {
        op: 6,
        d: {
            eventSubscriptions: 1 << 1,
        },
    };
    socket.send(JSON.stringify(subscribeRequest));
    console.log("Subscription request sent :", subscribeRequest);
}

function handleAudioLevelUpdate(eventData) {
    const { inputName, inputLevels } = eventData;

    if (inputName === "audioMeren") {
        updateVisuals(inputLevels.mul, "meren");
    } else if (inputName === "audioGardok") {
        updateVisuals(inputLevels.mul, "gardok");
    }
}

function updateVisuals(level, character) {
    const minVolumeThreshold = 0.05;
    const assetsForCharacter = assets[character];
    const portraitElement = document.getElementById(`${character}-portrait`);
    const frameElement = document.getElementById(`${character}-frame`);

    if (level > minVolumeThreshold) {
        portraitElement.src = assetsForCharacter.portraitOn;
        frameElement.src = assetsForCharacter.frameOn;
    } else {
        portraitElement.src = assetsForCharacter.portraitOff;
        frameElement.src = assetsForCharacter.frameOff;
    }
}

// Establish connection
connectToOBS();
