import json, os, urllib.parse, urllib.request

BASE=os.getenv("JARVIS_GRAPHITI_URL","http://127.0.0.1:8771").rstrip("/")

def _json_request(url,method="GET",body=None):
    data=None
    headers={"Content-Type":"application/json"}
    if body is not None:
        data=json.dumps(body).encode("utf-8")
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))

def memory_search(args,**kwargs):
    q=str(args.get("query","")).strip()
    if not q: return json.dumps({"error":"query required"})
    params={"q":q,"limit":str(min(max(int(args.get("limit",8)),1),20))}
    if args.get("group_id"): params["group_id"]=str(args["group_id"])
    rows=_json_request(f"{BASE}/search?{urllib.parse.urlencode(params)}")
    return json.dumps(rows,ensure_ascii=False,default=str)

def memory_remember(args,**kwargs):
    name=str(args.get("name","")).strip()
    body=str(args.get("body","")).strip()
    if not name or not body: return json.dumps({"error":"name and body required"})
    payload={
      "name":name,
      "body":body,
      "sourceDescription":str(args.get("source_description") or "Hermes Agent"),
      "groupId":str(args.get("group_id") or "jarvis-primary"),
      "referenceTime":args.get("reference_time"),
    }
    return json.dumps(_json_request(f"{BASE}/episodes","POST",payload),ensure_ascii=False)
