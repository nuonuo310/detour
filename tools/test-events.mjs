#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
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

const bad = spawnSync(process.execPath, [append, '--type', 'music', '--event', JSON.stringify({ at: 'not-a-date', title: 'Bad' })], { encoding: 'utf8' });
if (bad.status === 0) {
  console.error('✗ append-event accepted an invalid timestamp');
  failed = true;
} else {
  console.log('✓ append-event rejects invalid timestamps');
}

if (failed) process.exit(1);
console.log('\nDetour event pipeline self-check passed.');
