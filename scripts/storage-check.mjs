import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const maxSignedUrlSeconds = 604800;
const configPath = path.join(process.cwd(), 'config', 'shareclip.config.local.json');
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'release', '.test-dist', '=', '.npm-cache']);
const ignoredFiles = new Set(['config/shareclip.config.local.json', 'config/shareclip.local.json']);

function redact(message, config) {
  let output = String(message ?? 'Unknown error');
  for (const value of [config?.accessKeyId, config?.secretAccessKey].filter(Boolean)) {
    output = output.split(value).join('MASKED');
  }
  output = output.replace(/(Credential=)[^&\s]+/gi, '$1MASKED');
  return output;
}

function normalizeRel(filePath) {
  return filePath.split(path.sep).join('/');
}

function readConfig() {
  if (!existsSync(configPath)) {
    throw new Error('Missing config/shareclip.config.local.json. Copy the example config and fill it locally.');
  }
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function validateConfig(config) {
  const required = ['endpoint', 'region', 'bucket', 'accessKeyId', 'secretAccessKey', 'keyPrefix', 'signedUrlBaseSeconds'];
  const errors = [];
  for (const key of required) {
    if (config[key] === undefined || config[key] === null || String(config[key]).trim() === '') {
      errors.push(`${key} is required.`);
    }
  }
  if (Number(config.signedUrlBaseSeconds) > maxSignedUrlSeconds) {
    errors.push('signedUrlBaseSeconds must be 604800 or less.');
  }
  if (config.maxFileSizeMB !== undefined && Number(config.maxFileSizeMB) <= 0) {
    errors.push('maxFileSizeMB must be positive when set.');
  }
  if (errors.length > 0) throw new Error(errors.join(' '));
}

function walkFiles(root, files = []) {
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    const relative = normalizeRel(path.relative(process.cwd(), absolute));
    if (ignoredDirs.has(entry) || ignoredFiles.has(relative)) continue;
    const stat = statSync(absolute);
    if (stat.isDirectory()) walkFiles(absolute, files);
    if (stat.isFile() && stat.size <= 1024 * 1024) files.push(absolute);
  }
  return files;
}

function assertNoSecretInFiles(config) {
  const values = [config.accessKeyId, config.secretAccessKey].filter(Boolean);
  const hits = [];
  for (const file of walkFiles(process.cwd())) {
    const rel = normalizeRel(path.relative(process.cwd(), file));
    const text = readFileSync(file, 'utf8');
    if (values.some((value) => text.includes(value))) hits.push(rel);
  }
  if (hits.length > 0) {
    throw new Error(`Secret value appears outside local config: ${hits.join(', ')}`);
  }
}

function assertGitStateSafe(config) {
  const values = [config.accessKeyId, config.secretAccessKey].filter(Boolean);
  if (!existsSync(path.join(process.cwd(), '.git'))) {
    console.log('git check: skipped because this folder is not a git repository yet.');
    return;
  }

  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);

  if (tracked.includes('config/shareclip.config.local.json') || tracked.includes('config/shareclip.local.json')) {
    throw new Error('Local config file is tracked by git.');
  }

  const hits = [];
  for (const file of tracked) {
    if (!existsSync(file) || ignoredFiles.has(normalizeRel(file))) continue;
    const text = readFileSync(file, 'utf8');
    if (values.some((value) => text.includes(value))) hits.push(file);
  }
  if (hits.length > 0) {
    throw new Error(`Secret value appears in tracked files: ${hits.join(', ')}`);
  }

  const status = execFileSync('git', ['status', '--short', '--ignored=no'], { encoding: 'utf8' });
  if (status.includes('shareclip.config.local.json') || status.includes('shareclip.local.json')) {
    throw new Error('git status includes local config. Check .gitignore before committing.');
  }
  console.log('git check: local config and secret values are not tracked.');
}

const config = readConfig();
try {
  validateConfig(config);
  console.log('config check: ok');

  assertNoSecretInFiles(config);
  assertGitStateSafe(config);

  const keyPrefix = String(config.keyPrefix).replace(/^\/+/, '').replace(/\/?$/, '/');
  const key = `${keyPrefix}storage-check-${randomUUID()}.txt`;
  const body = `shareclip storage check ${new Date().toISOString()}\n`;
  const expiresIn = Math.min(7 * 24 * 60 * 60, Number(config.signedUrlBaseSeconds), maxSignedUrlSeconds);

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: Boolean(config.forcePathStyle) || String(config.endpoint).includes('.compat.objectstorage.')
  });

  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  console.log('bucket check: ok');

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain; charset=utf-8',
      ContentDisposition: "attachment; filename*=UTF-8''shareclip-storage-check.txt"
    })
  );
  console.log('upload check: ok');

  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn });
  console.log(`signed URL check: ok (${expiresIn}s)`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
  const downloaded = await response.text();
  if (downloaded !== body) throw new Error('downloaded content did not match uploaded content.');
  console.log('download check: ok');

  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  console.log('cleanup check: ok');
  console.log('ShareClip storage check passed.');
} catch (error) {
  console.error(`ShareClip storage check failed: ${redact(error instanceof Error ? error.message : String(error), config)}`);
  process.exit(1);
}
