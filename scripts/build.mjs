import { spawnSync } from 'node:child_process';
import path from 'node:path';

const vite = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'lib', 'tsc.js');

for (const [label, args] of [
  ['renderer', [vite, 'build']],
  ['electron', [tsc, '-p', 'tsconfig.electron.json']]
]) {
  console.log('build ' + label);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
