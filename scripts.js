// OBS WebSocket config
const socket = new WebSocket("ws://localhost:4455");
const PASSWORD = "59^#tmvbSPT8GR";

// Frames and portraits
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

// HTML elements reference
const gardokPortrait = document.getElementById("gardok-portrait");
const gardokFrame = document.getElementById("gardok-frame");
const merenPortrait = document.getElementById("meren-portrait");
const merenFrame = document.getElementById("meren-frame");

// Audio levels variables
let gardokLevel = 0;
let merenLevel = 0;

// WebSocket connexion
socket.addEventListener("open", () => {
    console.log("Connected to OBS WebSocket");

    // Authentication
    socket.send(
        JSON.stringify({
            op: 1,
            d: {
                rpcVersion: 1,
                authication: PASSWORD ? btoa(PASSWORD) : undefined,
            },
        })
    );

    // Periodic audio levels tracking
    setInterval(() => {
        // Request for Gardok
        socket.send(
            JSON.stringify({
                requestType: "GetInputVolume",
                requestId: "gardok-level",
                requestData: { inputName: "audioGardok" }, // Nom OBS pour Gardok
            })
        );
    
        // Request for Meren
        socket.send(
            JSON.stringify({
                requestType: "GetInputVolume",
                requestId: "meren-level",
                requestData: { inputName: "audioMeren" }, // Nom OBS pour Meren
            })
        );
    }, 100); // Update every 100ms
});
    
// OBS responses management
socket.addEventListener("message", (event) => {
    const response = JSON.parse(event.data);
    
    // Gardok volume management
    if (response.requestId === "gardok-level") {
        gardokLevel = response.responseData?.inputVolumeMul || 0;
    
        if (gardokLevel > 0.1) {
        gardokPortrait.src = assets.gardok.portraitOn;
        gardokFrame.src = assets.gardok.frameOn;
        } else {
        gardokPortrait.src = assets.gardok.portraitOff;
        gardokFrame.src = assets.gardok.frameOff;
        }
    }
    
    // Meren volume management
    if (response.requestId === "meren-level") {
        merenLevel = response.responseData?.inputVolumeMul || 0;
    
        if (merenLevel > 0.1) {
        merenPortrait.src = assets.meren.portraitOn;
        merenFrame.src = assets.meren.frameOn;
        } else {
        merenPortrait.src = assets.meren.portraitOff;
        merenFrame.src = assets.meren.frameOff;
        }
    }
});