"use client";
export type ReasoningSurfaceProps={
  state:"idle"|"thinking"|"acting"|"waiting"|"done"|"error";
  output?:string;
  delta?:string;
  activeTool?:string;
};

export function ReasoningSurface({state,output,delta,activeTool}:ReasoningSurfaceProps){
  return <section className={`jx3-reasoning is-${state}`}>
    <header><span>INTELLIGENCE</span><strong>{state}</strong></header>
    <div className="jx3-reasoning-body">
      <p>{output || delta || (state==="idle"?"Ready for intent.":"Processing…")}</p>
    </div>
    {activeTool && <footer><i/><span>{activeTool}</span></footer>}
  </section>
}
