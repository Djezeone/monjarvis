export type BrowserTask={
  task:string;
  allowedDomains?:string[];
  maxSteps?:number;
  sessionId?:string;
};

export class BrowserWorkerAdapter {
  constructor(
    private baseUrl=process.env.JARVIS_BROWSER_WORKER_URL || "http://127.0.0.1:8772",
    private token=process.env.JARVIS_BROWSER_WORKER_TOKEN || ""
  ){}

  async run(task:BrowserTask){
    const headers:Record<string,string>={"Content-Type":"application/json"};
    if(this.token) headers["Authorization"]=`Bearer ${this.token}`;
    const r=await fetch(`${this.baseUrl}/tasks`,{
      method:"POST",headers,body:JSON.stringify(task)
    });
    if(!r.ok) throw new Error(`Browser worker ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async status(id:string){
    const headers:Record<string,string>={};
    if(this.token) headers["Authorization"]=`Bearer ${this.token}`;
    const r=await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(id)}`,{headers,cache:"no-store"});
    if(!r.ok) throw new Error(`Browser worker status ${r.status}`);
    return r.json();
  }
}
