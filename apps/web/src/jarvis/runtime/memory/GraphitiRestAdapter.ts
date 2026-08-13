import type { MemoryAdapter, MemoryEpisode, MemoryFact } from "./contracts";

export class GraphitiRestAdapter implements MemoryAdapter {
  readonly id="graphiti-local";
  constructor(private baseUrl="http://127.0.0.1:8771"){}

  async health(){
    try{return (await fetch(`${this.baseUrl}/health`,{cache:"no-store"})).ok}catch{return false}
  }

  async remember(episode:MemoryEpisode){
    const res=await fetch(`${this.baseUrl}/episodes`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(episode)
    });
    if(!res.ok) throw new Error(`Graphiti remember ${res.status}`);
    return res.json();
  }

  async search(query:string,groupId?:string,limit=8):Promise<MemoryFact[]>{
    const u=new URL(`${this.baseUrl}/search`);
    u.searchParams.set("q",query);
    u.searchParams.set("limit",String(limit));
    if(groupId) u.searchParams.set("group_id",groupId);
    const res=await fetch(u,{cache:"no-store"});
    if(!res.ok) throw new Error(`Graphiti search ${res.status}`);
    return res.json();
  }
}
