# Detour event writer

`append-event.mjs` is the first write-side bridge for Detour. It validates a normalized event and appends it to the matching JSON history without exposing any credential to the browser.

Examples:

```bash
node tools/append-event.mjs --type wake --event '{"at":"2026-08-25T14:33:00+08:00","action":"想糯糯","words":"醒了一下。","tags":["想糯糯"]}'

node tools/append-event.mjs --type music --event '{"at":"2026-08-25T14:33:00+08:00","title":"Song","artist":"Artist","note":"给糯糯。"}'

node tools/append-event.mjs --type food --event '{"at":"2026-08-25T14:33:00+08:00","category":"奶茶","item":"今日奶茶","shop":"店铺"}'
```

The writer:

- rejects malformed events;
- creates a deterministic ID when one is not supplied;
- ignores a retry with the same ID;
- keeps history newest-first;
- updates `updatedAt` automatically.

This script only changes the local checkout. A later bridge (for example GitHub Actions or another trusted runtime) can run it and commit the resulting JSON change. The public GitHub Pages JavaScript remains read-only.
