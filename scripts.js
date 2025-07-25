const obs = new OBSWebSocket();

let timers =  {
    meren: null,
    gardok: null,
}

const minVolumeThreshold = 0.08; // Seuil en dB pour ignorer les bruits faibles
const delayBeforeHiding = 500; // 1s

(async () => {
    try {
        // Connexion à OBS
        await obs.connect("ws://localhost:4455", "", { 
            eventSubscriptions: OBSWebSocket.EventSubscription.All | 
                                OBSWebSocket.EventSubscription.InputVolumeMeters, 
        });

        console.log("Connecté à OBS WebSocket !");

        GardokAnimator.init();
        MerenAnimator.init();
        
        // Écouter les niveaux audio
        obs.on("InputVolumeMeters", (data) => {
            data.inputs.forEach((input) => {
                const levels = input.inputLevelsMul.flat(); // Tous les canaux combinés
                const maxLevel = Math.max(...levels); // Niveau max

                // Gérer les niveaux pour chaque source
                if (input.inputName === "audioMeren") {
                    handleAudioLevel(maxLevel, "meren");
                }

                if (input.inputName === "audioGardok") {
                    handleAudioLevel(maxLevel, "gardok");
                }
            });
        });
    } catch (error) {
        console.error("Erreur de connexion ou de souscription :", error);
    }
})();

// Fonction pour gérer les changements d'images selon le niveau audio
function handleAudioLevel(level, character) {
    const frameElement = document.getElementById(`${character}-frame`);
    
    if (level > minVolumeThreshold) {
        // Annule le timer si la personne parle
        if (timers[character]) {
            clearTimeout(timers[character]);
            timers[character] = null;
        }

        frameElement.src = "public/assets/screen_border_ok.png"

        if (character === "gardok") {
            GardokAnimator.startTalking();
        }

        if (character === "meren") {
            MerenAnimator.startTalking();
        }
    } else {
        // Déclencher un timer pour éviter un changement immédiat à "Off"
        if (!timers[character]) {

            timers[character] = setTimeout(() => {

                frameElement.src = "public/assets/screen_border_off.png";
                
                if (character === "gardok") {
                    GardokAnimator.stopTalking();
                }

                if (character === "meren") {
                    MerenAnimator.stopTalking();
                }

                timers[character] = null;
            }, delayBeforeHiding);

        }
    }
}
