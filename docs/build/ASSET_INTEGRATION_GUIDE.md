# Claude Code — Asset Integration Guide

## Source of truth
Use:
- `assets/manifests/assets-manifest.json`
- `assets/manifests/assets.ts`
- `assets/manifests/screen_asset_mapping.json`

Never reference the historical French source filenames in application code.

## Import
Copy `assets/` into `public/assets/` or preserve the paths while updating `assets.ts`.

Example:
```ts
import { asset } from "@/assets/manifests/assets";
const src = asset("core_core_holographic_energy_futuristic");
```

## Rules
1. Prefer WebP in runtime UI.
2. Keep PNG as master/fallback.
3. Grade A may ship directly.
4. Grade B requires visual review in context.
5. Grade C must not ship without review.
6. Do not replace supplied assets by emoji.
7. Do not display ten large holographic objects simultaneously.
8. Cinematic assets belong to landing/transitions; daily UI must stay calm.
9. Preserve `prefers-reduced-motion`.
10. Use CSS/Three.js for dynamic glow where possible instead of baking endless variants.
