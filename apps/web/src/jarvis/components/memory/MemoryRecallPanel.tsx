"use client";
import { useState } from "react";
import type { MemoryFact } from "../../runtime/memory/contracts";

export function MemoryRecallPanel({
  search
}:{
  search:(query:string)=>Promise<MemoryFact[]>
}){
  const [q,setQ]=useState("");
  const [rows,setRows]=useState<MemoryFact[]>([]);
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!q.trim()) return;
    setBusy(true);
    try{setRows(await search(q.trim()))}finally{setBusy(false)}
  }

  return <section className="jx3-memory-recall">
    <header><span>TEMPORAL MEMORY</span><strong>Graphiti</strong></header>
    <form onSubmit={submit}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search remembered context…"/><button>{busy?"…":"Search"}</button></form>
    <div className="jx3-memory-list">
      {rows.map((r,i)=><article key={r.uuid||i}>
        <p>{r.fact}</p>
        {(r.validAt||r.invalidAt)&&<small>{r.validAt||"?"} → {r.invalidAt||"current"}</small>}
      </article>)}
    </div>
  </section>
}
