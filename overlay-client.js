let ws;
let reconnectTimer = null;
let microphoneStarted = false;
let pendingVoiceLevel = null;

const WS_URL = "wss://sonsofk.fr";
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || "overlay").toLowerCase();
const relayToken = params.get("token") || "";
const microphoneRoles = new Set(["meren", "gardok"]);

function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log(`✅ Connected to WebSocket server as ${role}`);
        updateSenderConnectionStatus("Serveur connecté", true);

        if (pendingVoiceLevel !== null) {
            sendVoiceLevel(role, pendingVoiceLevel);
        }
    };

    ws.onmessage = (event) => {
        let msg;

        try {
            msg = JSON.parse(event.data);
        } catch (_) {
            if (
                typeof event.data === "string" &&
                event.data.includes(":") &&
                window.applyOverlayEffect
            ) {
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
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
    };
}

async function startMicrophone(character) {
    if (microphoneStarted) return;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia indisponible : la page doit être ouverte en HTTPS dans un navigateur compatible.");
    }

    updateMicrophoneStatus("Demande d’autorisation…", false);

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        video: false
    });

    microphoneStarted = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    let lastSentAt = 0;

    function publishLevel(timestamp) {
        analyser.getFloatTimeDomainData(samples);

        let sumSquares = 0;
        for (const sample of samples) {
            sumSquares += sample * sample;
        }

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

function initializeMicrophonePage() {
    if (!microphoneRoles.has(role)) return;

    const button = document.getElementById("start-microphone");
    button?.addEventListener("click", () => {
        startMicrophone(role).catch((error) => {
            console.error(`Impossible d'activer le micro de ${role}:`, error);
            updateMicrophoneStatus(`Micro indisponible : ${error.message}`, false);
            setStartButtonVisible(true);
        });
    });

    // Tentative automatique. Le bouton reste disponible si le navigateur exige un geste utilisateur.
    startMicrophone(role).catch((error) => {
        console.warn("Activation automatique du micro impossible :", error);
        updateMicrophoneStatus("Clique sur « Activer le micro »", false);
        setStartButtonVisible(true);
    });
}

connectWebSocket();
initializeMicrophonePage();
