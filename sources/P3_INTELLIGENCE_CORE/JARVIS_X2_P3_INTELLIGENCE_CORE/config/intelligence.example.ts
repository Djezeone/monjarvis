export const intelligenceConfig = {
  mode: "local" as const,
  hermes: {
    baseUrl: "http://127.0.0.1:8642",
    // API key comes from SERVER environment only.
  },
  memory: {
    baseUrl: "http://127.0.0.1:8771",
    groupId: "jarvis-primary",
  },
  browser: {
    baseUrl: "http://127.0.0.1:8772",
    enabledByDefault: false,
  },
  n8n: {
    enabled: true,
    allowlist: [
      "jarvis-read-daily-brief",
      "jarvis-create-draft",
      "jarvis-research-pipeline",
    ],
  },
  homeAssistant: {
    enabled: false,
    readByDefault: true,
    controlByDefault: false,
  },
} as const;
