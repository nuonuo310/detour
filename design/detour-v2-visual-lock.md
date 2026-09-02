# Detour v2 visual lock

This file freezes the visual direction for the three-screen Detour prototype so later work does not drift back into generic UI cards or emoji placeholders.

## Core mood

Detour v2 is a soft violet / pearl-white dream garden with wisteria, a cream fox, butterflies, silver-violet bells, paper, ribbons and small keepsake objects. The target feeling is restrained abundance: many details, but each detail has a clear place and enough breathing room.

The reference direction is not flat SaaS UI and not a crowded fantasy poster. It should feel like an illustrated place we can enter.

### Palette

- pearl / warm paper white as the main ground
- muted Detour violet and lilac as the main accent family
- pale mist blue-violet for glass / moonlit depth
- desaturated leaf green only where botanical structure is needed
- very small amounts of warm metal / pearl highlight

Avoid strong saturated purple blocks, dark UI panels in day mode, and grey system-card surfaces.

### Typography

Use contrast deliberately:

- DETOUR / opening poetry / module English titles / a few central phrases: elegant display serif or script-like treatment
- Chinese labels: refined Song / Ming style, not UI sans where atmosphere matters
- dates, weather, controls, TODAY trail text: clear and restrained

Not every line should be decorative. The visual hierarchy comes from a few expressive lines surrounded by readable quiet text.

## Screen 1 — opening

Composition is locked:

- left: Welcome / DETOUR / Chinese subtitle / English subtitle
- center: cream-white fox and path into the garden
- upper-right: hanging wisteria and a large ornamental bell
- lower-right: the actual interactive wake / ring control
- lower-center: one poetic line + small English echo

The opening should resemble an illustrated gate into a place, not a hero section with UI decorations.

The large bell is decorative and jewel-like: pearl / silver / violet, with ribbon and butterfly details. The wake control is a separate circular interaction affordance.

The fox should be soft cream-white with a very large fluffy tail, a small violet floral / ribbon detail, and no cartoon emoji look.

## Screen 2 — transition

This is a moving passage, not a destination page.

The center axis is frozen: path and fox share the same 50% horizontal axis. Do not reintroduce horizontal movement into the fox animation. Motion is depth, scale and forward travel.

Add the feeling of entering the garden through foreground wisteria / petals crossing the camera, soft depth layers and the fox briefly looking back before running inward.

The transition should visually inherit the moonlit-garden / pale-lilac world from screen 1 and land naturally in the lobby, not feel like a generic rounded rectangle animation stage.

## Screen 3 — lobby

The reference composition is authoritative:

- upper-left: Detour brand block, light paper treatment
- upper-center: date / weather / greeting, also light paper treatment
- upper-right: two replaceable avatar portraits with delicate botanical / bow / butterfly ornament, plus day-night-settings controls
- left and right: three content entrances each
- center: fox, TODAY trace and welcome-home breathing room
- lower-center: arch + bell
- lower edges: MESSAGE / DIARY / MEMORY / LETTER auxiliary entries

### Six main entrances

Do not put the six entrances inside thick cards.

Each entrance is an illustrated object cluster plus title / Chinese label / one short line:

- Listen: gramophone / record player
- Read: violet book stack / open book
- Gifts: envelope, ribbon, small gift, pearl / keepsake objects
- Feeding: lilac drink / tea tray / small note
- Games: game controller / dice / playful keepsakes
- Dates: quill, paper, small heart keepsake / candle

These should look like objects placed around a garden-room composition, not dashboard widgets.

### Paper and keepsake language

Paper surfaces may use old-letter / stationery texture, softened edges, wax-seal / ribbon / pearl details, but should stay pale and breathable.

Use roses only as a secondary keepsake motif; wisteria remains the primary botanical identity of Detour v2.

### Central fox and bell

The central fox is the visual anchor. It should not be squeezed by surrounding modules. The lower bell zone should feel architectural / ceremonial, with a light arch rather than a thick bordered component.

## Responsive intent

Desktop / wide composition should preserve the illustrated spatial layout. Mobile should recompose rather than merely shrink every desktop element. The mobile opening can keep the bell and fox as the strongest landmarks, while text and ornament simplify.

## Things that are explicitly rejected

- generic rounded-card dashboard
- emoji as final visual assets
- every section enclosed by borders
- heavy frosted-glass panels everywhere
- overdecorating all typography
- random purple flowers without hierarchy
- moving screen-2 fox off the shared center axis
- treating the supplied reference images as literal assets to copy; they define visual language and object direction, while final Detour assets should be our own

## Current prototype rule

Continue work on `visual-v2-prototype` and `prototype/detour-v2-three-screen.html`. Preserve the original visual version in `archive/original-visual-v1`.

The latest pre-lock prototype head reviewed before this file was `bc3bf4152a671455b4e06a187b1dfe2b587c327f`.
