// Initialisation de la connexion avec OBS
const OBSWebSocket = require('obs-websocket-js').OBSWebSocket;
const obs = new OBSWebSocket();

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

// Références HTML
const merenPortrait = document.getElementById("meren-portrait");
const merenFrame = document.getElementById("meren-frame");
const gardokPortrait = document.getElementById("gardok-portrait");
const gardokFrame = document.getElementById("gardok-frame");

// Connexion à OBS
obs.connect({ address: "localhost:4455"})
    .then(() => {
        console.log("Connecté à OBS WebSocket !");

        // Écouter les changements de niveaux audio
        startAudioLevelMonitoring();
    })
    .catch((err) => {
        console.error("Erreur de connexion à OBS :", err);
    });

// Fonction pour surveiller les niveaux audio
function startAudioLevelMonitoring() {
    // Récupérer les sources audio configurées dans OBS
    obs.call("GetInputList")
        .then((response) => {
            console.log("Sources audio disponibles :", response.inputs);

            // Configurer les sources audio à surveiller
            const gardokSource = "audioGardok"; // Nom OBS pour Gardok
            const merenSource = "audioMeren"; // Nom OBS pour Meren

            // Vérifier les niveaux audio toutes les 100ms
            setInterval(async () => {
                // Récupérer le niveau de Gardok
                const gardokLevel = await obs.call("GetInputVolume", { inputName: gardokSource });
                handleAudioLevel(gardokLevel.inputVolumeMul, gardokPortrait, gardokFrame, assets.gardok);

                // Récupérer le niveau de Meren
                const merenLevel = await obs.call("GetInputVolume", { inputName: merenSource });
                handleAudioLevel(merenLevel.inputVolumeMul, merenPortrait, merenFrame, assets.meren);
            }, 100);
        })
        .catch((err) => {
            console.error("Erreur lors de la récupération des sources audio :", err);
        });
}

// Fonction pour gérer les changements d'images selon le niveau audio
function handleAudioLevel(level, portraitElement, frameElement, asset) {
    const minVolumeThreshold = 0.05; // Seuil pour les bruits faibles

    if (level > minVolumeThreshold) {
        portraitElement.src = asset.portraitOn;
        frameElement.src = asset.frameOn;
    } else {
        portraitElement.src = asset.portraitOff;
        frameElement.src = asset.frameOff;
    }
}