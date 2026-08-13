export const cinematicTimeline = [
  { id: "boot",        from: 0.00, to: 0.08, label: "Boot" },
  { id: "presence",    from: 0.08, to: 0.28, label: "Presence" },
  { id: "memory",      from: 0.28, to: 0.50, label: "Memory" },
  { id: "perception",  from: 0.50, to: 0.68, label: "Perception" },
  { id: "action",      from: 0.68, to: 0.84, label: "Action" },
  { id: "physical",    from: 0.84, to: 0.96, label: "Physical World" },
  { id: "handoff",     from: 0.96, to: 1.00, label: "Product Handoff" },
] as const;

export const cinematicCopy = {
  boot: "Presence, not interface.",
  presence: "One intelligence. Every context.",
  memory: "It remembers what matters.",
  perception: "It sees, hears and understands context.",
  action: "It turns intent into verified action.",
  physical: "Digital intelligence. Physical reach.",
  handoff: "Welcome to JARVIS X2.",
} as const;
