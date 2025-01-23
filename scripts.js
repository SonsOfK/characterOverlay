// Initialisation de la connexion avec OBS
const OBS_WEBSOCKET_URL = "ws://localhost:4455";
const OBS_PASSWORD = "pnjbFLehbi9sxyj1";

let socket;

// WebSocket connection
function connectToOBS() {
    socket = new WebSocket(OBS_WEBSOCKET_URL);

    socket.onopen = () => {
        console.log("Connection to OBS WebSocket successful !");
        authenticateWithOBS();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
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

// Authentication
function authenticateWithOBS() {
    const authRequest = {
        op: 1,
        d: {
            rpcVersion: 1,
            authentication: OBS_PASSWORD,
        },
    };
    socket.send(JSON.stringify(authRequest));
}

function handleOBSMessage(message) {
    switch (message.op) {
        case 2: // Authentication succeeded
            console.log("Authentication succeeded !");
            startAudioMonitoring();
            break;
        
        case 5: // OBS events
            if (message.d.eventType === "InputVolumeMeter") {
                handleAudioLevelUpdate(message.d.eventData);
            }
            break;
        
        default:
            console.log("OBS WebSocket message :", message);
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
}

function handleAudioLevelUpdate(eventData) {
    const { inputName, inputLevels } = eventData;

    if (inputName === "audioMeren") {
        updateVisuals(inputLevels.mul, "meren");
    } else if (inputName === "audioGardok") {
        updateVisuals(inputLevels.mul, "gardok");
    }
}

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

