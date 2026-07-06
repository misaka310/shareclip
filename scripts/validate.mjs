import { existsSync, readFileSync } from 'node:fs';

const required = [
  'package.json',
  'index.html',
  'vite.config.ts',
  'config/shareclip.config.example.json',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles.css',
  'electron/main.ts',
  'electron/preload.ts',
  'electron/services/shareService.ts',
  'shared/config.ts',
  'shared/types.ts',
  'README.md',
  'SECURITY.md',
  'docs/usage.md',
  'docs/configuration.md'
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const gitignore = readFileSync('.gitignore', 'utf8');
for (const pattern of ['config/shareclip.config.local.json', '*.local.json', 'node_modules/', 'dist/']) {
  if (!gitignore.includes(pattern)) throw new Error(`.gitignore must include ${pattern}`);
}

const example = readFileSync('config/shareclip.config.example.json', 'utf8');
for (const forbidden of ['secretAccessKey": "lD', 'accessKeyId": "fc', 'ocid1.']) {
  if (example.includes(forbidden)) throw new Error('Example config appears to contain real credentials.');
}

console.log('ShareClip validate checks passed.');
