import { requestMicrophonePermission, stopMediaStream } from "./permission";

export class VoiceTurnRecorder {
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private timer?: number;

  constructor(private maxMs = 12000){}

  async record(){
    this.stream = await requestMicrophonePermission();
    const preferred = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find(t => MediaRecorder.isTypeSupported(t));

    this.recorder = new MediaRecorder(this.stream, preferred ? { mimeType: preferred } : undefined);
    this.chunks = [];

    const result = new Promise<Blob>((resolve,reject)=>{
      if(!this.recorder) return reject(new Error("MediaRecorder unavailable"));
      this.recorder.ondataavailable=(e)=>{ if(e.data.size) this.chunks.push(e.data); };
      this.recorder.onerror=()=>reject(new Error("Microphone recording failed"));
      this.recorder.onstop=()=>{
        const type=this.recorder?.mimeType || "audio/webm";
        const blob=new Blob(this.chunks,{type});
        stopMediaStream(this.stream);
        this.stream=undefined;
        resolve(blob);
      };
    });

    this.recorder.start(120);
    this.timer=window.setTimeout(()=>this.stop(),this.maxMs);
    return result;
  }

  stop(){
    if(this.timer) window.clearTimeout(this.timer);
    if(this.recorder?.state === "recording") this.recorder.stop();
  }

  cancel(){
    if(this.timer) window.clearTimeout(this.timer);
    if(this.recorder?.state === "recording") this.recorder.stop();
    stopMediaStream(this.stream);
  }
}
