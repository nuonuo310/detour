#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ACTIONS = new Set(['date-plan', 'date-wish', 'date-memory']);

function fail(message) {
  console.error(`Detour date mutation rejected: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}

function nowAtOffset(offsetMinutes = 480) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const iso = d.toISOString().replace('Z', '');
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mm = String(absolute % 60).padStart(2, '0');
  return `${iso}${sign}${hh}:${mm}`;
}

function validDate(value) {
  if (typeof value !== 'string') return false;
  const explicitZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return value.includes('T') && explicitZone && !Number.isNaN(new Date(value).valueOf());
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stableId(prefix, value) {
  const canonical = JSON.stringify(Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .sort(([a], [b]) => a.localeCompare(b))
  ));
  const digest = crypto.createHash('sha256').update(`${prefix}:${canonical}`).digest('hex').slice(0, 10);
  return `${prefix}-${digest}`;
}

const args = parseArgs(process.argv.slice(2));
const action = args.action;
if (!ACTIONS.has(action)) fail('action must be date-plan, date-wish, or date-memory');

let payload;
try {
  payload = JSON.parse(args.payload || '');
} catch {
  fail('--payload must be valid JSON');
}
if (!payload || Array.isArray(payload) || typeof payload !== 'object') fail('payload must be a JSON object');

const repoRoot = path.resolve(import.meta.dirname, '..');
const root = process.env.DETOUR_ROOT ? path.resolve(process.env.DETOUR_ROOT) : repoRoot;
const file = path.join(root, 'data', 'date.json');
const data = JSON.parse(await fs.readFile(file, 'utf8'));
data.wishlist ||= [];
data.memories ||= [];

if (action === 'date-plan') {
  const place = cleanString(payload.place);
  if (!place) fail('date-plan.place is required');
  if (payload.at && !validDate(payload.at)) fail('date-plan.at must be an ISO date-time with an explicit timezone');

  data.next = {
    place,
    ...(payload.at ? { at: payload.at } : {}),
    ...(cleanString(payload.planA) ? { planA: cleanString(payload.planA) } : {}),
    ...(cleanString(payload.planB) ? { planB: cleanString(payload.planB) } : {}),
    ...(cleanString(payload.note) ? { note: cleanString(payload.note) } : {})
  };
} else if (action === 'date-wish') {
  const place = cleanString(payload.place);
  if (!place) fail('date-wish.place is required');

  const item = {
    place,
    ...(cleanString(payload.note) ? { note: cleanString(payload.note) } : {})
  };
  item.id = stableId('date-wish', item);

  if (!data.wishlist.some(existing => existing.id === item.id)) data.wishlist.push(item);
} else {
  const title = cleanString(payload.title);
  if (!title) fail('date-memory.title is required');
  if (payload.at && !validDate(payload.at)) fail('date-memory.at must be an ISO date-time with an explicit timezone');
  if (payload.photos != null && (!Array.isArray(payload.photos) || payload.photos.some(photo => !cleanString(photo)))) {
    fail('date-memory.photos must be an array of non-empty strings');
  }

  const memory = {
    title,
    ...(payload.at ? { at: payload.at } : {}),
    ...(cleanString(payload.place) ? { place: cleanString(payload.place) } : {}),
    ...(cleanString(payload.note) ? { note: cleanString(payload.note) } : {}),
    ...(Array.isArray(payload.photos) && payload.photos.length ? { photos: payload.photos.map(cleanString) } : {})
  };
  memory.id = stableId('date-memory', memory);

  if (!data.memories.some(existing => existing.id === memory.id)) data.memories.push(memory);
  data.memories.sort((a, b) => {
    const aTime = a.at ? new Date(a.at).valueOf() : -Infinity;
    const bTime = b.at ? new Date(b.at).valueOf() : -Infinity;
    return bTime - aTime;
  });
}

data.updatedAt = nowAtOffset();
await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Detour date mutation applied: ${action}`);
