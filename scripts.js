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

let timers =  {
    meren: null,
    gardok: null,
}
const delayBeforeHiding = 1000; // 1s

(async () => {
    try {
        // Connexion à OBS
        await obs.connect("ws://localhost:4455", "", { eventSubscriptions: OBSWebSocket.EventSubscription.All | OBSWebSocket.EventSubscription.InputVolumeMeters, });
        console.log("Connecté à OBS WebSocket !");

        // Écouter les niveaux audio
        obs.on("InputVolumeMeters", (data) => {
            data.inputs.forEach((input) => {
                // Gérer les niveaux pour chaque source
                if (input.inputName === "audioMeren") {
                    const levels = input.inputLevelsMul.flat(); // Tous les canaux combinés
                    const maxLevel = Math.max(...levels); // Niveau maximum
                    handleAudioLevel(maxLevel, merenPortrait, merenFrame, assets.meren);
                }

                if (input.inputName === "audioGardok") {
                    const levels = input.inputLevelsMul.flat();
                    const maxLevel = Math.max(...levels);
                    handleAudioLevel(maxLevel, gardokPortrait, gardokFrame, assets.gardok);
                }
            });
        });
    } catch (error) {
        console.error("Erreur de connexion ou de souscription :", error);
    }
})();

// Fonction pour gérer les changements d'images selon le niveau audio
function handleAudioLevel(levelDb, portraitElement, frameElement, asset) {
    const minVolumeThreshold = 0.08; // Seuil en dB pour ignorer les bruits faibles

    if (levelDb > minVolumeThreshold) {
        portraitElement.src = asset.portraitOn;
        frameElement.src = asset.frameOn;
    } else {
        portraitElement.src = asset.portraitOff;
        frameElement.src = asset.frameOff;
    }
}
