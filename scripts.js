let timers = {
    meren: null,
    gardok: null,
};

const minVolumeThreshold = 0.04;
const delayBeforeHiding = 300;
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || "overlay").toLowerCase();

function initAnimators() {
    GardokAnimator.init();
    MerenAnimator.init();
}

function configurePageMode() {
    const isMicrophoneSender = role === "meren" || role === "gardok";
    const overlay = document.querySelector(".overlay");
    const senderPanel = document.getElementById("sender-panel");
    const senderName = document.getElementById("sender-name");

    if (isMicrophoneSender) {
        if (overlay) overlay.hidden = true;
        if (senderPanel) senderPanel.hidden = false;
        if (senderName) senderName.textContent = role === "meren" ? "Meren" : "Gardok";
    } else {
        if (overlay) overlay.hidden = false;
        if (senderPanel) senderPanel.hidden = true;
    }
}

function handleAudioLevel(level, character) {
    const frameElement = document.getElementById(`${character}-frame`);
    if (!frameElement) return;

    if (level > minVolumeThreshold) {
        if (timers[character]) {
            clearTimeout(timers[character]);
            timers[character] = null;
        }

        frameElement.src = "assets/screen_border_ok.png";

        if (character === "gardok") {
            GardokAnimator.startTalking();
        } else if (character === "meren") {
            MerenAnimator.startTalking();
        }
        return;
    }

    if (!timers[character]) {
        timers[character] = setTimeout(() => {
            frameElement.src = "assets/screen_border_off.png";

            if (character === "gardok") {
                GardokAnimator.stopTalking();
            } else if (character === "meren") {
                MerenAnimator.stopTalking();
            }

            timers[character] = null;
        }, delayBeforeHiding);
    }
}

window.handleAudioLevel = handleAudioLevel;

initAnimators();
configurePageMode();
