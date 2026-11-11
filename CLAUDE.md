# Project Notes for AI Assistants

## Branch Structure

This repository has two branches that share the same infrastructure and differ only in how they communicate with the Joule web client:

### `main` — JouleConnector (recommended)
Uses `JouleConnector` from `sap.ui.joule.frontend` (SAPUI5 ≥ 1.151). This is the recommended approach and what the blog post describes.

### `pure-joule-webclient` — Direct webclient APIs
One commit on top of `main`. Uses a custom `JouleWebclientHelper.js` instead of `JouleConnector`, for SAPUI5 < 1.151 or non-UI5 environments. This is what the blog appendix describes.

**The branch's single commit changes exactly 6 files:**

| File | What differs |
|---|---|
| `webapp/JouleWebclientHelper.js` | New file (230 lines) — the custom helper |
| `webapp/controller/Main.controller.js` | Imports `JouleWebclientHelper` instead of `JouleConnector`; adds 3 bonus webclient API demo methods (`onJouleTogglePress`, `onJouleToggleNavPress`, `onJouleSendUserMessagePress`) |
| `webapp/view/Main.view.xml` | Adds 3 `<headerContent>` buttons wired to those bonus methods |
| `types/sap.das.webclient.d.ts` | New file — TypeScript type definitions for the webclient APIs |
| `types/sap.das.webclient+docs.d.ts` | New file — same types with inline JSDoc documentation |
| `README.md` | Branch-specific title, description, architecture section (documents `JouleWebclientHelper` internals), bonus API section, TypeScript Usage section, API limitations section. All infrastructure sections (Requirements, Preparation, Run, HTTPS/v5 explanation) are identical to main. |

**Everything else is inherited from `main`:** `package.json`, `ui5.yaml`, `docs/`, `index-flp.html`, `index-standalone.html`, all infra/CI files.

## After Updating `main`

When `main` changes (renovate, dependency bumps, doc edits, any infra change):

```sh
git checkout pure-joule-webclient
git rebase main
# If conflicts arise, they can only be in the 6 files listed above.
# Accept main's version for anything outside those files.
git checkout main
```

If the branch commit ever needs to be recreated from scratch, the recipe is: branch from `main`, then apply the 6-file delta described above. The controller diff is mechanical (JouleConnector → JouleWebclientHelper renaming + the 3 bonus methods). The README inherits main's content and only changes the Description, Application Architecture, and adds sections "JouleWebclientHelper internals", "Bonus: Direct Joule web client API calls", "TypeScript Usage", and "API Limitations".
