import type { AgentRun } from "./contracts";

export type StartOptions = {
  sessionId?: string;
  /** P4 handoff: reuse a sessionKey to continue the same conversation from any device. */
  sessionKey?: string;
  device?: string;
  location?: string;
};

export class JarvisApiClient {
  constructor(private baseUrl="/api/jarvis"){}

  async start(input:string,options:StartOptions={}){
    const r=await fetch(`${this.baseUrl}/run`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({input,...options})
    });
    if(!r.ok) throw new Error(`JARVIS API ${r.status}`);
    return r.json() as Promise<AgentRun & { sessionKey: string }>;
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
