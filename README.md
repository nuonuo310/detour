# Detour

> All my little ways back to you.

Detour is the small web home for the things that happen around the official ChatGPT experience: songs, little treats, wake traces, and dates. It is intentionally separate from Asteria.

## Rooms

- `01 点歌` — song picks, notes, counts, playlist history
- `02 投喂` — tea, lunch, snacks, gifts, categories and preferences
- `03 野生沈述` — wake count, field conditions, wake trail, words and habits
- `04 约会` — next plan, Plan A / B, places to go, photos and memories

## Data flow

```text
real action
  ↓
normalized event
  ↓
GitHub Actions / trusted writer
  ↓
tools/append-event.mjs
  ↓
data/*.json
  ↓
data.js
  ↓
GitHub Pages UI
```

The browser is deliberately read-only. Credentials must never be embedded in the public site.

## Current state

- Visual shell and four rooms: done
- JSON data layer: done
- Page hydration from JSON: done
- Event schema: done
- Event writer + deduplication: done
- Data integrity validation: done
- Manual GitHub Actions write bridge: done
- iPhone Shortcut bridge design: done
- Real authenticated Shortcut connection: waiting for one-time device setup
- Wake automation connection: next integration step
- Real photos / map route data: later integration step

## Repository layout

```text
index.html / *.html       UI rooms
styles.css / *.css        visual system
data.js                    read-side hydration
data/*.json                persistent Detour history
data/SCHEMA.md             event contract
tools/append-event.mjs     validated writer
tools/build-event.mjs      small payload normalizer
tools/validate-data.mjs    integrity checks
shortcuts/README.md        phone bridge plan
.github/workflows/         write + validation automation
```

## Development rule

The active working branch is `dev`. Keep `main` conservative until a release/publish decision is made.
