const GardokAnimator = (() => {
  const FRAME_RATE = 100; // vitesse animation bouche (en ms)
  const BLINK_FRAMES = 6;
  const BLINK_INTERVAL_RANGE = [3000, 7000];

  let mouthInterval = null;
  let blinkTimeout = null;
  let currentMouthFrame = 0;

  const MOUTH_FRAME_COUNT = 6;

  const elements = {
    body: document.getElementById("gardok-body"),
    head: document.getElementById("gardok-head"),
    hair: document.getElementById("gardok-hair"),
    goggles: document.getElementById("gardok-goggles"),
    leftEye: document.getElementById("gardok-left-eye"),
    rightEye: document.getElementById("gardok-right-eye"),
  };

  function updateImage(element, baseName, index) {
    element.src = `assets/${baseName}_${index}.png`;
  }

  function startTalking() {
    if (mouthInterval) return;

    mouthInterval = setInterval(() => {
      updateImage(elements.head, "gardok_head", currentMouthFrame);
      currentMouthFrame = (currentMouthFrame + 1) % MOUTH_FRAME_COUNT;
    }, FRAME_RATE);
  }

  function stopTalking() {
    if (mouthInterval) {
      clearInterval(mouthInterval);
      mouthInterval = null;
      currentMouthFrame = 0;
      updateImage(elements.head, "gardok_head", 0);
    }
  }

  function blinkEyes() {
    let frame = 0;

    const blinkInterval = setInterval(() => {
      if (frame >= BLINK_FRAMES) {
        clearInterval(blinkInterval);
        updateImage(elements.leftEye, "gardok_left_eye", 0);
        updateImage(elements.rightEye, "gardok_right_eye", 0);
        scheduleNextBlink();
        return;
      }

      updateImage(elements.leftEye, "gardok_left_eye", frame);
      updateImage(elements.rightEye, "gardok_right_eye", frame);
      frame++;
    }, 50);
  }

  function scheduleNextBlink() {
    const delay = Math.floor(Math.random() * (BLINK_INTERVAL_RANGE[1] - BLINK_INTERVAL_RANGE[0])) + BLINK_INTERVAL_RANGE[0];
    blinkTimeout = setTimeout(blinkEyes, delay);
  }

  function init() {
    updateImage(elements.head, "gardok_head", 0);
    updateImage(elements.leftEye, "gardok_left_eye", 0);
    updateImage(elements.rightEye, "gardok_right_eye", 0);
    scheduleNextBlink();
  }

  return {
    init,
    startTalking,
    stopTalking,
  };
})();