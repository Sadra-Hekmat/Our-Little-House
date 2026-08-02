import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const host = '127.0.0.1';
const port = 4174;
const baseUrl = `http://${host}:${port}`;
const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
const routes = ['/', '/game', '/game?renderer=webgl', '/game?renderer=canvas'];

const server = spawn(
  process.execPath,
  [viteEntry, 'preview', '--host', host, '--port', String(port), '--strictPort'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let output = '';
server.stdout.on('data', (chunk) => {
  output += chunk;
});
server.stderr.on('data', (chunk) => {
  output += chunk;
});

const deadline = Date.now() + 20_000;
const waitUntilReady = async () => {
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite preview exited before becoming ready.\n${output}`);
    }
    try {
      const response = await fetch(baseUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(1_000),
      });
      await response.text();
      if (response.ok) return;
    } catch {
      // The preview process may still be binding its socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite preview did not become ready within 20 seconds.\n${output}`);
};

try {
  await waitUntilReady();
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.text();
    if (!response.ok || !body.includes('<div id="app"></div>')) {
      throw new Error(`Production preview probe failed for ${route} with HTTP ${response.status}.`);
    }
  }
  console.log(
    `Production preview served the application shell for ${routes.length} direct route probe(s).`,
  );
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
}
