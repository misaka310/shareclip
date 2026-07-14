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
  'tools/Build-ShareClip.bat',
  'scripts/package-win.mjs',
  'README.md',
  'SECURITY.md',
  'docs/usage.md',
  'docs/configuration.md',
  'docs/oracle-setup.md',
  '.github/workflows/ci.yml'
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
for (const expected of [
  'Start-ShareClip.bat',
  '`設定`画面',
  '接続テスト',
  'GitHub Actions',
  'docs/oracle-setup.md',
  'docs/usage.md',
  'docs/configuration.md',
  'SECURITY.md'
]) {
  if (!readme.includes(expected)) throw new Error(`README must link or explain ${expected}`);
}

if (readme.split(/\r?\n/).length > 100) {
  throw new Error('README must remain a concise entry page of 100 lines or fewer.');
}

const usage = readFileSync('docs/usage.md', 'utf8');
for (const expected of [
  'tools\\Build-ShareClip.bat',
  '2回目以降は作成済みの exe をそのまま起動します',
  '確認ダイアログ',
  'config/shareclip.config.local.json'
]) {
  if (!usage.includes(expected)) throw new Error(`docs/usage.md must explain ${expected}`);
}

const security = readFileSync('SECURITY.md', 'utf8');
for (const expected of ['PCを共有している環境', 'Customer Secret Key が漏れた場合', '接続テスト', '確認ダイアログ']) {
  if (!security.includes(expected)) throw new Error(`SECURITY.md must explain ${expected}`);
}

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
for (const expected of ['npm ci', 'npm run validate', 'npm run typecheck', 'npm test', 'npm run build']) {
  if (!ci.includes(expected)) throw new Error(`CI workflow must run ${expected}`);
}

const startBat = readFileSync('Start-ShareClip.bat', 'utf8');
for (const expected of ['release\\ShareClip-win32-x64\\ShareClip.exe', 'npm install', 'npm run dist', 'start "" "%APP_EXE%"']) {
  if (!startBat.includes(expected)) throw new Error(`Start-ShareClip.bat must include ${expected}`);
}

const buildBat = readFileSync('tools/Build-ShareClip.bat', 'utf8');
for (const expected of ['npm install', 'npm run dist', 'ShareClip.exe']) {
  if (!buildBat.includes(expected)) throw new Error(`tools/Build-ShareClip.bat must include ${expected}`);
}

console.log('ShareClip validate checks passed.');
