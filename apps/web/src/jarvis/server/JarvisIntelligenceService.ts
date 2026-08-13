import { HermesRunsAdapter } from "../runtime/intelligence/HermesRunsAdapter";
import { GraphitiRestAdapter } from "../runtime/memory/GraphitiRestAdapter";
import { HermesJobsAdapter } from "../runtime/jobs/HermesJobsAdapter";
import { HomeAssistantAdapter } from "./adapters/HomeAssistantAdapter";
import { N8nWebhookAdapter } from "./adapters/N8nWebhookAdapter";
import { BrowserWorkerAdapter } from "./adapters/BrowserWorkerAdapter";
import { PolicyEngine } from "./policy/PolicyEngine";

export class JarvisIntelligenceService {
  readonly hermes:HermesRunsAdapter;
  readonly memory:GraphitiRestAdapter;
  readonly jobs:HermesJobsAdapter;
  readonly home:HomeAssistantAdapter;
  readonly n8n:N8nWebhookAdapter;
  readonly browser:BrowserWorkerAdapter;
  readonly policy=new PolicyEngine();

  constructor(){
    const hermesBase=process.env.HERMES_API_URL || "http://127.0.0.1:8642";
    const hermesKey=process.env.HERMES_API_KEY || "";
    if(!hermesKey) throw new Error("HERMES_API_KEY is required on the server.");

    this.hermes=new HermesRunsAdapter({baseUrl:hermesBase,apiKey:hermesKey});
    this.memory=new GraphitiRestAdapter(process.env.GRAPHITI_MEMORY_URL || "http://127.0.0.1:8771");
    this.jobs=new HermesJobsAdapter(hermesBase,hermesKey);
    this.home=new HomeAssistantAdapter();
    this.n8n=new N8nWebhookAdapter();
    this.browser=new BrowserWorkerAdapter();
  }
}
