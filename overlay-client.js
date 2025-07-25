let ws;

function connectWebSocket() {
    ws = new WebSocket("wss://8748ecc3d100.ngrok-free.app");

    ws.onopen = () => {
        console.log("✅ Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
        const [character, effect] = event.data.split(":");
        console.log(`🎨 Applying effect: ${character} → ${effect}`);
        if (window.applyOverlayEffect) {
            window.applyOverlayEffect(character, effect);
        }
    };

    ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
    };

    ws.onclose = () => {
        console.warn("🔌 WebSocket closed. Reconnecting in 5s...");
        setTimeout(connectWebSocket, 5000);
    };
}

connectWebSocket();