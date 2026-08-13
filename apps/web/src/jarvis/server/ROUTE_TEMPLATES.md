# Next.js server route templates

These are templates, not browser-side adapters.

## `/app/api/jarvis/run/route.ts`

```ts
import { NextResponse } from "next/server";
import { JarvisIntelligenceService } from "@/server/JarvisIntelligenceService";

export async function POST(req:Request){
  const body=await req.json();
  const service=new JarvisIntelligenceService();

  const input=String(body.input||"").trim();
  if(!input) return NextResponse.json({error:"input required"},{status:400});

  const run=await service.hermes.startRun({
    input,
    sessionId:body.sessionId,
    sessionKey:body.sessionKey,
    instructions:body.instructions,
  });

  return NextResponse.json(run);
}
```

## `/app/api/jarvis/run/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { JarvisIntelligenceService } from "@/server/JarvisIntelligenceService";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const service=new JarvisIntelligenceService();
  return NextResponse.json(await service.hermes.getRun(id));
}
```

## Streaming

Do not expose the Hermes bearer key through `EventSource`.

Implement a server-side SSE proxy:
browser → Next route → Hermes SSE.

The proxy must:
- authenticate the current app user
- attach `HERMES_API_KEY` server-side
- forward only sanitized run events
- close upstream connection when client disconnects
- never forward raw secrets/tool environment
```
