const audioMeren = document.getElementById('audioMeren');
const audioGardok = document.getElementById('audioGardok');
const imgMeren = document.getElementById('imgMeren');
const imgGardok = document.getElementById('imgGardok');

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyserMeren = audioContext.createAnalyser();
const analyserGardok = audioContext.createAnalyser();

const sourceMeren = audioContext.createMediaElementSource(audioMeren);
const sourceGardok = audioContext.createMediaElementSource(audioGardok);

sourceMeren.connect(analyserMeren);
sourceGardok.connect(analyserGardok);

audioMeren.onplay = () => console.log("Audio Meren est joué");
audioGardok.onplay = () => console.log("Audio Gardok est joué");

analyserMeren.connect(audioContext.destination);
analyserGardok.connect(audioContext.destination);

analyserMeren.fftSize = 256;
analyserGardok.fftSize = 256;

const dataArrayMeren = new Uint8Array(analyserMeren.frequencyBinCount);
const dataArrayGardok = new Uint8Array(analyserGardok.frequencyBinCount);

function checkVolume() {
    analyserMeren.getByteFrequencyData(dataArrayMeren);
    analyserGardok.getByteFrequencyData(dataArrayGardok);

    const volumeMeren = dataArrayMeren.reduce((a, b) => a + b) / dataArrayMeren.length; 
    const volumeGardok = dataArrayGardok.reduce((a, b) => a + b) / dataArrayGardok.length;

    console.log("Volume 1:", volumeMeren);
    console.log("Volume 2:", volumeGardok);

    if (volumeMeren > 50) {
        imgMeren.classList.add('talking');
    } else {
        imgMeren.classList.remove('talking');
    }

    if (volumeGardok > 50) {
        imgGardok.classList.add('talking');
    } else {
        imgGardok.classList.remove('talking');
    }
}

setInterval(checkVolume, 100);

