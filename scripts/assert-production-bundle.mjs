import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const forbiddenTokens = ['failRenderer', '__OLH_DEV__', 'Renderer: WebGL', 'Renderer: Canvas'];

const files = [];
const visit = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(fullPath);
    else if (/\.(?:html|js|css)$/.test(entry.name)) files.push(fullPath);
  }
};

await visit(dist);
if (files.length === 0)
  throw new Error('No production bundle files were found. Run npm run build first.');

for (const file of files) {
  const contents = await readFile(file, 'utf8');
  for (const token of forbiddenTokens) {
    if (contents.includes(token)) {
      throw new Error(
        `Production bundle ${path.relative(dist, file)} contains forbidden debug token: ${token}`,
      );
    }
  }
}

console.log(`Production bundle assertion passed across ${files.length} text asset(s).`);
