#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'detour-pipeline-'));
await fs.mkdir(path.join(tempRoot, 'data'), { recursive: true });

for (const name of ['wake', 'music', 'food', 'date']) {
  await fs.copyFile(path.join(repoRoot, 'data', `${name}.json`), path.join(tempRoot, 'data', `${name}.json`));
}

function runNode(script, args, env = {}) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, script), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status || 1);
  }
  return result.stdout.trim();
}

const built = runNode('tools/build-event.mjs', [
  '--type', 'music',
  '--payload', JSON.stringify({
    at: '2026-08-25T15:00:00+08:00',
    song: 'Pipeline Song',
    artist: 'Detour',
    link: 'https://example.com/song',
    message: 'pipeline test'
  })
]);

runNode('tools/append-event.mjs', ['--type', 'music', '--event', built], { DETOUR_ROOT: tempRoot });
runNode('tools/append-event.mjs', ['--type', 'music', '--event', built], { DETOUR_ROOT: tempRoot });

const music = JSON.parse(await fs.readFile(path.join(tempRoot, 'data', 'music.json'), 'utf8'));
const matches = music.records.filter(record => record.title === 'Pipeline Song');
if (matches.length !== 1) {
  console.error(`Expected exactly one deduplicated test record, got ${matches.length}`);
  process.exit(1);
}
if (matches[0].note !== 'pipeline test' || matches[0].url !== 'https://example.com/song') {
  console.error('Normalized fields were not preserved correctly.');
  process.exit(1);
}
if (!matches[0].id?.startsWith('music-')) {
  console.error('Stable generated event ID is missing.');
  process.exit(1);
}

console.log('✓ build-event normalizes input');
console.log('✓ append-event writes into an isolated data root');
console.log('✓ duplicate retry is ignored');
console.log('✓ normalized fields survive the full pipeline');

await fs.rm(tempRoot, { recursive: true, force: true });
