import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Package committed customer source only. Never collect working-tree secrets,
// credentials, CI fixture allocators, dependencies, or generated build output.
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const version = JSON.parse(execFileSync('git', ['show', `${revision}:package.json`], { cwd: root, encoding: 'utf8' })).version;
if (!/^[0-9A-Za-z.-]+$/.test(version)) throw new Error('Invalid package version');
const files = ['src', 'public', 'docs', 'scripts', 'e2e', 'e2e-live', 'test', 'LICENSE.md', 'README.md', 'Dockerfile', '.dockerignore', '.env.example', '.gitignore', 'headless.config.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'package.json', 'package-lock.json', 'playwright.config.ts', 'playwright.live.config.ts'];
const destination = resolve(root, 'release');
mkdirSync(destination, { recursive: true });
const filename = `1ecomm-nextjs-${version}-${revision.slice(0, 12)}.tar.gz`;
const archive = resolve(destination, filename);
execFileSync('git', ['archive', '--format=tar.gz', `--output=${archive}`, revision, '--', ...files], { cwd: root });
const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(resolve(destination, 'SHA256SUMS'), `${digest}  ${filename}\n`);
writeFileSync(resolve(destination, 'manifest.json'), JSON.stringify({ filename, sha256: digest, sourceCommit: revision, version, license: '1Ecomm Customer Use License 1.0', deployment: 'Node.js or Docker storefront; 1ecomm API required' }, null, 2) + '\n');
console.log(archive);
