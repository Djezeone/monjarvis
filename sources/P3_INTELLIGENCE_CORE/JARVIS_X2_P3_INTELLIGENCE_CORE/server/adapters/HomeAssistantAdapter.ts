export class HomeAssistantAdapter {
  constructor(
    private baseUrl=process.env.HASS_URL || "http://127.0.0.1:8123",
    private token=process.env.HASS_TOKEN || ""
  ){}

  private headers(){
    if(!this.token) throw new Error("HASS_TOKEN is not configured");
    return {
      "Authorization":`Bearer ${this.token}`,
      "Content-Type":"application/json"
    };
  }

  async health(){
    const r=await fetch(`${this.baseUrl.replace(/\/$/,"")}/api/`,{headers:this.headers(),cache:"no-store"});
    return r.ok;
  }

  async states(){
    const r=await fetch(`${this.baseUrl.replace(/\/$/,"")}/api/states`,{headers:this.headers(),cache:"no-store"});
    if(!r.ok) throw new Error(`Home Assistant states ${r.status}`);
    return r.json();
  }

  async state(entityId:string){
    const r=await fetch(`${this.baseUrl.replace(/\/$/,"")}/api/states/${encodeURIComponent(entityId)}`,{
      headers:this.headers(),cache:"no-store"
    });
    if(!r.ok) throw new Error(`Home Assistant state ${r.status}`);
    return r.json();
  }

  async callService(domain:string,service:string,data:Record<string,unknown>){
    const r=await fetch(`${this.baseUrl.replace(/\/$/,"")}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,{
      method:"POST",headers:this.headers(),body:JSON.stringify(data)
    });
    if(!r.ok) throw new Error(`Home Assistant service ${r.status}: ${await r.text()}`);
    return r.json();
  }
}
