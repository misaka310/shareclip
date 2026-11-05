import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/lib/tsc.js');
const compiledTestDir = '.test-dist/tests';

function run(args) {
  const result = spawnSync('node', args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([tsc, '-p', 'tsconfig.tests.json']);

// Every tests/*.test.ts file runs, so a newly added test file cannot be
// compiled and then silently skipped.
const compiledTestFiles = readdirSync(compiledTestDir)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => `${compiledTestDir}/${name}`);

run([
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-lines=50',
  `${compiledTestDir}/run.js`,
  `${compiledTestDir}/hardening.js`,
  ...compiledTestFiles
]);

run([
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-include=**/atomicJsonFile.js',
  '--test-coverage-include=**/uploadInput.js',
  '--test-coverage-lines=90',
  `${compiledTestDir}/hardening.js`
]);
