import { NextResponse } from "next/server";
import {
  browserConfig,
  listBrowserExecutions,
  listDomains,
  stepCeiling,
} from "@/server/browser-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    config: browserConfig(),
    stepCeiling: stepCeiling(),
    domains: listDomains(),
    executions: listBrowserExecutions().slice(0, 10),
  });
}
