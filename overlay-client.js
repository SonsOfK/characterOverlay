let ws;
let reconnectTimer = null;
let microphoneStarted = false;

const WS_URL = "wss://sonsofk.fr";
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || "overlay").toLowerCase();
const relayToken = params.get("token") || "";
const microphoneRoles = new Set(["meren", "gardok"]);

function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log(`✅ Connected to WebSocket server as ${role}`);
        updateSenderStatus("Connecté au serveur", true);

        if (microphoneRoles.has(role)) {
            startMicrophone(role).catch((error) => {
                console.error(`Impossible d'activer le micro de ${role} :`, error);
                updateSenderStatus("Micro refusé ou indisponible", false);
            });
        }
    };

    ws.onmessage = (event) => {
        let msg;

        try {
            msg = JSON.parse(event.data);
        } catch (_) {
            // Compatibilité avec les anciens messages "character:effect".
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
        updateSenderStatus("Erreur WebSocket", false);
    };

    ws.onclose = () => {
        console.warn("🔌 WebSocket closed. Reconnecting in 5s...");
        updateSenderStatus("Déconnecté — reconnexion…", false);
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
    };
}

async function startMicrophone(character) {
    if (microphoneStarted) {
        return;
    }

    microphoneStarted = true;

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        video: false
    });

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

        if (timestamp - lastSentAt >= 50 && ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "VOICE_LEVEL",
                char: character,
                level,
                token: relayToken
            }));
            lastSentAt = timestamp;
        }

        updateSenderMeter(level);
        requestAnimationFrame(publishLevel);
    }

    console.log(`🎙️ Microphone de ${character} activé`);
    updateSenderStatus(`Micro ${character} actif`, true);
    requestAnimationFrame(publishLevel);
}

function updateSenderStatus(text, ok) {
    const status = document.getElementById("sender-status");
    if (!status) return;
    status.textContent = text;
    status.dataset.ok = String(ok);
}

function updateSenderMeter(level) {
    const meter = document.getElementById("sender-meter-fill");
    if (!meter) return;
    meter.style.width = `${Math.min(100, Math.round(level * 100))}%`;
}

connectWebSocket();
