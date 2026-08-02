# CLAUDE.md

## What this is

Our Little House is a short, accessible pixel-art browser game for visitors to Sadra's personal
website, targeting current desktop and mobile browsers.

## Stack

- Runtime: vanilla TypeScript, Phaser 3, semantic HTML/CSS overlays
- Tooling: Vite, Vitest, Playwright, ESLint, Prettier
- Content: validated locale JSON; validated Tiled JSON from Phase 1 onward
- Hosting: static output; Cloudflare Pages is the planned production host
- Toolchain: Node 24.14.0 and npm 11.9.0

## Commands

- install: `npm ci`
- dev: `npm run dev`
- build: `npm run build`
- unit tests: `npm test`
- browser tests: `npm run test:e2e`
- renderer/performance evidence: `npm run evidence:phase1`
- physical-device closeout evidence: `npm run check:phase1:physical`
- full local gate: `npm run verify && npm run test:e2e`
- ship: push a reviewed commit after CI passes; production deployment is configured in a later
  release phase

## Project map

<!-- SOURCE OF TRUTH for layout. Update in the same session as any structural change. -->

- `.github/` — continuous-integration workflows and repository automation.
- `docs/` — requirements, architecture decisions, plan, development reports, and evidence.
- `scripts/` — content, bundle, route-registry, and production-preview checks.
- `src/app/` — browser routes, accessible shell, focus, and global recovery.
- `src/contracts/` — typed messages and view-model boundaries shared across modules.
- `src/content/` — locale data and, later, runtime content schemas/loaders.
- `src/game/` — Phaser runtime, scenes, state, and gameplay systems.
- `src/map/` — validated Tiled adapters and map contracts from Phase 1 onward.
- `src/storage/` — versioned local-preference handling from Phase 2 onward.
- `src/ui/` — accessible DOM overlays from Phase 2 onward.
- `tests/` — unit, browser, fixture, and evidence tests.

## Routes / Screens

<!-- SOURCE OF TRUTH. Update in the same session as any change — same commit. -->

| Route   | Method | Purpose                                   | Owner              |
| ------- | ------ | ----------------------------------------- | ------------------ |
| `/`     | GET    | Accessible title and start screen         | `src/app/shell.ts` |
| `/game` | GET    | Phaser room and renderer recovery surface | `src/app/shell.ts` |

## Standing orders

- Never commit secrets. `.env`, `.env.local`, and `.env.*.local` are ignored; client-visible
  configuration may use `VITE_PUBLIC_*` only when it is intentionally public.
- Any directory change updates **Project map** in the same session.
- Any route added, removed, or renamed updates **Routes / Screens** in the same session and commit.
- Trust this map and registry before exploring the filesystem. If either is wrong, correcting it is
  part of the current task.
- Keep DOM routing/focus/recovery out of Phaser scenes and keep game rules out of the browser shell.
- Preserve the development-only boundary around renderer overrides, diagnostics, and failure hooks.
- Changes to the fixture-map dimensions, layers, interaction IDs, animation keys, or depth bands
  require a versioned update to `src/map/graybox-contract.ts` and its adversarial tests.

## Before saying done

- [ ] Use Node 24.14.0 and npm 11.9.0.
- [ ] Run `npm run verify`.
- [ ] Run `npm run test:e2e` when browser behavior changes.
- [ ] Click through `/` → `/game`, direct `/game`, Back/Start, and the renderer recovery path.
- [ ] Run `npm run check:registry` and confirm the registry matches `src/app/router.ts`.
- [ ] Compare the Project map with `find . -maxdepth 1 -type d` and update it when needed.
