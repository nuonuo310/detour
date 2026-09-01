const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';

export function createSpotifySongSearchProvider({ clientId, clientSecret, fetchImpl = fetch } = {}) {
  if (!clientId || !clientSecret) throw new Error('Spotify client credentials are required');
  let token = null;
  let expiresAt = 0;

  async function accessToken() {
    if (token && Date.now() < expiresAt - 30000) return token;
    const auth = btoa(`${clientId}:${clientSecret}`);
    const response = await fetchImpl(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        authorization: `Basic ${auth}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.access_token) throw new Error('Spotify token response missing access_token');
    token = data.access_token;
    expiresAt = Date.now() + Math.max(1, Number(data.expires_in) || 3600) * 1000;
    return token;
  }

  return {
    async search(query, { limit = 5 } = {}) {
      const bearer = await accessToken();
      const url = new URL(SPOTIFY_SEARCH_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'track');
      url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 5))));
      const response = await fetchImpl(url, { headers: { authorization: `Bearer ${bearer}` } });
      if (!response.ok) throw new Error(`Spotify search failed: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
    }
  };
}
