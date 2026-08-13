export type WorkflowRequest={
  workflow:string;
  input:Record<string,unknown>;
  idempotencyKey?:string;
};

export class N8nWebhookAdapter {
  constructor(
    private baseUrl=process.env.N8N_WEBHOOK_BASE_URL || "http://127.0.0.1:5678/webhook",
    private sharedSecret=process.env.N8N_JARVIS_SECRET || ""
  ){}

  async trigger(req:WorkflowRequest){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(req.workflow)) throw new Error("Invalid workflow path");
    const headers:Record<string,string>={"Content-Type":"application/json"};
    if(this.sharedSecret) headers["X-Jarvis-Secret"]=this.sharedSecret;
    if(req.idempotencyKey) headers["Idempotency-Key"]=req.idempotencyKey;

    const r=await fetch(`${this.baseUrl.replace(/\/$/,"")}/${req.workflow}`,{
      method:"POST",headers,body:JSON.stringify(req.input)
    });
    if(!r.ok) throw new Error(`n8n webhook ${r.status}: ${await r.text()}`);
    const contentType=r.headers.get("content-type")||"";
    return contentType.includes("application/json")?r.json():r.text();
  }
}
