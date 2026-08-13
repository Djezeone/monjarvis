"use client";
const agents = [
  ["Research","/assets/agents/research.svg"],
  ["Builder","/assets/agents/builder.svg"],
  ["Operator","/assets/agents/operator.svg"],
  ["Analyst","/assets/agents/analyst.svg"],
];

export function AgentConstellation(){
  return <section className="jx-agent-constellation">
    {agents.map(([name,src],i)=><article key={name} style={{["--i" as any]:i}}>
      <img src={src} alt=""/>
      <div><strong>{name}</strong><span>{i===0?"working":"available"}</span></div>
    </article>)}
  </section>
}
