export type ToolRisk="READ"|"ACT"|"CRITICAL";

export type ToolDescriptor={
  id:string;
  label:string;
  category:"memory"|"browser"|"automation"|"home"|"system"|"communication";
  risk:ToolRisk;
  enabled:boolean;
  serverOnly:boolean;
  description:string;
};

export const defaultToolRegistry:ToolDescriptor[]=[
  {id:"memory.search",label:"Search memory",category:"memory",risk:"READ",enabled:true,serverOnly:true,description:"Search temporal personal memory."},
  {id:"memory.remember",label:"Remember episode",category:"memory",risk:"ACT",enabled:true,serverOnly:true,description:"Persist a new memory episode."},
  {id:"browser.inspect",label:"Inspect web",category:"browser",risk:"READ",enabled:true,serverOnly:true,description:"Read and inspect web pages."},
  {id:"browser.act",label:"Act in browser",category:"browser",risk:"ACT",enabled:false,serverOnly:true,description:"Interact with a website within policy."},
  {id:"n8n.trigger",label:"Run workflow",category:"automation",risk:"ACT",enabled:true,serverOnly:true,description:"Trigger allowlisted n8n workflows."},
  {id:"home.read",label:"Read home state",category:"home",risk:"READ",enabled:true,serverOnly:true,description:"Read Home Assistant entities."},
  {id:"home.control",label:"Control home",category:"home",risk:"ACT",enabled:false,serverOnly:true,description:"Call allowlisted Home Assistant services."},
  {id:"home.security",label:"Security controls",category:"home",risk:"CRITICAL",enabled:false,serverOnly:true,description:"Locks, alarms and sensitive physical controls."},
];
