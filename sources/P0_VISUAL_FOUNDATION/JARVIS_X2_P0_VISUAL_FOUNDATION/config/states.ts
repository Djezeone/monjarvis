export type JarvisState =
  | "idle"
  | "wake"
  | "listening"
  | "understanding"
  | "thinking"
  | "acting"
  | "speaking"
  | "warning";

export const jarvisStateConfig = {
  idle:          { energy: .22, speed: .12, hue: 0.56, pulse: .10 },
  wake:          { energy: .56, speed: .45, hue: 0.55, pulse: .62 },
  listening:     { energy: .72, speed: .66, hue: 0.52, pulse: .78 },
  understanding: { energy: .64, speed: .82, hue: 0.61, pulse: .52 },
  thinking:      { energy: .92, speed: 1.08, hue: 0.66, pulse: .94 },
  acting:        { energy: 1.00, speed: 1.28, hue: 0.48, pulse: .88 },
  speaking:      { energy: .84, speed: .74, hue: 0.58, pulse: 1.00 },
  warning:       { energy: 1.00, speed: 1.36, hue: 0.03, pulse: 1.00 },
} as const;
