import { jarvisEventBus } from "../JarvisEventBus";

export class PiperHttpAdapter {
  readonly id = "piper-http";
  private audio?: HTMLAudioElement;

  constructor(private endpoint = "http://127.0.0.1:5000/synthesize"){}

  async speak(text:string){
    if(!text.trim()) return;
    jarvisEventBus.emit({type:"speech.start",text});
    const res = await fetch(this.endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text})
    });
    if(!res.ok) throw new Error(`Piper ${res.status}`);
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    this.audio=new Audio(url);
    await new Promise<void>((resolve,reject)=>{
      if(!this.audio) return resolve();
      this.audio.onended=()=>resolve();
      this.audio.onerror=()=>reject(new Error("Piper audio playback failed"));
      this.audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
    jarvisEventBus.emit({type:"speech.end"});
  }

  stop(){
    this.audio?.pause();
    this.audio=undefined;
    jarvisEventBus.emit({type:"speech.end"});
  }
}
