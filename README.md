# Our Little House

**Our Little House** is a tender browser journey through a home that survives only in memory.
Phase 1 adds a playable seven-zone gray-box with a placeholder player, keyboard movement,
collision, depth, pause/restart controls, and deterministic WebGL/Canvas traces. The temporary room
is intentionally original flat-color geometry; no reference-site assets are included.

## Requirements

- Node `24.14.0` (see `.nvmrc`)
- npm `11.9.0` (see `packageManager`)

## Start locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/`. Development-only renderer probes are available at:

- `/game?renderer=webgl`
- `/game?renderer=canvas`
- `/game?failRenderer=1`
- `/game?debugCollision=1`

These overrides and diagnostics are stripped or ignored by the production build.

## Verify Phases 0–1

```bash
npm run verify
npx playwright install chromium
npm run test:e2e
npm run evidence:phase0
npm run evidence:phase1
```

`npm run validate:content` permits the approved development subtitle placeholder. The production
validator intentionally fails until final content replaces every `{{PLACEHOLDER}}`.

## Documents

- `requirement.md` — approved product requirements
- `docs/plan.md` — hardened production plan
- `docs/architecture_decisions.md` — Phase 0 decisions and import boundaries
- `docs/development_report.md` — commands, evidence, risks, and current phase readiness
- `CLAUDE.md` — authoritative project map, route registry, and standing checks
