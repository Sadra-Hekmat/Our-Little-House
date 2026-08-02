import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='));
const mode = modeArgument?.split('=')[1] ?? 'development';
if (mode !== 'development' && mode !== 'production') {
  throw new Error('Content mode must be development or production.');
}

const localeDirectory = path.resolve('src/content/locales');
const localeFiles = (await readdir(localeDirectory)).filter((file) => file.endsWith('.json'));
if (localeFiles.length === 0) throw new Error('At least one locale file is required.');

const requiredKeys = ['gameTitle', 'subtitle', 'loading', 'rendererError'];
const allowedKeys = new Set(requiredKeys);
let placeholderCount = 0;

for (const fileName of localeFiles) {
  const fullPath = path.join(localeDirectory, fileName);
  const data = JSON.parse(await readFile(fullPath, 'utf8'));
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    throw new Error(`${fileName} must contain one object.`);
  }

  for (const key of requiredKeys) {
    if (typeof data[key] !== 'string' || data[key].trim().length === 0) {
      throw new Error(`${fileName} is missing non-empty string key ${key}.`);
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!allowedKeys.has(key)) throw new Error(`${fileName} has unknown key ${key}.`);
    if (typeof value !== 'string') throw new Error(`${fileName}.${key} must be a string.`);
    if (value.length > 300) throw new Error(`${fileName}.${key} exceeds 300 characters.`);
    if (/<\/?[a-z][^>]*>/i.test(value)) throw new Error(`${fileName}.${key} contains HTML markup.`);
    if (/\{\{[A-Z0-9_]+\}\}/.test(value)) placeholderCount += 1;
  }
}

if (mode === 'production' && placeholderCount > 0) {
  throw new Error(`Production content contains ${placeholderCount} unresolved placeholder(s).`);
}

console.log(
  `Validated ${localeFiles.length} locale file(s) in ${mode} mode (${placeholderCount} placeholder(s)).`,
);
