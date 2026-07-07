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
  'Start-ShareClip.bat',
  'Build-ShareClip.bat',
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

const readme = readFileSync('README.md', 'utf8');
for (const expected of ['Start-ShareClip.bat', 'Build-ShareClip.bat', '設定画面', 'JSON 手編集は自動化や開発者向けの任意手順']) {
  if (!readme.includes(expected)) throw new Error(`README must explain ${expected}`);
}

const startBat = readFileSync('Start-ShareClip.bat', 'utf8');
for (const expected of ['npm install', 'npm run dev', 'Node.js']) {
  if (!startBat.includes(expected)) throw new Error(`Start-ShareClip.bat must include ${expected}`);
}

const buildBat = readFileSync('Build-ShareClip.bat', 'utf8');
for (const expected of ['npm install', 'npm run dist', 'ShareClip.exe']) {
  if (!buildBat.includes(expected)) throw new Error(`Build-ShareClip.bat must include ${expected}`);
}

console.log('ShareClip validate checks passed.');
