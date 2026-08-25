#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const build = path.join(root, 'tools', 'build-event.mjs');
const append = path.join(root, 'tools', 'append-event.mjs');

const cases = [
  {
    type: 'wake',
    payload: { at: '2026-08-25T14:33:00+08:00', choice: '想糯糯', message: '醒了一下。' },
    expect: e => e.action === '想糯糯' && e.words === '醒了一下。'
  },
  {
    type: 'music',
    payload: { at: '2026-08-25T15:00:00+08:00', song: 'Song', artist: 'Artist', link: 'https://open.spotify.com/' },
    expect: e => e.title === 'Song' && e.artist === 'Artist' && e.url.includes('spotify.com')
  },
  {
    type: 'food',
    payload: { at: '2026-08-25T15:05:00+08:00', kind: '奶茶', name: '今日奶茶', store: '店铺' },
    expect: e => e.category === '奶茶' && e.item === '今日奶茶' && e.shop === '店铺'
  }
];

let failed = false;
for (const item of cases) {
  const run = spawnSync(process.execPath, [build, '--type', item.type, '--payload', JSON.stringify(item.payload)], { encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(`✗ ${item.type} builder failed: ${run.stderr.trim()}`);
    failed = true;
    continue;
  }
  let event;
  try {
    event = JSON.parse(run.stdout.trim());
  } catch {
    console.error(`✗ ${item.type} builder returned invalid JSON`);
    failed = true;
    continue;
  }
  if (!item.expect(event)) {
    console.error(`✗ ${item.type} builder mapping failed`, event);
    failed = true;
  } else {
    console.log(`✓ ${item.type} builder`);
  }
}

const shortcutPayloads = [
  JSON.stringify(JSON.stringify({ song: 'Shortcut Song', artist: 'Phone' })),
  '{\\"song\\":\\"Shortcut Song\\",\\"artist\\":\\"Phone\\"}',
  '{“song”:“Shortcut Song”,“artist”:“Phone”}'
];
for (const payload of shortcutPayloads) {
  const run = spawnSync(process.execPath, [build, '--type', 'music', '--payload', payload], { encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(`✗ builder rejected Shortcut-style payload: ${payload}`);
    failed = true;
    continue;
  }
  const event = JSON.parse(run.stdout.trim());
  if (event.title !== 'Shortcut Song' || event.artist !== 'Phone') {
    console.error('✗ Shortcut-style payload mapping failed', event);
    failed = true;
  } else {
    console.log('✓ builder accepts Shortcut-style payload');
  }
}

const fallbackRun = spawnSync(process.execPath, [build, '--type', 'music', '--payload', JSON.stringify({ song: 'Fallback Song' })], { encoding: 'utf8' });
if (fallbackRun.status !== 0) {
  console.error('✗ builder fallback timestamp could not be generated');
  failed = true;
} else {
  const fallbackEvent = JSON.parse(fallbackRun.stdout.trim());
  if (!/\+08:00$/.test(fallbackEvent.at)) {
    console.error(`✗ builder fallback timestamp must use +08:00, got ${fallbackEvent.at}`);
    failed = true;
  } else {
    console.log('✓ builder fallback timestamp uses +08:00');
  }
}

const bad = spawnSync(process.execPath, [append, '--type', 'music', '--event', JSON.stringify({ at: 'not-a-date', title: 'Bad' })], { encoding: 'utf8' });
if (bad.status === 0) {
  console.error('✗ append-event accepted an invalid timestamp');
  failed = true;
} else {
  console.log('✓ append-event rejects invalid timestamps');
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'detour-test-'));
fs.mkdirSync(path.join(tempRoot, 'data'));
for (const name of ['wake', 'music', 'food']) {
  fs.writeFileSync(path.join(tempRoot, 'data', `${name}.json`), JSON.stringify({ version: 1, updatedAt: null, records: [] }, null, 2));
}

const sameSecondA = { at: '2026-08-25T15:10:00+08:00', title: 'Song A', artist: 'Artist' };
const sameSecondB = { at: '2026-08-25T15:10:00+08:00', title: 'Song B', artist: 'Artist' };

const runAppend = event => spawnSync(
  process.execPath,
  [append, '--type', 'music', '--event', JSON.stringify(event)],
  { encoding: 'utf8', env: { ...process.env, DETOUR_ROOT: tempRoot } }
);

const a1 = runAppend(sameSecondA);
const a2 = runAppend(sameSecondA);
const b1 = runAppend(sameSecondB);
if (a1.status !== 0 || a2.status !== 0 || b1.status !== 0) {
  console.error('✗ append-event deterministic-id test could not write fixtures');
  failed = true;
} else {
  const music = JSON.parse(fs.readFileSync(path.join(tempRoot, 'data', 'music.json'), 'utf8'));
  const ids = music.records.map(r => r.id);
  if (music.records.length !== 2) {
    console.error(`✗ duplicate retry or same-second separation failed: expected 2 records, got ${music.records.length}`);
    failed = true;
  } else if (new Set(ids).size !== 2) {
    console.error('✗ same-second distinct events produced the same id');
    failed = true;
  } else {
    console.log('✓ append-event deduplicates retries and separates same-second events');
  }
}

fs.rmSync(tempRoot, { recursive: true, force: true });

if (failed) process.exit(1);
console.log('\nDetour event pipeline self-check passed.');
