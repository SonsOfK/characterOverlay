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

obs.connect({ address: "ws://127.0.0.1:4455"})
    .then(() => {
        console.log("Connecté à OBS WebSocket !");

        startAudioLevelMonitoring();
    })
    .catch((err) => {
        console.error("Erreur de connexion à OBS :", err);
    });

function startAudioLevelMonitoring() {
    obs.call("GetInputList")
        .then((response) => {
            console.log("Sources audio disponibles :", response.inputs);

            const gardokSource = "audioGardok";
            const merenSource = "audioMeren";

            setInterval(async () => {
                const gardokLevel = await obs.call("GetInputVolume", { inputName: gardokSource });
                handleAudioLevel(gardokLevel.inputVolumeMul, gardokPortrait, gardokFrame, assets.gardok);

                const merenLevel = await obs.call("GetInputVolume", { inputName: merenSource });
                handleAudioLevel(merenLevel.inputVolumeMul, merenPortrait, merenFrame, assets.meren);
            }, 100);
        })
        .catch((err) => {
            console.error("Erreur lors de la récupération des sources audio :", err);
        });
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