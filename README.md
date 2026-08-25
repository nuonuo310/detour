# Detour

> All my little ways back to you.

Detour is the small web home for the things that happen around the official ChatGPT experience: songs, little treats, wake traces, and dates. It is intentionally separate from Asteria.

## Rooms

- `01 点歌` — song picks, notes, counts, playlist history
- `02 投喂` — tea, lunch, snacks, gifts, categories and preference summaries
- `03 野生沈述` — wake count, field conditions, wake trail, words, habits, archive and observer note
- `04 约会` — next plan, wish list, places to go, photos and memories

## Data flow

```text
real action / iPhone Shortcut / future automation
  ↓
raw payload
  ↓
tools/build-event.mjs
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
- Shared cached read-side loader: done
- Page hydration from JSON: done
- History/archive rendering for music, food, wake and dates: done
- Event schema + raw payload normalization: done
- Event writer + deterministic ID + retry deduplication: done
- Explicit-timezone validation and +08:00 fallback: done
- Data integrity validation: done
- Page reference / fragment / script-order validation: done
- Unified `npm test` regression entry point: done
- Manual GitHub Actions write bridge: done
- Safe dry-run GitHub Actions bridge: done
- iPhone Shortcut bridge design + setup checklist: done
- Real authenticated iPhone → GitHub Actions connection: done
- iPhone dry-run music payload end-to-end: passed
- Real event write from iPhone: next integration step
- Wake automation connection: after real event write verification
- Real photos / map route data: later integration step

## Repository layout

```text
index.html / *.html       UI rooms
styles.css / *.css        visual system
data.js                    shared cached read-side hydration
data/*.json                persistent Detour history
data/SCHEMA.md             event + payload contract
tools/build-event.mjs      raw payload normalizer
tools/append-event.mjs     validated writer + deduplication
tools/test-events.mjs      event pipeline regression tests
tools/validate-data.mjs    persistent data integrity checks
tools/validate-pages.mjs   page refs, fragments and script-order checks
shortcuts/                 phone bridge plan + setup checklist
.github/workflows/         dry-run, write and validation automation
```

## One-command check

```bash
npm test
```

This runs the event pipeline regression suite, validates committed JSON data, and checks local page references and script ordering.

## Development rule

The active working branch is `dev`. Keep `main` conservative until a release/publish decision is made.
