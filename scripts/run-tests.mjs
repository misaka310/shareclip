import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/lib/tsc.js');

for (const command of [
  ['node', [tsc, '-p', 'tsconfig.tests.json']],
  [
    'node',
    [
      '--test',
      '--experimental-test-coverage',
      '--test-coverage-lines=50',
      '.test-dist/tests/run.js',
      '.test-dist/tests/hardening.js'
    ]
  ],
  [
    'node',
    [
      '--test',
      '--experimental-test-coverage',
      '--test-coverage-include=**/atomicJsonFile.js',
      '--test-coverage-include=**/uploadInput.js',
      '--test-coverage-lines=90',
      '.test-dist/tests/hardening.js'
    ]
  ]
]) {
  const [bin, args] = command;
  const result = spawnSync(bin, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
