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

function normalizeEmbeddedText(value) {
  let text = String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u003A/gi, ':')
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/');

  try {
    text = decodeURIComponent(text);
  } catch {}

  return text;
}

function findDeepLink(text) {
  const candidates = [String(text || ''), normalizeEmbeddedText(text)];

  for (const candidate of candidates) {
    const direct = candidate.match(/imeituan:\/\/[^\s"'<>]+/i)?.[0];
    if (direct) return direct.replace(/&amp;/g, '&');

    const encoded = candidate.match(/imeituan%3A%2F%2F[^\s"'<>]+/i)?.[0];
    if (encoded) {
      try {
        return decodeURIComponent(encoded.replace(/&amp;/g, '&'));
      } catch {}
    }
  }

  return null;
}

function parseDeepLink(value) {
  try {
    const u = new URL(value);
    return {
      scheme: u.protocol.replace(':', ''),
      host: u.host,
      path: u.pathname,
      did: u.searchParams.get('did'),
      poiid: u.searchParams.get('poiid'),
      poiIdEncrypt: u.searchParams.get('poiIdEncrypt')
    };
  } catch {
    return {};
  }
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function firstMeta(html, keys) {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }
  return null;
}

function extractImageCandidates(html) {
  const found = new Set();
  const add = value => {
    if (!value) return;
    const decoded = decodeHtml(value).replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (/^https?:\/\//i.test(decoded) && /\.(?:png|jpe?g|webp)(?:\?|$)/i.test(decoded)) found.add(decoded);
  };

  add(firstMeta(html, ['og:image', 'twitter:image']));

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(match[1]);
  for (const match of html.matchAll(/https?:\\?\/\\?\/[^\s"'<>]+?\.(?:png|jpe?g|webp)(?:\?[^\s"'<>]*)?/gi)) add(match[0]);
  for (const match of html.matchAll(/(?:imageUrl|image_url|imgUrl|img_url|picUrl|pic_url|coverUrl|cover_url)["']?\s*[:=]\s*["']([^"']+)["']/gi)) add(match[1]);

  return [...found].slice(0, 20);
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
let body = '';
try {
  body = await response.text();
} catch {}

const resolvedDeepLink = decodeDeepLinkFromUrl(finalUrl) || findDeepLink(body);
const deepLink = resolvedDeepLink || finalUrl;
const resolution = resolvedDeepLink ? 'imeituan' : 'web-fallback';

const deepLinkData = parseDeepLink(deepLink);
const metadata = {
  title: firstMeta(body, ['og:title', 'twitter:title']),
  description: firstMeta(body, ['og:description', 'description']),
  image: firstMeta(body, ['og:image', 'twitter:image'])
};
const imageCandidates = extractImageCandidates(body);

const out = {
  shareUrl,
  finalUrl,
  deepLink,
  resolution,
  deal: deepLinkData,
  metadata,
  imageCandidates,
  bodyBytes: Buffer.byteLength(body || '', 'utf8'),
  resolvedAt: new Date().toISOString()
};

if (!resolvedDeepLink) {
  console.error(`imeituan deep link unavailable; using fresh web fallback: ${finalUrl}`);
}

console.log(JSON.stringify(out));
