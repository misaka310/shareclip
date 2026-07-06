import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/lib/tsc.js');
const projects = ['tsconfig.json', 'tsconfig.electron.json', 'tsconfig.tests.json'];

for (const project of projects) {
  const result = spawnSync('node', [tsc, '--noEmit', '-p', project], { stdio: 'inherit', shell: false });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
