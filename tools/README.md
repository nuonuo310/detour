# Detour tooling

The `tools/` directory contains the write-side and validation utilities used by Detour.

## Event pipeline

### `build-event.mjs`

Normalizes a small raw payload from Shortcuts or another trusted caller into the canonical Detour event shape.

Examples:

```bash
node tools/build-event.mjs --type wake --payload '{"choice":"想糯糯","message":"醒了一下。"}'
node tools/build-event.mjs --type music --payload '{"song":"Song","artist":"Artist","link":"https://open.spotify.com/"}'
node tools/build-event.mjs --type food --payload '{"kind":"奶茶","name":"今日奶茶","store":"店铺"}'
```

If `at` is omitted, the builder generates the current Detour timestamp with a `+08:00` offset.

### `append-event.mjs`

Validates a normalized event and appends it to the matching JSON history.

```bash
node tools/append-event.mjs --type wake --event '{"at":"2026-08-25T14:33:00+08:00","action":"想糯糯","words":"醒了一下。","tags":["想糯糯"]}'
```

The writer:

- rejects malformed events and timestamps without an explicit timezone;
- creates a deterministic content-based ID when one is not supplied;
- ignores a retry with the same ID;
- preserves distinct events that occur in the same second;
- keeps history newest-first;
- updates `updatedAt` automatically.

## Validation

### `test-events.mjs`

Regression tests for payload normalization, timestamp handling, retry deduplication, and same-second distinct events.

### `validate-data.mjs`

Checks the committed Detour JSON files for structural and data-integrity problems.

### `validate-pages.mjs`

Checks the five public pages for missing local CSS/JS/HTML references, missing local fragment targets, and history-script load order relative to `data.js`.

## Unified command

Run the full repository self-check with:

```bash
npm test
```

The same command is used by the GitHub Actions write workflows before real data is changed.

The public GitHub Pages JavaScript remains read-only. Credentials and write capability must stay in trusted callers such as GitHub Actions or the user's iPhone Shortcut.