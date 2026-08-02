# Phase 1 gray-box evidence

Run `npm run evidence:phase1` after installing Playwright Chromium. The evidence run uses the same
fixed 270-frame movement trace in forced WebGL and Canvas and writes:

- `renderer-baselines.json` — renderer, named viewport/profile, CPU throttle, average FPS, and final
  coordinates;
- `desktop-webgl-graybox.png` — `1366 × 768` desktop profile;
- `mobile-canvas-graybox.png` — `844 × 390` landscape profile at 4× CPU throttle.

The trace advances the live Phaser Arcade Physics world at a fixed 60 Hz in each forced renderer;
the pure movement trace remains its independent unit-test oracle. The throttled browser profile is
a reproducible local performance gate, not a substitute for the plan's physical mid-range
mobile-device acceptance run.

## Physical mobile Canvas closeout

1. Connect a real, named mid-range phone to the same network as the development machine.
2. Run `npm run dev -- --host 0.0.0.0` and open `/game?renderer=canvas` on the phone in landscape.
3. Confirm the development diagnostics report `Canvas`.
4. In the phone's remote browser console, run:

   ```js
   window.__OLH_PHASE1__.resetPerformanceSample();
   ```

5. Leave the focused game visible and unobstructed for at least 12 seconds, then run:

   ```js
   window.__OLH_PHASE1__.captureAcceptanceEvidence();
   ```

   This returns raw-render-frame statistics followed by the same 270-step trace through the live
   Phaser body used by the automated renderer gate.

6. Copy `physical-mobile-canvas.example.json` to `physical-mobile-canvas.json`, fill it with the
   captured values plus the exact device, OS, browser, viewport, and timestamp, and save a matching
   `physical-mobile-canvas.png` screenshot in this directory.
7. Calculate the screenshot SHA-256, place it in the JSON, and run:

   ```bash
   npm run check:phase1:physical
   ```

The validator rejects emulated evidence, samples shorter than 10 seconds, averages below 30 FPS,
trace drift beyond one logical pixel, missing screenshots, and screenshot hash mismatches. Do not
check the Phase 1 renderer Definition-of-Done item until this command passes for the committed
physical-device evidence.
