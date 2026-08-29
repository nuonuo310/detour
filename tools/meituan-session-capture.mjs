#!/usr/bin/env node

/**
 * Local-only helper to create Playwright storageState for the preview probe.
 * Opens Meituan H5 in a visible browser and waits for the operator to finish
 * login/navigation, then stores browser state at a local ignored path.
 *
 * It does not place, preview, submit or pay an order.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import readline from 'node:readline/promises';
import process from 'node:process';

const output = resolve(process.env.MEITUAN_STORAGE_STATE || '.local/meituan-storage-state.json');
const poi = process.env.MEITUAN_POI_ID_STR || '';
const startUrl = poi
  ? `https://h5.waimai.meituan.com/waimai/mindex/menu?mtShopId=-100&poi_id_str=${encodeURIComponent(poi)}`
  : 'https://h5.waimai.meituan.com/';

await mkdir(dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: false });
try {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 MicroMessenger'
  });
  const page = await context.newPage();
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await rl.question('Finish Meituan H5 login in the opened browser, then press Enter here to save local session state. ');
  } finally {
    rl.close();
  }

  await context.storageState({ path: output });
  console.log(`Saved local session state: ${output}`);
  console.log('Keep this file local. Do not commit or upload it.');
} finally {
  await browser.close();
}
