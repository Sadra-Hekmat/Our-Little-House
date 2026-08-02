# Development Report: Our Little House

## Report Metadata

- **Phase:** 0–1 — latest: Playable Gray-Box Core
- **Status:** Phase 1 locally complete; physical-device renderer acceptance pending
- **Latest local completion:** 2026-08-02
- **Executor:** Codex
- **Source requirements:** `requirement.md`
- **Source plan:** `docs/plan.md`

## 1. Phase Goal and MVP

Phase 0 establishes a reproducible TypeScript repository and proves the browser shell can create a
sharp `640 × 360` Phaser room through both WebGL and Canvas. The completed MVP opens the semantic
**Our Little House** start screen at `/`, navigates to `/game` without a page reload, displays an
original placeholder room, and replaces renderer construction failure with accessible DOM recovery
actions.

## 2. Work Completed

- Added a pinned Node/npm/Vite/TypeScript/Phaser 3 toolchain and committed lockfile.
- Added strict TypeScript, path aliases, Prettier, ESLint security rules, and enforced module
  boundaries.
- Implemented semantic `/` and `/game` routes with browser history, keyboard activation, focus
  treatment, controls summary, and safe text-only content rendering.
- Implemented `Boot`, `Preload`, `Title`, and `Home` scenes plus the seven-state controller.
- Added one idempotent game owner responsible for the Phaser instance, resize listener, input
  subscription, retry, and deterministic destruction.
- Configured `AUTO`, forced `WEBGL`, and forced `CANVAS` renderer adapters with `FIT`, centered
  letterboxing, nearest-neighbor display, `pixelArt`, and `roundPixels`.
- Added development-only renderer diagnostics and failure injection; release assertions prove the
  related tokens do not enter the production bundle.
- Added development content validation, unit tests, Playwright browser coverage, pixel-based
  first-frame assertions, renderer screenshots, and two GitHub Actions verification jobs.
- Added the missing repository hygiene files, removed generated dependencies and macOS metadata
  from version control, and installed an enforced project map and route registry in `CLAUDE.md`.
- Added production-preview probes for every Phase 0 route and query variant, plus a cache-empty CI
  job that verifies the pinned Node/npm versions before installing the lockfile.

## 3. Architecture and Decisions

The DOM owns routing, focus, accessible controls, and recovery. Phaser owns only the canvas and
scene lifecycle. `GameOwner` is the public runtime adapter; the shell does not import scenes,
systems, or state internals. Typed contracts are the intended cross-boundary channel.

The full rationale for Phaser 3, DOM overlays, Tiled JSON, the fixed logical resolution, and route
ownership is recorded in `docs/architecture_decisions.md`. ESLint blocks forbidden alias and
relative imports across `app`, `game`, `ui`, `content`, `map`, and `storage`.

### Toolchain versions

| Tool                                     | Pinned/tested version |
| ---------------------------------------- | --------------------- |
| Node.js                                  | 24.14.0               |
| npm                                      | 11.9.0                |
| Phaser                                   | 3.90.0                |
| Vite                                     | 8.2.0                 |
| TypeScript                               | 5.9.3                 |
| Vitest                                   | 4.1.10                |
| Playwright Test                          | 1.62.1                |
| ESLint                                   | 10.8.0                |
| Prettier                                 | 3.9.6                 |
| Local headless Chromium evidence runtime | 151.0.7922.34         |

GitHub CI installs Playwright's Chromium version associated with Playwright Test 1.62.1.

## 4. Commands and Tests Run

All commands below exited `0`, including a fresh cache-empty clone made after the repository
hygiene correction. It contained no `node_modules`, `dist`, browser reports, or prior test results.

| Command                            | Result                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `npm ci`                           | 148 packages installed from the committed lockfile                      |
| `npm run format:check`             | All tracked project files formatted                                     |
| `npm run check:registry`           | `/` and `/game` match the authoritative route registry                  |
| `npm run lint`                     | Zero errors and zero warnings                                           |
| `npm run typecheck`                | Strict application and tool configuration passed                        |
| `npm test`                         | 4 state-controller tests passed                                         |
| `npm run validate:content`         | 1 locale validated; 1 approved development placeholder reported         |
| `npm run build`                    | Vite production build completed; total `dist` size approximately 1.2 MB |
| `npm run test:bundle`              | 3 release assets contain no forbidden diagnostics/failure tokens        |
| `npm run test:preview`             | 4 direct route/query probes served the production application shell     |
| `npm audit --audit-level=critical` | 0 vulnerabilities at all reported severities                            |
| `npm run test:e2e`                 | 12 Chromium tests passed in the working tree and cache-empty copy       |

### Acceptance results

- Play keyboard activation changes the URL to `/game` and creates the room.
- Direct `/game` navigation succeeds.
- Forced WebGL and forced Canvas each report the correct renderer in development.
- PNG inspection finds more than eight rendered colors in each first visible frame.
- Injected construction failure shows Retry and Return to Start, then recovers.
- Three repeated leave/revisit cycles retain exactly one Phaser instance, one input subscription,
  and one resize listener.
- Cache-empty contexts load `/`, `/game`, `/game?renderer=webgl`, and
  `/game?renderer=canvas`.

## 5. Security and Privacy Review

- A source scan found no credentials, private keys, analytics SDKs, or tracking endpoints.
- Real environment files are ignored; `.env.example` documents that Phase 0 requires no variables
  and contains no values.
- Content is inserted with `textContent` or constructed DOM nodes; `innerHTML`, `eval`,
  `new Function`, and `document.write` are lint-blocked.
- The lockfile is committed, CI runs critical-level dependency audit, and the current audit reports
  zero vulnerabilities.
- Production bundle inspection confirms development failure injection and lifecycle diagnostics are
  removed.
- No permissions, accounts, identifiers, analytics, or external runtime resources are used.
- The supplied reference screenshot is excluded from the repository-ready package.

## 6. Performance and Accessibility

- Production output is approximately 1.2 MB uncompressed; the main JavaScript asset is 322.29 kB
  gzip, below the 8 MB initial-download gate.
- Canvas and WebGL evidence show hard-edged flat-color pixels with browser image smoothing disabled.
- The start screen uses a real heading and button, visible focus indicators, text controls, and
  native keyboard activation.
- The error path uses an assertive live region with focused Retry and Return to Start controls.
- Reduced-motion preferences suppress nonessential button transitions.

## 7. Deviations and Deliberate Debt

- Phase 0 uses generated flat-color placeholder art. It is original to this spike and must be
  replaced through the approved art pipeline in Phase 3.
- Vite reports one JavaScript chunk above its default 500 kB minified warning threshold because
  Phaser is bundled eagerly. The gzip payload remains well below the project budget. Phase 5 must
  reassess lazy loading and chunk strategy after real art/audio sizes are known.
- `{{SUBTITLE_TO_BE_PROVIDED}}` is intentionally retained. Development validation permits it;
  `npm run validate:content:production` rejects it until approved copy is supplied.

## 8. Known Issues and Blockers

No Phase 1 blocker remains. Final subtitle, character/cat references, room layout, launch dialogue,
language choice, interaction mode, and audio choice remain product inputs for later phases.

## 9. Phase 0 Assets and Content Status

No reference-site image, font, audio, sprite, or traced derivative is included. Phase 0 began with
generated rectangle graphics; its renderer screenshots are refreshed by the regression suite and
now show the Phase 1 gray-box while preserving the same first-visible-frame gate:

- [WebGL first frame](evidence/phase0/webgl-first-frame.png) — SHA-256
  `f53887bf5b3e714dee8782af4ae7113cf0976fff2f10e0d5087bde9554a533f2`
- [Canvas first frame](evidence/phase0/canvas-first-frame.png) — SHA-256
  `dd0313ac3078e13bf7d37108177dfa83c69c48cb26f8b749db4c54ccf5bba08b`

## 10. Phase 0 Closeout

The renderer, direct-route, lifecycle, production-debug, audit, and clean-install gates remain
green after Phase 1 integration.

## 11. Phase 1 Goal and Result

Phase 1 proves a complete gray-box mechanics layer before final art. The result is one fixed-camera,
seven-zone room with all required furniture footprints and twelve stable interaction approaches. A
placeholder player spawns centrally, moves through WASD or arrow input, collides with walls and
furniture, retains four-direction facing, changes depth around tall furniture, pauses safely, and
restarts without creating a second runtime.

## 12. Phase 1 Work Completed

- Added a versioned gray-box contract for logical dimensions, tile size, layer names, seven zone
  IDs, twelve interaction IDs, eight animation keys, depth bands, player clearance, and parser
  resource limits.
- Added the Tiled-compatible `tests/fixtures/graybox-home.json` fixture with floor, room walls,
  furniture, spawn, interaction rectangles/approaches, and visual depth bounds separated from
  collision footprints.
- Added a bounded adapter that rejects invalid dimensions/layers, duplicate IDs, non-finite or
  out-of-bounds rectangles, excessive resources, polygons, external tilesets, invalid spawn data,
  broken depth references, and missing stable IDs before Phaser construction.
- Added full-grid reachability sampling from spawn to all twelve approaches with player clearance;
  every walkable cell belongs to the spawn component and no trap pocket remains.
- Added a single Arcade Physics player body, static collision bodies, original generated four-way
  placeholder animation frames, normalized motion, last-facing idle behavior, and y-anchor depth.
- Added focus-scoped keyboard input and accessible DOM pause controls. Blur, hidden-document,
  pointer/focus loss, pause, restart, and route exit clear all held actions.
- Added deterministic renderer traces, desktop WebGL and throttled mobile-landscape Canvas profiles,
  screenshots, FPS thresholds, and production-bundle checks for every Phase 1 debug hook.

## 13. Phase 1 Verification

| Gate                 | Result                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Unit tests           | 20 tests pass across state, movement, input, depth, trace, map attacks, and reachability |
| Browser tests        | 19 tests pass across Phase 0 regression and Phase 1 gameplay suites                      |
| Reachability         | 12/12 approaches reachable; 0 disconnected walkable trap cells                           |
| Cross-renderer trace | WebGL and Canvas both end at `(370, 307)`, facing down, after 270 frames                 |
| Desktop profile      | WebGL at `1366 × 768`: 60.0 average FPS                                                  |
| Mobile profile       | Canvas at `844 × 390`, 4× CPU throttle: 60.1 average FPS                                 |
| Production build     | Approximately 1.23 MB uncompressed; 329.36 kB main-JS gzip                               |
| Dependency audit     | 0 vulnerabilities at critical audit level                                                |

Evidence is stored under `docs/evidence/phase1/`. The development API, collision query override,
raw diagnostics, and failure hooks are absent from the production bundle.

- Desktop WebGL screenshot SHA-256:
  `8e494000608b5a3afdbafb87cc4e3401f2c92b7fee801b24ecfde6086ee7fa2a`
- Mobile Canvas screenshot SHA-256:
  `2dbd24e20a09ab9068ae7a7dfb4218cdb35beb5d0bf1df4f723fd82556583b0e`

## 14. Phase 1 Known Boundary

The reproducible local desktop and throttled mobile profiles pass, but they do not prove physical
device behavior. Before Phase 2 closes—or final art begins—the Canvas baseline must be rerun on one
named representative mid-range mobile device and sustain at least 30 FPS. Final room layout,
subtitle, character/cat references, dialogue, language, interaction mode, and audio remain later
content approvals; they do not invalidate the gray-box contract.
