# Development Plan: Our Little House

## 1. Project Overview & Current State

**Our Little House** is a short, emotional browser game in which visitors explore a pixel-art recreation of a remembered home. The player walks through one compact room, approaches familiar objects, and discovers brief memories through a retro dialogue panel. The intended feeling is love, grief, warmth, and the quiet impossibility of returning to a place that survives only in memory.

### Product and audience

- Primary audience: visitors to the creator's personal website, including friends, clients, recruiters, and followers.
- Typical session: 2–5 minutes.
- Launch surface: modern desktop and mobile browsers.
- Release model: static website with no accounts, backend, database, combat, inventory, quests, or multiplayer.
- Version 1 experience: title screen, one explorable room, one player, one cat, movement and collision, 12 required interactions, responsive dialogue UI, keyboard and touch controls, local preferences, optional audio, and WebGL-to-Canvas fallback.

### Current state

- A detailed requirements document exists and defines product scope, interaction rules, visual direction, accessibility, performance, supported browsers, and acceptance scenarios.
- No application repository, runtime code, automated tests, production infrastructure, final artwork, or release build exists yet.
- The game title is approved as **Our Little House**.
- The final subtitle, player name and appearance references, cat name, final room layout, launch dialogue, language choice, interaction mode, and audio choice are still unresolved.
- There are no existing users, accounts, production data, or migrations.

### Planning assumptions

1. Use TypeScript, Phaser 3, Vite, HTML/CSS overlays, Vitest, and Playwright.
2. Use vanilla TypeScript for the website shell; do not add a UI framework unless a demonstrated accessibility or maintenance problem requires it.
3. Use a fixed `640 × 360` logical game resolution, Phaser `FIT` scaling, centered letterboxing, nearest-neighbor rendering, and integer scaling where the viewport allows it.
4. Use Tiled JSON for the final tilemap, collision objects, interaction zones, spawn points, and depth metadata. The gray-box may use a minimal hand-authored Tiled fixture.
5. Keep all launch content in validated locale files and all room behavior in validated map/config data. No dialogue may be hard-coded in scene logic.
6. Treat `/` and `/game` as client-side routes served by one static application. Production hosting must rewrite unknown routes to `index.html`.
7. Use Cloudflare Pages as the default static host. A different static host changes only the deployment configuration and runbook, not the game architecture.
8. Do not add third-party analytics in version 1. Operational monitoring is limited to availability and client error counts without persistent personal identifiers.
9. Original art and licensed audio are mandatory. The reference game defines the quality bar, not reusable source material.
10. Placeholder content is allowed in development builds but must fail the production validation command.

### Release constraints and gates

- **Content gate:** final art production cannot begin until the floor plan, object list, palette, player reference, cat reference, and launch language are approved.
- **Renderer gate:** Phase 1 cannot close until the same gray-box is playable in forced WebGL and forced Canvas modes. If Canvas cannot sustain 30 FPS on a representative mid-range mobile device, stop and reduce draw calls/texture size before producing final art.
- **Originality gate:** no reference-site asset or traced derivative may enter the repository. Unclear provenance blocks release.
- **Asset-budget gate:** if the essential initial download exceeds 8 MB compressed, stop nonessential asset integration and reduce atlas size, color depth, duplicate frames, or eager audio loading.
- **Mobile gate:** the release cannot proceed if the full room, dialogue, and touch controls are not usable at `844 × 390`.

## 2. Architecture & Scalability Principles

### Runtime boundaries

Use explicit modules so art, content, controls, and game rules can change independently:

| Boundary            | Responsibility                                                                             | Must not own                             |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `src/app/`          | Browser routes, start screen, focus, orientation, global error boundary                    | Movement or collision rules              |
| `src/game/scenes/`  | `Boot`, `Preload`, `Title`, and `Home` scene lifecycle                                     | Dialogue copy or local-storage parsing   |
| `src/game/state/`   | Top-level states: `Boot`, `Preload`, `Title`, `Playing`, `DialogueOpen`, `Paused`, `Error` | Rendering-specific DOM code              |
| `src/game/systems/` | Input, movement, collision, depth, interaction selection, pet behavior, audio              | Hard-coded room content                  |
| `src/content/`      | Locale JSON, schemas, placeholder detection, content loader                                | Phaser objects                           |
| `src/map/`          | Tiled loading, map schema, collision and interaction adapters                              | Dialogue presentation                    |
| `src/ui/`           | Accessible DOM overlays for dialogue, pause, error, rotate-device, and touch controls      | World coordinates beyond view-model data |
| `src/storage/`      | Versioned and validated local preferences                                                  | Arbitrary browser storage                |
| `tests/`            | Unit, integration, end-to-end, visual, and fixture data                                    | Production-only configuration            |

### State and data flow

- One state controller is the source of truth for whether movement input is accepted.
- Phaser scenes publish typed events; DOM overlays consume view models and publish user intents. Neither side reaches into the other's internal objects.
- `Playing → DialogueOpen → Playing` is explicit. Closing a dialogue consumes the triggering input and retains an interaction-zone latch until the player exits.
- The interaction selector is a pure function: filter enabled zones, apply optional facing rules, rank by facing, distance, then configured priority, and return at most one interaction.
- All content and map files are validated before the `Home` scene starts. Validation errors transition to `Error` and expose Retry and Return to Start actions.

### Rendering and world model

- Use Phaser Arcade Physics with a player body and static bodies generated from Tiled object layers.
- Keep visual bounds, collision bounds, interaction zones, and depth anchors separate. Tall furniture can overlap the player visually without expanding its collision footprint.
- Use y-based depth for movable entities and explicit depth bands for floor, lower furniture, entities, upper furniture, and viewport UI.
- Use texture atlases grouped by environment, player, cat, and UI. Do not create one unbounded global atlas.
- Keep logical coordinates integral, enable `pixelArt` and `roundPixels`, and disable image smoothing for both WebGL and Canvas.
- The fixed camera shows the whole room. Do not add scrolling-camera assumptions to version 1 systems.

### Content and localization

- Store launch strings in `src/content/locales/en.json`; use the same stable keys in every locale.
- Define runtime schemas for game metadata, locale data, preferences, and map interaction properties.
- Support LTR and RTL in the DOM layer from the start, but expose a language selector only when a complete second locale passes validation.
- Production content validation rejects unknown keys, missing keys, text over 300 characters, unsafe markup, and `{{PLACEHOLDER}}` values.

### Build, cache, and versioning

- Pin the selected Node LTS release in `.nvmrc` and `package.json#engines`; pin dependencies through the committed lockfile.
- Vite produces content-hashed JS, CSS, and asset filenames. HTML is revalidated; hashed assets receive long-lived immutable caching.
- Version local-storage data under a single namespaced key such as `our-little-house.preferences.v1`; invalid or future versions fall back safely to defaults.
- Keep static hosting provider details in `deploy/` and documentation, outside game modules.

### Quality and observability

- Unit-test pure rules with Vitest; test browser behavior and routes with Playwright.
- Use a small deterministic fixture map for collision, interaction priority, dialogue latching, and forced-renderer tests.
- Add visual snapshots only for stable UI/layout states; do not rely on screenshots as the sole gameplay test.
- Production logging records bounded, non-sensitive error categories. It must not record dialogue choices, names, IP-derived identifiers, or persistent user IDs.

### Deliberate debt

- ⚠️ DEBT: Version 1 uses Tiled JSON and locale files bundled at build time rather than a CMS. This keeps a personal static game simple. If non-developers need frequent post-launch editing, add a schema-compatible content build step or headless CMS adapter without changing game systems.
- ⚠️ DEBT: Version 1 uses simple AABB checks across approximately 12 interaction zones. This is appropriate for one room. If multiple maps or hundreds of zones are added, replace the selector's candidate scan with a spatial index while preserving its pure ranking API.
- ⚠️ DEBT: Version 1 stores preferences only in local storage and has no cross-device sync. If accounts are ever introduced, create a separately versioned backend service and migration plan; do not couple authentication to the current game state.

## 3. Security Principles

The version 1 attack surface is small because the product is a static, anonymous game, but the browser shell, dependencies, content pipeline, hosting headers, and local storage still require controls.

### Trust boundaries and controls

- Treat locale JSON, Tiled data, URL parameters, local-storage values, and runtime asset responses as untrusted until validated.
- Render game copy with DOM `textContent` or Phaser text APIs only. Do not pass content to `innerHTML`, dynamic script evaluation, or CSS injection.
- Do not add secrets to this client-only repository. Build-time variables must be public configuration and use a `VITE_PUBLIC_` naming convention.
- Keep dependencies minimal, commit the lockfile, run dependency review in CI, and block releases on known critical vulnerabilities without an accepted written exception.
- Serve only same-origin scripts, styles, fonts, audio, maps, and images at launch.
- Use HTTPS, a restrictive Content Security Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and clickjacking protection through CSP `frame-ancestors`.
- Do not request camera, microphone, location, notification, clipboard, or storage permissions beyond ordinary first-party local storage.
- Bound error messages and logs; user-facing errors must not expose stack traces, filesystem paths, build tokens, or provider internals.

### OWASP mapping

| OWASP risk                                   | Project-specific control                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                    | No protected routes or accounts in v1; deny framing and avoid admin/debug routes in production             |
| A03 Injection                                | Schema-validate content/map data; use `textContent`; ban `eval`, `new Function`, and HTML-bearing dialogue |
| A04 Insecure Design                          | Explicit state ownership, renderer/content failure states, interaction latching, and no permission prompts |
| A05 Security Misconfiguration                | Production headers, source-map policy, disabled debug overlays, correct MIME types, HTTPS-only hosting     |
| A06 Vulnerable and Outdated Components       | Lockfile, automated dependency audit, minimal dependencies, documented upgrade cadence                     |
| A08 Software and Data Integrity Failures     | Protected main branch, CI-gated builds, immutable asset hashes, provenance records for art/audio           |
| A09 Security Logging and Monitoring Failures | Sanitized client error categories and uptime checks without personal identifiers                           |

### Privacy posture

- Store only mute state, locale, and whether the control hint has been seen.
- Provide a clear-storage action in the pause/help menu.
- Do not load analytics, ad, social tracking, or third-party font scripts.
- If analytics is proposed later, require a separate privacy review, consent decision, retention policy, and updated CSP before implementation.

## 4. Phases

### Phase 0: Repository Foundation and Renderer Spike

**Goal:** Establish a reproducible project and prove that a crisp Phaser canvas can boot through WebGL and Canvas inside the accessible website shell.

**MVP definition:** Running `npm run dev` opens the **Our Little House** title screen at `/`, Play navigates to `/game`, and a `640 × 360` placeholder room renders sharply in both forced WebGL and forced Canvas modes with a readable DOM error fallback.

**Test plan:**

1. Install the pinned Node version, run `npm ci`, then run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; every command exits `0`.
2. Run `npm run dev`, open `/`, activate Play, and confirm the browser URL becomes `/game` without a full-page failure.
3. Open `/game?renderer=webgl` and `/game?renderer=canvas`; each shows the renderer name in a development-only diagnostics panel and displays hard-edged pixels.
4. Run the automated route test and confirm direct navigation to `/game` succeeds under the preview server.
5. Simulate renderer construction failure through the test flag and confirm a DOM message shows Retry and Return to Start instead of a blank canvas.

**Tasks:**

- [x] (S) Initialize **Our Little House** as a Vite vanilla-TypeScript project; add Phaser 3, Vitest, Playwright, ESLint, and Prettier; pin the active Node LTS in `.nvmrc` and `package.json#engines`; commit the generated lockfile; and add scripts for `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, and `validate:content`.
- [x] (S) Create the folder boundaries from Section 2, a strict `tsconfig`, import aliases, `.editorconfig`, `.gitignore`, and `docs/architecture_decisions.md`; document why the project uses Phaser, DOM overlays, Tiled JSON, and a fixed logical resolution.
- [x] (M) Implement the `/` and `/game` browser shell with semantic title, subtitle placeholder, Play button, control summary, visible focus states, history navigation, and a no-canvas error region; keep game logic out of the shell.
- [x] (M) Implement `Boot`, `Preload`, `Title`, and placeholder `Home` Phaser scenes plus the typed state controller for `Boot`, `Preload`, `Title`, `Playing`, `DialogueOpen`, `Paused`, and `Error`.
- [x] (M) Configure Phaser for `640 × 360`, `FIT`, centered letterboxing, `pixelArt`, `roundPixels`, transparent input ownership, and selectable `AUTO`, `WEBGL`, or `CANVAS` renderers; add a development-only diagnostics panel and a test-only renderer-failure injection point.
- [x] (S) Add baseline Vitest tests for state transitions and Playwright tests for `/`, direct `/game` navigation, keyboard activation of Play, forced renderers, and the renderer error fallback.
- [x] (S) Add continuous integration that installs with `npm ci` and gates changes on formatting check, lint, typecheck, unit tests, production build, content validation in development mode, and headless Chromium smoke tests.
- [x] [WARGAME] (S) Pin the package-manager version in `package.json#packageManager`; add a cache-empty clean-clone CI job that verifies the Node and package-manager versions before `npm ci` and fails on a dirty lockfile.
- [x] [WARGAME] (S) Add an import-boundary lint rule for `src/app`, `src/game`, `src/ui`, `src/content`, and `src/map`; document the allowed typed event/view-model dependencies and fail CI on forbidden cross-boundary imports.
- [x] [WARGAME] (M) Add an idempotent boot lifecycle test that repeatedly mounts, leaves, revisits, retries after injected renderer failure, and destroys the game; assert that exactly one Phaser instance, input subscription set, and resize listener remain.
- [x] [WARGAME] (S) Add a production-bundle assertion that renderer diagnostics, failure-injection hooks, debug overlays, and `renderer` query overrides are absent or ignored in production.
- [x] [WARGAME] (S) Add a first-visible-frame assertion for forced WebGL/Canvas plus cache-empty preview probes for `/`, `/game`, `/game?renderer=webgl`, and `/game?renderer=canvas`; save the results as phase evidence.
- [x] (S) Create `docs/development_report.md` from the Section 5 template and record the exact toolchain versions and Phase 0 commands.

**Scalability notes:** The shell/game boundary keeps later portfolio pages or alternative renderers from entering gameplay systems. Renderer selection remains a boot adapter, not a scene concern.  
⚠️ DEBT: Phase 0 uses a generated placeholder texture and flat colors. This is intentional for the renderer spike; Phase 3 replaces them through the approved atlas pipeline and removes all placeholder assets before release.

**Security checklist:**

- [x] Confirm no secrets or private keys exist in source, `.env` examples, build output, or CI logs.
- [x] Configure lint rules to forbid `eval` and flag unsafe DOM assignments; use text-only DOM APIs for subtitle and errors (OWASP A03).
- [x] Commit the lockfile and make critical dependency audit findings fail CI (OWASP A06).
- [x] Ensure diagnostics and failure-injection flags are disabled from production builds (OWASP A05).

**Definition of Done:**

- [x] All tasks checked.
- [x] Test plan passes in a clean clone.
- [x] Forced WebGL and Canvas recordings or screenshots are attached to the development report.
- [x] Renderer and direct-route gates pass.
- [x] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                       | Expected Observation                                                                                                                                  | Likely Failure                                                                                                                | Causal Action                                                                                                                       | Counter-Move                                                                                                                            | Prevention (added to plan)                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Security — dependency/toolchain setup           | A clean clone installs the committed dependency graph with the pinned Node and package-manager versions; the audit has no unresolved critical finding | [HIGH] A compromised, drifting, or irreproducible dependency graph reaches every later phase                                  | Accepting floating tool versions, editing the lockfile outside the pinned toolchain, or allowing CI caches to hide missing packages | Freeze dependency changes, restore the last reviewed lockfile, clear caches, reinstall, and review the dependency diff before resuming  | [WARGAME] Pin the package manager and add a cache-empty clean-clone CI job                                  |
| Scalability — shell/game boundaries             | Route, UI, state, and renderer adapters can be changed independently; no gameplay system imports browser-shell internals                              | [MED] Early cross-layer coupling makes later mobile, accessibility, or hosting changes require scene rewrites                 | Letting scenes own DOM routing/focus or letting shell code reach into Phaser objects                                                | Stop the next phase, extract a typed event/view-model boundary, and add a dependency-rule test                                          | [WARGAME] Include boundary imports in architecture review and fail lint on forbidden cross-boundary imports |
| Data integrity — boot/state lifecycle           | Repeated Play, Back, Retry, and route visits leave one game instance and one valid top-level state                                                    | [HIGH] Duplicate Phaser instances and listeners create double input, corrupt state transitions, or memory growth              | Creating the game on every route render without an idempotent owner and deterministic teardown                                      | Destroy extra instances, clear subscriptions, return to Title, and reproduce through the lifecycle fixture before continuing            | [WARGAME] Add the repeated mount/destroy/retry lifecycle test                                               |
| UX/functional — renderer selection and fallback | Forced WebGL and Canvas each show crisp output; double failure shows usable DOM recovery controls                                                     | [HIGH] A renderer or query-path failure produces a blank page, blurry canvas, or a production-only debug path                 | Treating successful construction as proof of a visible frame or leaving test overrides active in production                         | Return to the DOM error state, disable the failing override, capture diagnostics locally, and retry once through the supported fallback | [WARGAME] Assert the first rendered frame and strip/ignore all diagnostics and failure flags in production  |
| Operational — reproducible CI and direct routes | The same commands pass locally, in CI, and under the production-like preview server; direct `/game` returns the app                                   | [HIGH] A green development build cannot be reproduced or hosted because CI, preview, and production use different assumptions | Testing only the dev server, relying on warm caches, or omitting clean route probes                                                 | Block Phase 1, reproduce in a clean checkout and preview server, then fix the documented toolchain or rewrite configuration             | [WARGAME] Make the cache-empty clean-clone and preview-route checks required phase evidence                 |

**Fork trigger:** if either forced renderer cannot produce a visible, sharp first frame in the deterministic fixture, take the renderer-spike route and do not begin movement systems; if both pass, proceed to Phase 1.

**RECON NEEDED:** None. This is a static anonymous game, the stack and hosting assumption are pinned, and the creator is the approval owner.

### Phase 1: Playable Gray-Box Core

**Goal:** Prove movement, collision, depth, state ownership, and full-room readability before investing in final art.

**MVP definition:** A placeholder player can traverse a gray-box apartment with all required zones, collide with walls and furniture, pass correctly behind tall objects, pause and resume, and remain playable in WebGL and Canvas.

**Test plan:**

1. Start at the configured spawn and verify W/A/S/D and arrow keys move in four directions while the page does not scroll.
2. Hold one horizontal and one vertical key and confirm diagonal speed equals cardinal speed within the test tolerance.
3. Walk around every wall and required furniture footprint; the player never crosses solids or becomes trapped.
4. Walk in front of and behind the depth-test cabinet; the player is obscured only when behind it.
5. Press Escape with no dialogue open; movement stops in `Paused`, then resumes without a position jump.
6. Run the deterministic Playwright fixture in WebGL and Canvas; collision and final coordinates match expected values.

**Tasks:**

- [ ] (S) Create a `tests/fixtures/graybox-home.json` Tiled-compatible map at `640 × 360` with floor, walls, required furniture footprints, spawn, interaction placeholders, and depth anchors for the seven visual zones defined in the requirements.
- [ ] (M) Implement a typed Tiled map adapter that validates map dimensions, layer names, object IDs, rectangles, spawn count, collision metadata, and depth anchors before constructing Phaser objects.
- [ ] (M) Implement the placeholder player with four facing directions, idle/walk animation contracts, normalized movement, last-facing retention, integral positioning, and a single Arcade Physics body.
- [ ] (M) Implement unified keyboard input for WASD, arrows, E, Enter, Space, Escape, and M; prevent browser scrolling only while the game has active input focus and expose typed action states to game systems.
- [ ] (M) Generate static collision bodies from map object layers and add collision-debug rendering available only in development; add an automated path test for every corridor and required object clearance.
- [ ] (M) Implement depth resolution using explicit layer bands plus entity y-position; add a fixture with a tall object whose art bounds differ from its collision bounds.
- [ ] (S) Add pause/resume, Return to Start, and Restart actions with one state owner for movement; ensure blur and document visibility pause the game safely.
- [ ] (M) Add Vitest coverage for movement vectors, diagonal normalization, map validation, and depth calculation plus Playwright coverage for spawn, collision, pause, and both renderers.
- [ ] [WARGAME] (S) Add map-parser resource limits and tests for excessive layer/object/point counts, duplicate IDs, external tileset URLs, non-finite coordinates, and geometry outside `640 × 360`; fail before Phaser object construction.
- [ ] [WARGAME] (S) Freeze a versioned gray-box contract containing map dimensions, required layer names, animation keys, coordinate origin, depth bands, and interaction IDs; make later map/atlas validation depend on this contract.
- [ ] [WARGAME] (M) Add a reachability test that samples the collision grid from spawn to every required interaction approach point, enforces the configured clearance, and fails on disconnected walkable islands or trap pockets.
- [ ] [WARGAME] (M) Add input-lifecycle tests for simultaneous keys, key repeat, opposite directions, window blur, visibility change, pointer focus loss, Pause/Restart, and route exit; assert no action remains stuck and browser scrolling resumes outside active play.
- [ ] [WARGAME] (M) Record deterministic movement traces and frame-time baselines for forced WebGL and Canvas on one named representative desktop and mid-range mobile profile; require final coordinates within one logical pixel and Canvas at or above 30 FPS before Phase 2.

**Scalability notes:** Map data owns layout while reusable systems own behavior, allowing a future room to be added without copying scene logic. Collision and depth metadata remain independent so increasingly detailed art does not destabilize movement.  
⚠️ DEBT: The player uses placeholder geometry instead of a final sprite sheet. This isolates mechanics from art; Phase 3 binds the same animation contract to approved sprites and deletes the placeholder in the release build.

**Security checklist:**

- [ ] Reject malformed, non-finite, negative, or out-of-bounds Tiled geometry before it reaches Phaser (OWASP A03/A04).
- [ ] Exclude collision debug overlays, raw map dumps, and stack traces from production (OWASP A05).
- [ ] Keep map and asset URLs same-origin and produced from an allowlisted manifest rather than arbitrary query parameters (OWASP A03).

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes.
- [ ] Every required area has a reachable gray-box path and no trap.
- [ ] The renderer gate passes at target performance before final art begins.
- [ ] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                      | Expected Observation                                                                                                     | Likely Failure                                                                                               | Causal Action                                                                                                   | Counter-Move                                                                                                         | Prevention (added to plan)                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Security — Tiled/map ingestion                 | Malformed or oversized maps are rejected before object allocation; only same-origin manifest assets are accepted         | [MED] A malformed map exhausts memory or smuggles an unexpected external asset reference into the build      | Trusting arbitrary Tiled layers, points, IDs, or external tileset paths without hard bounds                     | Stop loading, show the bounded content error, replace the invalid fixture, and rerun validation before starting Home | [WARGAME] Add parser resource limits and adversarial map fixtures               |
| Scalability — mechanics/art contract           | Gray-box dimensions, IDs, animation keys, and depth bands remain stable when final assets arrive                         | [MED] Final art forces mechanics rewrites because the gray-box contract was implicit                         | Encoding coordinates or animation names directly in scene logic and allowing map conventions to drift           | Freeze Phase 1, extract the stable contract, migrate the fixture, and rerun all gray-box tests                       | [WARGAME] Version and validate the gray-box contract                            |
| Data integrity — collision/reachability        | Every required approach point is reachable from spawn; no walkable pocket can trap the player                            | [HIGH] Collision generation silently creates unreachable memories, wall leaks, or permanent traps            | Testing only hand-picked paths or deriving collision from visual bounds                                         | Revert the footprint change, restore the last passing map, visualize the failed path, and correct collision metadata | [WARGAME] Add exhaustive grid reachability, clearance, and trap-pocket checks   |
| UX/functional — unified input and focus        | Every key lifecycle ends in a neutral action state; the page scrolls normally when gameplay lacks focus                  | [HIGH] Stuck movement, double actions, or globally suppressed scrolling makes the game or host page unusable | Failing to clear input on blur/visibility/pause, trusting keyup to always fire, or preventing defaults globally | Force all actions to neutral on lifecycle loss, return to Paused, and resume only after explicit focus               | [WARGAME] Add the full input-lifecycle test matrix                              |
| Operational — renderer determinism/performance | Identical scripted traces end within one logical pixel in both renderers; named baseline profiles meet 60/30 FPS targets | [HIGH] Renderer or timing drift is discovered only after expensive art integration                           | Using variable-step movement without deterministic traces or postponing device measurement                      | Pause Phase 2, fix fixed-step/clamping behavior or reduce draw cost, then recapture the baseline                     | [WARGAME] Record cross-renderer movement traces and named performance baselines |

**Fork trigger:** if reachability fails, stay in Phase 1 and change collision/room geometry; if reachability passes but Canvas misses 30 FPS, optimize the renderer spike before any content or art work.

**RECON NEEDED:** None. The final room shape is an approval input, but the gray-box contract and all failure thresholds are defined independently.

### Phase 2: Data-Driven Memories and Accessible Dialogue

**Goal:** Deliver the complete interaction loop and make every memory editable without touching game logic.

**MVP definition:** All 12 required gray-box objects can open validated text through automatic proximity or press-to-interact mode; selection, latching, closing, focus, accessibility, and preference behavior match the requirements.

**Test plan:**

1. Run `npm run validate:content`; valid development fixtures pass, while a fixture containing a placeholder, missing key, markup, or text over 300 characters fails with the exact key path.
2. Approach each required object and confirm the matching memory opens, movement pauses, text is announced in the DOM dialogue, and all close inputs work.
3. Stay inside a closed interaction zone and confirm it does not reopen; leave and re-enter and confirm it opens once.
4. Enter the overlapping-zone fixture from each facing direction and verify ranking by facing, distance, and priority.
5. Switch the test configuration to `press` mode and verify proximity shows an action prompt but does not open dialogue until E/Enter/touch action.
6. Corrupt local preferences and reload; safe defaults are restored without a blank screen or console error.

**Tasks:**

- [ ] (M) Define runtime schemas and TypeScript types for game metadata, locale strings, interaction definitions, control labels, and preferences; implement development and production validators with production rejection of `{{PLACEHOLDER}}`, HTML-like content, missing keys, unknown keys, and overlong text.
- [ ] (S) Create `src/content/locales/en.json` with stable keys for title, subtitle, menus, controls, errors, and all 12 required interaction IDs; use clearly marked development copy until approved launch text is supplied.
- [ ] (M) Implement the interaction-zone tracker and pure selector that ranks enabled candidates by required facing, facing alignment, distance, and configured priority; return at most one candidate and expose deterministic unit-test inputs.
- [ ] (M) Implement proximity and press interaction modes behind one configuration flag, including enter/exit latching, no immediate reopen, one open dialogue at a time, and a consumed-input cooldown after close.
- [ ] (M) Build the bottom dialogue as an accessible DOM overlay with retro pixel styling, text wrapping, close button, visible focus, `role="dialog"`, an appropriate accessible label, focus restoration, keyboard/pointer/touch dismissal, and reduced-motion behavior.
- [ ] (S) Implement the interaction prompt for press mode and ensure it never overlaps the dialogue, rotate-device notice, or critical touch controls.
- [ ] (M) Implement versioned preferences for mute, locale, and control-hint visibility; validate reads, recover from corrupt data, and add a Clear Preferences action.
- [ ] (M) Add locale loading with complete-key parity checks, DOM `lang` and `dir` updates, LTR/RTL layout support, and a rule that hides the language selector until a second complete locale exists.
- [ ] (M) Add unit and Playwright tests for every required interaction, overlapping priority, close-input consumption, latching, focus restoration, keyboard-only completion, corrupt storage, and both interaction modes.
- [ ] [WARGAME] (S) Add hostile locale/map fixtures and a static DOM-sink check that fails on dialogue paths using `innerHTML`, `insertAdjacentHTML`, dynamic code evaluation, or unsanitized CSS/URL construction; assert hostile strings render literally.
- [ ] [WARGAME] (S) Version the content schema and add compatibility fixtures for the current and one prior preferences version; require stable IDs for all 12 interactions and exact locale-key parity before a locale can be selected.
- [ ] [WARGAME] (M) Define the interaction/dialogue transition table in `docs/architecture_decisions.md` and generate model-based tests covering zone enter/exit, overlapping zones, open/close, input cooldown, Pause, Restart, route exit, and corrupt preference recovery in both interaction modes.
- [ ] [WARGAME] (M) Add an accessibility evidence run using keyboard-only navigation and at least one screen-reader path; verify modal focus containment, announcement once per opening, Close discoverability, focus restoration, and no hidden control activation.
- [ ] [WARGAME] (S) Emit a production content manifest with schema version, locale key count, 12 interaction IDs, content checksum, and placeholder/markup scan result; CI must block the build without logging full private memory text.

**Scalability notes:** Stable content keys and pure interaction ranking allow more memories or locales without scene changes. DOM dialogue remains renderer-independent and accessible in both WebGL and Canvas.  
⚠️ DEBT: Launch content ships as versioned JSON in the bundle. If dialogue changes become frequent, add a prebuild content import adapter while keeping the runtime schema and stable keys unchanged.

**Security checklist:**

- [ ] Render all locale and dialogue values as text, never HTML, and test hostile strings such as `<img onerror=...>` (OWASP A03).
- [ ] Validate and size-bound local-storage values before use; never deserialize executable data (OWASP A03).
- [ ] Keep focus inside modal dialogue while open and restore it safely on close to avoid hidden or ambiguous actions (OWASP A04).
- [ ] Ensure error messages identify invalid content keys without dumping full local-storage contents or stack traces (OWASP A09).

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes.
- [ ] The 12 required interactions are reachable and data-driven.
- [ ] Keyboard-only interaction and accessible dialogue behavior pass manual review.
- [ ] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                  | Expected Observation                                                                                                        | Likely Failure                                                                                                               | Causal Action                                                                                             | Counter-Move                                                                                                                            | Prevention (added to plan)                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Security — editable content rendering      | Hostile strings appear as literal text; no dialogue path reaches an HTML, script, CSS, or arbitrary URL sink                | [HIGH] A later content edit introduces script or markup execution in the website origin                                      | Rendering convenience markup, weakening schema rules, or bypassing the single text-only presentation path | Disable the affected locale/build, restore the last validated content manifest, and replace the sink with `textContent`                 | [WARGAME] Add hostile fixtures and a forbidden DOM-sink check                                 |
| Scalability — schemas/locales/preferences  | Stable interaction IDs and versioned schemas accept supported data and reject incomplete or future data safely              | [MED] Adding a locale or content revision breaks old preferences or silently maps memories to the wrong objects              | Treating object order as identity, changing keys in place, or showing an incomplete locale                | Hide the incomplete locale, fall back to defaults, add an explicit migration, and preserve old stable keys                              | [WARGAME] Version schemas and test stable IDs, key parity, and prior preference compatibility |
| Data integrity — interaction state machine | Every tested event sequence reaches one valid state, opens at most one dialogue, and cannot immediately retrigger           | [HIGH] A race between zone, close, pause, or route events leaves movement locked or memories reopening in a loop             | Implementing behavior across independent listeners without a documented transition owner                  | Force-close the overlay, neutralize input, return to Playing or Title through the controller, and reproduce with the transition fixture | [WARGAME] Generate model-based tests from the explicit transition table                       |
| UX/functional — focus and announcements    | Dialogue is announced once, focus stays on valid controls, and closing restores a sensible target across keyboard and touch | [HIGH] Sighted users can play while keyboard or screen-reader users become trapped, lose context, or trigger hidden controls | Relying only on canvas text or automated role checks without an end-to-end assistive path                 | Return focus to the game/prompt, suspend hidden controls, correct labels/order, and rerun the accessibility evidence path               | [WARGAME] Require keyboard and screen-reader dialogue evidence                                |
| Operational — content release evidence     | CI reports schema/version/key/checksum status and blocks placeholders without exposing the full personal memory copy        | [HIGH] Wrong or unfinished memories ship, or private draft text leaks into logs while diagnosing validation                  | Treating development fixtures as production data or printing entire invalid objects                       | Stop the release, restore the approved content sheet, redact diagnostics to key paths, and regenerate the manifest                      | [WARGAME] Produce a privacy-safe production content manifest and gate                         |

**Fork trigger:** if automatic proximity repeatedly interrupts movement during user testing, switch the existing configuration to press-to-interact and rerun the same state/accessibility suite; do not fork the interaction implementation.

**RECON NEEDED:** None. The exact launch copy and mode remain creator approvals, while both modes and placeholder rejection are fully testable now.

### Phase 3: Original Art, Character, Pet, and Final Content

**Goal:** Replace the gray-box with an approved, original, emotionally coherent home while preserving proven collision and interaction behavior.

**MVP definition:** The complete room, player, cat, UI skin, title/subtitle, and approved memories appear in the final pixel-art style with correct depth, collision, provenance, and asset budgets.

**Test plan:**

1. Run the asset manifest validator; every production asset has an owner/source, license or original-work status, dimensions, intended atlas, and approval state.
2. Compare the game to the approved room mockup at native `640 × 360`; all required zones and objects are present, silhouettes are readable, and no reference-site asset is used.
3. Move the final character in every direction; each idle and walk state uses the correct facing animation and lands on a valid idle frame.
4. Observe the cat for the configured test interval; idle variation works, its label is readable, and it never blocks a narrow path.
5. Complete all interactions and verify final subtitle, names, and sentences contain no placeholders and match the approved content sheet.
6. Run collision/depth regressions in both renderers and confirm art bounds did not alter physical bounds.
7. Build production and verify the compressed essential initial payload is at or below 8 MB.

**Tasks:**

- [ ] (S) Create `docs/art_bible.md` from the approved requirements with logical resolution, tile size, palette swatches, light direction, outline rules, sprite scale, depth bands, atlas limits, naming rules, and explicit originality/provenance rules.
- [ ] (M) Produce and obtain approval for a `640 × 360` room composition based on the creator's chosen home layout, showing the living, kitchen, sleeping, work, exercise, pet, and walking zones before creating final individual assets.
- [ ] (M) Create original environment tiles and furniture for every required object using the approved palette and pixel density; export lossless source files and atlas-ready PNGs without anti-aliasing.
- [ ] (M) Create the original player sprite sheet from approved appearance references with four idle directions and at least four walk frames per direction; export animation metadata matching the Phase 1 animation contract.
- [ ] (M) Create the original cat sprite sheet with idle, blink/tail variation, four look directions if approved, and a safe optional wander footprint; export animation metadata independent of scene code.
- [ ] (M) Create original start-screen, dialogue, button, label, and control graphics; keep dialogue text in the accessible DOM layer and use imagery only for borders/backgrounds.
- [ ] (M) Replace the gray-box map with the final Tiled map while preserving separate visual, collision, interaction, spawn, and depth layers; run automated reachability and trap checks after every footprint change.
- [ ] (S) Build split environment/player/cat/UI atlases, add an asset manifest with dimensions and provenance, and enforce maximum texture dimensions plus duplicate-frame detection in the asset validation script.
- [ ] (S) Insert the approved subtitle, player name, cat name, interaction memories, and launch language into validated locale data; run production validation and remove unused development copy.
- [ ] (M) Add visual-regression baselines for the title screen, full room, each player facing, dialogue, cat label, and one front/behind depth case in WebGL and Canvas.
- [ ] [WARGAME] (S) Add an export privacy check that strips PNG/audio metadata and fails if web assets, source-map paths, manifests, or build output contain private reference filenames, local paths, EXIF fields, or unapproved names.
- [ ] [WARGAME] (M) Add atlas preflight tests against conservative WebGL and Canvas texture limits; cap each atlas dimension/file size/frame count, render every frame once in both forced renderers, and split any atlas that fails.
- [ ] [WARGAME] (M) Archive editable source files, fonts, licenses, palette, Tiled source, and approved exports with SHA-256 checksums in a location separate from generated `dist`; perform one clean restore/export comparison before Phase 4.
- [ ] [WARGAME] (M) Create a versioned footprint contract mapping every visual asset to collision, interaction, depth anchor, and required approach points; fail the map build when a footprint change breaks reachability or moves a required ID without an explicit migration.
- [ ] [WARGAME] (S) Create a content-and-provenance freeze manifest that records the creator's approval state, original/licensed source, license terms, checksum, final subtitle/names/memory keys, and any rejected reference-derived asset; block Phase 4 until every launch entry is approved.

**Scalability notes:** Separate atlases prevent a single texture from growing without bound, while stable animation and map contracts let approved art replace placeholders without rewriting systems. Source assets remain separate from web exports so future palette or resolution work is reproducible.  
⚠️ DEBT: Version 1 uses one fixed room composition. If multiple rooms are added, introduce a map registry and scene transition contract; do not expand the `Home` scene into map-specific conditionals.

**Security checklist:**

- [ ] Record provenance and license status for every art, font, and audio asset; block unknown or incompatible assets from production (OWASP A08).
- [ ] Strip unnecessary metadata from exported images and audio, including creator filesystem paths and embedded personal information.
- [ ] Keep atlas/map filenames generated through the build manifest; do not accept arbitrary remote asset URLs (OWASP A03/A08).
- [ ] Verify no development references, private photographs, or unapproved names are included in production assets or source maps.

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes.
- [ ] Creator approves room composition, player likeness, cat, UI, palette, subtitle, names, and every memory.
- [ ] Originality and asset-budget gates pass.
- [ ] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                                    | Expected Observation                                                                                                            | Likely Failure                                                                                                                            | Causal Action                                                                                                         | Counter-Move                                                                                                                                      | Prevention (added to plan)                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Security/privacy — private appearance references and exports | Production assets contain no EXIF, local paths, private source filenames, unapproved names, or hidden reference material        | [CRIT] Personal reference data or private filesystem information is published with the game                                               | Exporting creator photos/source files directly, retaining metadata, or exposing private source maps/manifests         | Remove the release immediately, invalidate caches where possible, rebuild from sanitized exports, and review the full asset set for the same leak | [WARGAME] Add automated metadata/path/name privacy scanning before any production asset is accepted |
| Scalability — atlas and sprite pipeline                      | Every atlas stays below conservative texture limits and every frame renders in WebGL and Canvas without allocation failure      | [HIGH] A single oversized atlas works on the artist's machine but crashes or renders blank on mobile/Canvas                               | Packing all art into one sheet or validating dimensions only against a desktop GPU                                    | Split the failing atlas by environment/player/cat/UI, lower dimensions, and rerun all frame preflights                                            | [WARGAME] Enforce atlas dimension, size, frame-count, and forced-renderer preflight limits          |
| Data integrity — editable art/source preservation            | A clean restore reproduces approved web exports with matching checksums and licenses                                            | [CRIT] Original editable art or licensing evidence is lost, making later fixes impossible or the release unverifiable                     | Keeping sources only in an artist tool, local machine, or ephemeral build folder                                      | Stop destructive edits/releases, recover from the separate archive, verify checksums, and recreate missing provenance before proceeding           | [WARGAME] Archive and restore-test all editable sources and license evidence                        |
| UX/functional — visual/collision/depth integration           | Final art preserves every required approach point, correct overlap, readable silhouette, and interaction ID                     | [HIGH] Beautiful final art makes memories unreachable, lets the player walk through furniture, or causes depth flicker                    | Changing furniture footprints or anchors visually without updating the independent map contract                       | Revert the offending footprint/export, compare the contract diff, repair map metadata, and rerun reachability plus both-renderer snapshots        | [WARGAME] Version the visual-to-physics footprint contract and fail on unapproved drift             |
| Operational — originality/content approval                   | Every launch asset and memory has an explicit approved source/status/checksum; no placeholder or reference-derived item remains | [HIGH] Unapproved, derivative, mislabeled, or emotionally incorrect content reaches release because approval lived only in chat or memory | Starting final integration before the floor plan/copy/provenance freeze and accepting “temporary” art into production | Remove the item, restore the last approved manifest, obtain creator approval, and rerun production validation                                     | [WARGAME] Make the content-and-provenance freeze manifest a hard Phase 4 gate                       |

**Fork trigger:** if the final room cannot preserve all 12 reachable approach points at `640 × 360`, revise the composition within the fixed resolution; only reconsider the logical resolution if two approved layout revisions still fail reachability and mobile legibility together.

**RECON NEEDED:** None. The creator must still supply/approve the listed art and copy, but the plan now blocks dependent work until that approval is recorded.

### Phase 4: Responsive Controls, Audio, and Inclusive UX

**Goal:** Make the approved game comfortable on desktop, tablet, and mobile without losing room legibility or accessibility.

**MVP definition:** Keyboard, pointer, and touch visitors can start, explore, read, pause, mute, and recover at every required viewport; portrait users receive a usable orientation state and the game remains understandable without sound.

**Test plan:**

1. Test `1920×1080`, `1366×768`, `1280×720`, `1024×576`, `844×390`, and `390×844`; the room is never stretched or critically cropped.
2. On `844×390`, use only the virtual D-pad/action controls to reach and close three memories; touch targets are at least `44 × 44` CSS pixels and do not cover essential objects.
3. On `390×844`, confirm the rotate-device state is readable, keyboard/screen-reader users are not trapped, and returning to landscape restores play.
4. Enable reduced motion and verify nonessential UI transitions are removed while gameplay remains usable.
5. If approved audio is present, start muted, unmute after Play, reload, and verify the preference persists; with audio blocked, gameplay and error handling continue.
6. Navigate the shell, dialogue, pause menu, retry, and Return to Start with keyboard only and with a screen-reader smoke test.

**Tasks:**

- [ ] (M) Implement responsive shell sizing with `640 × 360` aspect preservation, nearest-neighbor scaling, centered letterboxing, no active-game scrolling, safe-area insets, and a portrait rotate-device overlay that does not destroy game state.
- [ ] (M) Build a virtual D-pad and action/close button with pointer events, multi-touch-safe input state, `44 × 44` minimum targets, visible pressed state, accessible labels, and automatic visibility based on touch capability plus a manual override.
- [ ] (M) Refactor keyboard, touch, and pointer actions behind the same typed input adapter so movement normalization, pause, interact, close, and consumed-input behavior remain identical across devices.
- [ ] (S) Add a brief dismissible control hint, persistent Help/Pause menu, Mute control, Restart, Return to Start, Clear Preferences, and visible focus treatment without covering the fixed room.
- [ ] (M) Implement an audio manager that unlocks only after Play, separates ambience/effects categories, tolerates autoplay rejection, lazy-loads nonessential files, observes mute preference, and becomes a silent no-op when launch audio is not approved.
- [ ] (S) Integrate only approved, licensed, web-optimized audio; record provenance and confirm that no essential instruction depends on sound.
- [ ] (M) Add responsive Playwright tests with touch emulation, safe-area cases, orientation changes, reduced motion, browser zoom checks for the shell, and keyboard-only completion.
- [ ] (M) Perform and document an accessibility review of semantic controls, focus order, dialogue announcements, contrast, reduced motion, zoom, sound independence, and LTR/RTL layout; fix all critical and serious findings.
- [ ] [WARGAME] (S) Make the top-level state controller publish the sole active input context (`game`, `dialogue`, `pause`, `orientation`, or `error`); add tests proving covered or hidden controls cannot receive pointer, keyboard, or accessibility activation.
- [ ] [WARGAME] (S) Define one device-agnostic action contract with neutral-state semantics and capability detection inputs; test keyboard-only, pointer-only, touch-only, hybrid touch/mouse, and manual-control-override profiles against the same expected actions.
- [ ] [WARGAME] (M) Add pointer/viewport lifecycle fuzz tests for multi-touch, opposing D-pad presses, `pointercancel`, lost capture, interrupted orientation change, browser chrome resize, background/foreground, dialogue open, and route exit; assert movement returns to neutral and game state survives.
- [ ] [WARGAME] (M) Add a control-occlusion and safe-area matrix that checks the player, every required approach point, dialogue Close, Pause, and action controls at each required viewport; record real-device evidence on one iOS Safari and one Android Chrome device.
- [ ] [WARGAME] (M) Instrument test builds with active audio-node, timer, and listener counts; loop Play/Mute/Pause/Restart/Return/visibility changes 50 times with audio allowed and rejected, and require counts to return to the documented baseline.

**Scalability notes:** A single input adapter prevents divergent gameplay rules across control types. DOM overlays and safe-area handling remain reusable if later maps or pages are added. Audio categories allow future sounds without scene-level mute logic.  
⚠️ DEBT: The mobile experience is landscape-first and portrait shows an orientation request. If portrait play becomes a product requirement, create a separately approved portrait room/UI composition rather than shrinking the current layout below legibility.

**Security checklist:**

- [ ] Request no browser permissions and test that the game never prompts for camera, microphone, location, notifications, or clipboard.
- [ ] Load audio and fonts from the same-origin validated manifest only (OWASP A03/A08).
- [ ] Ensure touch and keyboard events cannot activate controls hidden behind a modal overlay (OWASP A04).
- [ ] Store no device fingerprint, raw input history, or accessibility preference beyond the three approved local settings.

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes.
- [ ] Mobile gate passes on at least one iOS Safari device and one Android Chrome device.
- [ ] No critical or serious accessibility finding remains.
- [ ] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                          | Expected Observation                                                                                                                            | Likely Failure                                                                                                          | Causal Action                                                                                             | Counter-Move                                                                                                                                   | Prevention (added to plan)                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Security — modal/input isolation                   | Only controls belonging to the visible top state can receive input or accessibility activation                                                  | [MED] A hidden canvas or menu control activates through an overlay, causing unintended navigation or state changes      | Disabling visuals without disabling hit testing, focus, and input adapters together                       | Neutralize all gameplay actions, return to the visible overlay state, remove hidden elements from focus/hit testing, and rerun isolation tests | [WARGAME] Route all inputs through one active-context gate and test hidden-control rejection |
| Scalability — device input abstraction             | Keyboard, pointer, touch, and hybrid profiles emit the same typed actions and neutral semantics                                                 | [MED] Device-specific branches diverge, so a future control change fixes desktop but breaks touch or hybrid devices     | Implementing separate movement/close/pause rules inside each UI control                                   | Disable the divergent adapter, map it back to the shared contract, and rerun the profile suite                                                 | [WARGAME] Define and test a device-agnostic action contract                                  |
| Data integrity — lifecycle/orientation state       | Rotation, resize, cancellation, backgrounding, and route changes preserve position/preferences and clear transient input                        | [HIGH] Interrupted touch or orientation changes leave movement stuck, duplicate actions, or reset/corrupt session state | Assuming `pointerup`/resize completion always fires or reconstructing the game on every orientation event | Force actions neutral, pause without destroying state, restore the last valid viewport, and resume only after layout stabilization             | [WARGAME] Add multi-touch and viewport lifecycle fuzz tests                                  |
| UX/functional — mobile legibility and reachability | At every required viewport, controls and safe areas leave all 12 interactions reachable and critical UI visible                                 | [HIGH] Touch controls or browser safe areas cover an object, dialogue Close, or essential room detail on real devices   | Positioning controls from emulator dimensions only and checking screenshots rather than interaction paths | Move/scale DOM controls within approved bounds, retest every approach path, and capture real-device evidence                                   | [WARGAME] Gate Phase 5 on the occlusion/safe-area matrix and iOS/Android device run          |
| Operational — audio lifecycle and rejection        | Repeated audio unlock/reject/mute/restart cycles return nodes, timers, and listeners to baseline; gameplay remains silent and usable on failure | [HIGH] Audio rejection or repeated restarts leak contexts/listeners, drain battery, or break later sound                | Creating audio resources per scene/retry without a single lifecycle owner and teardown                    | Switch the manager to silent no-op, dispose excess resources, recreate one manager after user gesture, and rerun the loop                      | [WARGAME] Add audio resource counters and the 50-cycle lifecycle test                        |

**Fork trigger:** if the full room and controls cannot pass the `844 × 390` occlusion matrix, first move/compact the DOM controls; if two control layouts still fail, simplify nonessential room clutter before considering any resolution change.

**RECON NEEDED:** None. Audio may remain disabled at launch; the no-audio path is a first-class passing configuration.

### Phase 5: Compatibility, Performance, and Recovery

**Goal:** Make the complete game reliable across the browser matrix and resilient to slow assets, renderer failures, corrupt data, tab lifecycle changes, and extended play.

**MVP definition:** The release candidate passes automated and manual browser/viewport tests, meets frame-rate and download budgets, recovers from injected failures, and produces no continuous errors or memory growth during a 15-minute session.

**Test plan:**

1. Run the full CI suite and production build from a clean clone; all checks pass.
2. Test current stable Chrome, Edge, Firefox, macOS Safari, iOS Safari, and Android Chrome at the required viewport matrix.
3. Disable WebGL and confirm Canvas starts automatically; make both renderers fail and confirm the DOM recovery screen.
4. Simulate a missing atlas, failed locale response, corrupt map, and offline reload; each case shows a bounded explanation, Retry, and Return to Start where possible.
5. Profile a 15-minute scripted session; desktop targets 60 FPS, representative mid-range mobile remains at or above 30 FPS, and retained memory does not show unbounded growth.
6. Measure a cold production load under a typical broadband profile; essential interaction is available within 3 seconds where the requirements' test conditions are met and the compressed essential download remains at or below 8 MB.
7. Hide and restore the tab repeatedly; animation/audio pause and resume without duplicate loops, stacked listeners, or player jumps.

**Tasks:**

- [ ] (M) Implement an asset-loading coordinator with essential/nonessential groups, bounded retry, progress reporting, timeout handling, deduplicated requests, and typed failure categories that transition to the accessible Error state.
- [ ] (M) Implement explicit renderer recovery: attempt the configured renderer, retry with Canvas after recoverable WebGL initialization failure, and fall back to the DOM error screen if Canvas also fails; prevent infinite boot loops.
- [ ] (S) Add test fixtures and Playwright routes for missing assets, malformed content, corrupt map data, renderer failure, slow loading, and retry success.
- [ ] (M) Optimize atlases, PNGs, fonts, and optional audio; lazy-load nonessential audio; remove unused assets; emit a build budget report and fail CI when essential compressed assets exceed 8 MB.
- [ ] (M) Add performance instrumentation available in test builds for FPS, frame-time percentiles, draw calls where available, load milestones, and listener counts; keep production reporting aggregate and non-identifying.
- [ ] (M) Add automated browser tests for the supported Chromium, Firefox, and WebKit engines plus a documented manual device matrix for real Safari/iOS and Chrome/Android results.
- [ ] (M) Run a 15-minute deterministic soak test covering movement, dialogue, pause, restart, visibility changes, and audio toggles; fix leaked timers, event listeners, textures, or audio nodes and attach before/after evidence.
- [ ] (S) Review runtime dependencies, licenses, production source-map policy, console output, and bundle contents; remove debug utilities and resolve critical audit findings.
- [ ] [WARGAME] (S) Define an allowlisted client-error schema containing only release ID, bounded category, renderer, and coarse browser family; intercept production-network tests to prove that dialogue, names, storage values, full URLs, stack traces, IP-derived IDs, and raw input never leave the browser.
- [ ] [WARGAME] (S) Make asset-budget reporting deterministic: list the essential manifest, uncompressed bytes, gzip bytes, Brotli bytes, request count, atlas dimensions, and the exact compression/tool versions; fail CI on the approved 8 MB compressed metric and archive the report.
- [ ] [WARGAME] (M) Add a recovery/request budget: at most one WebGL-to-Canvas fork, two retries per essential asset with capped backoff, one active boot generation, cancellation of stale requests, and a visible terminal error; assert the request count cannot grow after terminal failure.
- [ ] [WARGAME] (M) Create a recovery truth table for missing/slow atlas, locale, map, offline load, WebGL failure, double-renderer failure, Retry, Return to Start, visibility, and restart; automate every feasible route and record manual-only cases.
- [ ] [WARGAME] (M) Define numeric soak acceptance thresholds before profiling: no duplicate game loop, zero net listener/timer/audio-node growth after cleanup, no monotonic heap trend across three checkpoints, and documented FPS/frame-time percentiles on named devices; fail the phase if results are inconclusive.

**Scalability notes:** Typed recovery categories keep failure UX stable as assets grow. Budget automation makes future content increases deliberate. Deterministic fixtures prevent one-room implementation details from hiding browser regressions.  
⚠️ DEBT: Real-device tests remain a documented manual matrix because hosted device-farm automation is not justified for a one-room personal site. If release frequency or device-specific regressions increase, add a device-farm job to the existing Playwright contract.

**Security checklist:**

- [ ] Bound retry counts, error payloads, and asset sizes to prevent runaway requests or memory exhaustion (OWASP A04).
- [ ] Resolve critical dependency findings or document a time-bounded exception with compensating controls and owner (OWASP A06).
- [ ] Confirm production source maps are private or omitted and errors expose no stack traces or local paths (OWASP A05/A09).
- [ ] Verify build output contains no unapproved external domains, tracking scripts, credentials, debug routes, or original reference-site assets (OWASP A05/A08).

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes.
- [ ] Browser, performance, asset-budget, failure-recovery, and soak-test evidence is recorded.
- [ ] No release-blocking console, memory, accessibility, or dependency issue remains.
- [ ] `docs/development_report.md` updated for this phase.

## Risk Audit

| Move/Task                                       | Expected Observation                                                                                                                                 | Likely Failure                                                                                                                    | Causal Action                                                                                                  | Counter-Move                                                                                                                                                    | Prevention (added to plan)                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Security/privacy — client errors and test hooks | Production sends only allowlisted, bounded error fields and contains no failure flags, private source maps, raw content, or user-identifying payload | [CRIT] Personal memory text, local state, stack paths, or persistent identifiers are transmitted or exposed in production         | Forwarding generic exceptions/storage to monitoring or shipping test instrumentation and source maps unchanged | Disable reporting/release, remove the exposed artifact, rotate any affected endpoint credential, rebuild with the allowlist, and verify network silence/content | [WARGAME] Add an allowlisted error schema plus production network and bundle privacy assertions |
| Scalability — asset budget methodology          | The same clean build produces a stable essential manifest, request count, atlas limits, and compressed-size report                                   | [MED] Budget results cannot be compared, allowing asset growth or needless optimization based on inconsistent compression         | Measuring browser cache totals, different encoders, or the entire optional bundle without a versioned method   | Recalculate with the pinned method, correct the manifest classification, and retain the comparable report                                                       | [WARGAME] Pin and archive deterministic raw/gzip/Brotli budget reports                          |
| Data integrity — recovery concurrency           | Only the newest boot generation may commit state; retries are bounded and stale requests are cancelled                                               | [HIGH] Retry races create duplicate scenes, mix old/new assets, or loop requests indefinitely                                     | Allowing concurrent boot attempts and callbacks to mutate shared state after cancellation                      | Cancel all stale generations, destroy duplicate scenes, return to the terminal DOM error, and retry once from a clean owner                                     | [WARGAME] Enforce boot generation IDs, cancellation, and explicit request/retry limits          |
| UX/functional — failure recovery                | Every injected failure reaches the documented accessible state and Retry/Return actions behave deterministically                                     | [HIGH] A rare failure still leaves a spinner, blank canvas, disabled controls, or misleading retry                                | Testing happy-path fallback only and treating different loader/renderer errors ad hoc                          | Transition to the bounded terminal error, keep Return to Start available, correct the truth table branch, and add the regression fixture                        | [WARGAME] Implement and verify the recovery truth table                                         |
| Operational — performance/leak evidence         | Named environments meet the numeric FPS/load thresholds and resource counts return to baseline through the 15-minute run                             | [HIGH] A “looks fine” soak misses gradual leaks or reports incomparable performance, causing post-launch freezes or battery drain | Profiling without thresholds, stable scripted load, cleanup checkpoints, or device identity                    | Block release, capture heap/resource timelines, isolate the owner, fix cleanup, and rerun all three checkpoints                                                 | [WARGAME] Set numeric soak/resource thresholds before measuring and fail inconclusive runs      |

**Fork trigger:** if the 8 MB budget is missed, remove/lazy-load optional audio and split/optimize atlases first; if essential visual assets alone still exceed the budget after one documented optimization pass, pause and re-scope the art/export pipeline rather than weakening the gate.

**RECON NEEDED:** None. “Representative mid-range mobile” must be named in the development report when testing begins; the plan does not require a specific brand to proceed.

### Phase 6: Static Deployment and Production Release

**Goal:** Ship a reversible, observable HTTPS release with correct routes, headers, caches, documentation, and ownership.

**MVP definition:** **Our Little House** is live on its production HTTPS URL; `/` and direct `/game` navigation work; security headers and caching are correct; smoke tests pass; and a previous known-good version can be restored mechanically.

**Test plan:**

1. Deploy a preview from the exact release commit and run automated smoke tests against it.
2. Open preview and production `/` and `/game` directly in a new session; both load, Play works, assets resolve, and no mixed content appears.
3. Inspect response headers; HTML revalidates, hashed assets are immutable, HTTPS is enforced, and CSP/Permissions/Referrer/MIME/frame protections are present.
4. Run a production journey on desktop and mobile: start, move, open/close three memories, mute, pause, restart, and return to start.
5. Trigger the documented rollback to the previous saved deployment, verify its smoke test, then redeploy the candidate.
6. Restore the project from the remote repository plus archived original art sources into a clean directory and produce an identical build.
7. Verify availability monitoring reports a failed synthetic request without storing personal visitor data.

**Tasks:**

- [ ] (S) Add Cloudflare Pages build configuration for `npm ci && npm run build` and the `dist` output; generate a production `_redirects` file that rewrites direct `/game` requests to `index.html`; and configure separate preview/production environments with no client secrets.
- [ ] (M) Generate a production `_headers` file defining CSP restricted to required same-origin resources, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`, safe `Referrer-Policy`, HTML revalidation, and immutable caching for hashed assets; configure HTTPS/custom-domain redirect behavior separately and verify both on deployed responses.
- [ ] (S) Create `docs/release_runbook.md` with prerequisites, content freeze, clean-build commands, preview verification, approval gate, production deployment, smoke tests, rollback, and incident contacts/ownership.
- [ ] (S) Create `docs/operations.md` with availability check, bounded privacy-safe client error handling, dependency update cadence, content update workflow, clear-cache guidance, and criteria for disabling a broken release.
- [ ] (S) Configure a privacy-preserving uptime check for `/` and `/game` plus a synthetic Play smoke test; do not add visitor analytics.
- [ ] (M) Add a CI release workflow that deploys only a reviewed commit after lint, typecheck, unit, E2E, production content validation, asset budget, dependency review, and build checks pass; retain the previous known-good deployment identifier.
- [ ] (S) Create a release inventory containing the approved locale files, Tiled map, web atlases, original editable art sources, font/audio licenses, build-tool versions, and ownership; archive it separately from ephemeral build output.
- [ ] (M) Execute the preview-to-production checklist, tag the release, capture production smoke-test evidence, exercise rollback once, and record the final production URL and release identifier in the development report.
- [ ] [WARGAME] (S) Create a least-privilege deployment credential dedicated to this project/environment; add repository, built-bundle, and CI-log secret scans, verify fork/preview jobs cannot access production credentials, and document immediate revocation.
- [ ] [WARGAME] (M) Probe deployed cache behavior for HTML, hashed assets, maps, locale files, fonts, and optional audio using cold and revalidation requests; record status, cache headers, MIME, content hash, and confirm a new HTML shell never points to unavailable assets.
- [ ] [WARGAME] (M) Generate a release manifest for the exact deployed artifact containing commit, toolchain, content/art checksums, `dist` file hashes, host deployment ID, and previous known-good ID; store it with the separately archived source/license inventory and complete one restore verification.
- [ ] [WARGAME] (M) Test the proposed CSP in preview before enforcement and run direct route probes for `/`, `/game`, `/game/`, query strings, refresh, Back/Forward, and missing routes; verify all required same-origin asset/font/audio requests and reject every unapproved origin.
- [ ] [WARGAME] (M) Perform a pre-public rollback drill using the retained previous deployment, verify its manifest and smoke journey, redeploy the candidate by its recorded ID, and define the owner plus maximum 15-minute disable/rollback decision window in the runbook.

**Scalability notes:** Provider configuration is isolated from game code, hashed assets support CDN caching, and a reproducible build makes future content releases small and reversible. The static architecture has no server capacity bottleneck for version 1.  
⚠️ DEBT: Cloudflare Pages is the assumed host. If organizational requirements select another provider, port only rewrites, headers, deployment workflow, and rollback steps; preserve the same build artifact and smoke tests.

**Security checklist:**

- [ ] Verify HTTPS, CSP, anti-framing, MIME, referrer, permissions, and cache headers on the actual production responses (OWASP A05).
- [ ] Protect production deployment credentials in the hosting/CI secret store with least privilege; confirm they never enter client bundles or logs (OWASP A05/A08).
- [ ] Require successful CI and an approved commit for production deployment; record release and rollback identifiers (OWASP A08).
- [ ] Confirm privacy documentation matches actual storage and monitoring behavior and that no unapproved third-party request occurs.

**Definition of Done:**

- [ ] All tasks checked.
- [ ] Test plan passes on the production URL.
- [ ] Rollback and clean restore/build have both been exercised successfully.
- [ ] Final creator approval is recorded.
- [ ] `docs/development_report.md` updated for this phase and marked production-ready.

## Risk Audit

| Move/Task                                  | Expected Observation                                                                                                                                | Likely Failure                                                                                                        | Causal Action                                                                                                      | Counter-Move                                                                                                                                         | Prevention (added to plan)                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Security — deployment credentials and logs | Production credentials are least-privilege, unavailable to untrusted preview/fork jobs, absent from source/bundles/logs, and mechanically revocable | [CRIT] A deployment credential leaks and permits unauthorized production changes                                      | Reusing a broad personal token, exposing secrets to preview jobs, or echoing environment values during CI failures | Revoke the credential immediately, inspect deployment history, restore the known-good ID, issue a narrower credential, and rerun secret scans        | [WARGAME] Add project-scoped credentials, isolation checks, secret scans, and revocation steps                  |
| Scalability — cache/release compatibility  | HTML revalidates, immutable hashed assets remain addressable, and maps/locales use cache rules compatible with the release manifest                 | [MED] Cache policy creates stale shell/asset mismatches that worsen as releases and assets accumulate                 | Caching `index.html` immutably, deleting referenced hashed assets too early, or applying one rule to every file    | Roll back to the compatible deployment, purge only the incorrect cache keys, correct headers, and rerun cold/revalidation probes                     | [WARGAME] Add deployed cache/MIME/hash compatibility probes per asset class                                     |
| Data integrity — release/source inventory  | The exact deployed bytes, approved content, editable sources, licenses, and previous deployment are recoverable from checksummed manifests          | [CRIT] The live version cannot be reproduced or legally verified after a host/repository/source loss                  | Treating a commit hash as sufficient while art sources/licenses/build outputs live elsewhere without tested backup | Freeze new releases, restore from the separate archive, compare checksums, and rebuild provenance before changing production                         | [WARGAME] Bind deployed artifact and archived source/license inventories in one restore-tested release manifest |
| UX/functional — CSP/routes/asset loading   | Direct and in-app routes load under enforced CSP; all required same-origin requests succeed and unknown routes fail intentionally                   | [HIGH] A rewrite or CSP change passes CI but blocks the game, font, audio, or direct `/game` navigation in production | Enforcing untested headers or validating only `/` through client-side navigation                                   | Roll back/disable the candidate, inspect blocked requests and route responses, adjust the minimal rule, and repeat preview probes before redeploying | [WARGAME] Test CSP in preview and probe the complete direct-navigation matrix                                   |
| Operational — rollback and ownership       | The owner can restore a verified previous deployment and return to the candidate by ID within 15 minutes                                            | [HIGH] A broken release stays live because rollback is manual, untested, ambiguous, or rebuilds moving dependencies   | Recording a rollback description without exercising it or failing to retain immutable deployment identifiers       | Disable the broken release, invoke the saved previous ID, run the smoke journey, and escalate to the named owner if the 15-minute window is exceeded | [WARGAME] Require a pre-public rollback drill, immutable IDs, and a decision owner/window                       |

**Fork trigger:** if preview CSP or route probes fail, remain on preview and change hosting configuration only; if the exact same artifact passes preview but fails production, restore the previous deployment and investigate domain/CDN configuration before any rebuild.

**RECON NEEDED:** None. Cloudflare Pages remains the default adapter; selecting another static host activates the documented provider-port path without changing game architecture.

## 5. Development Report Template

Use the following content for `docs/development_report.md`. Replace bracketed guidance rather than deleting unanswered risks.

```markdown
# Development Report: Our Little House

## Report Metadata

- Current phase: [Phase number and name]
- Status: [Not started / In progress / Blocked / Complete]
- Report updated: [YYYY-MM-DD]
- Release candidate or commit: [identifier]
- Developer/agent: [name]
- Environment: [local / preview / production]

## 1. Phase Goal and MVP

- Planned goal: [copy from docs/plan.md]
- Planned MVP: [copy from docs/plan.md]
- Actual result: [what can be run and demonstrated now]

## 2. Work Completed

| Plan task   | Result                      | Files/components changed | Evidence                           |
| ----------- | --------------------------- | ------------------------ | ---------------------------------- |
| [task text] | [complete/partial/deferred] | [paths or modules]       | [test, screenshot, recording, URL] |

## 3. Architecture and Decisions

| Decision   | Rationale | Alternatives considered | Consequences    |
| ---------- | --------- | ----------------------- | --------------- |
| [decision] | [why]     | [options]               | [future impact] |

## 4. Commands and Tests Run

| Command or manual test | Environment   | Result      | Evidence or failure |
| ---------------------- | ------------- | ----------- | ------------------- |
| `[exact command]`      | [environment] | [pass/fail] | [summary/link]      |

### Acceptance results

- [ ] Phase test plan passed completely.
- [ ] WebGL behavior verified where required.
- [ ] Canvas behavior verified where required.
- [ ] Required viewport/device checks completed.
- [ ] No unexplained console error remains.

## 5. Security and Privacy Review

- Controls added or verified: [list]
- Dependency audit result: [summary]
- Content/asset provenance result: [summary]
- Data stored or transmitted: [exact inventory]
- Open security/privacy findings: [finding, severity, owner, due phase]

## 6. Performance and Accessibility

- Load/bundle measurements: [numbers and conditions]
- FPS/memory measurements: [numbers and devices]
- Accessibility checks: [keyboard, focus, announcements, contrast, motion, zoom]
- Open performance/accessibility findings: [finding, severity, owner, due phase]

## 7. Deviations and Deliberate Debt

| Deviation or debt | Why accepted | User impact | Required future fix | Due phase/trigger          |
| ----------------- | ------------ | ----------- | ------------------- | -------------------------- |
| [item]            | [reason]     | [impact]    | [fix]               | [date/phase/scale trigger] |

## 8. Known Issues and Blockers

| Issue   | Severity                   | Reproduction | Owner   | Next action | Abort condition |
| ------- | -------------------------- | ------------ | ------- | ----------- | --------------- |
| [issue] | [critical/high/medium/low] | [steps]      | [owner] | [action]    | [condition]     |

## 9. Assets and Content Status

- Approved room layout: [yes/no/link]
- Approved player and cat: [status]
- Approved subtitle, names, and memories: [status]
- Placeholder scan: [pass/fail]
- Asset budget: [size and pass/fail]
- Provenance/license inventory: [status]

## 10. Next-Phase Readiness

- [ ] Current phase Definition of Done is satisfied.
- [ ] Required approvals and inputs for the next phase are available.
- [ ] No unresolved abort condition blocks progression.
- [ ] Tests and fixtures are stable enough to protect completed behavior.
- Recommended next action: [one concrete action]
- Handoff notes for the next AI session: [state, constraints, exact starting task]
```

## 6. Final Production-Readiness Checklist (Pre-Launch)

### Product and content

- [ ] Title is **Our Little House** and the approved final subtitle is present.
- [ ] Player name, cat name, appearance, room layout, palette, and all 12 memories are approved.
- [ ] `npm run validate:content -- --mode production` passes with no placeholder, missing, unknown, unsafe, or overlong value.
- [ ] The entire experience can be completed without sound and without prior game knowledge.
- [ ] No out-of-scope feature has entered the release candidate without an approved requirements update.

### Functional and visual

- [ ] Movement, normalization, facing, collision, depth, spawn, pause, restart, and Return to Start pass.
- [ ] Every required interaction is reachable, selects correctly, opens once per zone entry, closes with every supported input, and restores movement/focus.
- [ ] Original room, player, cat, and UI art pass approval at native resolution in WebGL and Canvas.
- [ ] No blurred pixels, stretched art, tile seams, unreadable labels, covered controls, or trapped paths remain.
- [ ] Desktop keyboard and mobile touch journeys pass on the release candidate.

### Browser, viewport, and accessibility

- [ ] Current stable Chrome, Edge, Firefox, macOS Safari, iOS Safari, and Android Chrome results are recorded.
- [ ] `1920×1080`, `1366×768`, `1280×720`, `1024×576`, `844×390`, and `390×844` handling pass.
- [ ] Keyboard navigation, focus visibility/restoration, dialogue announcement, text contrast, reduced motion, browser zoom, and sound independence pass.
- [ ] Touch targets meet the `44 × 44` CSS-pixel minimum and safe-area insets are respected.
- [ ] No critical or serious accessibility issue remains.

### Performance and resilience

- [ ] Desktop target is 60 FPS and representative mid-range mobile remains at or above 30 FPS under documented conditions.
- [ ] Essential compressed initial download is at or below 8 MB and load milestones meet the approved performance test.
- [ ] Fifteen-minute soak test shows no unbounded memory, event-listener, timer, texture, or audio growth.
- [ ] WebGL-to-Canvas fallback, double-renderer failure, missing asset, corrupt content/map, Retry, and Return to Start pass.
- [ ] Visibility/background behavior pauses and resumes without duplicate loops or state corruption.

### Security, privacy, and integrity

- [ ] CI dependency review has no unresolved critical finding.
- [ ] Production contains no secret, credential, debug route, failure-injection flag, local path, private source map, or unapproved domain.
- [ ] CSP, HTTPS, anti-framing, MIME, referrer, permissions, and cache headers are verified on production.
- [ ] Locale/map/storage inputs are validated and all visible content is rendered as text.
- [ ] Art, font, and audio provenance/licenses are complete; no reference-site asset or traced derivative is present.
- [ ] Actual storage is limited to mute, locale, and control-hint preference; no analytics or persistent visitor identifier is active.

### Deployment, recovery, and operations

- [ ] A clean clone using the pinned toolchain produces the release build.
- [ ] Preview smoke tests pass against the exact commit intended for production.
- [ ] Direct `/` and `/game` navigation works over HTTPS with correct assets and no mixed content.
- [ ] Production smoke tests pass on desktop and mobile.
- [ ] Previous known-good deployment is identified and rollback has been exercised successfully.
- [ ] Repository plus archived editable art/licensing sources can be restored and rebuilt.
- [ ] Availability monitoring and bounded privacy-safe error handling are active.
- [ ] Release runbook, operations guide, final development report, production URL, release tag, owner, and next maintenance date are recorded.

## Abort Conditions

Pause execution and reconsider the approach before continuing when any condition below is true. Record the trigger, evidence, owner, and decision in `docs/development_report.md`; retrying the same task is not an acceptable response.

1. **Renderer viability fails:** forced WebGL or Canvas cannot produce a sharp visible first frame, or Canvas remains below 30 FPS on the named representative mid-range mobile profile after one documented draw-call/texture optimization pass.
2. **Cross-renderer mechanics diverge:** the same deterministic movement/collision trace differs by more than one logical pixel or selects a different interaction between WebGL and Canvas after timing fixes.
3. **The fixed-room premise fails:** two approved layout revisions still cannot make all 12 interactions reachable and legible at `640 × 360` while passing the `844 × 390` mobile occlusion gate.
4. **Originality or legal provenance is unresolved:** any launch art, font, audio, or text has unknown ownership/license, is copied/traced from the reference, or lacks an approved source record.
5. **Private material or credentials are exposed:** a creator reference, personal filename/path, private memory draft, identifier, source map, or deployment credential reaches a public artifact, log, cache, or network payload.
6. **Irreplaceable source data is missing:** editable art, Tiled sources, approved locale content, licenses, or release manifests cannot be restored with matching checksums from the separate archive.
7. **Content approval is unavailable at its gate:** Phase 3 lacks the approved floor plan, palette, player/cat references, launch language, subtitle/names, or memory copy; do not substitute executor-written final personal content.
8. **The essential asset model breaks:** the compressed essential download remains above 8 MB after one documented optimization/lazy-load pass without removing approved essential content.
9. **Accessibility requires an architectural fork:** a critical or serious keyboard, focus, announcement, contrast, zoom, or touch issue cannot be fixed through the existing DOM overlay and unified input boundaries.
10. **Release integrity or recovery fails:** a clean pinned-toolchain clone cannot reproduce the candidate manifest, or the previous known-good production deployment cannot be restored and smoke-tested within 15 minutes.
11. **Scope changes the trust model:** accounts, backend storage, visitor analytics, user-generated content, remote content, payments, or additional browser permissions become requirements. Stop and create a requirements/security/architecture revision before implementation continues.
12. **Any `[CRIT]` finding remains open:** no phase may close and no public release may proceed while a critical risk lacks verified remediation and recorded evidence.

## Verification Runs

Before marking any phase complete, run that phase's existing test plan plus every applicable run below. Record the exact command, environment, result, and evidence in `docs/development_report.md`. A skipped run needs a written “not yet applicable” reason and the phase in which it becomes mandatory.

1. **Clean-room build and static checks**
   - Run from a fresh checkout with empty dependency/build caches using the pinned Node and package-manager versions.
   - Execute `npm ci`, formatting check, lint, typecheck, unit tests, development content validation, production build, and headless smoke tests using the scripts established in Phase 0.
   - **Pass:** every command exits `0`, the lockfile remains unchanged, no untracked generated dependency file appears, and the report records tool versions plus commit ID.

2. **Boundary and production-bundle inspection**
   - Run the import-boundary rule, secret scan, forbidden DOM-sink scan, source-map policy check, external-domain scan, and production debug/test-hook assertions.
   - **Pass:** no forbidden import/sink/domain/secret/private path exists; production ignores or omits renderer overrides, diagnostics, failure injection, and collision/debug overlays.

3. **Renderer and lifecycle journey**
   - In forced WebGL and forced Canvas, open `/`, keyboard-activate Play, reach `/game`, render the first frame, move, pause/resume, Retry after one injected boot failure, Return to Start, use Back/Forward, revisit `/game`, and destroy the app.
   - **Pass:** both renderers remain sharp; final deterministic coordinates differ by at most one logical pixel; each transition has the expected state; exactly one game loop, Phaser instance, resize listener set, and input subscription set remain.

4. **Map, collision, depth, and reachability run**
   - Validate the map/footprint contract, then execute the sampled path from spawn to every required interaction approach point and the front/behind depth fixture in both renderers.
   - **Pass:** all 12 approach points are reachable with required clearance; no out-of-bounds geometry, wall leak, disconnected island, or trap exists; collision and visual depth match the contract.

5. **Complete interaction and content tour**
   - Validate the production content manifest, then open and close each of the 12 memories using automatic proximity and press mode fixtures; test overlapping zones from each facing, remain in/exit/re-enter zones, Pause, Restart, corrupt preferences, and locale fallback.
   - **Pass:** the correct stable ID wins every selection; at most one dialogue opens; movement stops/restores correctly; close input is consumed; no immediate reopen occurs; preferences recover safely; production contains no placeholder, markup, missing/unknown key, or overlong value.

6. **Accessibility and control matrix**
   - Complete the start/dialogue/pause/error/return journey by keyboard, run the screen-reader evidence path, enable reduced motion, test 200% browser zoom on the shell, and execute keyboard/touch/hybrid profiles.
   - **Pass:** focus is visible and ordered; dialogue is announced once and traps/restores focus correctly; hidden controls cannot activate; meaning does not depend on sound/color/motion; all touch targets are at least `44 × 44` CSS pixels.

7. **Viewport, safe-area, and real-device run**
   - Exercise `1920×1080`, `1366×768`, `1280×720`, `1024×576`, `844×390`, and `390×844`, including orientation and browser-chrome changes; complete the required real iOS Safari and Android Chrome journeys once Phase 4 starts.
   - **Pass:** no stretching, critical crop, unsafe-area overlap, covered Close/action/Pause control, hidden required object, lost state, stuck movement, or browser-scroll lock outside active gameplay occurs.

8. **Asset integrity, originality, and restore run**
   - Validate atlas limits, render every atlas frame in both forced renderers, scan export metadata/private paths, verify the content-and-provenance manifest, and restore editable sources/licenses before comparing SHA-256 checksums.
   - **Pass:** every asset renders, is original or compatibly licensed, contains no private metadata/path, matches an approved manifest entry, and can be recreated/restored from non-ephemeral sources.

9. **Failure, retry, privacy, and network run**
   - Execute the recovery truth table for missing/slow assets, malformed locale/map, offline load, WebGL failure, double-renderer failure, Retry, Return to Start, restart, and tab visibility. Inspect all network payloads during the production-mode journey.
   - **Pass:** retry/request caps hold; stale generations cannot commit; every terminal failure has an accessible explanation and recovery action; no dialogue, name, storage value, raw input, stack trace, private URL/path, or persistent identifier leaves the browser.

10. **Performance and soak run**
    - Produce the pinned raw/gzip/Brotli budget report, measure load milestones/FPS/frame-time percentiles, and run the deterministic 15-minute soak plus the 50-cycle audio/input lifecycle loop on named environments.
    - **Pass:** essential compressed bytes are at or below 8 MB; desktop reaches the 60 FPS target; representative mid-range mobile stays at or above 30 FPS; no duplicate loop or net listener/timer/audio-node growth remains; heap checkpoints show no monotonic unbounded trend.

11. **Preview, production, cache, and rollback run**
    - From the exact release commit/artifact, probe HTTPS `/`, `/game`, `/game/`, query, refresh, Back/Forward, missing routes, CSP, MIME, referrer, permissions, framing, HTML revalidation, and immutable asset caches. Run the desktop/mobile smoke journey, restore the previous deployment by ID, smoke-test it, then redeploy the candidate by ID.
    - **Pass:** all expected routes/assets work without mixed content or unapproved origins; headers/cache hashes match policy; monitoring detects the synthetic failure without visitor identifiers; both rollback and candidate restoration finish within the 15-minute decision window.

12. **Phase evidence and gate review**
    - Review every task checkbox, Risk Audit prevention, fork trigger, applicable abort condition, deliberate debt item, approval gate, and outstanding finding.
    - **Pass:** each completion claim has evidence; every `[WARGAME]` task for the phase is complete; no applicable abort condition or unresolved `[CRIT]`/release-blocking issue remains; the report names the exact next task and required inputs.
