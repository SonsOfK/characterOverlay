(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");

    const VALID_ROLES = ["meren", "gardok"];
    const WS_URL = "wss://sonsofk.fr";

    const MICROPHONE_CONFIG = {
        fftSize: 1024,
        smoothingTimeConstant: 0.75,
        // Niveau minimal considéré comme du bruit ambiant.
        noiseFloor: 0.02,
        // Amplification appliquée après retrait du bruit ambiant.
        amplification: 10,
        // Évite d'envoyer inutilement 60 messages par seconde.
        sendIntervalMs: 50
    };

    let ws = null;
    let reconnectTimeout = null;

    let microphoneStream = null;
    let audioContext = null;
    let analyser = null;
    let microphoneSource = null;
    let animationFrameId = null;

    let lastSentAt = 0;
    let microphoneStarted = false;

    function isMicrophonePage() {
        return VALID_ROLES.includes(role);
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function updateWebSocketStatus(text) {
        const element = getElement("websocket-status");

        if (element) {
            element.textContent = text;
        }
    }

    function updateMicrophoneStatus(text) {
        const element = getElement("microphone-status");

        if (element) {
            element.textContent = text;
        }
    }

    function updateVolumeMeter(level) {
        const meter = getElement("microphone-level");

        if (!meter) {
            return;
        }

        const normalizedLevel = Math.max(0, Math.min(1, level));
        meter.style.width = `${normalizedLevel * 100}%`;
    }

    function connectWebSocket() {
        if (
            ws &&
            (
                ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }

        updateWebSocketStatus("Connexion au serveur…");

        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("✅ WebSocket connecté");
            updateWebSocketStatus("Serveur connecté");
        };

        ws.onmessage = event => {
            handleWebSocketMessage(event.data);
        };

        ws.onerror = error => {
            console.error("❌ Erreur WebSocket :", error);
            updateWebSocketStatus("Erreur de connexion");
        };

        ws.onclose = () => {
            console.warn("🔌 WebSocket fermé");
            updateWebSocketStatus("Serveur déconnecté");

            ws = null;

            clearTimeout(reconnectTimeout);

            reconnectTimeout = setTimeout(() => {
                connectWebSocket();
            }, 5000);
        };
    }

    function handleWebSocketMessage(rawData) {
        try {
            const message = JSON.parse(rawData);

            if (
                message.type === "VOICE_LEVEL" &&
                VALID_ROLES.includes(message.char) &&
                Number.isFinite(Number(message.level))
            ) {
                const level = Math.max(
                    0,
                    Math.min(1, Number(message.level))
                );

                if (typeof window.handleAudioLevel === "function") {
                    window.handleAudioLevel(level, message.char);
                }

                return;
            }

            if (
                message.type === "EFFECT_TRIGGER" &&
                typeof window.applyOverlayEffect === "function"
            ) {
                window.applyOverlayEffect(
                    message.char,
                    message.effect,
                    message.durationMs
                );
            }
        } catch {
            handleLegacyWebSocketMessage(rawData);
        }
    }

    function handleLegacyWebSocketMessage(rawData) {
        if (
            typeof rawData !== "string" ||
            !rawData.includes(":") ||
            typeof window.applyOverlayEffect !== "function"
        ) {
            return;
        }

        const [character, effect] = rawData.split(":");

        window.applyOverlayEffect(character, effect);
    }

    async function startMicrophone() {
        if (!isMicrophonePage()) {
            updateMicrophoneStatus("Aucun rôle micro sélectionné");
            return;
        }

        if (microphoneStarted) {
            updateMicrophoneStatus(`Micro ${role} déjà actif`);
            return;
        }

        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
            updateMicrophoneStatus(
                "Micro indisponible : la page doit être ouverte en HTTPS"
            );

            console.error(
                "navigator.mediaDevices.getUserMedia n'est pas disponible"
            );

            return;
        }

        updateMicrophoneStatus("Demande d’autorisation au navigateur…");

        try {
            microphoneStream =
                await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                });

            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            audioContext = new AudioContextClass();

            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }

            analyser = audioContext.createAnalyser();
            analyser.fftSize = MICROPHONE_CONFIG.fftSize;
            analyser.smoothingTimeConstant =
                MICROPHONE_CONFIG.smoothingTimeConstant;

            microphoneSource =
                audioContext.createMediaStreamSource(microphoneStream);

            microphoneSource.connect(analyser);

            microphoneStarted = true;

            updateMicrophoneStatus(`Micro ${role} actif`);

            console.log(`🎤 Microphone ${role} actif`);

            readMicrophoneLevel();
        } catch (error) {
            microphoneStarted = false;

            console.error(
                "❌ Impossible d'activer le microphone :",
                error
            );

            updateMicrophoneStatus(
                getMicrophoneErrorMessage(error)
            );
        }
    }

    function getMicrophoneErrorMessage(error) {
        switch (error.name) {
            case "NotAllowedError":
                return "Accès au micro refusé dans le navigateur";

            case "NotFoundError":
                return "Aucun microphone détecté";

            case "NotReadableError":
                return "Microphone déjà utilisé ou inaccessible";

            case "OverconstrainedError":
                return "Le microphone ne supporte pas les réglages demandés";

            case "SecurityError":
                return "Accès au micro bloqué pour des raisons de sécurité";

            default:
                return `Erreur microphone : ${error.message}`;
        }
    }

    function readMicrophoneLevel() {
        if (!analyser || !microphoneStarted) {
            return;
        }

        const samples = new Float32Array(analyser.fftSize);

        analyser.getFloatTimeDomainData(samples);

        let sumSquares = 0;

        for (let index = 0; index < samples.length; index++) {
            const sample = samples[index];
            sumSquares += sample * sample;
        }

        const rms = Math.sqrt(sumSquares / samples.length);

        const levelAboveNoise = Math.max(
            0,
            rms - MICROPHONE_CONFIG.noiseFloor
        );

        const normalized = levelAboveNoise * MICROPHONE_CONFIG.amplification;
        const level = Math.min(1, normalized * normalized);

        updateVolumeMeter(level);
        sendVoiceLevel(level);

        animationFrameId =
            requestAnimationFrame(readMicrophoneLevel);
    }

    function sendVoiceLevel(level) {
        if (
            !isMicrophonePage() ||
            !ws ||
            ws.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        const now = performance.now();

        if (
            now - lastSentAt <
            MICROPHONE_CONFIG.sendIntervalMs
        ) {
            return;
        }

        lastSentAt = now;

        ws.send(
            JSON.stringify({
                type: "VOICE_LEVEL",
                char: role,
                level: Math.max(0, Math.min(1, level))
            })
        );
    }

    async function stopMicrophone() {
        microphoneStarted = false;

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        if (microphoneSource) {
            microphoneSource.disconnect();
            microphoneSource = null;
        }

        if (microphoneStream) {
            microphoneStream
                .getTracks()
                .forEach(track => track.stop());

            microphoneStream = null;
        }

        if (audioContext) {
            await audioContext.close();
            audioContext = null;
        }

        analyser = null;

        updateVolumeMeter(0);
        updateMicrophoneStatus("Microphone arrêté");
    }

    window.startMicrophoneFromButton = startMicrophone;
    window.stopMicrophone = stopMicrophone;

    connectWebSocket();

    if (isMicrophonePage()) {
        updateMicrophoneStatus(
            `Prêt à activer le micro ${role}`
        );
    }
})();