"use client";

import { LivingVoiceController } from "./LivingVoiceController";
import { HandsFreeFallbacks } from "./HandsFreeFallbacks";
import { ActionApproval } from "../approvals/ActionApproval";
import { jarvisEventBus } from "../../runtime/JarvisEventBus";
import { useJarvisStore } from "../../runtime/store/jarvisStore";
import { useJarvisRuntime } from "../../runtime/JarvisRuntimeProvider";

export function LivingInterfaceOverlay(){
  const s=useJarvisStore();
  const { adapter: runtime }=useJarvisRuntime();

  async function submit(text:string){
    jarvisEventBus.emit({type:"reasoning.start"});
    try{
      await runtime.sendUserText(text);
    }catch{
      jarvisEventBus.emit({type:"warning",message:"Local runtime is not connected."});
    }
  }

  return <>
    <LivingVoiceController onFinalText={submit}/>
    <HandsFreeFallbacks
      onPushToTalk={()=>jarvisEventBus.emit({type:"voice.start"})}
      onCancel={()=>jarvisEventBus.emit({type:"reset"})}
    />
    {s.pendingApproval && (
      <ActionApproval
        action={s.pendingApproval}
        onApprove={a=>runtime.approveAction?.(a)}
        onDeny={a=>runtime.denyAction?.(a)}
      />
    )}
  </>;
}
