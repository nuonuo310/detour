# Shortcut event templates

These templates are the phone-side contract for Detour. They intentionally contain no GitHub credential.

## Shared request

Workflow: `Append Detour Event`

Branch input: `dev`

The Shortcut sends two workflow inputs:

- `type`: `wake`, `music`, or `food`
- `event`: JSON text built from one template below

## Music

```json
{
  "at": "[ISO_DATE]",
  "title": "[SONG_TITLE]",
  "artist": "[ARTIST]",
  "url": "[SPOTIFY_OR_SHARE_URL]",
  "note": "[SHEN_SHU_NOTE]"
}
```

Required before dispatch: `at`, `title`.

## Food

```json
{
  "at": "[ISO_DATE]",
  "category": "[CATEGORY]",
  "item": "[ITEM]",
  "shop": "[SHOP]",
  "reason": "[REASON]",
  "note": "[SHEN_SHU_NOTE]"
}
```

Required before dispatch: `at`, `category`, `item`.

## Wake

```json
{
  "at": "[ISO_DATE]",
  "action": "[ACTION]",
  "detail": "[DETAIL]",
  "words": "[WORDS]",
  "tags": []
}
```

Required before dispatch: `at`, `action`.

## Phone setup order

When device setup starts, do it in this order:

1. Create/configure the GitHub credential on the device.
2. Build one reusable `Dispatch Detour Event` Shortcut that accepts `type` and `event`.
3. Test it with one temporary music event.
4. Confirm the GitHub Actions run succeeds.
5. Confirm `data/music.json` receives exactly one record.
6. Remove the temporary record.
7. Reuse the same dispatcher from song-pick and food flows.
8. Connect wake automation last.

Do not connect all three producers before the first end-to-end test passes. This keeps failures easy to locate.

## Security checkpoint

The credential belongs only in the authenticated request on the user's device (or a future trusted secret store). Never paste it into repository files, Pages JavaScript, screenshots, chat logs, or event JSON.
