import type { ToolDescriptor, ToolRisk } from "../../runtime/tools/ToolRegistry";

export type PolicyDecision={
  allow:boolean;
  requireApproval:boolean;
  reason:string;
};

const DENIED_HOME_DOMAINS=new Set(["lock","alarm_control_panel"]);
const CRITICAL_WORKFLOW_PATTERNS=[/payment/i,/publish/i,/delete/i,/production/i,/legal/i];

export class PolicyEngine {
  decideTool(tool:ToolDescriptor):PolicyDecision{
    if(!tool.enabled) return {allow:false,requireApproval:false,reason:"Tool is disabled."};
    if(tool.risk==="CRITICAL") return {allow:true,requireApproval:true,reason:"Critical action requires explicit approval."};
    if(tool.risk==="ACT") return {allow:true,requireApproval:false,reason:"Action allowed under reversible-action policy."};
    return {allow:true,requireApproval:false,reason:"Read-only tool."};
  }

  decideHomeService(domain:string,service:string):PolicyDecision{
    if(DENIED_HOME_DOMAINS.has(domain)){
      return {allow:true,requireApproval:true,reason:"Sensitive physical security domain."};
    }
    if(/delete|remove|unlock|disarm/i.test(service)){
      return {allow:true,requireApproval:true,reason:"Potentially destructive/sensitive home action."};
    }
    return {allow:true,requireApproval:false,reason:"Non-security home action."};
  }

  decideWorkflow(name:string):PolicyDecision{
    if(CRITICAL_WORKFLOW_PATTERNS.some(r=>r.test(name))){
      return {allow:true,requireApproval:true,reason:"Workflow name matches critical-operation pattern."};
    }
    return {allow:true,requireApproval:false,reason:"Workflow accepted by baseline policy."};
  }
}
