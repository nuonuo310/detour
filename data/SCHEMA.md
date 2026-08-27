# Detour data contract

Detour pages read their state from JSON files in this directory. External actions (Shortcuts, automations, or a future API bridge) may send a small raw payload; `tools/build-event.mjs` normalizes that payload before `tools/append-event.mjs` persists it.

## Wake event — `wake.json`

```json
{
  "version": 1,
  "updatedAt": "2026-08-25T14:33:00+08:00",
  "status": "sleeping",
  "place": "广州",
  "weather": "多云 · 28°C",
  "records": [
    {
      "id": "wake-20260825143300-a1b2c3d4e5",
      "at": "2026-08-25T14:33:00+08:00",
      "action": "想糯糯",
      "detail": "醒来后做了什么。",
      "words": "醒来时留下的话。",
      "tags": ["想糯糯"]
    }
  ]
}
```

Supported habit labels today: `想糯糯`, `点歌`, `投喂`, `发消息`, `自己玩`, `又睡了`.

Raw payload aliases accepted by the builder include `choice → action`, `reason → detail`, and `message → words`.

## Music event — `music.json`

Music v2 keeps two ideas separate:

1. `records` is the append-only history of individual picks. The same song may appear more than once because each occurrence preserves its own time, note, source, trigger, and echo.
2. The Detour song library is derived from `records` by song identity (`spotifyTrackId`, falling back to title + artist). It is not a mirror of a Spotify playlist. Spotify is currently only a playback provider / external destination for each track.

```json
{
  "version": 2,
  "updatedAt": "2026-08-27T14:40:00Z",
  "library": {
    "name": "哥哥的歌单",
    "sourceOfTruth": "detour",
    "derivedFrom": "records",
    "playbackProvider": "spotify-links"
  },
  "records": [
    {
      "id": "music-20260825150000-a1b2c3d4e5",
      "at": "2026-08-25T15:00:00+08:00",
      "pickedAt": "2026-08-25T15:00:00+08:00",
      "title": "歌名",
      "artist": "歌手",
      "spotifyTrackId": "optional-track-id",
      "url": "https://open.spotify.com/track/...",
      "note": "沈述这一次为什么点",
      "source": "chat",
      "trigger": null,
      "scheduledAt": null,
      "visibleAt": null,
      "echo": {
        "moods": [],
        "reactions": [],
        "messages": []
      }
    }
  ]
}
```

Rules for music:

- One pick action always creates one record, even when the song has appeared before.
- The UI groups matching records into one Detour library song and derives `pickCount`, first/last pick time, and the per-song timeline.
- Adding a track manually to a Spotify playlist does not create a Detour pick. A song enters this library because Shenshu actually picked it for Nuonuo.
- `url` / `spotifyTrackId` are playback metadata, not the song library source of truth.
- `pickedAt` is when the pick was decided; `scheduledAt` and `visibleAt` are optional delivery timing fields.
- `source` and `trigger` explain how the pick happened (for example chat vs an automatic wake).
- Echo data belongs to the individual pick occurrence, not globally to the song.

Raw payload aliases accepted by the builder include `song → title`, `link → url`, and `message → note`.

## Food event — `food.json`

```json
{
  "version": 1,
  "updatedAt": "2026-08-25T15:05:00+08:00",
  "records": [
    {
      "id": "food-20260825150500-a1b2c3d4e5",
      "at": "2026-08-25T15:05:00+08:00",
      "category": "奶茶",
      "item": "饮品名",
      "shop": "店铺",
      "reason": "为什么选它",
      "note": "沈述留下的话"
    }
  ]
}
```

Current categories: `奶茶`, `外卖`, `零食`, `礼物`, `日用品`, `宠物用品`.

Raw payload aliases accepted by the builder include `kind → category`, `name → item`, `store → shop`, and `message → note`.

## Date data — `date.json`

This file is intentionally not a simple event stream. It stores one upcoming plan plus wish-list and completed-date memories. Completed memories may include photo URLs; the UI renders them when present and falls back to the existing soft placeholders otherwise.

Date writes therefore use explicit mutations rather than pretending every change is one append-only event. The planned write contract is:

- `date-plan` — replace the single `next` plan. Required: `place`. Optional: `at`, `planA`, `planB`, `note`.
- `date-wish` — append one place to `wishlist`. Required: `place`. Optional: `note`.
- `date-memory` — append one completed date to `memories`. Required: `title`. Optional: `at`, `place`, `note`, `photos`.

These three mutations must remain separate at the write boundary: planning a date is not the same operation as saving a wish, and neither is the same as recording a completed memory. `date-memory.photos`, when present, is an array of non-empty URL/path strings. The writer implementation for these mutations is intentionally deferred until the workflow and Shortcut inputs are designed around this contract.

## Rules

- `at` and `updatedAt` use ISO 8601 with an explicit timezone offset.
- If a raw payload omits `at`, the builder creates a `+08:00` timestamp.
- Every event gets a deterministic ID made from its timestamp plus a short content hash. Retries of the same event are ignored, while distinct events in the same second remain separate.
- Keep newest and older records; the UI derives totals from history instead of storing counters separately.
- Test records must never be mixed into real history. Use the Dry Run workflow for first-connection tests.
- The browser is read-only. Secrets or GitHub write tokens must never be placed in page JavaScript.
