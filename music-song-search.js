import { normalizeSong } from './music-room-sync.js';

const clampLimit = value => Math.max(1, Math.min(10, Number(value) || 5));

export function normalizeSearchResult(candidate, provider) {
  if (!candidate) return null;
  const song = normalizeSong({
    provider,
    providerId: candidate.providerId || candidate.id || null,
    title: candidate.title || candidate.name || '',
    artist: candidate.artist || candidate.artists?.map(item => item?.name).filter(Boolean).join(', ') || '',
    duration: candidate.duration ?? (Number.isFinite(Number(candidate.duration_ms)) ? Number(candidate.duration_ms) / 1000 : null),
    source: candidate.source || candidate.external_urls?.spotify || null
  });
  return song.providerId ? song : null;
}

export function createSongSearch({ providers = {} } = {}) {
  return {
    async search(query, { provider = 'spotify', limit = 5 } = {}) {
      const normalizedQuery = String(query || '').trim();
      if (!normalizedQuery) throw new Error('query is required');
      const adapter = providers[provider];
      if (!adapter?.search) throw new Error(`unsupported song search provider: ${provider}`);
      const results = await adapter.search(normalizedQuery, { limit: clampLimit(limit) });
      return (Array.isArray(results) ? results : [])
        .map(result => normalizeSearchResult(result, provider))
        .filter(Boolean);
    }
  };
}
