// «التسميع»: the microphone's samples, passed on to the page in blocks (the tajweed check is done on the device).
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.block = new Float32Array(4096);
    this.fill = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.block[this.fill++] = channel[i];
        if (this.fill === this.block.length) {
          this.port.postMessage(this.block);
          this.block = new Float32Array(4096);
          this.fill = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
