let ws;
let currentWsUrl = null;
const configUrl = "https"

function connectWebSocket() {
    ws = new WebSocket("wss://5f85686de39c.ngrok-free.app");

    ws.onopen = () => {
        console.log("✅ Connected to WebSocket server ");
    };

    ws.onmessage = (event) => {
        const [character, effect] = event.data.split(":");
        console.log(`🎨 Applying effect: ${character} → ${effect}`);
        if (window.applyOverlayEffect) {
            window.applyOverlayEffect(character, effect);
        }
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg && msg.type === "EFFECT_TRIGGER" && window.applyOverlayEffect) {
                window.applyOverlayEffect(msg.char, msg.effect, msg.durationMs);
            }
            return;
        } catch (_) {
            // not JSON, fall through
        }

        if (
            typeof event.data === "string" &&
            event.data.includes(":") &&
            window.applyOverlayEffect
        ) {
            const [character, effect] = event.data.split(":");
            console.log(`🎨 Applying effect: ${character} → ${effect}`);
            window.applyOverlayEffect(character, effect);
        }
    };


    ws.onclose = () => {
        console.warn("🔌 WebSocket closed. Reconnecting in 5s...");
        setTimeout(connectWebSocket, 5000);
    };
}

connectWebSocket();
