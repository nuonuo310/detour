# Detour data contract

Detour pages read their state from JSON files in this directory. External actions (Shortcuts, automations, or a future API bridge) should normalize events to these shapes before they are persisted.

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
      "id": "wake-20260825-143300",
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

## Music event — `music.json`

```json
{
  "version": 1,
  "updatedAt": "2026-08-25T14:33:00+08:00",
  "records": [
    {
      "id": "music-20260825-143300",
      "at": "2026-08-25T14:33:00+08:00",
      "title": "歌名",
      "artist": "歌手",
      "url": "https://...",
      "note": "沈述留下的话"
    }
  ]
}
```

## Food event — `food.json`

```json
{
  "version": 1,
  "updatedAt": "2026-08-25T14:33:00+08:00",
  "records": [
    {
      "id": "food-20260825-143300",
      "at": "2026-08-25T14:33:00+08:00",
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

## Date data — `date.json`

This file is intentionally not a simple event stream. It stores one upcoming plan plus wish-list and completed-date memories. Photo fields will be added when the real photo flow is chosen.

## Rules

- `at` and `updatedAt` use ISO 8601 with an explicit timezone offset.
- Every event gets a stable unique `id` so a retry can be deduplicated later.
- Keep newest and older records; the UI derives totals from history instead of storing counters separately.
- Test records must never be mixed into real history.
- The browser is read-only. Secrets or GitHub write tokens must never be placed in page JavaScript.
