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

```json
{
  "version": 1,
  "updatedAt": "2026-08-25T15:00:00+08:00",
  "records": [
    {
      "id": "music-20260825150000-a1b2c3d4e5",
      "at": "2026-08-25T15:00:00+08:00",
      "title": "歌名",
      "artist": "歌手",
      "url": "https://...",
      "note": "沈述留下的话"
    }
  ]
}
```

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

## Rules

- `at` and `updatedAt` use ISO 8601 with an explicit timezone offset.
- If a raw payload omits `at`, the builder creates a `+08:00` timestamp.
- Every event gets a deterministic ID made from its timestamp plus a short content hash. Retries of the same event are ignored, while distinct events in the same second remain separate.
- Keep newest and older records; the UI derives totals from history instead of storing counters separately.
- Test records must never be mixed into real history. Use the Dry Run workflow for first-connection tests.
- The browser is read-only. Secrets or GitHub write tokens must never be placed in page JavaScript.
