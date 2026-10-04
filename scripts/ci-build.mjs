import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const packageRoot = join(root, 'packages/blog');
export const artifacts = join(root, '.ci-artifacts');
export const repo = 'vibelabsdotto/vibeblog';
export const packageName = '@vibelabsdotto/blog';
const remote = 'https://github.com/vibelabsdotto/vibeblog.git';
export function requireThat(ok, message) {
  if (!ok) throw new Error(message);
}
export function stableVersion(version) {
  requireThat(typeof version === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), 'Only stable canonical semver is allowed');
  return version.split('.').map(BigInt);
}
export function identity() {
  const env = process.env;
  requireThat(env.CI_REPO === repo, 'CI_REPO does not match the release repository');
  requireThat(/^[a-f0-9]{40}$/.test(env.CI_COMMIT_SHA ?? ''), 'CI_COMMIT_SHA must be 40 lowercase hex characters');
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  requireThat(pkg.name === packageName && pkg.private !== true, 'Unexpected or private package');
  stableVersion(pkg.version);
  const event = env.CI_PIPELINE_EVENT;
  const tag = env.CI_COMMIT_TAG || '';
  const ref = env.CI_COMMIT_REF;
  if (event === 'tag') {
    requireThat(tag === `v${pkg.version}` && ref === `refs/tags/${tag}`, 'Release tag/ref must equal vPACKAGE_VERSION');
  } else {
    requireThat(['push', 'manual'].includes(event) && env.CI_COMMIT_BRANCH === 'main' && ref === 'refs/heads/main' && !tag,
      'Only push/manual on main or stable version tags are allowed');
  }
  return { repo, commit: env.CI_COMMIT_SHA, event, ref, tag, name: pkg.name, version: pkg.version };
}
function git(args) {
  return execFileSync('git', ['-c', `safe.directory=${root}`, '-c', 'credential.helper=', '-c', 'core.askPass=/bin/false',
    '-c', 'http.extraHeader=', '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], {
    cwd: root, encoding: 'utf8',
    // Git never receives npm credentials, injected Git settings, or user configuration.
    env: { PATH: '/usr/local/bin:/usr/bin:/bin', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  }).trim();
}
export function checkoutGuard(id, verifyRemote = id.event === 'tag') {
  requireThat(git(['rev-parse', 'HEAD']) === id.commit, 'Checked-out HEAD differs from CI_COMMIT_SHA');
  git(['diff', '--exit-code', 'HEAD', '--', 'package.json', 'package-lock.json', 'packages/blog', 'apps/example', 'scripts', '.woodpecker']);
  if (!verifyRemote) return;
  const args = ['fetch', '--no-tags'];
  if (git(['rev-parse', '--is-shallow-repository']) === 'true') args.push('--unshallow');
  git([...args, remote, '+refs/heads/main:refs/ci/main', ...(id.event === 'tag' ? [`+refs/tags/${id.tag}:refs/ci/release-tag`] : [])]);
  if (id.event === 'tag') requireThat(git(['rev-parse', 'refs/ci/release-tag^{commit}']) === id.commit, 'Remote release tag differs from CI_COMMIT_SHA');
  git(['merge-base', '--is-ancestor', id.commit, 'refs/ci/main']);
  console.log('Checkout commit, remote main ancestry and any release tag verified');
}
export const integrity = bytes => `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
// tsdown currently emits two entrypoints, a shared declaration chunk and plain CSS.
const generatedPath = /^dist\/(?:(?:index|client)\.(?:js|d\.ts)|rehype-[A-Za-z0-9_-]{8}\.d\.ts|styles\.css)$/;
function allowedPath(path) {
  const parts = path.split('/');
  requireThat(parts.every(p => p && p !== '.' && p !== '..') && !/[\\\x00-\x1f\x7f]/.test(path), 'Unsafe archive path');
  requireThat(generatedPath.test(path) || /^(?:package\.json|README\.md|LICENSE|bin\/vibeblog\.mjs)$/.test(path),
    `File outside package allowlist: ${path}`);
}
export function inspectArchive(bytes, id, compareGenerated = true) {
  requireThat(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024, 'Archive exceeds size limit or is empty');
  const tar = gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 });
  const files = new Map();
  const text = (header, start, size) => header.subarray(start, start + size).toString('utf8').split('\0')[0];
  const octal = value => {
    const clean = value.replace(/\0/g, '').trim();
    requireThat(/^[0-7]+$/.test(clean), 'Invalid tar numeric header');
    return parseInt(clean, 8);
  };
  let offset = 0;
  while (offset + 512 <= tar.length && tar.subarray(offset, offset + 512).some(Boolean)) {
    const header = tar.subarray(offset, offset + 512);
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
    requireThat(checksum === octal(header.subarray(148, 156).toString('ascii')), 'Tar header checksum mismatch');
    const prefix = text(header, 345, 155);
    const name = `${prefix ? `${prefix}/` : ''}${text(header, 0, 100)}`;
    const size = octal(header.subarray(124, 136).toString('ascii'));
    requireThat(name.startsWith('package/'), 'Tar entry outside package root');
    const path = name.slice(8);
    allowedPath(path);
    requireThat(['\0', '0'].includes(String.fromCharCode(header[156])) && !text(header, 157, 100), 'Only regular tar files are allowed, no links or extended headers');
    requireThat(!files.has(path) && offset + 512 + size <= tar.length, 'Duplicate or truncated tar entry');
    files.set(path, tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  requireThat(tar.length - offset >= 1024 && !tar.subarray(offset).some(Boolean), 'Missing or invalid tar end marker');
  const pkg = JSON.parse(files.get('package.json')?.toString('utf8') || '{}');
  requireThat(pkg.name === id.name && pkg.version === id.version && pkg.private !== true, 'Packed package identity mismatch');
  requireThat(JSON.stringify(pkg) === JSON.stringify(JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))), 'Packed manifest differs from checkout');
  for (const name of ['README.md', 'LICENSE', 'bin/vibeblog.mjs', 'dist/index.js', 'dist/client.js',
    'dist/index.d.ts', 'dist/client.d.ts', 'dist/styles.css']) requireThat(files.has(name), `Missing ${name}`);
  requireThat([...files.keys()].filter(p => /^dist\/rehype-[A-Za-z0-9_-]{8}\.d\.ts$/.test(p)).length === 1,
    'Expected one shared rehype declaration chunk');
  requireThat(pkg.type === 'module' && pkg.exports && typeof pkg.exports === 'object', 'Missing ESM package exports');
  requireThat(pkg.exports['.']?.types === './dist/index.d.ts' && pkg.exports['.']?.default === './dist/index.js'
    && pkg.exports['./styles.css'] === './dist/styles.css' && pkg.exports['./package.json'] === './package.json', 'Unexpected package entrypoints');
  const targets = value => {
    if (typeof value === 'string') return [value];
    requireThat(value && typeof value === 'object' && !Array.isArray(value), 'Invalid export condition');
    return Object.values(value).flatMap(targets);
  };
  for (const target of targets(pkg.exports)) {
    requireThat(target.startsWith('./') && files.has(target.slice(2)), `Missing exported target: ${target}`);
  }
  requireThat(pkg.bin && Object.keys(pkg.bin).length === 1 && pkg.bin.vibeblog === 'bin/vibeblog.mjs'
    && files.get(pkg.bin.vibeblog)?.toString('utf8').startsWith('#!/usr/bin/env node\n'), 'Missing or invalid vibeblog CLI target');
  const publishConfig = pkg.publishConfig ?? {};
  requireThat(Object.keys(publishConfig).every(key => ['access', 'registry', 'tag'].includes(key))
    && (!publishConfig.access || publishConfig.access === 'public')
    && (!publishConfig.registry || publishConfig.registry === 'https://registry.npmjs.org/')
    && (!publishConfig.tag || publishConfig.tag === 'latest'), 'Unexpected package publishConfig');
  for (const [path, bytes] of files) {
    if (path.startsWith('dist/')) {
      // Generated output is data, never imported or executed by the publisher.
      requireThat(bytes.length > 0 && !bytes.includes(0) && Buffer.from(bytes.toString('utf8')).equals(bytes), `Invalid generated text: ${path}`);
      // Type declarations use .js specifiers for their corresponding .d.ts chunks.
      if (path.endsWith('.d.ts')) {
        for (const match of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*\(\s*)["'](\.\/[^"']+\.js)["']/g)) {
          requireThat(files.has(`dist/${match[1].slice(2, -3)}.d.ts`), `Missing declaration dependency: ${match[1]}`);
        }
      }
      if (path === 'dist/styles.css') {
        requireThat(readFileSync(join(packageRoot, 'src/styles.css')).equals(bytes), 'Packed stylesheet differs from source');
      }
      if (!compareGenerated) continue;
    }
    const local = join(packageRoot, path);
    requireThat(lstatSync(local).isFile() && !lstatSync(local).isSymbolicLink() && readFileSync(local).equals(bytes), `Packed bytes differ from checkout: ${path}`);
  }
  const walk = dir => readdirSync(join(packageRoot, dir), { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    requireThat(!entry.isSymbolicLink(), `Package symlink: ${path}`);
    return entry.isDirectory() ? walk(path) : [path];
  });
  for (const path of [...walk('bin'), ...(compareGenerated ? walk('dist') : [])]) requireThat(files.has(path), `Missing package file: ${path}`);
  return { files: files.size, pkg };
}
export function verifyArtifact(id = identity(), artifactDirectory = artifacts, compareGenerated = true) {
  requireThat(lstatSync(artifactDirectory).isDirectory() && !lstatSync(artifactDirectory).isSymbolicLink(), 'Invalid artifact directory');
  const manifestPath = join(artifactDirectory, 'release.json');
  requireThat(lstatSync(manifestPath).isFile() && !lstatSync(manifestPath).isSymbolicLink(), 'Invalid artifact manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [key, value] of Object.entries(id)) requireThat(manifest[key] === value, `Artifact identity mismatch: ${key}`);
  const filename = `vibelabsdotto-blog-${id.version}.tgz`;
  requireThat(manifest.filename === filename && manifest.schema === 1, 'Unexpected artifact filename/schema');
  const path = join(artifactDirectory, filename);
  requireThat(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'Artifact must be a regular file');
  const bytes = readFileSync(path);
  requireThat(integrity(bytes) === manifest.integrity, 'Artifact SHA512 mismatch');
  const inspected = inspectArchive(bytes, id, compareGenerated);
  requireThat(inspected.files === manifest.files, 'Artifact file count mismatch');
  return { id, manifest, path, bytes };
}
async function build() {
  requireThat(!process.env.NPM_TOKEN && !process.env.NODE_AUTH_TOKEN, 'Build must not receive npm credentials');
  const id = identity();
  checkoutGuard(id);
  requireThat(!existsSync(artifacts), 'Artifact directory already exists; use a clean workspace');
  const npm = (args, cwd = root, capture = false) => execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  console.log(`Building ${id.name}@${id.version} from ${id.commit} on ${process.platform}/${process.arch}`);
  const workspace = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  requireThat(workspace.private === true && workspace.packageManager === 'npm@12.0.2', 'Unexpected workspace package manager');
  requireThat(npm(['--version'], root, true).trim() === '12.0.2', 'Build requires npm 12.0.2');
  npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  npm(['run', 'typecheck']);
  // Root build runs tsdown first, then the full Next example including its TypeScript check.
  npm(['run', 'build']);
  checkoutGuard(id);
  mkdirSync(artifacts);
  // npm 12 returns an object keyed by package name, not the npm 11 result array.
  const result = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], packageRoot, true));
  requireThat(result && !Array.isArray(result) && Object.keys(result).length === 1 && result[id.name], 'Unexpected npm pack result');
  const packed = result[id.name];
  requireThat(packed.name === id.name && packed.version === id.version
    && packed.filename === `vibelabsdotto-blog-${id.version}.tgz`, 'Unexpected packed package identity');
  const bytes = readFileSync(join(artifacts, packed.filename));
  const inspected = inspectArchive(bytes, id);
  requireThat(packed.integrity === integrity(bytes) && packed.entryCount === inspected.files, 'npm pack integrity/file count differs from actual archive');
  const manifest = { schema: 1, ...id, filename: packed.filename, integrity: integrity(bytes), files: inspected.files };
  writeFileSync(join(artifacts, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
  verifyArtifact(id);
  console.log(JSON.stringify(manifest, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireThat(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--verify'), 'Usage: node scripts/ci-build.mjs [--verify]');
    if (process.argv[2] === '--verify') console.log(JSON.stringify(verifyArtifact().manifest, null, 2));
    else await build();
  } catch (error) {
    console.error(`CI build guard failed: ${error.message}`);
    process.exitCode = 1;
  }
}
