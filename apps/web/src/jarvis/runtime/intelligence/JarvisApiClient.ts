import type { AgentRun } from "./contracts";

export class JarvisApiClient {
  constructor(private baseUrl="/api/jarvis"){}

  async start(input:string,sessionId?:string){
    const r=await fetch(`${this.baseUrl}/run`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({input,sessionId})
    });
    if(!r.ok) throw new Error(`JARVIS API ${r.status}`);
    return r.json() as Promise<AgentRun>;
  }

  async status(runId:string){
    const r=await fetch(`${this.baseUrl}/run/${encodeURIComponent(runId)}`,{cache:"no-store"});
    if(!r.ok) throw new Error(`JARVIS status ${r.status}`);
    return r.json() as Promise<AgentRun>;
  }

  async stop(runId:string){
    const r=await fetch(`${this.baseUrl}/run/${encodeURIComponent(runId)}/stop`,{method:"POST"});
    if(!r.ok) throw new Error(`JARVIS stop ${r.status}`);
  }

  async approval(runId:string,decision:"approve"|"deny",approvalId?:string){
    const r=await fetch(`${this.baseUrl}/run/${encodeURIComponent(runId)}/approval`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({decision,approvalId})
    });
    if(!r.ok) throw new Error(`JARVIS approval ${r.status}`);
  }
}
