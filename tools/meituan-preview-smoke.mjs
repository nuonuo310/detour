#!/usr/bin/env node
// Placeholder smoke check: validates fixture shape without network/auth.
import { targetFixture } from './meituan-preview-fixture.mjs';
const ok = targetFixture.poiIdStr && Number.isFinite(targetFixture.skuId) && targetFixture.attrIds.length > 0 && targetFixture.count > 0;
if (!ok) process.exit(1);
console.log('preview fixture OK');
