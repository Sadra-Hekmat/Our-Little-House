import Phaser from 'phaser';

import type { GamePauseReason, RendererName } from '@contracts/game-events';
import { GAME_COMMAND_EVENT, type GameCommand } from '@contracts/game-events';
import { createPlaceholderPlayer, playerFeetY } from '@game/entities/placeholder-player';
import { KeyboardInputController } from '@game/systems/input-controller';
import type { InputAction } from '@game/systems/input-state';
import { resolveMovement } from '@game/systems/movement';
import {
  PHASE1_ACCEPTANCE_TRACE,
  type MovementTraceResult,
  type MovementTraceSegment,
  type PlayerBodyBounds,
} from '@game/systems/movement-trace';
import type { StateController } from '@game/state/state-controller';
import { depthForAnchor, depthForBand, depthForEntity, isEntityBehindAnchor } from '@map/depth';
import { type Facing, type GrayboxZoneId } from '@map/graybox-contract';
import type { GrayboxMap } from '@map/tiled-map-adapter';

interface HomeSceneCallbacks {
  onFirstFrame: (renderer: RendererName) => void;
  onPauseChange: (paused: boolean, reason: GamePauseReason) => void;
}

interface Phase1Snapshot {
  renderer: RendererName;
  state: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: Facing;
  animation: string | null;
  pressedActions: InputAction[];
  playerDepth: number;
  tallCabinetDepth: number;
  behindTallCabinet: boolean;
  averageFps: number;
  p95FrameMs: number;
  sampleFrames: number;
  sampleDurationMs: number;
  collisionCount: number;
  body: PlayerBodySnapshot;
}

interface PlayerBodySnapshot extends PlayerBodyBounds {
  blocked: { up: boolean; down: boolean; left: boolean; right: boolean };
}

interface RuntimeTraceSample {
  position: { x: number; y: number };
  facing: Facing;
  body: PlayerBodySnapshot;
}

interface RuntimeTraceResult extends MovementTraceResult {
  body: PlayerBodySnapshot;
  segmentEnds: RuntimeTraceSample[];
}

interface Phase1DevelopmentApi {
  snapshot: () => Phase1Snapshot;
  teleport: (x: number, y: number) => Phase1Snapshot;
  collisions: () => GrayboxMap['collisions'];
  resetPerformanceSample: () => void;
  captureAcceptanceEvidence: () => {
    renderer: RendererName;
    viewport: { width: number; height: number };
    performance: Pick<
      Phase1Snapshot,
      'averageFps' | 'p95FrameMs' | 'sampleFrames' | 'sampleDurationMs'
    >;
    traceDefinition: readonly MovementTraceSegment[];
    trace: RuntimeTraceResult;
  };
  runTrace: (
    segments: MovementTraceSegment[],
    start?: { x: number; y: number; facing: Facing },
  ) => RuntimeTraceResult;
}

declare global {
  interface Window {
    __OLH_PHASE1__?: Phase1DevelopmentApi;
  }
}

const rendererName = (game: Phaser.Game): RendererName =>
  game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas';

const zoneColors: Readonly<Record<GrayboxZoneId, number>> = {
  living: 0x71435f,
  kitchen: 0x73543d,
  sleeping: 0x4e4b77,
  work: 0x315e69,
  exercise: 0x785044,
  pet: 0x496349,
  open_walkway: 0x8a7247,
};

const furnitureColor = (name: string): number => {
  if (name.includes('bed')) return 0x65517a;
  if (name.includes('couch')) return 0x8d5067;
  if (name.includes('desk')) return 0x426d73;
  if (name.includes('cabinet') || name.includes('counter')) return 0x8d623e;
  if (name.includes('refrigerator') || name.includes('water')) return 0x71838a;
  if (name.includes('weights')) return 0x57505c;
  return 0x7d5842;
};

export class HomeScene extends Phaser.Scene {
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private inputController: KeyboardInputController | null = null;
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
  private lastFacing: Facing;
  private readonly frameDeltas: number[] = [];
  private previousFrameTimestamp: number | null = null;
  private cleanedUp = false;

  public constructor(
    private readonly stateController: StateController,
    private readonly map: GrayboxMap,
    private readonly callbacks: HomeSceneCallbacks,
    private readonly collisionDebug: boolean,
  ) {
    super({ key: 'Home' });
    this.lastFacing = map.spawn.facing;
  }

  public create(): void {
    this.cleanedUp = false;
    this.resetPerformanceSample();
    if (!this.stateController.acceptsMovement) this.stateController.transition('Playing');

    this.cameras.main.setBackgroundColor('#180f22');
    this.drawGrayboxRoom();
    this.player = createPlaceholderPlayer(this, this.map.spawn);
    this.player.setDepth(depthForEntity(playerFeetY(this.map.spawn.y)));
    this.installCollisionBodies();
    this.installInput();
    this.game.events.on(GAME_COMMAND_EVENT, this.handleCommand);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown);
    this.installDevelopmentApi();

    this.time.delayedCall(34, () => this.callbacks.onFirstFrame(rendererName(this.game)));
  }

  public override update(): void {
    const frameTimestamp = performance.now();
    if (this.previousFrameTimestamp !== null) {
      const rawFrameDelta = frameTimestamp - this.previousFrameTimestamp;
      if (rawFrameDelta > 0 && rawFrameDelta < 1_000) {
        this.frameDeltas.push(rawFrameDelta);
        if (this.frameDeltas.length > 1_800) this.frameDeltas.shift();
      }
    }
    this.previousFrameTimestamp = frameTimestamp;

    if (!this.player || !this.inputController) return;
    if (!this.stateController.acceptsMovement) {
      this.player.setVelocity(0, 0);
      this.player.play(`player.idle.${this.lastFacing}`, true);
      return;
    }

    const movement = resolveMovement(this.inputController.state.directions, this.lastFacing);
    this.lastFacing = movement.facing;
    this.player.setVelocity(movement.x, movement.y);
    this.player.play(movement.animation, true);
    this.player.setDepth(depthForEntity(playerFeetY(this.player.y)));
  }

  private drawGrayboxRoom(): void {
    const floor = this.map.floor;
    this.add
      .rectangle(
        floor.x + floor.width / 2,
        floor.y + floor.height / 2,
        floor.width,
        floor.height,
        0xb77b4e,
      )
      .setDepth(depthForBand('floor'));

    for (const zone of this.map.zones) {
      this.add
        .rectangle(
          zone.x + zone.width / 2,
          zone.y + zone.height / 2,
          zone.width,
          zone.height,
          zoneColors[zone.zoneId],
          0.22,
        )
        .setStrokeStyle(1, zoneColors[zone.zoneId], 0.8)
        .setDepth(depthForBand('floor') + 1);
      this.add
        .text(zone.x + 6, zone.y + 5, zone.zoneId.replace('_', ' ').toUpperCase(), {
          color: '#f6e4be',
          fontFamily: 'monospace',
          fontSize: '8px',
        })
        .setDepth(depthForBand('lowerFurniture') - 1);
    }

    for (const anchor of this.map.depthAnchors) {
      const anchorDepth =
        anchor.band === 'entities' ? depthForAnchor(anchor.anchorY) : depthForBand(anchor.band);
      const visual = this.add
        .rectangle(
          anchor.x + anchor.width / 2,
          anchor.y + anchor.height / 2,
          anchor.width,
          anchor.height,
          furnitureColor(anchor.name),
        )
        .setStrokeStyle(anchor.name === 'cabinet_tall' ? 3 : 2, 0x25182d, 1)
        .setDepth(anchorDepth);
      visual.setData('depth-anchor', anchor.anchorY);

      if (anchor.width >= 48 && anchor.height >= 32) {
        this.add
          .text(anchor.x + 4, anchor.y + 4, anchor.name.replaceAll('_', ' '), {
            color: '#fff0c7',
            fontFamily: 'monospace',
            fontSize: '7px',
            wordWrap: { width: Math.max(24, anchor.width - 8) },
          })
          .setDepth(anchorDepth + 1);
      }
    }

    if (this.collisionDebug) {
      for (const interaction of this.map.interactions) {
        this.add
          .rectangle(
            interaction.x + interaction.width / 2,
            interaction.y + interaction.height / 2,
            interaction.width,
            interaction.height,
            0x6ee7d2,
            0.12,
          )
          .setStrokeStyle(1, 0x6ee7d2, 0.9)
          .setDepth(depthForBand('upperFurniture'));
      }
    }
  }

  private installCollisionBodies(): void {
    if (!this.player) return;
    const anchoredNames = new Set(
      this.map.depthAnchors.map((anchor) => anchor.collisionId).filter((name) => name !== null),
    );

    for (const collision of this.map.collisions) {
      const visible = collision.kind === 'wall' || !anchoredNames.has(collision.name);
      const bodyObject = this.add
        .rectangle(
          collision.x + collision.width / 2,
          collision.y + collision.height / 2,
          collision.width,
          collision.height,
          collision.kind === 'wall' ? 0x35223f : furnitureColor(collision.name),
          visible ? 1 : this.collisionDebug ? 0.18 : 0.001,
        )
        .setDepth(depthForBand('lowerFurniture') + Math.round(collision.y));
      if (this.collisionDebug) bodyObject.setStrokeStyle(1, 0xffdd72, 0.95);
      this.physics.add.existing(bodyObject, true);
      this.colliders.push(this.physics.add.collider(this.player, bodyObject));
    }
  }

  private installInput(): void {
    const parent = this.game.canvas.parentElement;
    if (!(parent instanceof HTMLElement)) throw new Error('The game input surface is missing.');

    this.inputController = new KeyboardInputController({
      target: parent,
      onEdgeAction: (action) => {
        if (action === 'pause') this.pause('manual');
      },
      onLifecycleLoss: (reason) => this.pause(reason),
    });
  }

  private pause(reason: GamePauseReason): void {
    if (this.stateController.state !== 'Playing') return;
    this.stateController.transition('Paused');
    this.inputController?.clear();
    this.player?.setVelocity(0, 0);
    this.physics.pause();
    this.callbacks.onPauseChange(true, reason);
  }

  private resume(reason: GamePauseReason = 'manual'): void {
    if (this.stateController.state !== 'Paused') return;
    this.inputController?.clear();
    this.physics.resume();
    this.stateController.transition('Playing');
    this.callbacks.onPauseChange(false, reason);
  }

  private restart(): void {
    if (!this.player) return;
    this.inputController?.clear();
    this.physics.resume();
    if (this.stateController.state === 'Paused') this.stateController.transition('Playing');
    this.positionPlayer(this.map.spawn);
    this.callbacks.onPauseChange(false, 'manual');
  }

  private readonly handleCommand = (command: GameCommand): void => {
    if (command.type === 'pause') this.pause('manual');
    if (command.type === 'resume') this.resume();
    if (command.type === 'restart') this.restart();
  };

  private snapshot(): Phase1Snapshot {
    if (!this.player) throw new Error('The player is not ready.');
    const tallCabinet = this.map.depthAnchors.find((anchor) => anchor.name === 'cabinet_tall');
    if (!tallCabinet) throw new Error('The tall-cabinet depth fixture is missing.');
    const feetY = playerFeetY(this.player.y);
    const body = this.player.body;
    const performanceSample = this.performanceSample();

    return {
      renderer: rendererName(this.game),
      state: this.stateController.state,
      position: {
        x: Number(this.player.x.toFixed(3)),
        y: Number(this.player.y.toFixed(3)),
      },
      velocity: {
        x: Number((body?.velocity.x ?? 0).toFixed(3)),
        y: Number((body?.velocity.y ?? 0).toFixed(3)),
      },
      facing: this.lastFacing,
      animation: this.player.anims.currentAnim?.key ?? null,
      pressedActions: this.inputController?.state.pressedActions ?? [],
      playerDepth: depthForEntity(feetY),
      tallCabinetDepth: depthForAnchor(tallCabinet.anchorY),
      behindTallCabinet: isEntityBehindAnchor(feetY, tallCabinet.anchorY),
      ...performanceSample,
      collisionCount: this.map.collisions.length,
      body: this.bodySnapshot(),
    };
  }

  private bodySnapshot(): PlayerBodySnapshot {
    const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) throw new Error('The player body is not ready.');
    return {
      left: Number(body.left.toFixed(3)),
      right: Number(body.right.toFixed(3)),
      top: Number(body.top.toFixed(3)),
      bottom: Number(body.bottom.toFixed(3)),
      centerX: Number(body.center.x.toFixed(3)),
      centerY: Number(body.center.y.toFixed(3)),
      blocked: {
        up: body.blocked.up,
        down: body.blocked.down,
        left: body.blocked.left,
        right: body.blocked.right,
      },
    };
  }

  private performanceSample(): Pick<
    Phase1Snapshot,
    'averageFps' | 'p95FrameMs' | 'sampleFrames' | 'sampleDurationMs'
  > {
    if (this.frameDeltas.length === 0) {
      return { averageFps: 0, p95FrameMs: 0, sampleFrames: 0, sampleDurationMs: 0 };
    }
    const duration = this.frameDeltas.reduce((total, value) => total + value, 0);
    const ordered = [...this.frameDeltas].sort((left, right) => left - right);
    const p95Index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1);
    return {
      averageFps: Number(((this.frameDeltas.length * 1_000) / duration).toFixed(1)),
      p95FrameMs: Number((ordered[p95Index] ?? 0).toFixed(2)),
      sampleFrames: this.frameDeltas.length,
      sampleDurationMs: Number(duration.toFixed(1)),
    };
  }

  private resetPerformanceSample(): void {
    this.frameDeltas.length = 0;
    this.previousFrameTimestamp = null;
  }

  private positionPlayer(start: { x: number; y: number; facing: Facing }): void {
    if (!this.player) throw new Error('The player is not ready.');
    this.lastFacing = start.facing;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(start.x, start.y);
    body.updateFromGameObject();
    this.player.setVelocity(0, 0);
    this.player.play(`player.idle.${this.lastFacing}`, true);
    this.player.setDepth(depthForEntity(playerFeetY(this.player.y)));
  }

  private runRuntimeTrace(
    segments: MovementTraceSegment[],
    start: { x: number; y: number; facing: Facing } = this.map.spawn,
  ): RuntimeTraceResult {
    if (!this.player || !this.stateController.acceptsMovement) {
      throw new Error('Runtime traces require a ready, playing scene.');
    }
    if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) {
      throw new Error('Runtime trace start coordinates must be finite.');
    }
    for (const segment of segments) {
      if (!Number.isInteger(segment.frames) || segment.frames < 0 || segment.frames > 3_600) {
        throw new Error('Trace frame counts must be integers between 0 and 3600.');
      }
    }

    const world = this.physics.world;
    const segmentEnds: RuntimeTraceSample[] = [];
    let frames = 0;
    this.inputController?.clear();
    this.physics.disableUpdate();

    try {
      this.positionPlayer(start);
      for (const segment of segments) {
        for (let frame = 0; frame < segment.frames; frame += 1) {
          const movement = resolveMovement(segment.directions, this.lastFacing);
          this.lastFacing = movement.facing;
          this.player.setVelocity(movement.x, movement.y);
          this.player.play(movement.animation, true);
          world.singleStep();
          this.player.setDepth(depthForEntity(playerFeetY(this.player.y)));
          frames += 1;
        }
        segmentEnds.push({
          position: {
            x: Number(this.player.x.toFixed(3)),
            y: Number(this.player.y.toFixed(3)),
          },
          facing: this.lastFacing,
          body: this.bodySnapshot(),
        });
      }
      this.player.setVelocity(0, 0);
      this.player.play(`player.idle.${this.lastFacing}`, true);
      return {
        x: Number(this.player.x.toFixed(3)),
        y: Number(this.player.y.toFixed(3)),
        facing: this.lastFacing,
        frames,
        body: this.bodySnapshot(),
        segmentEnds,
      };
    } finally {
      this.player.setVelocity(0, 0);
      this.physics.enableUpdate();
    }
  }

  private installDevelopmentApi(): void {
    if (!import.meta.env.DEV) return;
    window.__OLH_PHASE1__ = {
      snapshot: () => this.snapshot(),
      teleport: (x, y) => {
        if (!this.player || !Number.isFinite(x) || !Number.isFinite(y)) {
          throw new Error('Teleport requires a ready player and finite coordinates.');
        }
        this.positionPlayer({
          x: Phaser.Math.Clamp(x, 0, this.map.width),
          y: Phaser.Math.Clamp(y, 0, this.map.height),
          facing: this.lastFacing,
        });
        return this.snapshot();
      },
      collisions: () => this.map.collisions,
      resetPerformanceSample: () => this.resetPerformanceSample(),
      captureAcceptanceEvidence: () => {
        const performanceSample = this.performanceSample();
        const trace = this.runRuntimeTrace([...PHASE1_ACCEPTANCE_TRACE]);
        return {
          renderer: rendererName(this.game),
          viewport: { width: window.innerWidth, height: window.innerHeight },
          performance: performanceSample,
          traceDefinition: PHASE1_ACCEPTANCE_TRACE,
          trace,
        };
      },
      runTrace: (segments, start) => this.runRuntimeTrace(segments, start),
    };
  }

  private readonly shutdown = (): void => {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    this.game.events.off(GAME_COMMAND_EVENT, this.handleCommand);
    this.inputController?.destroy();
    this.inputController = null;
    for (const collider of this.colliders) collider.destroy();
    this.colliders.length = 0;
    if (import.meta.env.DEV) delete window.__OLH_PHASE1__;
  };
}
