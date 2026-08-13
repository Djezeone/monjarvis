"use client";
import { useState } from "react";
import type { JarvisState } from "../../config/states";
import { JarvisCoreScene } from "../jarvis-core/JarvisCoreScene";
import { HandsFreeDock } from "../voice/HandsFreeDock";
import { CursorField } from "../cursor/CursorField";
import { MemoryConstellation } from "../memory/MemoryConstellation";
import { AgentConstellation } from "../agents/AgentConstellation";

const states: JarvisState[]=["idle","wake","listening","understanding","thinking","acting","speaking","warning"];

export function JarvisP0DemoPage(){
  const [state,setState]=useState<JarvisState>("idle");
  return <section className="jx-dashboard">
    <CursorField/>
    <header className="jx-topbar">
      <img src="/assets/brand/jarvis-x2-lockup.svg" alt="Jarvis X2"/>
      <div className="jx-status"><i/> LOCAL <span>HANDS-FREE READY</span></div>
    </header>
    <section className="jx-grid">
      <article className="jx-panel jx-core-panel">
        <JarvisCoreScene state={state} className="jx-core-canvas"/>
        <div className="jx-core-copy">
          <span>LIVE STATE</span><strong>{state}</strong>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:12}}>
            {states.map(s=><button key={s} onClick={()=>setState(s)}
              style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",color:"#DCEFFF",borderRadius:999,padding:"6px 9px",fontSize:10}}>
              {s}
            </button>)}
          </div>
        </div>
      </article>
      <article className="jx-panel"><h3>Memory graph</h3><MemoryConstellation/></article>
      <article className="jx-panel"><h3>Agent constellation</h3><AgentConstellation/></article>
      <article className="jx-panel"><h3>Hands-free principle</h3>
        <p className="jx-big">Wake → Listen → Reason → Act → Speak</p>
      </article>
      <article className="jx-panel"><h3>Interaction</h3>
        <p>Move the pointer through the scene. Use the bottom dock to simulate voice-first operation.</p>
      </article>
    </section>
    <HandsFreeDock state={state} onToggle={()=>setState(s=>s==="listening"?"idle":"listening")}/>
  </section>
}
