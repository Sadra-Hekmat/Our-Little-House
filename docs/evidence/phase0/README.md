# Phase 0 renderer evidence

Run `npm run evidence:phase0` after installing Playwright Chromium. The test proves each forced
renderer has a nonblank first frame and writes:

- `webgl-first-frame.png`
- `canvas-first-frame.png`

The same run probes `/`, `/game`, and both forced-renderer URLs from cache-empty browser contexts.
