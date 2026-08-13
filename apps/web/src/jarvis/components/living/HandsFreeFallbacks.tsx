"use client";
import { useEffect } from "react";
import { jarvisEventBus } from "../../runtime/JarvisEventBus";

export function HandsFreeFallbacks({
  onPushToTalk,
  onCancel,
}:{
  onPushToTalk?:()=>void;
  onCancel?:()=>void;
}){
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat) return;
      if(e.code==="Space" && (e.ctrlKey || e.metaKey)){
        e.preventDefault();
        onPushToTalk?.();
      }
      if(e.key==="Escape"){
        onCancel?.();
        jarvisEventBus.emit({type:"reset"});
      }
    };
    window.addEventListener("keydown",key);
    return()=>window.removeEventListener("keydown",key);
  },[onPushToTalk,onCancel]);

  return <div className="jx2-input-fallbacks" aria-label="Input alternatives">
    <span>Voice</span>
    <span><kbd>Ctrl/⌘</kbd> + <kbd>Space</kbd> push-to-talk</span>
    <span><kbd>Esc</kbd> cancel</span>
  </div>
}
