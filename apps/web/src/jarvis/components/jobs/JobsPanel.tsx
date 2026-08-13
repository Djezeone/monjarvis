"use client";
export type JobView={id:string;prompt:string;schedule?:string;paused?:boolean};

export function JobsPanel({
  jobs,onRun,onPause
}:{
  jobs:JobView[];
  onRun?:(id:string)=>void;
  onPause?:(id:string)=>void;
}){
  return <section className="jx3-jobs">
    <header><span>AUTONOMY</span><strong>{jobs.length} jobs</strong></header>
    <div>{jobs.length===0?<p className="jx3-empty">No scheduled intelligence jobs.</p>:jobs.map(j=><article key={j.id}>
      <div><strong>{j.prompt}</strong><span>{j.schedule||"manual"}</span></div>
      <div><button onClick={()=>onRun?.(j.id)}>Run</button><button onClick={()=>onPause?.(j.id)}>{j.paused?"Resume":"Pause"}</button></div>
    </article>)}</div>
  </section>
}
