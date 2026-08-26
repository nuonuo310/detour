#!/usr/bin/env node

import process from 'node:process';

const args = process.argv.slice(2);
const pick = key => {
  const i = args.indexOf(`--${key}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const shareUrl = pick('url');
if (!shareUrl) {
  console.error('--url is required');
  process.exit(1);
}

function decodeDeepLinkFromUrl(value) {
  try {
    const u = new URL(value);
    const nested = u.searchParams.get('url');
    if (nested?.startsWith('imeituan://')) return nested;
  } catch {}
  return null;
}

function findDeepLink(text) {
  const direct = String(text || '').match(/imeituan:\/\/[^\s"'<>]+/i)?.[0];
  if (direct) return direct.replace(/&amp;/g, '&');

  const encoded = String(text || '').match(/imeituan%3A%2F%2F[^\s"'<>]+/i)?.[0];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/&amp;/g, '&'));
    } catch {}
  }
  return null;
}

let response;
try {
  response = await fetch(shareUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    }
  });
} catch (error) {
  console.error(`failed to fetch share URL: ${error.message}`);
  process.exit(1);
}

const finalUrl = response.url;
let deepLink = decodeDeepLinkFromUrl(finalUrl);
let body = '';

if (!deepLink) {
  try {
    body = await response.text();
  } catch {}
  deepLink = findDeepLink(body);
}

if (!deepLink) {
  console.error(`could not resolve imeituan deep link; final URL: ${finalUrl}`);
  process.exit(1);
}

const out = {
  shareUrl,
  finalUrl,
  deepLink,
  resolvedAt: new Date().toISOString()
};

console.log(JSON.stringify(out));
