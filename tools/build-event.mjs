#!/usr/bin/env node

import process from 'node:process';

const args = process.argv.slice(2);
const pick = key => {
  const i = args.indexOf(`--${key}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const type = pick('type');
if (!['wake', 'music', 'food'].includes(type)) {
  console.error('type must be wake, music, or food');
  process.exit(1);
}

function parsePayload(value) {
  let current = String(value || '{}').trim();

  // Shortcuts may hand workflow_dispatch either normal JSON text,
  // a JSON-encoded string, or visibly escaped JSON text. Peel those
  // transport wrappers without changing ordinary payload content.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = JSON.parse(current);
      if (typeof parsed === 'string') {
        current = parsed.trim();
        continue;
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      break;
    } catch {
      if (/^[{[]\\"/.test(current) && current.includes('\\"')) {
        current = current.replace(/\\"/g, '"');
        continue;
      }
      if (/[“”]/.test(current)) {
        current = current.replace(/[“”]/g, '"');
        continue;
      }
      break;
    }
  }

  console.error('--payload must be valid JSON');
  process.exit(1);
}

const payload = parsePayload(pick('payload'));

function nowAtOffset(offsetMinutes = 480) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const iso = d.toISOString().replace('Z', '');
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mm = String(absolute % 60).padStart(2, '0');
  return `${iso}${sign}${hh}:${mm}`;
}

const at = payload.at || nowAtOffset();
const base = { at };
let event;

if (type === 'wake') {
  event = {
    ...base,
    action: payload.action || payload.choice || '又睡了',
    detail: payload.detail || payload.reason || '',
    words: payload.words || payload.message || '',
    tags: Array.isArray(payload.tags) ? payload.tags : []
  };
} else if (type === 'music') {
  event = {
    ...base,
    title: payload.title || payload.song || '',
    artist: payload.artist || '',
    url: payload.url || payload.link || '',
    note: payload.note || payload.message || ''
  };
} else {
  event = {
    ...base,
    category: payload.category || payload.kind || '',
    item: payload.item || payload.name || '',
    shop: payload.shop || payload.store || '',
    reason: payload.reason || '',
    note: payload.note || payload.message || ''
  };
}

console.log(JSON.stringify(event));
