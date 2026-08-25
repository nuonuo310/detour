#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const pages = ['index.html', 'music.html', 'food.html', 'wild.html', 'date.html'];
let errors = 0;

const fail = message => {
  errors += 1;
  console.error(`✗ ${message}`);
};

for (const page of pages) {
  const pagePath = path.join(root, page);
  let html;
  try {
    html = await fs.readFile(pagePath, 'utf8');
  } catch (error) {
    fail(`${page} cannot be read: ${error.message}`);
    continue;
  }

  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)]
    .map(match => match[1])
    .filter(ref => !/^(?:https?:|mailto:|tel:|data:)/i.test(ref));

  for (const ref of refs) {
    const target = path.resolve(root, ref);
    if (!target.startsWith(root + path.sep) && target !== root) {
      fail(`${page} references path outside repository: ${ref}`);
      continue;
    }
    try {
      await fs.access(target);
    } catch {
      fail(`${page} references missing file: ${ref}`);
    }
  }

  const historyScripts = [...html.matchAll(/<script[^>]+src=["']([^"']*history\.js)["'][^>]*>/g)].map(m => m[1]);
  if (historyScripts.length) {
    const dataIndex = html.indexOf('src="data.js"');
    for (const history of historyScripts) {
      const historyIndex = html.indexOf(`src="${history}"`);
      if (dataIndex < 0) fail(`${page} uses ${history} without data.js`);
      else if (historyIndex >= 0 && historyIndex < dataIndex) fail(`${page} loads ${history} before data.js`);
    }
  }

  console.log(`✓ ${page}`);
}

if (errors) {
  console.error(`\nDetour page validation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log('\nDetour page references are valid.');
