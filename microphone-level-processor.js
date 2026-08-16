class MicrophoneLevelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.sumSquares = 0;
        this.sampleCount = 0;
        this.samplesPerReport = Math.round(sampleRate * 0.02);
    }

    process(inputs) {
        const channels = inputs[0];

        if (!channels || channels.length === 0) {
            return true;
        }

        for (const channel of channels) {
            for (let index = 0; index < channel.length; index++) {
                const sample = channel[index];
                this.sumSquares += sample * sample;
                this.sampleCount++;
            }
        }

        if (this.sampleCount >= this.samplesPerReport) {
            const rms = Math.sqrt(this.sumSquares / this.sampleCount);

            this.port.postMessage({ rms });
            this.sumSquares = 0;
            this.sampleCount = 0;
        }

        return true;
    }
}

registerProcessor(
    "microphone-level-processor",
    MicrophoneLevelProcessor
);
