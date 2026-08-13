import type {
  AgentRun, IntelligenceAdapter, IntelligenceEvent, RunInput
} from "./contracts";

type HermesAdapterOptions = {
  baseUrl?: string;
  apiKey: string;
};

function normalizeStatus(value:unknown): AgentRun["status"] {
  const s=String(value||"running");
  if(["queued","started","running","waiting_approval","stopping","completed","failed","cancelled"].includes(s)) {
    return s as AgentRun["status"];
  }
  return "running";
}

export class HermesRunsAdapter implements IntelligenceAdapter {
  readonly id="hermes-agent";
  private baseUrl:string;
  private apiKey:string;

  constructor(options:HermesAdapterOptions){
    this.baseUrl=(options.baseUrl||"http://127.0.0.1:8642").replace(/\/$/,"");
    this.apiKey=options.apiKey;
  }

  private headers(extra:Record<string,string>={}){
    return {
      "Authorization":`Bearer ${this.apiKey}`,
      "Content-Type":"application/json",
      ...extra
    };
  }

  async health(){
    try{
      const res=await fetch(`${this.baseUrl}/health`,{cache:"no-store"});
      return res.ok;
    }catch{return false;}
  }

  async capabilities(){
    const res=await fetch(`${this.baseUrl}/v1/capabilities`,{
      headers:this.headers(),cache:"no-store"
    });
    if(!res.ok) throw new Error(`Hermes capabilities ${res.status}`);
    return res.json();
  }

  async startRun(input:RunInput):Promise<AgentRun>{
    const body:Record<string,unknown>={
      input:input.input,
      session_id:input.sessionId,
      instructions:input.instructions,
      previous_response_id:input.previousResponseId,
    };
    if(input.model) body.model=input.model;
    if(input.provider) body.provider=input.provider;
    if(input.reasoningEffort) body.model_options={reasoning_effort:input.reasoningEffort};

    const headers=this.headers();
    if(input.sessionKey) headers["X-Hermes-Session-Key"]=input.sessionKey;

    const res=await fetch(`${this.baseUrl}/v1/runs`,{
      method:"POST",headers,body:JSON.stringify(body)
    });
    if(!res.ok) throw new Error(`Hermes run submission ${res.status}: ${await res.text()}`);
    const data=await res.json();
    return {
      runId:String(data.run_id),
      sessionId:input.sessionId,
      status:normalizeStatus(data.status),
      input:input.input,
      startedAt:new Date().toISOString(),
    };
  }

  async getRun(runId:string):Promise<AgentRun>{
    const res=await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}`,{
      headers:this.headers(),cache:"no-store"
    });
    if(!res.ok) throw new Error(`Hermes run status ${res.status}`);
    const d=await res.json();
    return {
      runId:String(d.run_id||runId),
      sessionId:d.session_id ? String(d.session_id) : undefined,
      status:normalizeStatus(d.status),
      input:"",
      output:typeof d.output==="string"?d.output:undefined,
      startedAt:new Date().toISOString(),
      usage:d.usage ? {
        inputTokens:Number(d.usage.input_tokens||0),
        outputTokens:Number(d.usage.output_tokens||0),
        totalTokens:Number(d.usage.total_tokens||0),
      }:undefined
    };
  }

  async stopRun(runId:string){
    const res=await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/stop`,{
      method:"POST",headers:this.headers(),body:"{}"
    });
    if(!res.ok) throw new Error(`Hermes stop ${res.status}`);
  }

  async approveRun(runId:string,decision:"approve"|"deny",approvalId?:string){
    const res=await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/approval`,{
      method:"POST",
      headers:this.headers(),
      body:JSON.stringify({
        decision,
        ...(approvalId?{approval_id:approvalId}:{})
      })
    });
    if(!res.ok) throw new Error(`Hermes approval ${res.status}: ${await res.text()}`);
  }

  streamRun(runId:string,onEvent:(event:IntelligenceEvent)=>void){
    const controller=new AbortController();

    (async()=>{
      try{
        const res=await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`,{
          headers:{
            "Authorization":`Bearer ${this.apiKey}`,
            "Accept":"text/event-stream"
          },
          signal:controller.signal,
          cache:"no-store"
        });
        if(!res.ok || !res.body) throw new Error(`Hermes SSE ${res.status}`);

        const reader=res.body.getReader();
        const decoder=new TextDecoder();
        let buffer="";

        while(true){
          const {done,value}=await reader.read();
          if(done) break;
          buffer+=decoder.decode(value,{stream:true});
          const blocks=buffer.split(/\n\n/);
          buffer=blocks.pop()||"";

          for(const block of blocks){
            let eventName="";
            let dataText="";
            for(const line of block.split(/\n/)){
              if(line.startsWith("event:")) eventName=line.slice(6).trim();
              if(line.startsWith("data:")) dataText+=line.slice(5).trim();
            }
            if(!dataText) continue;
            let data:any;
            try{data=JSON.parse(dataText)}catch{data={text:dataText};}
            this.translateSse(runId,eventName,data,onEvent);
          }
        }
      }catch(error){
        if(!controller.signal.aborted){
          onEvent({type:"warning",message:error instanceof Error?error.message:"Hermes SSE failed"});
        }
      }
    })();

    return()=>controller.abort();
  }

  private translateSse(
    runId:string,eventName:string,data:any,onEvent:(event:IntelligenceEvent)=>void
  ){
    const at=new Date().toISOString();
    const name=eventName || String(data.type||"");

    if(/delta/i.test(name) && typeof(data.delta||data.text)==="string"){
      onEvent({type:"run.delta",runId,text:String(data.delta||data.text)});return;
    }

    if(name==="subagent.start" || name==="subagent.complete"){
      onEvent({
        type:"delegation",
        delegation:{
          runId,
          childSessionId:data.child_session_id?String(data.child_session_id):undefined,
          status:name==="subagent.start"?"started":String(data.status||"completed") as any,
          summary:data.summary?String(data.summary):undefined,
          durationMs:data.duration_ms?Number(data.duration_ms):undefined,
          tokens:data.tokens?Number(data.tokens):undefined,
          cost:data.cost?Number(data.cost):undefined,
          at
        }
      });return;
    }

    if(/approval/i.test(name) || data.status==="waiting_approval"){
      onEvent({
        type:"approval.required",
        approval:{
          runId,
          approvalId:data.approval_id?String(data.approval_id):undefined,
          title:String(data.title||data.tool||"Action approval required"),
          description:data.description?String(data.description):undefined,
          tool:data.tool?String(data.tool):undefined,
          argumentsPreview:data.arguments,
          risk:"CRITICAL"
        }
      });return;
    }

    if(/tool/i.test(name)){
      onEvent({
        type:"tool.progress",
        progress:{
          runId,
          tool:data.tool||data.name,
          phase:/fail/i.test(name)?"failed":/complete|done/i.test(name)?"completed":/start/i.test(name)?"started":"progress",
          summary:data.summary||data.message,
          at
        }
      });return;
    }

    if(/complete/i.test(name) || data.status==="completed"){
      onEvent({type:"run.status",runId,status:"completed"});return;
    }

    if(/fail|error/i.test(name) || data.status==="failed"){
      onEvent({type:"run.failed",runId,error:String(data.error||data.message||"Run failed")});return;
    }
  }
}
