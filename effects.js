const validEffects = ["sick", "rainbow", "roll"];

// Apply a visual effect to a character
window.applyOverlayEffect = (character, effect) => {
  if (!["gardok", "meren"].includes(character)) {
    console.warn(`Personnage inconnu : ${character}`);
    return;
  }

  if (!validEffects.includes(effect)) {
    console.warn(`Effet inconnu : ${effect}`);
    return;
  }

  const container = document.getElementById(character);
  const fullElements = document.querySelectorAll(`.${character}-full`);

  // Remove existing effect
  validEffects.forEach(e => {
    container.classList.remove(`effect-${e}`);
    fullElements.forEach(el => el.classList.remove(`effect-${e}`));
  });

  // Apply new effect
  if (effect === "roll") {
    fullElements.forEach(el => el.classList.add(`effect-${effect}`));
  } else {
    container.classList.add(`effect-${effect}`);
  }

  // Remove effect after duration
  setTimeout(() => {
    container.classList.remove(`effect-${effect}`);
    fullElements.forEach(el => el.classList.remove(`effect-${effect}`));
  }, 5000);
};