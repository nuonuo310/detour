# Phone setup checkpoint

This is the one-time setup we will complete together on the iPhone before real Detour writes can be dispatched from Shortcuts.

## Goal

Allow a Shortcut on the user's phone to trigger the existing GitHub Actions workflows without putting any credential into the Detour repository or GitHub Pages code.

## Current checkpoint

- Fine-grained GitHub token is limited to `nuonuo310/detour`.
- Token has Actions read/write permission.
- iPhone Shortcut can successfully call GitHub `workflow_dispatch`.
- `dry-run-detour-event.yml` has completed green end-to-end from the phone.
- The next phone step is to duplicate the working Dry Run Shortcut and change only the workflow filename to `append-detour-event.yml` for the first real music write.

Do not overwrite the working Dry Run Shortcut. Keep it as a permanent safe diagnostic path.

## What must stay private

- GitHub personal access token or equivalent credential
- Authorization header value
- Any screenshot that visibly contains the credential

Never paste the credential into repository files, issues, commits, page JavaScript, or public screenshots.

## Shared GitHub request

Endpoint pattern:

`POST https://api.github.com/repos/nuonuo310/detour/actions/workflows/<workflow-file>/dispatches`

Headers:

- `Accept: application/vnd.github+json`
- `Authorization: Bearer <PRIVATE_TOKEN>`
- `X-GitHub-Api-Version: 2022-11-28`
- `Content-Type: application/json`

A successful GitHub workflow dispatch normally returns HTTP `204 No Content`. This means GitHub accepted the dispatch request; the workflow can still fail later, so inspect the Actions run during first setup.

## Event writes: wake / music / food

Use the event workflows with the same request body for dry-run and real writes. Only the workflow filename changes.

Body:

```json
{
  "ref": "dev",
  "inputs": {
    "type": "music",
    "payload": "{...raw payload JSON as a string...}"
  }
}
```

Example music payload:

```json
{
  "song": "Song",
  "artist": "Artist",
  "link": "https://open.spotify.com/...",
  "message": "给糯糯。"
}
```

The repository normalizes natural fields through `tools/build-event.mjs`; the Shortcut does not need to construct the final Detour schema itself. The normalizer also tolerates common iOS Shortcut transport wrappers and escaping discovered during the first phone connection.

First real-write sequence:

1. Duplicate the proven `Detour Dry Run` Shortcut.
2. Rename the copy to `Detour Write`.
3. Change only the endpoint workflow filename from `dry-run-detour-event.yml` to `append-detour-event.yml`.
4. Leave headers, `ref`, `inputs`, `type`, and payload structure unchanged.
5. Send one intentional real music record, not a disposable test record.
6. Confirm the `Append Detour Event` Actions run is green.
7. Confirm `data/music.json` contains exactly one new record and the page renders it.
8. Keep the Dry Run Shortcut for later diagnostics.

## Date writes: plan / wish / memory

Date data uses a separate mutation workflow because `date.json` is not an append-only event stream.

Body:

```json
{
  "ref": "dev",
  "inputs": {
    "action": "date-wish",
    "payload": "{...date payload JSON as a string...}"
  }
}
```

Supported actions:

- `date-plan` — replace the current `next` plan.
- `date-wish` — append one place to the wish list.
- `date-memory` — append one completed date memory, optionally with photos.

Use `dry-run-date-mutation.yml` first, then switch only the workflow filename to `mutate-detour-date.yml` after the date dry run succeeds. The `action + payload` body stays the same.

## Shortcut design rules

Logging the Detour event and opening/playing Spotify are separate steps. The Shortcut should dispatch the Detour record first (or independently), then try the Spotify action. A Spotify rendering/playback failure must not delete or undo the Detour record.

Retrying the same event, wish, or memory is safe because the repository deduplicates stable IDs. Replacing `date-plan` is intentionally not append-only: the newest plan becomes `date.next`.

## When we do this together

The user only needs to operate the GitHub credential screen and the iPhone Shortcut UI. Repository-side workflows, validation, payload shapes, and debugging remain on the engineering side.
