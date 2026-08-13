import type { ActionRequest } from "../contracts";

export type ApprovalRecord = {
  actionId:string;
  title:string;
  decision:"approved"|"denied";
  at:string;
};

const STORAGE_KEY="jarvisx2.approval-ledger.v1";

export function appendApproval(action:ActionRequest,decision:"approved"|"denied"){
  if(typeof window==="undefined") return;
  const current=readApprovalLedger();
  current.unshift({actionId:action.id,title:action.title,decision,at:new Date().toISOString()});
  localStorage.setItem(STORAGE_KEY,JSON.stringify(current.slice(0,100)));
}

export function readApprovalLedger():ApprovalRecord[]{
  if(typeof window==="undefined") return [];
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}
}
