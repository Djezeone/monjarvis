"use client";
import type { DelegationEvent } from "../../runtime/intelligence/contracts";

export function DelegationPanel({items}:{items:DelegationEvent[]}){
  return <section className="jx3-delegations">
    <header><span>DELEGATIONS</span><strong>{items.filter(i=>i.status==="started").length} active</strong></header>
    <div>
      {items.length===0 && <p className="jx3-empty">No child agents.</p>}
      {items.slice(-8).reverse().map((d,i)=><article key={`${d.childSessionId||i}-${d.at}`}>
        <i className={`is-${d.status}`}/>
        <div><strong>{d.childSessionId || "subagent"}</strong><span>{d.summary || d.status}</span></div>
        <small>{d.durationMs ? `${Math.round(d.durationMs/1000)}s` : d.status}</small>
      </article>)}
    </div>
  </section>
}
