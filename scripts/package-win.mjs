import { packager } from '@electron/packager';

const outputPaths = await packager({
  dir: '.',
  name: 'ShareClip',
  executableName: 'ShareClip',
  platform: 'win32',
  arch: 'x64',
  out: 'release',
  overwrite: true,
  prune: true,
  asar: false,
  ignore: [
    /^\/\.ai-bridge(\/|$)/,
    /^\/\.test-dist(\/|$)/,
    /^\/\.npm-cache(\/|$)/,
    /^\/\.pnpm-store(\/|$)/,
    /^\/docs(\/|$)/,
    /^\/src(\/|$)/,
    /^\/tests(\/|$)/,
    /^\/release(\/|$)/,
    /^\/config\/shareclip\.config\.local\.json$/,
    /^\/config\/shareclip\.local\.json$/,
    /^\/.*\.local\.json$/
  ]
});

for (const outputPath of outputPaths) {
  console.log(`packaged: ${outputPath}`);
}
