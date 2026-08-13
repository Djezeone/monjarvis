"use client";
import { useState } from "react";
import type { JarvisState } from "../../config/states";
import { JarvisCoreScene } from "../jarvis-core/JarvisCoreScene";
import { HandsFreeDock } from "../voice/HandsFreeDock";
import { MemoryConstellation } from "../memory/MemoryConstellation";
import { AgentConstellation } from "../agents/AgentConstellation";
import { CursorField } from "../cursor/CursorField";

export function JarvisDashboard(){
  const [state,setState]=useState<JarvisState>("idle");
  return <main className="jx-dashboard">
    <CursorField/>
    <header className="jx-topbar">
      <img src="/assets/brand/jarvis-x2-lockup.svg" alt="Jarvis X2"/>
      <div className="jx-status"><i/> LOCAL <span>PRIVATE</span></div>
    </header>

    <section className="jx-grid">
      <article className="jx-panel jx-core-panel">
        <JarvisCoreScene state={state} className="jx-core-canvas"/>
        <div className="jx-core-copy"><span>CURRENT STATE</span><strong>{state}</strong></div>
      </article>
      <article className="jx-panel"><h3>Memory</h3><MemoryConstellation/></article>
      <article className="jx-panel"><h3>Agents</h3><AgentConstellation/></article>
      <article className="jx-panel"><h3>Active context</h3><p className="jx-big">3 tasks<br/>2 devices<br/>1 location</p></article>
      <article className="jx-panel"><h3>Next action</h3><p>Waiting for your voice or the next scheduled trigger.</p></article>
    </section>

    <HandsFreeDock
      state={state}
      onToggle={()=>setState(s=>s==="idle"?"listening":"idle")}
    />
  </main>
}
