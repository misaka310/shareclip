import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/lib/tsc.js');

for (const command of [
  ['node', [tsc, '-p', 'tsconfig.tests.json']],
  ['node', ['.test-dist/tests/run.js']]
]) {
  const [bin, args] = command;
  const result = spawnSync(bin, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
