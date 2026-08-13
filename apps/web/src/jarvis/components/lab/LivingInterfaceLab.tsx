"use client";

import { useEffect, useMemo, useState } from "react";
import { PermissionCenter } from "../permissions/PermissionCenter";
import { LivingInterfaceOverlay } from "../living/LivingInterfaceOverlay";
import { jarvisEventBus } from "../../runtime/JarvisEventBus";
import { useJarvisStore } from "../../runtime/store/jarvisStore";
import { LocalRuntimeWebSocketAdapter } from "../../runtime/adapters/LocalRuntimeWebSocketAdapter";
import type { ActionRequest } from "../../runtime/contracts";

export function LivingInterfaceLab(){
  const s=useJarvisStore();
  const runtime=useMemo(()=>new LocalRuntimeWebSocketAdapter(),[]);
  const [connected,setConnected]=useState(false);

  useEffect(()=>{
    const off=runtime.onEvent(e=>jarvisEventBus.emit(e));
    return ()=>{off()};
  },[runtime]);

  async function toggleRuntime(){
    if(connected){await runtime.disconnect();setConnected(false);}
    else{
      try{await runtime.connect();setConnected(true);}
      catch{jarvisEventBus.emit({type:"warning",message:"Start the local runtime on port 8765."});}
    }
  }

  function criticalDemo(){
    const action:ActionRequest={
      id:crypto.randomUUID(),
      title:"Publish external update",
      description:"Demonstration of a CRITICAL action requiring explicit approval.",
      tier:"CRITICAL",
      reversible:false,
      target:"External channel",
      dataAffected:["public content"],
      createdAt:new Date().toISOString()
    };
    jarvisEventBus.emit({type:"action.requested",action});
  }

  return <main className="jx2-lab">
    <header>
      <div><span>LIVING INTERFACE LAB</span><h1>Hands-free runtime</h1></div>
      <button onClick={toggleRuntime}>{connected?"Disconnect runtime":"Connect local runtime"}</button>
    </header>

    <section className="jx2-lab-grid">
      <article><h2>Live state</h2><strong className="jx2-state">{s.state}</strong><p>{s.transcript||s.partialTranscript||"No transcript yet."}</p></article>
      <article><h2>Permissions</h2><PermissionCenter/></article>
      <article><h2>Safety</h2><p>Critical external actions require an explicit decision.</p><button onClick={criticalDemo}>Test CRITICAL approval</button></article>
      <article><h2>Runtime</h2><dl><div><dt>Connection</dt><dd>{s.connection}</dd></div><div><dt>Wake</dt><dd>{s.wakeEnabled?"on":"off"}</dd></div><div><dt>Mic</dt><dd>{s.micEnabled?"on":"off"}</dd></div></dl></article>
    </section>

    <LivingInterfaceOverlay/>
  </main>
}
