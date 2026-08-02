# Map boundary

Validated Tiled JSON adapters, collision objects, spawn points, interaction zones, and depth
metadata belong here. Map modules do not render DOM or own scene lifecycle.

`graybox-contract.ts` freezes Phase 1 dimensions, layer names, stable IDs, animation keys, player
clearance, resource limits, and depth bands. `tiled-map-adapter.ts` validates unknown input before
Phaser construction. The temporary canonical fixture is `tests/fixtures/graybox-home.json`; the
bundled manifest is the only runtime entry point, so map URLs cannot come from query parameters.
