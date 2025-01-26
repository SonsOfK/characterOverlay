const OBSWebSocket = window.OBSWebSocket; // Import depuis le CDN
const obs = new OBSWebSocket();

(async () => {
    try {
        // Connexion à OBS
        await obs.connect("ws://localhost:4455", "ton_mot_de_passe"); // Si pas de mot de passe, omets-le
        console.log("Connecté à OBS WebSocket !");
    } catch (error) {
        console.error("Erreur de connexion :", error);
    }
})();
