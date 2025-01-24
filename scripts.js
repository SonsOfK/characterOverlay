// Initialisation de la connexion avec OBS
import { OBSWebSocket } from 'obs-websocket-js';
import { WebSocket } from 'ws';

const obs = new OBSWebSocket();

const OBS_WEBSOCKET_URL = "ws://localhost:4455";
const OBS_PASSWORD = "cGYMCwKvne3uziCf";

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

async function connectToOBS() {
    try {
        await obs.connect(OBS_WEBSOCKET_URL, OBS_PASSWORD);
        console.log('Connecté à OBS WebSocket');

        await obs.call('Subscribe', { events: ['InputVolumeMeters'] });

        obs.on('InputVolumeMeters', (data) => {
            data.inputs.forEach((input) => {
                if (input.inputName === 'audioGardok') {
                    const gardokVolume = input.inputVolumeMul;
                    const gardokPortrait = document.getElementById('gardok-portrait');
                    const gardokFrame = document.getElementById('gardok-frame');
                    if (gardokVolume > 0.1) {
                        gardokPortrait.src = assets.gardok.portraitOn;
                        gardokFrame.src = assets.gardok.frameOn;
                    } else {
                        gardokPortrait.src = assets.gardok.portraitOff;
                        gardokFrame.src = assets.gardok.frameOff;
                    }
                }

                if (input.inputName === 'audioMeren') {
                    const merenVolume = input.inputVolumeMul;
                    const merenPortrait = document.getElementById('meren-portrait');
                    const merenFrame = document.getElementById('meren-frame');
                    if (merenVolume > 0.1) {
                        merenPortrait.src = assets.meren.portraitOn;
                        merenFrame.src = assets.meren.frameOn;
                    } else {
                        merenPortrait.src = assets.meren.portraitOff;
                        merenFrame.src = assets.meren.frameOff;
                    }
                }
            });
        });
    } catch (err) [
        console.error('Erreur de connexion à OBS :', err);
    ]
}

connectToOBS();