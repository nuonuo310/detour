#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const specs = {
  music: { required: ['id', 'at', 'title'] },
  food: { required: ['id', 'at', 'category', 'item'] },
  wake: { required: ['id', 'at', 'action'] }
};

let errors = 0;
const fail = message => { errors += 1; console.error(`✗ ${message}`); };

for (const [name, spec] of Object.entries(specs)) {
  const file = path.join(root, 'data', `${name}.json`);
  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail(`${name}.json cannot be parsed: ${error.message}`);
    continue;
  }

  if (data.version !== 1) fail(`${name}.json version must be 1`);
  if (!Array.isArray(data.records)) {
    fail(`${name}.json records must be an array`);
    continue;
  }

  const ids = new Set();
  for (const [index, record] of data.records.entries()) {
    for (const key of spec.required) {
      if (typeof record[key] !== 'string' || !record[key].trim()) fail(`${name}.records[${index}].${key} is required`);
    }
    if (record.at && Number.isNaN(new Date(record.at).valueOf())) fail(`${name}.records[${index}].at is invalid`);
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
  console.log('✓ data/date.json');
} catch (error) {
  fail(`date.json cannot be parsed: ${error.message}`);
}

if (errors) {
  console.error(`\nDetour data validation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log('\nDetour data is valid.');
