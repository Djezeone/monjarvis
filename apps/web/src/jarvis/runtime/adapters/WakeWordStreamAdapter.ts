import { requestMicrophonePermission, stopMediaStream } from "../audio/permission";
import { jarvisEventBus } from "../JarvisEventBus";
import { setJarvisUiFlags } from "../store/jarvisStore";

export class WakeWordStreamAdapter {
  readonly id = "openwakeword-local";
  private stream?: MediaStream;
  private context?: AudioContext;
  private socket?: WebSocket;
  private source?: MediaStreamAudioSourceNode;
  private worklet?: AudioWorkletNode;

  constructor(
    private url = "ws://127.0.0.1:8765/wake",
    private threshold = 0.5
  ){}

  async enable(){
    this.stream = await requestMicrophonePermission();
    this.context = new AudioContext();
    await this.context.audioWorklet.addModule("/worklets/pcm16-worklet.js");

    this.source = this.context.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.context, "pcm16-worklet", {
      processorOptions: { targetRate: 16000 }
    });

    this.socket = new WebSocket(this.url);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = ()=>{
      setJarvisUiFlags({micEnabled:true,wakeEnabled:true});
    };
    this.socket.onclose = ()=>{
      setJarvisUiFlags({wakeEnabled:false});
    };
    this.socket.onerror = ()=>{
      jarvisEventBus.emit({type:"warning",message:"Wake-word runtime unavailable."});
    };
    this.socket.onmessage = (message)=>{
      try{
        const data = JSON.parse(String(message.data));
        if(data.type === "wake" && Number(data.score ?? 0) >= this.threshold){
          jarvisEventBus.emit({
            type:"wake.detected",
            score:Number(data.score),
            phrase:data.phrase || "Hey Jarvis"
          });
        }
      }catch{}
    };

    this.worklet.port.onmessage = (e)=>{
      if(this.socket?.readyState === WebSocket.OPEN){
        this.socket.send(e.data);
      }
    };

    // Keep processor alive without feeding audio to speakers.
    const silent = this.context.createGain();
    silent.gain.value = 0;
    this.source.connect(this.worklet);
    this.worklet.connect(silent);
    silent.connect(this.context.destination);
  }

  async disable(){
    try{ this.worklet?.disconnect(); }catch{}
    try{ this.source?.disconnect(); }catch{}
    this.socket?.close();
    await this.context?.close();
    stopMediaStream(this.stream);
    this.stream=undefined;this.context=undefined;this.socket=undefined;
    setJarvisUiFlags({micEnabled:false,wakeEnabled:false});
  }
}
