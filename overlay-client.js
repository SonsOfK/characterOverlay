(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");

    let ws = null;
    let microphoneStream = null;
    let audioContext = null;
    let analyser = null;
    let animationFrameId = null;

    window.startMicrophoneFromButton = async function () {
        try {
            console.log("Demande d'accès au microphone…");

            microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(microphoneStream);

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.65;

            source.connect(analyser);

            console.log(`Microphone ${role} actif`);

            readMicrophoneLevel();
        } catch (error) {
            console.error("Impossible d'activer le microphone :", error);

            const statusElement = document.getElementById("microphone-status");

            if (statusElement) {
                statusElement.textContent =
                    `Erreur microphone : ${error.name} — ${error.message}`;
            }
        }
    };

    function readMicrophoneLevel() {
        if (!analyser) {
            return;
        }

        const samples = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(samples);

        let sum = 0;

        for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);
        const level = Math.min(1, rms * 5);

        sendVoiceLevel(level);

        animationFrameId = requestAnimationFrame(readMicrophoneLevel);
    }

    function sendVoiceLevel(level) {
        if (
            !ws ||
            ws.readyState !== WebSocket.OPEN ||
            !["meren", "gardok"].includes(role)
        ) {
            return;
        }

        ws.send(JSON.stringify({
            type: "VOICE_LEVEL",
            char: role,
            level
        }));
    }

    function connectWebSocket() {
        ws = new WebSocket("wss://sonsofk.fr");

        ws.onopen = () => {
            console.log("WebSocket connecté");
        };

        ws.onmessage = event => {
            try {
                const message = JSON.parse(event.data);

                if (
                    message.type === "VOICE_LEVEL" &&
                    typeof window.handleAudioLevel === "function"
                ) {
                    window.handleAudioLevel(message.level, message.char);
                }

                if (
                    message.type === "EFFECT_TRIGGER" &&
                    window.applyOverlayEffect
                ) {
                    window.applyOverlayEffect(
                        message.char,
                        message.effect,
                        message.durationMs
                    );
                }
            } catch {
                if (
                    typeof event.data === "string" &&
                    event.data.includes(":") &&
                    window.applyOverlayEffect
                ) {
                    const [character, effect] = event.data.split(":");
                    window.applyOverlayEffect(character, effect);
                }
            }
        };

        ws.onclose = () => {
            console.warn("WebSocket fermé, reconnexion dans 5 secondes");
            setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = error => {
            console.error("Erreur WebSocket :", error);
        };
    }

    connectWebSocket();
})();
