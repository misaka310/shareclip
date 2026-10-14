import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultConfig, mergeConfig, resolveConfig, sanitizeKeyPrefix, validateConfig } from '../shared/config';

test('config helpers report required fields', () => {
  assert.deepEqual(validateConfig(defaultConfig), [
    'Endpoint is required.',
    'Region is required.',
    'Bucket is required.',
    'Access key ID is required.',
    'Secret access key is required.'
  ]);
});

test('config helpers merge overrides onto defaults', () => {
  assert.deepEqual(
    mergeConfig({
      bucket: 'demo',
      signedUrlBaseSeconds: 7200
    }),
    {
      ...defaultConfig,
      bucket: 'demo',
      signedUrlBaseSeconds: 7200
    }
  );
});

test('config helpers normalize key prefixes', () => {
  assert.equal(sanitizeKeyPrefix('assets'), 'assets/');
  assert.equal(sanitizeKeyPrefix('assets/'), 'assets/');
  assert.equal(sanitizeKeyPrefix('   '), '');
});

test('config helpers prefer saved config over file config', () => {
  const result = resolveConfig({ bucket: 'file-bucket' }, { bucket: 'saved-bucket' });
  assert.equal(result.source, 'saved');
  assert.equal(result.config.bucket, 'saved-bucket');
});
