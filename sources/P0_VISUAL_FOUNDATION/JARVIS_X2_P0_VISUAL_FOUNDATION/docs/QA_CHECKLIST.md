# JARVIS X2 P0 QA Checklist

## Visual
- [ ] No legacy branding remains.
- [ ] 8 Core states are visually distinguishable.
- [ ] Cyan/violet dominate; gold remains rare.
- [ ] Mobile layout remains usable.
- [ ] Reduced-motion removes decorative motion.

## Hands-free
- [ ] Microphone never activates before permission.
- [ ] Voice status is visible and understandable.
- [ ] Keyboard/touch can perform every primary action.
- [ ] Audio cues never autoplay on initial page load.

## Performance
- [ ] 3D scene lazy-loaded.
- [ ] DPR clamped.
- [ ] Background tab reduces animation work.
- [ ] WebGL failure renders 2D fallback.
- [ ] No uncompressed 4K PNG in first viewport.

## Security
- [ ] No secrets in browser bundle.
- [ ] Critical actions use explicit approval UI.
- [ ] Runtime actions are separated from presentation state.
- [ ] Audit trail exists before enabling external writes.

## Engineering
- [ ] No TypeScript errors.
- [ ] No hydration warnings.
- [ ] No console errors.
- [ ] Routes `/`, `/app`, `/lab/core` work.
