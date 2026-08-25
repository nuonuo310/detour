#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const TYPES = {
  wake: { file: 'wake.json', required: ['at', 'action'] },
  music: { file: 'music.json', required: ['at', 'title'] },
  food: { file: 'food.json', required: ['at', 'category', 'item'] }
};

function fail(message) {
  console.error(`Detour event rejected: ${message}`);
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

function validDate(value) {
  return typeof value === 'string' && value.includes('T') && !Number.isNaN(new Date(value).valueOf());
}

const args = parseArgs(process.argv.slice(2));
const type = args.type;
if (!TYPES[type]) fail('type must be wake, music, or food');

let event;
try {
  event = JSON.parse(args.event || '');
} catch {
  fail('--event must be valid JSON');
}
if (!event || Array.isArray(event) || typeof event !== 'object') fail('event must be a JSON object');

for (const key of TYPES[type].required) {
  if (typeof event[key] !== 'string' || !event[key].trim()) fail(`${type}.${key} is required`);
}
if (!validDate(event.at)) fail('event.at must be an ISO date-time');

if (!event.id) {
  const stamp = event.at.replace(/[^0-9]/g, '').slice(0, 14);
  event.id = `${type}-${stamp}`;
}

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'data', TYPES[type].file);
const raw = await fs.readFile(file, 'utf8');
const data = JSON.parse(raw);
data.records ||= [];

if (data.records.some(record => record.id === event.id)) {
  console.log(`Detour event already exists: ${event.id}`);
  process.exit(0);
}

data.records.push(event);
data.records.sort((a, b) => new Date(b.at) - new Date(a.at));
data.updatedAt = event.at;

await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Detour event appended: ${event.id} -> data/${TYPES[type].file}`);
