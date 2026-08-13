"use client";

import { useMemo } from "react";
import { LivingVoiceController } from "./LivingVoiceController";
import { HandsFreeFallbacks } from "./HandsFreeFallbacks";
import { ActionApproval } from "../approvals/ActionApproval";
import { LocalRuntimeWebSocketAdapter } from "../../runtime/adapters/LocalRuntimeWebSocketAdapter";
import { jarvisEventBus } from "../../runtime/JarvisEventBus";
import { useJarvisStore } from "../../runtime/store/jarvisStore";

export function LivingInterfaceOverlay(){
  const s=useJarvisStore();
  const runtime=useMemo(()=>new LocalRuntimeWebSocketAdapter(),[]);

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
