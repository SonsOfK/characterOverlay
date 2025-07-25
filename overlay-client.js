const ws = new WebSocket("wss://cc11fd422fc9.ngrok-free.app");

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