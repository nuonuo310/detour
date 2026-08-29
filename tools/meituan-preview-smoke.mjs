#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { targetFixture } from './meituan-preview-fixture.mjs';

assert.match(targetFixture.poiIdStr, /^[A-Za-z0-9_-]+$/);
assert.ok(Number.isSafeInteger(targetFixture.skuId) && targetFixture.skuId > 0);
assert.ok(Number.isSafeInteger(targetFixture.count) && targetFixture.count > 0);
assert.ok(Array.isArray(targetFixture.attrIds) && targetFixture.attrIds.length > 0);
assert.ok(targetFixture.attrIds.every(id => Number.isSafeInteger(id) && id > 0));

const probe = await readFile(new URL('./meituan-preview-probe.mjs', import.meta.url), 'utf8');
assert.match(probe, /\/openh5\/order\/v2\/preview/);
assert.match(probe, /H5guard/);
assert.match(probe, /credentials:\s*['"]include['"]/);
assert.doesNotMatch(probe, /\/order\/(?:create|submit)|submitOrder|payment|\/pay\//i,
  'preview spike must not contain order submission/payment endpoints');

for (const forbidden of ['51E24F16012A44F79371C3613B4FF95E', '093C2EBC365441AFA49E2C6354D161C2']) {
  assert.equal(probe.includes(forbidden), false, 'captured ephemeral tokens must never be committed');
}

console.log('preview spike smoke OK');
