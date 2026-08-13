import type { ActionRequest, RuntimeEvent } from "../contracts";
import type { RuntimeAdapter } from "./RuntimeAdapter";

export class LocalRuntimeWebSocketAdapter implements RuntimeAdapter {
  readonly id = "jarvis-local-runtime";
  private ws?: WebSocket;
  private listeners = new Set<(event:RuntimeEvent)=>void>();

  constructor(private url="ws://127.0.0.1:8765/events"){}

  async connect(){
    await new Promise<void>((resolve,reject)=>{
      this.ws=new WebSocket(this.url);
      this.ws.onopen=()=>resolve();
      this.ws.onerror=()=>reject(new Error("Local runtime unavailable"));
      this.ws.onmessage=(m)=>{
        try{
          const event=JSON.parse(String(m.data)) as RuntimeEvent;
          this.listeners.forEach(l=>l(event));
        }catch{}
      };
      this.ws.onclose=()=>this.listeners.forEach(l=>l({type:"runtime.disconnected",reason:"Runtime socket closed"}));
    });
    this.listeners.forEach(l=>l({type:"runtime.connected",mode:"local"}));
  }

  async disconnect(){ this.ws?.close(); }

  async sendUserText(text:string){
    this.send({type:"user.text",text});
  }

  async approveAction(action:ActionRequest){
    this.send({type:"approval",actionId:action.id,decision:"approve"});
  }

  async denyAction(action:ActionRequest){
    this.send({type:"approval",actionId:action.id,decision:"deny"});
  }

  onEvent(listener:(event:RuntimeEvent)=>void){
    this.listeners.add(listener);
    return()=>this.listeners.delete(listener);
  }

  private send(payload:unknown){
    if(this.ws?.readyState!==WebSocket.OPEN) throw new Error("Runtime not connected");
    this.ws.send(JSON.stringify(payload));
  }
}
