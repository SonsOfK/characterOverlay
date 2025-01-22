// OBS WebSocket config
let socket;
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

function connectWebSocket() {
    socket = new WebSocket("ws://localhost:4455");

    socket.addEventListener("open", () => {
        console.log("WebSocket connecté à OBS.");

        // Envoyer la commande Identify
        socket.send(
            JSON.stringify({
                op: 1, // Opération d'identification
                d: {
                    rpcVersion: 1, // Version du protocole WebSocket OBS
                },
            })
        );

        // Lancer les requêtes périodiques pour les niveaux audio
        startAudioLevelRequests();
    });

    socket.addEventListener("close", (event) => {
        console.warn("WebSocket fermé. Code :", event.code, "Raison :", event.reason);
        // Reconnexion automatique après une déconnexion
        setTimeout(connectWebSocket, 3000);
    });

    socket.addEventListener("error", (error) => {
        console.error("Erreur WebSocket :", error);
    });

    socket.addEventListener("message", (event) => {
        const response = JSON.parse(event.data);
        
        console.log("Message reçu :", response); // Affiche la réponse brute

        if (response.d && response.d.requestId === "list-audio-sources") {
            console.log("Réponse complète pour les sources audio :", response.d); // Ajoute un log complet
            console.log("Sources audio disponibles :", response.d.responseData.inputs); // Vérifie si `inputs` existe
        }

        // Gestion des niveaux audio pour Gardok
        if (response.requestId === "gardok-level") {
            const gardokLevel = response.responseData?.inputVolumeMul || 0;

            if (gardokLevel > 0.1) {
                gardokPortrait.src = assets.gardok.portraitOn;
                gardokFrame.src = assets.gardok.frameOn;
            } else {
                gardokPortrait.src = assets.gardok.portraitOff;
                gardokFrame.src = assets.gardok.frameOff;
            }
        }

        // Gestion des niveaux audio pour Meren
        if (response.requestId === "meren-level") {
            console.log("SON DE MEREN RECU")
            const merenLevel = response.responseData?.inputVolumeMul || 0;

            if (merenLevel > 0.1) {
                merenPortrait.src = assets.meren.portraitOn;
                merenFrame.src = assets.meren.frameOn;
            } else {
                merenPortrait.src = assets.meren.portraitOff;
                merenFrame.src = assets.meren.frameOff;
            }
        }

        if (response.d && response.d.requestId === "list-audio-sources") {
            console.log("Sources audio disponibles :", response.d.inputs);
        }
    });
}

// Fonction pour envoyer les requêtes de niveaux audio
function startAudioLevelRequests() {
    setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    op: 6, // Opération : Requête
                    d: {
                        requestType: "GetInputList",
                        requestId: "list-audio-sources"
                    },
                })
            );

            // Requête pour Gardok
            socket.send(
                JSON.stringify({
                    op: 6,
                    d: {
                        requestType: "GetInputVolume",
                        requestId: "gardok-level",
                        requestData: { inputName: "audioGardok" }, // Nom OBS pour Gardok   
                    }
                })
            );

            // Requête pour Meren
            socket.send(
                JSON.stringify({
                    op: 6,
                    d: {
                        requestType: "GetInputVolume",
                        requestId: "meren-level",
                        requestData: { inputName: "audioMeren" }, // Nom OBS pour Meren
                    }
                })
            );
        }
    }, 100); // Mise à jour toutes les 100 ms
}

// Lancer la connexion WebSocket
connectWebSocket();