export type HermesJob = {
  id?:string;
  prompt:string;
  schedule:string;
  skills?:string[];
  provider?:string;
  delivery_target?:unknown;
};

export class HermesJobsAdapter {
  constructor(private baseUrl:string,private apiKey:string){}

  private headers(){
    return {"Authorization":`Bearer ${this.apiKey}`,"Content-Type":"application/json"};
  }
  async list(){
    const r=await fetch(`${this.baseUrl}/api/jobs`,{headers:this.headers(),cache:"no-store"});
    if(!r.ok) throw new Error(`Jobs list ${r.status}`);
    return r.json();
  }
  async create(job:HermesJob){
    const r=await fetch(`${this.baseUrl}/api/jobs`,{method:"POST",headers:this.headers(),body:JSON.stringify(job)});
    if(!r.ok) throw new Error(`Jobs create ${r.status}`);
    return r.json();
  }
  async pause(id:string){return this.post(id,"pause")}
  async resume(id:string){return this.post(id,"resume")}
  async runNow(id:string){return this.post(id,"run")}
  async remove(id:string){
    const r=await fetch(`${this.baseUrl}/api/jobs/${encodeURIComponent(id)}`,{method:"DELETE",headers:this.headers()});
    if(!r.ok) throw new Error(`Jobs delete ${r.status}`);
  }
  private async post(id:string,action:string){
    const r=await fetch(`${this.baseUrl}/api/jobs/${encodeURIComponent(id)}/${action}`,{method:"POST",headers:this.headers(),body:"{}"});
    if(!r.ok) throw new Error(`Jobs ${action} ${r.status}`);
    return r.json();
  }
}
