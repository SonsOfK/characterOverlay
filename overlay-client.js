(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");

    const VALID_ROLES = ["meren", "gardok"];
    const WS_URL = "wss://sonsofk.fr";

    const MICROPHONE_CONFIG = {
        fftSize: 1024,
        smoothingTimeConstant: 0.75,
        // Niveau minimal considéré comme du bruit ambiant.
        noiseFloor: 0.01,
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
    let microphoneWorklet = null;
    let silentOutput = null;
    let microphoneIntervalId = null;

    let lastSentAt = 0;
    let pendingVoiceLevel = 0;
    let microphoneStarted = false;
    let publisherAuthenticated = false;
    let pendingAuthentication = null;

    function isMicrophonePage() {
        return VALID_ROLES.includes(role);
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function updateWebSocketStatus(text) {
        const element = getElement("sender-connection-status");

        if (element) {
            element.textContent = text;
        }
    }

    function updateMicrophoneStatus(text) {
        const element = getElement("sender-microphone-status");

        if (element) {
            element.textContent = text;
        }
    }

    function updateVolumeMeter(level) {
        const meter = getElement("sender-meter-fill");

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
            updateWebSocketStatus(
                isMicrophonePage()
                    ? "Serveur connecté — authentification requise"
                    : "Serveur connecté"
            );
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
            publisherAuthenticated = false;
            rejectPendingAuthentication("Connexion au serveur interrompue");

            if (microphoneStarted) {
                stopMicrophone().catch(error => {
                    console.error("❌ Impossible d'arrêter le microphone :", error);
                });
            }

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

            if (message.type === "AUTH_RESULT") {
                if (message.ok) {
                    publisherAuthenticated = true;
                    updateWebSocketStatus("Serveur authentifié");
                    resolvePendingAuthentication();
                } else {
                    publisherAuthenticated = false;
                    updateWebSocketStatus("Token refusé");
                    rejectPendingAuthentication("Token refusé");
                }
                return;
            }

            if (message.type === "ERROR" && message.code === "AUTH_REQUIRED") {
                publisherAuthenticated = false;
                updateWebSocketStatus("Authentification requise");
                return;
            }

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

    function startMicrophoneAnalysis() {
        if (microphoneIntervalId !== null) {
            clearInterval(microphoneIntervalId);
        }

        microphoneIntervalId = setInterval(() => {
            readMicrophoneLevel();
        }, MICROPHONE_CONFIG.sendIntervalMs);
    }

    async function setupMicrophoneAnalysis() {
        if (
            audioContext.audioWorklet &&
            typeof window.AudioWorkletNode === "function"
        ) {
            try {
                await audioContext.audioWorklet.addModule(
                    "microphone-level-processor.js"
                );

                microphoneWorklet = new AudioWorkletNode(
                    audioContext,
                    "microphone-level-processor"
                );

                silentOutput = audioContext.createGain();
                silentOutput.gain.value = 0;

                microphoneWorklet.port.onmessage = event => {
                    const rms = Number(event.data?.rms);

                    if (Number.isFinite(rms)) {
                        processMicrophoneRms(rms);
                    }
                };

                // La sortie silencieuse maintient le graphe audio actif sans
                // renvoyer le son du micro dans les enceintes.
                microphoneSource.connect(microphoneWorklet);
                microphoneWorklet.connect(silentOutput);
                silentOutput.connect(audioContext.destination);

                return "AudioWorklet";
            } catch (error) {
                console.warn(
                    "⚠️ AudioWorklet indisponible, utilisation du mode de secours :",
                    error
                );

                microphoneSource.disconnect();
                microphoneWorklet?.disconnect();
                silentOutput?.disconnect();
                microphoneWorklet = null;
                silentOutput = null;
            }
        }

        analyser = audioContext.createAnalyser();
        analyser.fftSize = MICROPHONE_CONFIG.fftSize;
        analyser.smoothingTimeConstant =
            MICROPHONE_CONFIG.smoothingTimeConstant;

        microphoneSource.connect(analyser);
        startMicrophoneAnalysis();

        return "timer de secours";
    }

    function waitForWebSocketOpen() {
        if (ws?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        connectWebSocket();

        return new Promise((resolve, reject) => {
            const socket = ws;
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error("Le serveur ne répond pas"));
            }, 5000);

            function cleanup() {
                clearTimeout(timeoutId);
                socket?.removeEventListener("open", handleOpen);
                socket?.removeEventListener("error", handleError);
                socket?.removeEventListener("close", handleClose);
            }

            function handleOpen() {
                cleanup();
                resolve();
            }

            function handleError() {
                cleanup();
                reject(new Error("Connexion au serveur impossible"));
            }

            function handleClose() {
                cleanup();
                reject(new Error("Connexion au serveur interrompue"));
            }

            socket?.addEventListener("open", handleOpen, { once: true });
            socket?.addEventListener("error", handleError, { once: true });
            socket?.addEventListener("close", handleClose, { once: true });
        });
    }

    function resolvePendingAuthentication() {
        if (!pendingAuthentication) return;
        clearTimeout(pendingAuthentication.timeoutId);
        pendingAuthentication.resolve();
        pendingAuthentication = null;
    }

    function rejectPendingAuthentication(message) {
        if (!pendingAuthentication) return;
        clearTimeout(pendingAuthentication.timeoutId);
        pendingAuthentication.reject(new Error(message));
        pendingAuthentication = null;
    }

    async function authenticatePublisher(token) {
        await waitForWebSocketOpen();

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (pendingAuthentication?.timeoutId !== timeoutId) return;
                pendingAuthentication = null;
                reject(new Error("L'authentification a expiré"));
            }, 5000);

            pendingAuthentication = { resolve, reject, timeoutId };
            ws.send(JSON.stringify({ type: "AUTH", token }));
        });
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

        const tokenInput = getElement("publisher-token");
        const token = tokenInput?.value.trim();

        if (!publisherAuthenticated) {
            if (!token) {
                updateWebSocketStatus("Colle d'abord le token Streamer.bot");
                tokenInput?.focus();
                return;
            }

            updateWebSocketStatus("Authentification…");

            try {
                await authenticatePublisher(token);
            } catch (error) {
                updateWebSocketStatus(error.message);
                return;
            } finally {
                if (tokenInput) tokenInput.value = "";
            }
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

            microphoneSource =
                audioContext.createMediaStreamSource(microphoneStream);

            const analysisMode = await setupMicrophoneAnalysis();

            microphoneStarted = true;

            updateMicrophoneStatus(`Micro ${role} actif`);

            console.log(
                `🎤 Microphone ${role} actif — analyse ${analysisMode}`
            );
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

        processMicrophoneRms(rms);
    }

    function processMicrophoneRms(rms) {
        const levelAboveNoise = Math.max(
            0,
            rms - MICROPHONE_CONFIG.noiseFloor
        );

        const normalized =
            levelAboveNoise * MICROPHONE_CONFIG.amplification;

        // Une réponse linéaire conserve mieux les voix faibles que la
        // transformation au carré utilisée auparavant.
        const level = Math.min(1, normalized);

        updateVolumeMeter(level);
        sendVoiceLevel(level);
    }

    function sendVoiceLevel(level) {
        if (
            !isMicrophonePage() ||
            !publisherAuthenticated ||
            !ws ||
            ws.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        const clampedLevel = Math.max(0, Math.min(1, level));
        pendingVoiceLevel = Math.max(pendingVoiceLevel, clampedLevel);

        const now = performance.now();

        if (
            now - lastSentAt <
            MICROPHONE_CONFIG.sendIntervalMs
        ) {
            return;
        }

        lastSentAt = now;
        const levelToSend = pendingVoiceLevel;
        pendingVoiceLevel = 0;

        ws.send(
            JSON.stringify({
                type: "VOICE_LEVEL",
                char: role,
                level: levelToSend
            })
        );
    }

    async function stopMicrophone() {
        microphoneStarted = false;
        pendingVoiceLevel = 0;

        if (microphoneIntervalId !== null) {
            clearInterval(microphoneIntervalId);
            microphoneIntervalId = null;
        }

        if (microphoneWorklet) {
            microphoneWorklet.port.onmessage = null;
            microphoneWorklet.port.close();
            microphoneWorklet.disconnect();
            microphoneWorklet = null;
        }

        if (silentOutput) {
            silentOutput.disconnect();
            silentOutput = null;
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
