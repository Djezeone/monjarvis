"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JarvisApiClient } from "../../runtime/intelligence/JarvisApiClient";
import type { AgentRun, DelegationEvent } from "../../runtime/intelligence/contracts";
import { ReasoningSurface } from "../intelligence/ReasoningSurface";
import { DelegationPanel } from "../agents/DelegationPanel";

export function IntelligenceCoreLab(){
  const api=useMemo(()=>new JarvisApiClient(),[]);
  const [prompt,setPrompt]=useState("Summarize the current JARVIS X2 state and identify the next safest useful action.");
  const [run,setRun]=useState<AgentRun|null>(null);
  const [output,setOutput]=useState("");
  const [delegations]=useState<DelegationEvent[]>([]);
  const poll=useRef<number | undefined>(undefined);

  useEffect(()=>()=>{if(poll.current)clearInterval(poll.current)},[]);

  async function start(){
    setOutput("");
    const r=await api.start(prompt,"jarvis-x2-lab");
    setRun(r);
    poll.current=window.setInterval(async()=>{
      const next=await api.status(r.runId);
      setRun(next);
      if(next.output)setOutput(next.output);
      if(["completed","failed","cancelled"].includes(next.status)){
        if(poll.current)clearInterval(poll.current);
      }
    },900);
  }

  return <main className="jx3-lab">
    <header>
      <div><span>INTELLIGENCE CORE LAB</span><h1>Reason. Remember. Act.</h1></div>
      <div className="jx3-mode"><i/> LOCAL-FIRST</div>
    </header>

    <section className="jx3-command">
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3}/>
      <button onClick={start} disabled={!prompt.trim()}>Run intelligence</button>
      {run && !["completed","failed","cancelled"].includes(run.status) && <button className="quiet" onClick={()=>api.stop(run.runId)}>Stop</button>}
    </section>

    <section className="jx3-grid">
      <ReasoningSurface
        state={!run?"idle":run.status==="completed"?"done":run.status==="failed"?"error":run.status==="waiting_approval"?"waiting":run.status==="running"||run.status==="started"?"thinking":"acting"}
        output={output}
      />
      <DelegationPanel items={delegations}/>
      <article className="jx3-panel">
        <header><span>RUN</span><strong>{run?.status||"idle"}</strong></header>
        <dl>
          <div><dt>ID</dt><dd>{run?.runId||"—"}</dd></div>
          <div><dt>Session</dt><dd>{run?.sessionId||"—"}</dd></div>
          <div><dt>Tokens</dt><dd>{run?.usage?.totalTokens||"—"}</dd></div>
        </dl>
      </article>
      <article className="jx3-panel">
        <header><span>CORE ORGANS</span><strong>5</strong></header>
        <ul className="jx3-organs">
          <li><i className="on"/>Hermes <span>reasoning</span></li>
          <li><i className="on"/>Graphiti <span>memory</span></li>
          <li><i/>Browser worker <span>gated</span></li>
          <li><i/>n8n <span>server-side</span></li>
          <li><i/>Home Assistant <span>server-side</span></li>
        </ul>
      </article>
    </section>
  </main>
}
