# Our Little House — Web Game Requirements

**Document status:** Draft for review  
**Version:** 0.1  
**Target platform:** Modern desktop and mobile web browsers  
**Reference experience:** [imsaud.me/game](https://www.imsaud.me/game) and the supplied screenshot  
**Game title:** **Our Little House**  
**Working subtitle:** `{{SUBTITLE_TO_BE_PROVIDED}}`

---

## 1. Product Summary

This project is a short, browser-based personal life-simulation experience set inside the creator's home.

The player controls a small pixel-art version of the creator, walks around a cozy apartment, and discovers short personal or humorous sentences by approaching interactive objects such as the laptop, bed, television, kitchen appliances, weights, and pet.

The target experience is a close functional and visual match to the reference:

- detailed modern 16-bit pixel art;
- a top-down three-quarter room perspective;
- warm, saturated colors;
- a compact chibi player character;
- a cozy, cluttered home;
- grid-aligned furniture and collision;
- short proximity-based interactions;
- a dark retro dialogue box at the bottom of the screen;
- a lightweight, personal, slice-of-life tone.

The implementation must use original project assets, text, and code. The reference is used to define the experience, composition, mechanics, and quality bar.

---

## 2. Product Goals

### 2.1 Primary goals

1. Let visitors explore a pixel-art version of the creator's home directly in a web browser.
2. Make movement immediately understandable without a tutorial sequence.
3. Reward exploration with short personal sentences attached to room objects.
4. Match the cozy, polished, nostalgic feeling of a 16-bit life-simulation game.
5. Load quickly and work without installation.
6. Make dialogue and room content easy to edit later without changing game code.

### 2.2 Success criteria

The first release is successful when:

- a visitor can open the website and start the game in two actions or fewer;
- the room is fully visible and uses crisp, non-blurred pixel art;
- the player can walk around all intended open floor areas without crossing furniture;
- approaching every configured interactive object shows the correct sentence;
- the dialogue can be closed using keyboard, mouse, or touch;
- the game works in browsers with either WebGL or Canvas rendering;
- no essential text, controls, or interactive objects are cut off at supported screen sizes;
- a non-developer can update the subtitle and dialogue text from configuration files.

---

## 3. Scope

### 3.1 Included in version 1

- responsive website shell;
- loading screen;
- title/start screen;
- configurable title and subtitle;
- one explorable home interior;
- one controllable player character;
- one pet cat with a configurable name;
- top-down four-direction movement;
- idle and walk animations;
- collision with walls and furniture;
- interactive object proximity detection;
- bottom-screen retro dialogue UI;
- close button and keyboard/touch dismissal;
- player and pet name labels;
- desktop keyboard controls;
- mobile touch controls;
- mute control and optional ambient audio support;
- local persistence for basic preferences;
- editable content configuration;
- graceful WebGL-to-Canvas fallback;
- deployment as a static browser website.

### 3.2 Explicitly outside version 1

- combat;
- weapons;
- health or damage systems;
- inventory;
- crafting;
- quests;
- branching dialogue;
- save-game progression;
- multiplayer;
- online accounts;
- backend database;
- user-generated room editing;
- multiple homes or outdoor maps;
- non-game portfolio sections such as About, Projects, FAQs, or Contact;
- copying or extracting the reference site's source code or art assets.

These features can be considered after the core room experience is approved.

---

## 4. Target Audience and Session

### 4.1 Audience

- visitors to the creator's personal website;
- friends, clients, recruiters, or followers who want a playful introduction;
- casual players with no prior gaming experience.

### 4.2 Expected session

- typical session length: 2–5 minutes;
- no account or sign-in;
- no previous game knowledge required;
- all primary content discoverable in a single visit.

---

## 5. Website Structure

### 5.1 Routes

| Route   | Purpose                                                               |
| ------- | --------------------------------------------------------------------- |
| `/`     | Minimal title/start screen with game title, subtitle, and Play button |
| `/game` | Full game experience                                                  |

If desired during implementation, `/` may load the game shell and transition into gameplay without a full page navigation.

### 5.2 Start screen

The start screen must contain:

- game title: **Our Little House**;
- subtitle: `{{SUBTITLE_TO_BE_PROVIDED}}`;
- primary **Play Game** button;
- compact control instructions;
- language control if a second language is approved;
- mute/unmute control if audio is included.

The start screen should preserve the same retro pixel-art identity as the game. Starting the game must count as the browser user gesture needed to enable audio.

### 5.3 Loading behavior

The game must:

1. show an immediate branded loading state;
2. preload the room, player, UI, and essential fonts;
3. show progress or a simple animated loading indicator;
4. enter gameplay only after essential assets are ready;
5. show a readable retry message if an essential asset cannot load;
6. never remain on a blank or black screen after a rendering failure.

---

## 6. Core User Flow

1. Visitor opens the website.
2. Visitor sees the game title and custom subtitle.
3. Visitor selects **Play Game**.
4. The home interior appears with the player at the configured spawn point.
5. A compact control hint appears briefly.
6. The visitor moves around the room.
7. When the player enters an interactive object's activation area, a dialogue panel appears at the bottom of the screen.
8. The visitor reads the sentence and closes the panel.
9. The visitor continues exploring other objects.
10. The visitor may mute audio, restart, or return to the start screen.

There is no required win state. Exploration itself is the experience.

---

## 7. Game World

### 7.1 Room composition

Version 1 contains one open-plan home interior inspired by the supplied reference.

The room should include these visual zones:

- living area;
- kitchen;
- sleeping area;
- computer/work area;
- exercise corner;
- pet area;
- open walking space connecting all zones.

### 7.2 Required room elements

| Zone          | Required elements                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Living area   | Television, TV stand, couch, side table, long teal/orange rug, small decorative objects             |
| Kitchen       | Upper and lower cabinets, refrigerator, water dispenser, stove, sink, dishes, microwave, countertop |
| Sleeping area | Bed, pillows, blanket, bedside surface, red/orange rug                                              |
| Work area     | Desk, laptop or desktop computer, monitor, keyboard, office chair                                   |
| Exercise area | Two dumbbells or small weight set                                                                   |
| Pet area      | Cat sprite and a nearby open walking area                                                           |
| Environment   | Warm wooden floor, deep-purple outer/background area, walls, trim, framed wall decoration           |

Small decorative objects should make the apartment feel lived-in, but they must not make the walking paths unclear.

### 7.3 Layout rules

- Furniture is authored on an invisible tile grid.
- Art may extend above or outside a furniture object's collision footprint.
- Open walking paths must remain visually obvious.
- The player must not become permanently trapped between collision objects.
- At least one tile of clearance should exist around important interactive objects.
- The room should feel compact rather than empty.
- Large foreground furniture may visually overlap the player's lower body when appropriate.
- Rendering depth must create believable front/behind relationships.

### 7.4 Camera

Version 1 uses a fixed camera showing the full playable room.

- No manual camera controls.
- No camera shake is required.
- The room must remain legible at the minimum supported desktop size.
- On smaller screens, the full composition is scaled down rather than cropped.
- The dialogue panel stays anchored to the viewport, not the world.

---

## 8. Player Character

### 8.1 Identity

The player character represents the creator.

Required configurable values:

- display name: `{{PLAYER_NAME}}`;
- appearance reference: `{{CHARACTER_REFERENCE_IMAGES}}`;
- skin tone;
- hair style and color;
- outfit colors;
- optional accessory.

### 8.2 Visual style

- compact chibi proportions;
- oversized head;
- readable silhouette;
- limited facial detail;
- consistent pixel density with the room;
- original sprite design based on user-supplied appearance references.

### 8.3 Animation states

Minimum animation set:

- idle facing down;
- idle facing up;
- idle facing left;
- idle facing right;
- walking down;
- walking up;
- walking left;
- walking right.

Recommended animation timing:

- idle: subtle two-frame loop or static frame;
- walking: four or more frames per direction;
- animation must stop on the correct facing frame when movement stops.

### 8.4 Name label

- The player's name appears in a compact pixel-style label above the character.
- The label follows the character.
- It must remain readable against light and dark room areas.
- The label may be hidden while a dialogue panel is open if it competes with the UI.

---

## 9. Movement and Collision

### 9.1 Desktop controls

| Action             | Primary input                   | Alternative input             |
| ------------------ | ------------------------------- | ----------------------------- |
| Move up            | `W`                             | Up Arrow                      |
| Move down          | `S`                             | Down Arrow                    |
| Move left          | `A`                             | Left Arrow                    |
| Move right         | `D`                             | Right Arrow                   |
| Confirm / interact | `E`                             | Enter or Space                |
| Close dialogue     | Escape                          | Enter, Space, or Close button |
| Mute / unmute      | `M`                             | UI button                     |
| Pause / menu       | Escape when no dialogue is open | UI button                     |

### 9.2 Movement behavior

- Movement is smooth but aligned visually to the tile-based environment.
- Four-direction character animations are required.
- Diagonal input may be accepted, but speed must be normalized.
- The last movement direction determines the idle facing direction.
- Movement must stop while a modal dialogue is open.
- Keyboard input must not scroll the browser page during gameplay.

### 9.3 Collision

The player must collide with:

- room boundaries;
- walls;
- cabinets and counters;
- couch and tables;
- bed;
- TV stand;
- work desk;
- exercise equipment where appropriate;
- other configured solid furniture.

The player may pass behind tall objects only when the object's collision footprint and depth layer make that path believable.

### 9.4 Spawn point

- The player starts in a clear central area.
- The spawn point must not overlap an interaction zone.
- The initial facing direction is down unless changed in configuration.

---

## 10. Interaction System

### 10.1 Interaction model

Interactive objects use invisible activation zones.

Default version 1 behavior:

1. The player enters an object's activation zone.
2. The object's sentence appears automatically in the bottom dialogue panel.
3. Player movement pauses.
4. The visitor closes the dialogue.
5. The same dialogue does not immediately reopen while the player remains inside the zone.
6. Leaving and re-entering the zone allows the dialogue to appear again.

An implementation setting must allow interaction to be changed from automatic proximity to “press E/Enter” without rewriting the system.

### 10.2 Object selection priority

If activation zones overlap:

1. prefer an object in the direction the player is facing;
2. then prefer the nearest object;
3. then use the object's configured priority value.

Only one dialogue can be open at a time.

### 10.3 Interactive object data

Each interactive item must support:

- unique ID;
- content key;
- dialogue text;
- position;
- activation-zone size;
- activation mode;
- priority;
- optional required facing direction;
- optional sound effect;
- enabled/disabled state.

### 10.4 Required interactive objects

| ID                | Object           | Initial dialogue content |
| ----------------- | ---------------- | ------------------------ |
| `work_computer`   | Laptop/computer  | `{{LAPTOP_SENTENCE}}`    |
| `bed`             | Bed              | `{{BED_SENTENCE}}`       |
| `television`      | Television       | `{{TV_SENTENCE}}`        |
| `couch`           | Couch            | `{{COUCH_SENTENCE}}`     |
| `refrigerator`    | Refrigerator     | `{{FRIDGE_SENTENCE}}`    |
| `water_dispenser` | Water dispenser  | `{{WATER_SENTENCE}}`     |
| `stove`           | Stove            | `{{STOVE_SENTENCE}}`     |
| `sink`            | Kitchen sink     | `{{SINK_SENTENCE}}`      |
| `microwave`       | Microwave        | `{{MICROWAVE_SENTENCE}}` |
| `weights`         | Dumbbells        | `{{WEIGHTS_SENTENCE}}`   |
| `pet_cat`         | Cat              | `{{CAT_SENTENCE}}`       |
| `wall_art`        | Framed wall item | `{{WALL_ART_SENTENCE}}`  |

Additional decorative objects may be made interactive through configuration.

---

## 11. Pet Character

### 11.1 Pet identity

- Type: cat.
- Display name: `{{PET_NAME}}`.
- The name appears above the cat in a pixel-style label.

### 11.2 Version 1 behavior

Minimum:

- idle animation;
- occasional subtle animation such as tail movement, blink, sit, or look direction;
- one interaction sentence.

Optional if time permits:

- short wandering path inside a safe pet area;
- random idle timing;
- the cat turns toward the player at close range.

The pet must not block the player in a narrow path.

---

## 12. Dialogue Interface

### 12.1 Visual requirements

The dialogue panel must closely match the supplied reference:

- dark navy/black rectangular panel;
- thin light outer border;
- subtle inner border or shadow;
- white pixel font;
- large readable sentence area;
- **Close** button in the lower-right corner;
- crisp square corners or very small pixel-radius corners;
- slight transparency is allowed only if text remains highly readable.

### 12.2 Position and sizing

- Anchored near the bottom of the viewport.
- Centered horizontally.
- Maximum width should preserve margins on desktop.
- Must not cover the entire player and object area.
- On mobile, it may use most of the viewport width.
- Text wraps naturally and never overflows.
- The Close button remains visible regardless of text length.

### 12.3 Behavior

- Dialogue opens with a short, subtle appearance transition.
- Text appears immediately; typewriter animation is optional and disabled by default.
- Movement pauses while the panel is open.
- Clicking/tapping **Close**, pressing Escape, Enter, or Space closes it.
- Input used to close a dialogue must not immediately trigger another action.
- The most recently focused control should be restored when appropriate.

### 12.4 Content constraints

- Recommended sentence length: 20–140 characters.
- Maximum supported text: 300 characters.
- Version 1 displays plain text only.
- Dialogue content must be stored separately from game logic.

---

## 13. Art Direction

### 13.1 Style definition

**Modern cozy 16-bit pixel-art life simulator with a top-down RPG perspective.**

### 13.2 Required visual traits

- top-down three-quarter perspective;
- deliberately placed hard-edged pixels;
- no anti-aliased sprite edges;
- strong shape readability;
- warm orange wood;
- teal rugs and bedding;
- deep navy and purple shadows;
- saturated accent colors;
- compact chibi characters;
- cozy, slightly cluttered interior;
- visible furniture fronts and sides;
- consistent light direction;
- clear visual separation between walkable floor and solid objects.

### 13.3 Recommended palette families

| Role                   | Color family                                 |
| ---------------------- | -------------------------------------------- |
| Floor and cabinets     | Warm amber, orange, terracotta, medium brown |
| Rugs and bedding       | Teal, cyan-blue, orange trim                 |
| Background and shadows | Deep purple, navy, muted plum                |
| UI panel               | Near-black navy with pale gray/white borders |
| Highlights             | Cream, pale blue, warm yellow                |

Final colors must be defined in the approved art palette before asset production.

### 13.4 Pixel-art rendering rules

- Use nearest-neighbor scaling.
- Disable browser image smoothing for game assets.
- Place sprites on whole logical pixels.
- Avoid fractional camera positions.
- Avoid CSS transforms that blur the game canvas.
- Use integer scaling when viewport dimensions allow.
- Use letterboxing rather than stretching the art.

### 13.5 Asset originality

- All room art, character sprites, pet sprites, UI graphics, text, and audio must be created or licensed for this project.
- Do not copy, trace, download, or redistribute the reference site's assets.
- The approved result should reproduce the reference's overall experience while remaining a personal, original home and character.

---

## 14. Responsive Design

### 14.1 Reference render size

Recommended logical game resolution:

- `640 × 360` pixels;
- 16:9 composition;
- authored on a 16-pixel or 32-pixel tile grid;
- scaled to the viewport using nearest-neighbor rendering.

The final logical resolution may be adjusted after the room mockup is approved, but it must remain fixed during gameplay.

### 14.2 Desktop

- Target viewport: 1280×720 and larger.
- Minimum supported viewport: 1024×576.
- Game remains centered with dark-purple letterboxing when necessary.
- No page scrolling while the game is active.

### 14.3 Tablet

- Full room remains visible.
- Dialogue text and touch targets remain readable.
- Touch controls appear only on touch-capable devices or when enabled.

### 14.4 Mobile

- Landscape orientation is the primary mobile mode.
- Portrait mode shows a friendly rotate-device message or a deliberately scaled layout.
- A translucent virtual D-pad appears in the lower-left.
- Interact/close control appears in the lower-right.
- Touch controls must not cover key interactive objects or dialogue text.
- Minimum touch target size: 44×44 CSS pixels.

---

## 15. Audio

Audio is optional for the first implementation but the system must be ready for it.

Supported audio categories:

- short start-screen ambience;
- room ambience;
- walking sound;
- dialogue open/close sound;
- object-specific interaction sound;
- cat sound.

Rules:

- audio starts only after the visitor selects Play;
- mute state is immediately accessible;
- mute preference persists locally;
- the game remains fully understandable with audio off;
- audio files must be optimized for web delivery.

---

## 16. Content and Localization

### 16.1 Editable content

The following must be stored in data/configuration rather than hard-coded:

- game title;
- subtitle;
- player name;
- pet name;
- all object sentences;
- control labels;
- menu labels;
- interaction settings;
- audio volume defaults.

### 16.2 Language support

Default assumption for version 1:

- English is the launch language.
- The content system is prepared for a second language.
- A language switch is shown only when a complete second-language content file exists.

Text direction must support both left-to-right and right-to-left languages if Persian or Arabic is added.

### 16.3 Placeholder policy

The build must fail a content validation check if launch content still contains `{{PLACEHOLDER}}` values.

---

## 17. Technical Requirements

### 17.1 Recommended stack

- TypeScript;
- Phaser 3;
- Vite;
- HTML5 Canvas;
- CSS for the website shell and accessible overlays;
- static JSON or TypeScript configuration for dialogue and room data;
- optional Tiled map JSON for tile and object layers.

Equivalent technologies may be proposed before implementation if they meet all acceptance criteria.

### 17.2 Rendering

- Use renderer auto-detection.
- Prefer WebGL when available.
- Automatically fall back to Canvas when WebGL is unavailable or initialization fails.
- A rendering failure must produce a visible recovery message, not a blank screen.
- Pixel-art smoothing must be disabled in both rendering modes.

### 17.3 Game states

Required state flow:

1. `Boot`
2. `Preload`
3. `Title`
4. `Playing`
5. `DialogueOpen`
6. `Paused`
7. `Error`

Only one top-level game state may own movement input at a time.

### 17.4 Suggested content model

```json
{
  "gameTitle": "Our Little House",
  "subtitle": "{{SUBTITLE_TO_BE_PROVIDED}}",
  "playerName": "{{PLAYER_NAME}}",
  "petName": "{{PET_NAME}}",
  "interactions": {
    "work_computer": {
      "text": "{{LAPTOP_SENTENCE}}",
      "mode": "proximity",
      "priority": 10
    }
  }
}
```

This example defines the expected separation of content from game logic; exact file structure is an implementation decision.

### 17.5 Asset organization

Assets should be grouped by purpose:

- environment tiles and furniture;
- player sprite sheets;
- pet sprite sheets;
- UI elements;
- fonts;
- audio;
- map data;
- localization data.

### 17.6 Persistence

Use browser local storage only for:

- mute preference;
- selected language;
- whether the introductory control hint has been seen.

No personal data, analytics identifier, or gameplay profile is required for version 1.

### 17.7 Hosting

- The production build must be deployable to static hosting.
- Direct navigation to `/game` must work.
- Static asset URLs must work from production paths.
- HTTPS is required.
- No server-side runtime is required for the game.

---

## 18. Performance Requirements

- Target 60 FPS on a typical desktop browser.
- Maintain at least 30 FPS on supported mid-range mobile devices.
- Essential gameplay should become interactive within 3 seconds on a typical broadband connection after assets are cached or reasonably optimized.
- Essential initial download should remain below 8 MB where practical.
- Use sprite atlases where they reduce requests without harming maintainability.
- Load nonessential audio after visual gameplay assets.
- Pause or reduce the game loop when the tab is hidden.
- No continuous console errors or warnings in production.
- No memory growth during a 15-minute play session.

---

## 19. Accessibility and Usability

- All essential actions are available by keyboard.
- The start screen uses semantic HTML controls.
- Focus indicators are visible.
- The dialogue panel is mirrored in an accessible HTML layer or otherwise announced to assistive technology.
- Dialogue text meets strong foreground/background contrast.
- Important meaning is not communicated by color alone.
- The visitor can mute audio at any time.
- The game respects reduced-motion preferences for nonessential UI transitions.
- Control instructions are available from the pause/menu UI.
- Browser zoom must not make the start screen unusable.
- Gameplay remains understandable without sound.

---

## 20. Error Handling

The website must show a readable message and recovery action for:

- failed essential asset download;
- unsupported browser features;
- WebGL initialization failure when Canvas fallback also fails;
- corrupted or missing content configuration;
- missing required sprite or map data.

Every recoverable error should provide:

- a short explanation;
- a **Retry** action;
- a **Return to Start** action when possible.

---

## 21. Privacy, Security, and Analytics

- No login is required.
- No sensitive user information is collected.
- No browser permission prompts are required.
- No camera, microphone, location, notification, or clipboard access.
- No third-party analytics in version 1 unless separately approved.
- If analytics is later added, it must be privacy-conscious and documented.
- All dependencies must be reviewed for known critical vulnerabilities before release.
- User-visible text must be treated as static content, not executable markup.

---

## 22. Testing Requirements

### 22.1 Functional testing

Verify:

- start screen and Play action;
- player spawn and facing direction;
- all movement keys;
- diagonal speed normalization if diagonal movement is enabled;
- collision around every solid object;
- no unreachable interactive object;
- all proximity triggers;
- overlapping interaction priority;
- dialogue open, wrap, and close behavior;
- repeat interaction only after leaving and re-entering a zone;
- pause behavior;
- mute preference;
- language preference if localization is enabled;
- return to start;
- retry after simulated asset failure.

### 22.2 Visual testing

Verify:

- nearest-neighbor rendering;
- no blurred sprites;
- correct sprite depth around tall furniture;
- labels remain readable;
- dialogue matches the approved visual reference;
- no art seams between tiles;
- no stretched pixels;
- all required room elements are present;
- mobile controls do not cover essential content.

### 22.3 Browser matrix

Test current stable versions of:

- Chrome;
- Edge;
- Firefox;
- Safari on macOS;
- Safari on iOS;
- Chrome on Android.

Test at least one environment where WebGL is unavailable to confirm Canvas fallback.

### 22.4 Viewport matrix

Minimum validation sizes:

- 1920×1080;
- 1366×768;
- 1280×720;
- 1024×576;
- 844×390 mobile landscape;
- 390×844 mobile portrait handling.

---

## 23. Definition of Done

Version 1 is complete only when:

- the approved original room artwork is implemented;
- the approved player character resembles the supplied creator reference;
- every required object exists and has approved dialogue;
- all movement and collision acceptance tests pass;
- the dialogue interface matches the approved mockup;
- desktop keyboard and mobile touch controls work;
- the game works with WebGL and Canvas fallback;
- supported viewports show no cropped essential content;
- all placeholders have been replaced;
- title, subtitle, names, and dialogue can be edited from content configuration;
- a production build passes automated checks;
- the production URL loads successfully over HTTPS;
- there are no critical accessibility, performance, or console-error blockers.

---

## 24. Acceptance Scenarios

### Scenario A — Start the game

**Given** a visitor opens the website  
**When** they select Play Game  
**Then** the essential assets load and the room appears  
**And** the player is visible at the approved spawn point  
**And** movement controls are available.

### Scenario B — Walk around the home

**Given** gameplay is active  
**When** the visitor uses WASD or arrow keys  
**Then** the character moves in the intended direction  
**And** the correct walk animation plays  
**And** the character cannot pass through solid furniture or walls.

### Scenario C — Discover the laptop sentence

**Given** the laptop interaction is enabled  
**When** the player enters its activation zone  
**Then** movement pauses  
**And** the laptop sentence appears in the bottom dialogue panel  
**And** the Close button is visible.

### Scenario D — Close and continue

**Given** a dialogue is open  
**When** the visitor presses Escape, Enter, Space, or selects Close  
**Then** the dialogue closes  
**And** movement becomes available  
**And** the same dialogue does not reopen until the player exits and re-enters its zone.

### Scenario E — Multiple nearby objects

**Given** two activation zones overlap  
**When** the player enters the overlap  
**Then** only one dialogue opens  
**And** the facing, distance, and priority rules select the correct object.

### Scenario F — WebGL is unavailable

**Given** the browser cannot initialize WebGL  
**When** the game starts  
**Then** it automatically uses Canvas rendering  
**And** the room remains playable  
**And** the visitor does not see a blank screen.

### Scenario G — Mobile play

**Given** the website is opened on a supported touch device in landscape  
**When** the visitor starts the game  
**Then** touch movement and action controls appear  
**And** the full room, dialogue, and essential controls remain usable.

---

## 25. Inputs Required Before Implementation

The following decisions or assets are still required:

1. Final subtitle.
2. Player display name.
3. Pet name.
4. Clear appearance references for the player sprite.
5. Preferred outfit for the player.
6. Approved dialogue sentence for each interactive object.
7. Confirmation that the home should use the reference layout or a layout based on the creator's real home.
8. Launch language or languages.
9. Whether background music and sound effects are wanted.
10. Whether proximity should open dialogue automatically or show a “Press E” prompt first.
11. Whether the website needs only the game or also separate portfolio sections.

---

## 26. Recommended Implementation Milestones

### Milestone 1 — Content and layout approval

- finalize subtitle;
- approve room floor plan;
- approve object list;
- approve interaction sentences;
- approve player and pet references.

### Milestone 2 — Playable gray-box

- implement room bounds;
- implement movement and collision;
- implement interaction zones;
- implement temporary dialogue UI;
- validate the complete user flow with placeholder art.

### Milestone 3 — Pixel-art production

- create environment tiles and furniture;
- create player sprite sheet;
- create pet sprite sheet;
- create dialogue and menu UI;
- integrate approved palette.

### Milestone 4 — Responsive website

- implement title/start screen;
- implement scaling and letterboxing;
- add mobile controls;
- add accessible HTML overlays;
- add Canvas fallback and error states.

### Milestone 5 — Content, QA, and release

- insert final dialogue;
- add optional audio;
- run browser and viewport tests;
- fix visual and collision issues;
- optimize assets;
- deploy the production build.
