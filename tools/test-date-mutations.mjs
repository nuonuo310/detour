#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tool = path.join(repoRoot, 'tools', 'mutate-date.mjs');
const fixture = { version: 1, updatedAt: null, next: null, wishlist: [], memories: [] };

async function makeRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'detour-date-'));
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'date.json'), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  return root;
}

function run(root, action, payload) {
  const result = spawnSync(process.execPath, [tool, '--action', action, '--payload', JSON.stringify(payload)], {
    env: { ...process.env, DETOUR_ROOT: root },
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result;
}

async function read(root) {
  return JSON.parse(await fs.readFile(path.join(root, 'data', 'date.json'), 'utf8'));
}

{
  const root = await makeRoot();
  run(root, 'date-plan', { place: '海边', at: '2026-09-01T18:30:00+08:00', planA: '散步', planB: '吃饭', note: '看日落' });
  const data = await read(root);
  assert.deepEqual(data.next, { place: '海边', at: '2026-09-01T18:30:00+08:00', planA: '散步', planB: '吃饭', note: '看日落' });
  assert.match(data.updatedAt, /\+08:00$/);
}

{
  const root = await makeRoot();
  const payload = { place: '旧书店', note: '慢慢逛' };
  run(root, 'date-wish', payload);
  run(root, 'date-wish', payload);
  const data = await read(root);
  assert.equal(data.wishlist.length, 1);
  assert.equal(data.wishlist[0].place, '旧书店');
  assert.match(data.wishlist[0].id, /^date-wish-/);
}

{
  const root = await makeRoot();
  run(root, 'date-memory', { title: '第一次夜游', at: '2026-08-20T21:00:00+08:00', place: '江边', photos: ['https://example.com/a.jpg'] });
  run(root, 'date-memory', { title: '下午茶', at: '2026-08-22T15:00:00+08:00', place: '咖啡店' });
  run(root, 'date-memory', { title: '第一次夜游', at: '2026-08-20T21:00:00+08:00', place: '江边', photos: ['https://example.com/a.jpg'] });
  const data = await read(root);
  assert.equal(data.memories.length, 2);
  assert.equal(data.memories[0].title, '下午茶');
  assert.equal(data.memories[1].title, '第一次夜游');
  assert.deepEqual(data.memories[1].photos, ['https://example.com/a.jpg']);
}

{
  const root = await makeRoot();
  const result = spawnSync(process.execPath, [tool, '--action', 'date-memory', '--payload', JSON.stringify({ title: '坏照片', photos: [''] })], {
    env: { ...process.env, DETOUR_ROOT: root },
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
}

console.log('✓ date-plan replacement');
console.log('✓ date-wish deduplication');
console.log('✓ date-memory ordering and deduplication');
console.log('✓ invalid date-memory photos rejected');
console.log('\nDetour date mutations are valid.');
