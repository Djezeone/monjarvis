"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WakeWordStreamAdapter } from "../../runtime/adapters/WakeWordStreamAdapter";
import { WhisperCppAdapter } from "../../runtime/adapters/WhisperCppAdapter";
import { PiperHttpAdapter } from "../../runtime/adapters/PiperHttpAdapter";
import { VoiceTurnRecorder } from "../../runtime/audio/VoiceTurnRecorder";
import { jarvisEventBus } from "../../runtime/JarvisEventBus";
import { useJarvisStore } from "../../runtime/store/jarvisStore";

export function LivingVoiceController({
  onFinalText,
  wakeUrl="ws://127.0.0.1:8765/wake",
  whisperUrl="http://127.0.0.1:8080/inference",
  piperUrl="http://127.0.0.1:5000/synthesize",
}:{
  onFinalText?:(text:string)=>void|Promise<void>;
  wakeUrl?:string;
  whisperUrl?:string;
  piperUrl?:string;
}){
  const s=useJarvisStore();
  const wake=useMemo(()=>new WakeWordStreamAdapter(wakeUrl),[wakeUrl]);
  const stt=useMemo(()=>new WhisperCppAdapter(whisperUrl,"auto"),[whisperUrl]);
  const tts=useMemo(()=>new PiperHttpAdapter(piperUrl),[piperUrl]);
  const recorder=useRef<VoiceTurnRecorder>();
  const [enabled,setEnabled]=useState(false);
  const busy=useRef(false);

  useEffect(()=>{
    const off=jarvisEventBus.subscribe(async event=>{
      if(event.type==="wake.detected" && !busy.current){
        busy.current=true;
        try{
          jarvisEventBus.emit({type:"voice.start"});
          recorder.current=new VoiceTurnRecorder(9000);
          const audio=await recorder.current.record();
          const text=await stt.transcribe(audio);
          if(text) await onFinalText?.(text);
        }catch(error){
          jarvisEventBus.emit({type:"warning",message:error instanceof Error?error.message:"Voice turn failed"});
        }finally{
          busy.current=false;
        }
      }
    });
    return off;
  },[stt,onFinalText]);

  async function toggle(){
    if(enabled){ await wake.disable(); setEnabled(false); }
    else { await wake.enable(); setEnabled(true); }
  }

  return <section className="jx2-living-controller">
    <button onClick={toggle} className={enabled?"is-on":""}>
      <i/>
      <span>{enabled?"Hands-free active":"Enable hands-free"}</span>
    </button>
    <div className="jx2-living-state">
      <strong>{s.state}</strong>
      <span>{s.partialTranscript || s.transcript || (enabled?`Say “${s.wakePhrase}”`:"Microphone disabled")}</span>
    </div>
    <div className="jx2-living-badges">
      <span>{s.connection}</span><span>{enabled?"wake on":"wake off"}</span>
    </div>
  </section>
}
