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

let isReconnecting = false;

// Gère la connexion WebSocket et les niveaux audio
function connectToOBS() {
    if (isReconnecting) return;
    isReconnecting = true;

    const ws = new WebSocket(OBS_WEBSOCKET_URL);

    ws.onopen = () => {
        console.log("Connected to OBS WebSocket");

        isReconnecting = false;

        // Abonnement aux niveaux audio
        ws.send(JSON.stringify({op: 1, d: { rpcVersion: 1 } }));

        ws.send(JSON.stringify({op: 6, d: { requests: [{ requestType: "GetInputList", requestId: "inputs" }] } }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log("Message reçu depuis OBS: ", data)

        if (data.op === 0 && data.d && data.d?.inputs) {
            for (const input of data.d.inputs) {

                console.log(`Source: ${input.inputName}, Volume: ${input.inputVolumeMul}`);

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
        setTimeout(() => {
            isReconnecting = false;
            connectToOBS();
        }, 5000);
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close(); // Tente une reconnexion propre
    };
}

// Initialisation
connectToOBS();
