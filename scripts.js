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
        await obs.connect("ws://localhost:4455", "ton_mot_de_passe");
        console.log("Connecté à OBS WebSocket !");

        startAudioLevelMonitoring();
    } catch (error) {
        console.error("Erreur de connexion :", error);
    }
})();

function startAudioLevelMonitoring() {
    const gardokSource = "audioGardok";
    const merenSource = "audioMeren";

    setInterval(async () => {
        try {
            const gardokLevel = await getAudioLevel(gardokSource);
            handleAudioLevel(gardokLevel, gardokPortrait, gardokFrame, assets.gardok);

            const merenLevel = await getAudioLevel(merenSource);
            handleAudioLevel(merenLevel, merenPortrait, merenFrame, assets.meren);
        } catch (error) {
            console.error("Erreur lors de la récupération des niveaux audio :", error);
        }
    }, 100);
}

async function getAudioLevel(sourceName) {
    const response = await obs.call("GetInputVolume", { inputName: sourceName });
    return response.inputVolumeMul || 0;
}

function handleAudioLevel(level, portraitElement, frameElement, asset) {
    const minVolumeThreshold = 0.05;

    if (level > minVolumeThreshold) {
        portraitElement.src = asset.portraitOn;
        frameElement.src = asset.frameOn;
    } else {
        portraitElement.src = asset.portraitOff;
        frameElement.src = asset.frameOff;
    }
}
