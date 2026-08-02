# Phase 1 gray-box evidence

Run `npm run evidence:phase1` after installing Playwright Chromium. The evidence run uses the same
fixed 270-frame movement trace in forced WebGL and Canvas and writes:

- `renderer-baselines.json` — renderer, named viewport/profile, CPU throttle, average FPS, and final
  coordinates;
- `desktop-webgl-graybox.png` — `1366 × 768` desktop profile;
- `mobile-canvas-graybox.png` — `844 × 390` landscape profile at 4× CPU throttle.

The throttled browser profile is a reproducible local performance gate, not a substitute for the
plan's physical mid-range mobile-device acceptance run.
