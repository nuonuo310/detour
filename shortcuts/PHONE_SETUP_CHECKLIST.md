# Phone setup checkpoint

This is the one-time setup we will complete together on the iPhone before real Detour events can be dispatched from Shortcuts.

## Goal

Allow a Shortcut on the user's phone to trigger the existing GitHub Actions workflows without putting any credential into the Detour repository or GitHub Pages code.

## What must stay private

- GitHub personal access token or equivalent credential
- Authorization header value
- Any screenshot that visibly contains the credential

Never paste the credential into repository files, issues, commits, page JavaScript, or public screenshots.

## What the phone request will need

Endpoint pattern:

`POST https://api.github.com/repos/nuonuo310/detour/actions/workflows/<workflow-file>/dispatches`

Headers:

- `Accept: application/vnd.github+json`
- `Authorization: Bearer <PRIVATE_TOKEN>`
- `X-GitHub-Api-Version: 2022-11-28`
- `Content-Type: application/json`

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

The phone uses the same `type + payload` body for both dry-run and real append. Only the workflow filename changes.

Example music payload:

```json
{
  "song": "Song",
  "artist": "Artist",
  "link": "https://open.spotify.com/...",
  "message": "给糯糯。"
}
```

The repository normalizes those natural fields through `tools/build-event.mjs`; the Shortcut does not need to construct the final Detour schema itself.

## Safe first connection order

1. Create the minimum-scope GitHub credential on the user's account.
2. Store it only inside the iPhone Shortcut request header.
3. Point the first request at the **Dry Run Detour Event** workflow.
4. Send one harmless music test payload.
5. Confirm the workflow run succeeds and real `data/*.json` files remain unchanged.
6. Keep the same request body and switch only the workflow filename to **Append Detour Event**.
7. Send one clearly identified real-world test and verify the page updates.

## Expected HTTP behavior

A successful GitHub workflow dispatch normally returns HTTP `204 No Content`. This means GitHub accepted the dispatch request; the workflow can still fail later, so we should also inspect the Actions run during first setup.

## Shortcut design rule

Logging the Detour event and opening/playing Spotify are separate steps. The Shortcut should dispatch the Detour record first (or independently), then try the Spotify action. A Spotify rendering/playback failure must not delete or undo the Detour record.

## When we do this together

The user only needs to operate the GitHub credential screen and the iPhone Shortcut UI. Repository-side workflows, validation, event shapes, and debugging remain on the engineering side.
