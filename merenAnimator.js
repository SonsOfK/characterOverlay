const MerenAnimator = (() => {
  const FRAME_RATE = 100; // vitesse animation bouche
  const BLINK_FRAMES = 6;
  const BLINK_INTERVAL_RANGE = [3000, 7000];

  let mouthInterval = null;
  let blinkTimeout = null;
  let currentMouthFrame = 0;

  const MOUTH_FRAME_COUNT = 6;

  const elements = {
    body: document.getElementById("meren-body"),
    head: document.getElementById("meren-head"),
    hair: document.getElementById("meren-hair"),
    eye: document.getElementById("meren-eye"),
  };

  function updateImage(element, baseName, index) {
    element.src = `assets/${baseName}_${index}.png`;
  }

  function startTalking() {
    if (mouthInterval) return;

    mouthInterval = setInterval(() => {
      updateImage(elements.head, "meren_head", currentMouthFrame);
      currentMouthFrame = (currentMouthFrame + 1) % MOUTH_FRAME_COUNT;
    }, FRAME_RATE);
  }

  function stopTalking() {
    if (mouthInterval) {
      clearInterval(mouthInterval);
      mouthInterval = null;
      currentMouthFrame = 0;
      updateImage(elements.head, "meren_head", 0);
    }
  }

  function blinkEye() {
    let frame = 0;

    const blinkInterval = setInterval(() => {
      if (frame >= BLINK_FRAMES) {
        clearInterval(blinkInterval);
        updateImage(elements.eye, "meren_eye", 0);
        scheduleNextBlink();
        return;
      }

      updateImage(elements.eye, "meren_eye", frame);
      frame++;
    }, 50);
  }

  function scheduleNextBlink() {
    const delay = Math.floor(Math.random() * (BLINK_INTERVAL_RANGE[1] - BLINK_INTERVAL_RANGE[0])) + BLINK_INTERVAL_RANGE[0];
    blinkTimeout = setTimeout(blinkEye, delay);
  }

  function init() {
    updateImage(elements.head, "meren_head", 0);
    updateImage(elements.eye, "meren_eye", 0);
    scheduleNextBlink();
  }

  return {
    init,
    startTalking,
    stopTalking,
  };
})();