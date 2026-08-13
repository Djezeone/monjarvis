class Pcm16Worklet extends AudioWorkletProcessor {
  constructor(options){
    super();
    this.targetRate = options.processorOptions?.targetRate || 16000;
    this.inputRate = sampleRate;
    this.acc = [];
    this.accSize = 0;
    this.chunkSamples = Math.floor(this.targetRate * 0.08); // 80 ms
  }

  downsample(input){
    if(this.inputRate === this.targetRate) return input;
    const ratio = this.inputRate / this.targetRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for(let i=0;i<outLen;i++){
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i+1)*ratio));
      let sum=0;
      for(let j=start;j<end;j++) sum += input[j];
      out[i] = sum / Math.max(1,end-start);
    }
    return out;
  }

  process(inputs){
    const input = inputs[0]?.[0];
    if(!input) return true;
    const mono = this.downsample(input);
    const pcm = new Int16Array(mono.length);
    for(let i=0;i<mono.length;i++){
      const s=Math.max(-1,Math.min(1,mono[i]));
      pcm[i]=s<0?s*0x8000:s*0x7fff;
    }
    this.port.postMessage(pcm.buffer,[pcm.buffer]);
    return true;
  }
}
registerProcessor("pcm16-worklet", Pcm16Worklet);
