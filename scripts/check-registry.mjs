import { readFile } from 'node:fs/promises';

const routerSource = await readFile(new URL('../src/app/router.ts', import.meta.url), 'utf8');
const instructions = await readFile(new URL('../CLAUDE.md', import.meta.url), 'utf8');

const routeType = routerSource.match(/export type AppRoute\s*=\s*([^;]+);/s)?.[1];
if (!routeType) throw new Error('Could not find the AppRoute declaration in src/app/router.ts.');

const actualRoutes = [...routeType.matchAll(/['"](\/[^'"]*)['"]/g)].map((match) => match[1]).sort();
const registeredRoutes = [...instructions.matchAll(/^\| `([^`]+)`\s*\|\s*GET\s*\|/gm)]
  .map((match) => match[1])
  .sort();

if (actualRoutes.length === 0) throw new Error('The AppRoute declaration contains no routes.');

const actual = JSON.stringify(actualRoutes);
const registered = JSON.stringify(registeredRoutes);
if (actual !== registered) {
  throw new Error(
    `Route registry mismatch. Router: ${actualRoutes.join(', ')}; CLAUDE.md: ${registeredRoutes.join(', ')}`,
  );
}

console.log(
  `Route registry matches ${actualRoutes.length} application route(s): ${actualRoutes.join(', ')}`,
);
