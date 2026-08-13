import type { ActionRequest, PermissionTier } from "../contracts";

const CRITICAL_PATTERNS = [
  /pay|purchase|checkout|transfer|bank/i,
  /delete|destroy|drop|wipe|erase/i,
  /publish|post publicly|send campaign|broadcast/i,
  /credential|password|secret|api key|token/i,
  /legal|sign|submit.*court|tax filing/i,
  /production|deploy prod|database migration/i,
  /unlock|door|alarm|security system/i,
];

const READ_PATTERNS = [
  /read|search|find|list|inspect|summari[sz]e|analy[sz]e|check|view/i,
];

export function classifyAction(title:string, description=""): PermissionTier {
  const text=`${title} ${description}`;
  if(CRITICAL_PATTERNS.some(r=>r.test(text))) return "CRITICAL";
  if(READ_PATTERNS.some(r=>r.test(text))) return "READ";
  return "ACT";
}

export function requiresExplicitApproval(action:ActionRequest){
  return action.tier === "CRITICAL" || action.reversible === false;
}
