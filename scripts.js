const obs = new OBSWebSocket();

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

const merenPortrait = document.getElementById("meren-portrait");
const merenFrame = document.getElementById("meren-frame");
const gardokPortrait = document.getElementById("gardok-portrait");
const gardokFrame = document.getElementById("gardok-frame");

(async () => {
    try {
        // Connexion à OBS
        await obs.connect("ws://localhost:4455", "", { eventSubscriptions: OBSWebSocket.EventSubscription.All | OBSWebSocket.EventSubscription.InputVolumeMeters, });
        console.log("Connecté à OBS WebSocket !");

        // Écouter les niveaux audio
        obs.on("InputVolumeMeters", (data) => {
            data.inputs.forEach((input) => {
                if (input.inputName === "audioGardok") {
                    handleAudioLevel(input.inputLevelsDb[0], gardokPortrait, gardokFrame, assets.gardok);
                }
                if (input.inputName === "audioMeren") {
                    handleAudioLevel(input.inputLevelsDb[0], merenPortrait, merenFrame, assets.meren);
                }
            });
        });
    } catch (error) {
        console.error("Erreur de connexion ou de souscription :", error);
    }
})();

// Fonction pour gérer les changements d'images selon le niveau audio
function handleAudioLevel(levelDb, portraitElement, frameElement, asset) {
    const minVolumeThreshold = -40; // Seuil en dB pour ignorer les bruits faibles

    if (levelDb > minVolumeThreshold) {
        portraitElement.src = asset.portraitOn;
        frameElement.src = asset.frameOn;
    } else {
        portraitElement.src = asset.portraitOff;
        frameElement.src = asset.frameOff;
    }
}
