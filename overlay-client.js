let ws = null;
let reconnectTimer = null;
let microphoneStarted = false;
let pendingVoiceLevel = null;
let activeStream = null;
let activeAudioContext = null;

const WS_URL = "wss://sonsofk.fr";
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || "overlay").toLowerCase();
const relayToken = params.get("token") || "";
const microphoneRoles = new Set(["meren", "gardok"]);

function connectWebSocket() {
    try {
        ws = new WebSocket(WS_URL);
    } catch (error) {
        console.error("Impossible de créer le WebSocket :", error);
        updateSenderConnectionStatus(`Erreur : ${error.message}`, false);
        scheduleReconnect();
        return;
    }

    ws.onopen = () => {
        console.log(`✅ Connected to WebSocket server as ${role}`);
        updateSenderConnectionStatus("Serveur connecté", true);

        if (pendingVoiceLevel !== null && microphoneRoles.has(role)) {
            sendVoiceLevel(role, pendingVoiceLevel);
        }
    };

    ws.onmessage = (event) => {
        let msg;

        try {
            msg = JSON.parse(event.data);
        } catch (_) {
            if (typeof event.data === "string" && event.data.includes(":") && window.applyOverlayEffect) {
                const [character, effect] = event.data.split(":");
                window.applyOverlayEffect(character, effect);
            }
            return;
        }

        if (msg.type === "EFFECT_TRIGGER" && window.applyOverlayEffect) {
            window.applyOverlayEffect(msg.char, msg.effect, msg.durationMs);
            return;
        }

        if (
            msg.type === "VOICE_LEVEL" &&
            (msg.char === "meren" || msg.char === "gardok") &&
            typeof msg.level === "number" &&
            window.handleAudioLevel
        ) {
            window.handleAudioLevel(msg.level, msg.char);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateSenderConnectionStatus("Erreur WebSocket", false);
    };

    ws.onclose = () => {
        console.warn("🔌 WebSocket closed. Reconnecting in 5s...");
        updateSenderConnectionStatus("Serveur déconnecté — reconnexion…", false);
        scheduleReconnect();
    };
}

function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 5000);
}

async function startMicrophone(character) {
    if (microphoneStarted) {
        updateMicrophoneStatus(`Micro ${character} déjà actif`, true);
        return;
    }

    updateMicrophoneStatus("Vérification du navigateur…", false);

    if (!window.isSecureContext) {
        throw new Error(`contexte non sécurisé (${location.protocol}). Utilise bien l'URL HTTPS.`);
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        throw new Error("getUserMedia n'est pas disponible dans ce navigateur.");
    }

    updateMicrophoneStatus("Demande d’autorisation au navigateur…", false);

    activeStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        video: false
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        activeStream.getTracks().forEach((track) => track.stop());
        throw new Error("AudioContext n'est pas disponible dans ce navigateur.");
    }

    activeAudioContext = new AudioContextClass();
    if (activeAudioContext.state === "suspended") {
        await activeAudioContext.resume();
    }

    const source = activeAudioContext.createMediaStreamSource(activeStream);
    const analyser = activeAudioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);

    microphoneStarted = true;
    const samples = new Float32Array(analyser.fftSize);
    let lastSentAt = 0;

    function publishLevel(timestamp) {
        if (!microphoneStarted) return;

        analyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        for (const sample of samples) sumSquares += sample * sample;

        const rms = Math.sqrt(sumSquares / samples.length);
        const level = Math.min(1, rms * 4);
        pendingVoiceLevel = level;

        if (timestamp - lastSentAt >= 50) {
            sendVoiceLevel(character, level);
            lastSentAt = timestamp;
        }

        updateSenderMeter(level);
        requestAnimationFrame(publishLevel);
    }

    console.log(`🎙️ Microphone de ${character} activé`);
    updateMicrophoneStatus(`Micro ${character} actif`, true);
    setStartButtonVisible(false);
    requestAnimationFrame(publishLevel);
}

async function startMicrophoneFromButton() {
    const button = document.getElementById("start-microphone");
    if (button) button.disabled = true;

    try {
        await startMicrophone(role);
    } catch (error) {
        console.error(`Impossible d'activer le micro de ${role}:`, error);
        const details = getMicrophoneErrorMessage(error);
        updateMicrophoneStatus(details, false);
        setStartButtonVisible(true);
    } finally {
        if (button && !microphoneStarted) button.disabled = false;
    }
}

function getMicrophoneErrorMessage(error) {
    switch (error?.name) {
        case "NotAllowedError":
            return "Accès refusé. Autorise le micro via l’icône cadenas de la barre d’adresse, puis recharge la page.";
        case "NotFoundError":
            return "Aucun microphone détecté.";
        case "NotReadableError":
            return "Le microphone est déjà utilisé ou inaccessible au navigateur.";
        case "AbortError":
            return "Activation du microphone interrompue. Réessaie.";
        default:
            return `Micro indisponible : ${error?.message || "erreur inconnue"}`;
    }
}

function sendVoiceLevel(character, level) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
        type: "VOICE_LEVEL",
        char: character,
        level,
        token: relayToken
    }));
}

function updateSenderConnectionStatus(text, ok) {
    const status = document.getElementById("sender-connection-status");
    if (!status) return;
    status.textContent = text;
    status.dataset.ok = String(ok);
}

function updateMicrophoneStatus(text, ok) {
    const status = document.getElementById("sender-microphone-status");
    if (!status) return;
    status.textContent = text;
    status.dataset.ok = String(ok);
}

function updateSenderMeter(level) {
    const meter = document.getElementById("sender-meter-fill");
    if (!meter) return;
    meter.style.width = `${Math.min(100, Math.round(level * 100))}%`;
}

function setStartButtonVisible(visible) {
    const button = document.getElementById("start-microphone");
    if (button) button.hidden = !visible;
}

function initializePage() {
    if (microphoneRoles.has(role)) {
        updateMicrophoneStatus("Clique sur « Activer le micro »", false);
        setStartButtonVisible(true);
    }

    connectWebSocket();
}

window.startMicrophoneFromButton = startMicrophoneFromButton;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
} else {
    initializePage();
}
