# Shortcut event templates

These templates are the phone-side contract for Detour. They intentionally contain no GitHub credential.

## Shared event request

Workflow: `Append Detour Event`

Branch input: `dev`

The Shortcut sends two workflow inputs:

- `type`: `wake`, `music`, or `food`
- `payload`: raw JSON text built from one template below

Use the same `type + payload` body with the dry-run workflow first. Only the workflow filename changes when moving from dry-run to the real writer.

## Music payload

```json
{
  "song": "[SONG_TITLE]",
  "artist": "[ARTIST]",
  "link": "[SPOTIFY_OR_SHARE_URL]",
  "message": "[SHEN_SHU_NOTE]"
}
```

`tools/build-event.mjs` maps `song → title`, `link → url`, and `message → note`. `at` may be supplied explicitly; otherwise the repository creates a +08:00 timestamp.

## Food payload

```json
{
  "kind": "[CATEGORY]",
  "name": "[ITEM]",
  "store": "[SHOP]",
  "reason": "[REASON]",
  "message": "[SHEN_SHU_NOTE]"
}
```

`kind → category`, `name → item`, `store → shop`, and `message → note` are normalized repository-side.

## Wake payload

```json
{
  "choice": "[ACTION]",
  "reason": "[DETAIL]",
  "message": "[WORDS]",
  "tags": []
}
```

`choice → action`, `reason → detail`, and `message → words` are normalized repository-side.

## Date mutations

Date data uses a separate workflow because planning, wishing, and recording a completed date are different operations. The date workflow accepts:

- `action`: `date-plan`, `date-wish`, or `date-memory`
- `payload`: JSON text

Examples:

```json
{
  "place": "海边",
  "at": "2026-09-01T18:30:00+08:00",
  "planA": "散步看日落",
  "planB": "找一家店吃饭",
  "note": "慢慢来。"
}
```

```json
{
  "place": "旧书店",
  "note": "想一起慢慢逛。"
}
```

```json
{
  "title": "第一次夜游",
  "at": "2026-08-20T21:00:00+08:00",
  "place": "江边",
  "note": "那天风很好。",
  "photos": ["https://example.com/photo.jpg"]
}
```

Run the date dry-run workflow before the real date mutation workflow during first setup.

## Phone setup order

When device setup starts, do it in this order:

1. Create/configure the GitHub credential on the device.
2. Build one reusable `Dispatch Detour Event` Shortcut that accepts `type` and `payload`.
3. Point it at `Dry Run Detour Event` and send one harmless music payload.
4. Confirm the dry-run succeeds and real data is unchanged.
5. Switch only the workflow filename to `Append Detour Event`.
6. Send one clearly identified real event and verify the page updates.
7. Reuse the same dispatcher from song-pick and food flows.
8. Connect wake automation after the manual path is stable.
9. Add a separate date dispatcher only when date writes are needed.

Do not connect every producer before the first end-to-end test passes. This keeps failures easy to locate.

## Security checkpoint

The credential belongs only in the authenticated request on the user's device (or a future trusted secret store). Never paste it into repository files, Pages JavaScript, screenshots, chat logs, or payload JSON.
