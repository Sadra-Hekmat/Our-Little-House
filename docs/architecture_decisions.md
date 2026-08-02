# Architecture Decisions — Our Little House

## ADR-001: Phaser 3 for the game runtime

**Status:** accepted  
**Decision:** Phaser 3 owns canvas rendering, scene lifecycle, scale management, and later Arcade
Physics systems. It is mature, browser-focused, supports WebGL with Canvas fallback, and provides
the fixed-resolution pixel-art controls required by the product. Game rules remain in explicit
systems instead of being buried in scene callbacks.

## ADR-002: Accessible DOM overlays beside the canvas

**Status:** accepted  
**Decision:** Routing, title controls, dialogue, recovery, pause, and touch UI use semantic HTML and
CSS. The canvas remains responsible for the room. Phaser publishes typed view models and the DOM
publishes user intents, so neither reaches into the other's objects. This preserves keyboard,
focus, screen-reader, RTL, and responsive behavior.

## ADR-003: Tiled JSON for room data

**Status:** accepted for Phase 1 onward  
**Decision:** The final room uses validated Tiled JSON for tiles, collision footprints, interaction
zones, spawn points, and depth metadata. Visual bounds remain separate from collision and
interaction bounds. Phase 0 deliberately uses generated flat-color graphics while renderer
behavior is proven.

## ADR-004: Fixed 640 × 360 logical resolution

**Status:** accepted  
**Decision:** The room is authored at `640 × 360`, shown in full with Phaser `FIT` and centered
letterboxing. `pixelArt`, `roundPixels`, disabled antialiasing, and CSS `image-rendering` preserve
hard edges. This keeps map, collision, art, and interaction coordinates stable across viewports.

## ADR-005: Browser history routes in one static application

**Status:** accepted  
**Decision:** `/` and `/game` are client routes in one Vite build. The shell owns `pushState`,
`popstate`, focus, and game mount/destruction. Static hosting must rewrite direct requests to
`index.html`; hosting details stay outside runtime modules.

## Boundary contract

| Source boundary             | May depend on                                       | Must not depend on                     |
| --------------------------- | --------------------------------------------------- | -------------------------------------- |
| `app`                       | content, contracts, the public game runtime adapter | scenes, systems, map internals         |
| `game`                      | contracts, validated content/map types              | app routing, DOM UI, storage internals |
| `ui`                        | contracts and view models                           | Phaser scenes/systems or app routing   |
| `content`, `map`, `storage` | their own schemas and contracts                     | app, game, or UI implementation        |

ESLint fails on forbidden aliases and cross-boundary relative imports. Later cross-boundary work
must add a typed contract instead of weakening this rule without an ADR.

## ADR-006: Versioned gray-box map contract before final art

**Status:** accepted

**Decision:** Phase 1 freezes a `640 × 360`, top-left-origin contract with required Tiled object
layers, seven visual-zone IDs, twelve stable interaction IDs, player animation keys, depth bands,
clearance, and parser resource limits. Unknown input is validated before Phaser construction. The
temporary fixture lives in `tests/fixtures` and is reached at runtime only through a bundled
allowlist; query parameters and external tileset URLs cannot select assets.

## ADR-007: Arcade bodies with pure movement and reachability rules

**Status:** accepted

**Decision:** Phaser Arcade Physics owns the single player body and static collision bodies. Pure
functions own movement-vector normalization, depth calculation, reachability sampling, and fixed
trace calculation so renderer-independent rules have exact unit tests. Runtime keyboard motion
still uses Arcade velocity/collision, while the deterministic trace is the cross-renderer evidence
contract used to detect future map or timing drift.

## ADR-008: Focus-scoped input and DOM-owned pause controls

**Status:** accepted

**Decision:** A single input controller listens for required keyboard codes only while the game
surface owns focus. It prevents scrolling only for gameplay-relevant browser keys, clears every
action on blur, visibility loss, pointer/focus loss, pause, restart, and route exit, and requests a
state transition rather than owning movement itself. The shell owns the accessible Pause, Resume,
Restart, and Return to Start controls through typed game commands.
