import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const evidenceDirectory = path.resolve('docs/evidence/phase1');
const evidencePath = path.join(evidenceDirectory, 'physical-mobile-canvas.json');
const baselinesPath = path.join(evidenceDirectory, 'renderer-baselines.json');

const fail = (message) => {
  throw new Error(`Phase 1 physical-device evidence is invalid: ${message}`);
};

const readJson = async (file, missingMessage) => {
  let contents;
  try {
    contents = await readFile(file, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fail(missingMessage);
    }
    throw error;
  }
  try {
    return JSON.parse(contents);
  } catch {
    return fail(`${path.basename(file)} must contain valid JSON.`);
  }
};

const evidence = await readJson(
  evidencePath,
  'physical-mobile-canvas.json is missing; capture the documented run on a real phone first.',
);
const baselines = await readJson(baselinesPath, 'renderer-baselines.json is missing.');

if (evidence.schemaVersion !== 1) fail('schemaVersion must be 1.');
if (evidence.environment?.type !== 'physical-device') {
  fail('environment.type must be physical-device.');
}
for (const [name, value] of Object.entries({
  deviceModel: evidence.environment?.deviceModel,
  operatingSystem: evidence.environment?.operatingSystem,
  browser: evidence.environment?.browser,
})) {
  if (typeof value !== 'string' || value.trim().length < 2 || value.includes('REPLACE')) {
    fail(`environment.${name} must identify the real test environment.`);
  }
}
if (evidence.renderer !== 'Canvas') fail('renderer must be Canvas.');
if (evidence.orientation !== 'landscape') fail('orientation must be landscape.');
if (!Number.isFinite(Date.parse(evidence.capturedAt))) fail('capturedAt must be an ISO timestamp.');
if (
  !Number.isInteger(evidence.viewport?.width) ||
  !Number.isInteger(evidence.viewport?.height) ||
  evidence.viewport.width <= evidence.viewport.height
) {
  fail('viewport must contain positive integer landscape dimensions.');
}

const performance = evidence.performance;
if (!Number.isInteger(performance?.sampleFrames) || performance.sampleFrames < 240) {
  fail('performance.sampleFrames must contain at least 240 rendered-frame intervals.');
}
if (!Number.isFinite(performance?.sampleDurationMs) || performance.sampleDurationMs < 10_000) {
  fail('performance.sampleDurationMs must cover at least 10 seconds.');
}
if (!Number.isFinite(performance?.averageFps) || performance.averageFps < 30) {
  fail('performance.averageFps must be at least 30.');
}
if (!Number.isFinite(performance?.p95FrameMs) || performance.p95FrameMs <= 0) {
  fail('performance.p95FrameMs must be recorded.');
}

const referenceTrace = baselines.profiles?.[0]?.finalTrace;
const tolerance = baselines.thresholds?.rendererCoordinateTolerance;
const trace = evidence.finalTrace;
if (!referenceTrace || !Number.isFinite(tolerance)) fail('renderer baseline trace is incomplete.');
if (
  !Number.isFinite(trace?.x) ||
  !Number.isFinite(trace?.y) ||
  Math.abs(trace.x - referenceTrace.x) > tolerance ||
  Math.abs(trace.y - referenceTrace.y) > tolerance ||
  trace.facing !== referenceTrace.facing ||
  trace.frames !== referenceTrace.frames
) {
  fail('finalTrace must match the accepted live runtime trace within the configured tolerance.');
}

const screenshotName = evidence.screenshot?.path;
if (typeof screenshotName !== 'string' || screenshotName.length === 0) {
  fail('screenshot.path is required.');
}
const screenshotPath = path.resolve(evidenceDirectory, screenshotName);
if (!screenshotPath.startsWith(`${evidenceDirectory}${path.sep}`)) {
  fail('screenshot.path must remain inside docs/evidence/phase1.');
}
const screenshot = await readFile(screenshotPath).catch(() =>
  fail(`screenshot ${screenshotName} is missing.`),
);
const screenshotHash = createHash('sha256').update(screenshot).digest('hex');
if (evidence.screenshot?.sha256 !== screenshotHash) {
  fail('screenshot.sha256 does not match the captured file.');
}

console.log(
  `Phase 1 physical Canvas evidence passed for ${evidence.environment.deviceModel}: ${performance.averageFps} average FPS.`,
);
