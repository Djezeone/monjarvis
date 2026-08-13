export const designTokens = {
  color: {
    void: "#05070A",
    mineral: "#090D12",
    graphite: "#111820",
    panel: "rgba(12, 18, 26, 0.64)",
    panelStrong: "rgba(10, 15, 22, 0.86)",
    line: "rgba(120, 170, 220, 0.16)",
    text: "#EDF6FF",
    muted: "#8EA1B4",
    cyan: "#5DEBFF",
    azure: "#4A8DFF",
    violet: "#7867FF",
    gold: "#D5A85A",
    success: "#63E6A5",
    warning: "#FFC66D",
    danger: "#FF6D86",
  },
  radius: { xs: 8, sm: 12, md: 18, lg: 28, xl: 40 },
  blur: { panel: 20, elevated: 34 },
  shadow: {
    glow: "0 0 40px rgba(93,235,255,.12)",
    elevated: "0 24px 80px rgba(0,0,0,.38)",
  },
  motion: {
    react: 0.22,
    panel: 0.42,
    cinematic: 1.1,
    breath: 4.8,
  }
} as const;
