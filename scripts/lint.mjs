import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const roots = ['electron', 'shared', 'src', 'tests', 'scripts'];
const extensions = new Set(['.ts', '.tsx', '.mjs']);
const ignored = new Set(['node_modules', '.test-dist', 'dist', 'dist-electron', 'release']);
const failures = [];
let inspectedFiles = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(filePath);
      continue;
    }
    if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;

    inspectedFiles += 1;
    const text = await readFile(filePath, 'utf8');
    if (text.includes('@ts-ignore')) failures.push(`${filePath}: @ts-ignore is forbidden`);
    if (/\beval\s*\(/.test(text)) failures.push(`${filePath}: eval() is forbidden`);
  }
}

for (const root of roots) await visit(root);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Source lint passed for ${inspectedFiles} TypeScript/JavaScript files.`);
