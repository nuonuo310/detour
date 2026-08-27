#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const specs = {
  music: { required: ['id', 'at', 'title'], versions: [1, 2] },
  food: { required: ['id', 'at', 'category', 'item'], versions: [1, 2] },
  wake: { required: ['id', 'at', 'action'], versions: [1] }
};

let errors = 0;
const fail = message => { errors += 1; console.error(`✗ ${message}`); };
const validDate = value => typeof value === 'string' && value.trim() && !Number.isNaN(new Date(value).valueOf());

for (const [name, spec] of Object.entries(specs)) {
  const file = path.join(root, 'data', `${name}.json`);
  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail(`${name}.json cannot be parsed: ${error.message}`);
    continue;
  }

  if (!spec.versions.includes(data.version)) fail(`${name}.json version must be one of: ${spec.versions.join(', ')}`);
  if (!Array.isArray(data.records)) {
    fail(`${name}.json records must be an array`);
    continue;
  }

  const ids = new Set();
  for (const [index, record] of data.records.entries()) {
    for (const key of spec.required) {
      if (typeof record[key] !== 'string' || !record[key].trim()) fail(`${name}.records[${index}].${key} is required`);
    }
    if (record.at && !validDate(record.at)) fail(`${name}.records[${index}].at is invalid`);
    if (record.pickedAt && !validDate(record.pickedAt)) fail(`${name}.records[${index}].pickedAt is invalid`);
    if (record.scheduledAt && !validDate(record.scheduledAt)) fail(`${name}.records[${index}].scheduledAt is invalid`);
    if (record.visibleAt && !validDate(record.visibleAt)) fail(`${name}.records[${index}].visibleAt is invalid`);
    if (record.seenAt && !validDate(record.seenAt)) fail(`${name}.records[${index}].seenAt is invalid`);
    if (record.listenedAt && !validDate(record.listenedAt)) fail(`${name}.records[${index}].listenedAt is invalid`);
    if (record.id) {
      if (ids.has(record.id)) fail(`${name}.json contains duplicate id ${record.id}`);
      ids.add(record.id);
    }
  }

  for (let i = 1; i < data.records.length; i += 1) {
    if (new Date(data.records[i - 1].at) < new Date(data.records[i].at)) {
      fail(`${name}.json records are not newest-first`);
      break;
    }
  }

  console.log(`✓ data/${name}.json (${data.records.length} records)`);
}

const dateFile = path.join(root, 'data', 'date.json');
try {
  const date = JSON.parse(await fs.readFile(dateFile, 'utf8'));
  if (date.version !== 1) fail('date.json version must be 1');
  if (!Array.isArray(date.wishlist)) fail('date.json wishlist must be an array');
  if (!Array.isArray(date.memories)) fail('date.json memories must be an array');
  if (date.next != null) {
    if (typeof date.next !== 'object' || Array.isArray(date.next)) fail('date.json next must be an object or null');
    else {
      if (typeof date.next.place !== 'string' || !date.next.place.trim()) fail('date.json next.place is required');
      if (date.next.at && !validDate(date.next.at)) fail('date.json next.at is invalid');
    }
  }
  if (Array.isArray(date.wishlist)) {
    date.wishlist.forEach((item, index) => {
      if (!item || typeof item !== 'object' || typeof item.place !== 'string' || !item.place.trim()) fail(`date.wishlist[${index}].place is required`);
    });
  }
  if (Array.isArray(date.memories)) {
    date.memories.forEach((memory, index) => {
      if (!memory || typeof memory !== 'object') { fail(`date.memories[${index}] must be an object`); return; }
      if (typeof memory.title !== 'string' || !memory.title.trim()) fail(`date.memories[${index}].title is required`);
      if (memory.at && !validDate(memory.at)) fail(`date.memories[${index}].at is invalid`);
      if (memory.photos != null && (!Array.isArray(memory.photos) || memory.photos.some(photo => typeof photo !== 'string' || !photo.trim()))) fail(`date.memories[${index}].photos must be an array of non-empty strings`);
    });
  }
  console.log('✓ data/date.json');
} catch (error) {
  fail(`date.json cannot be parsed: ${error.message}`);
}

if (errors) {
  console.error(`\nDetour data validation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log('\nDetour data is valid.');
