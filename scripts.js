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

async function startAudioLevelMonitoring() {
    const gardokSource = "audioGardok";
    const merenSource = "audioMeren";

    try {
        await obs.call("Subscribe", {
            eventSubscriptions: 1 << 8,
        });

        console.log("Abonné aux niveaux audio des sources");

        obs.on("InputVolumeMeters", (data) => {
            data.inputs.forEach((input) => {
                if (input.inputName === gardokSource) {
                    handleAudioLevel(input.inputLevelsMul[0], gardokPortrait, gardokFrame, assets.gardok);
                }
                if (input.inputName === merenSource) {
                    handleAudioLevel(input.inputLevelsMul[0], merenPortrait, merenFrame, assets.meren);
                }
            });
        });
    } catch (error) {
        console.error("Erreur lors de l'abonnement aux niveaux audio :", error);
    }
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
