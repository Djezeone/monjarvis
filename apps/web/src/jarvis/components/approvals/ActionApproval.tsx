"use client";
import type { ActionRequest } from "../../runtime/contracts";
import { appendApproval } from "../../runtime/policy/approvalLedger";

export function ActionApproval({
  action,onApprove,onDeny
}:{
  action:ActionRequest;
  onApprove:(action:ActionRequest)=>void|Promise<void>;
  onDeny:(action:ActionRequest)=>void|Promise<void>;
}){
  return <div className="jx2-approval-backdrop" role="presentation">
    <section className="jx2-approval" role="alertdialog" aria-modal="true" aria-labelledby="jx2-approval-title">
      <span className="jx2-approval-tier">{action.tier} ACTION</span>
      <h2 id="jx2-approval-title">{action.title}</h2>
      {action.description && <p>{action.description}</p>}
      <dl>
        <div><dt>Target</dt><dd>{action.target||"Not specified"}</dd></div>
        <div><dt>Reversible</dt><dd>{action.reversible?"Yes":"No"}</dd></div>
        <div><dt>Data affected</dt><dd>{action.dataAffected?.join(", ")||"Not specified"}</dd></div>
      </dl>
      <div className="jx2-approval-actions">
        <button className="deny" onClick={async()=>{appendApproval(action,"denied");await onDeny(action)}}>Deny</button>
        <button className="approve" onClick={async()=>{appendApproval(action,"approved");await onApprove(action)}}>Approve once</button>
      </div>
    </section>
  </div>
}
