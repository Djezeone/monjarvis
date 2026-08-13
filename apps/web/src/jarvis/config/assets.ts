export const jarvisAssets = {
  brand: {
    mark: "/assets/brand/jarvis-x2-mark.svg",
    lockup: "/assets/brand/jarvis-x2-lockup.svg",
  },
  agents: ["research","builder","operator","analyst","home","scheduler"].map(
    id => `/assets/agents/${id}.svg`
  ),
  devices: ["phone","laptop","desktop","tablet","home-node","satellite"].map(
    id => `/assets/devices/${id}.svg`
  ),
  textures: ["mineral","glass-noise","grid","holo-lines","starfield","energy-rings"].map(
    id => `/assets/textures/${id}.svg`
  ),
  audio: ["wake","listening","accepted","processing","task-complete","warning","agent-spawn","shutdown"].map(
    id => `/assets/audio/ui/${id}.wav`
  ),
} as const;
