const OBS_WEBSOCKET_URL = "ws://localhost:4455";

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

const sources = { gardok: "audioGardok", meren: "audioMeren" };

// Met à jour les images selon l'état actif/inactif
function updateImages(characterId, isActive) {
    const frame = document.getElementById(`${characterId}-frame`);
    const portrait = document.getElementById(`${characterId}-portrait`);

    frame.src = isActive ? assets[characterId].frameOn : assets[characterId].frameOff;
    portrait.src = isActive ? assets[characterId].portraitOn : assets[characterId].portraitOff;
}

// Gère la connexion WebSocket et les niveaux audio
function connectToOBS() {
    const ws = new WebSocket(OBS_WEBSOCKET_URL);

    ws.onopen = () => {
        console.log("Connected to OBS WebSocket");
        // Abonnement aux niveaux audio
        ws.send(
            JSON.stringify({
                op: 1,
                d: {
                requestType: "GetInputList",
                requestId: "1",
                },
            })
        );
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.op === 0 && data.d && data.d.inputs) {
            for (const input of data.d.inputs) {
                if (input.inputName === sources.gardok) {
                updateImages("gardok", input.inputVolumeMul > 0.05); // Seuil de volume pour "actif"
                } else if (input.inputName === sources.meren) {
                updateImages("meren", input.inputVolumeMul > 0.05);
                }
            }
        }
    };

    ws.onclose = () => {
        console.warn("WebSocket closed. Reconnecting in 5 seconds...");
        setTimeout(connectToOBS, 5000); // Reconnexion automatique
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close(); // Tente une reconnexion propre
    };
}

// Initialisation
connectToOBS();
