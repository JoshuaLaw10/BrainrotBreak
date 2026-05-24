# State at Handoff — Doomscroll Break

> **Read this first in every new session.**  
> It is the authoritative source of what's done, what's next, and where skeletons are buried.

---

## What this is

A Chrome extension (MV3) that shows a self-closing video overlay on chatgpt.com while ChatGPT is generating. The overlay closes automatically when the answer is ready. Targets Chrome Web Store submission.

**Repo:** https://github.com/JoshuaLaw10/DoomBreak  
**Privacy policy (live after GitHub Pages setup):** https://joshuaLaw10.github.io/DoomBreak/privacy.html

---

## Current state (as of 2026-05-24)

### ✅ Done

| Area | Status |
|---|---|
| Architecture refactor | Complete — platform adapter, data/code separation, state machine |
| `platforms/chatgpt.js` | Complete — all selectors, telemetry, getStateSnapshot() |
| `content_script.js` | Complete — edge-triggered observer + heartbeat, no raw selectors |
| `service_worker.js` | Complete — dropped oEmbed, clean install init |
| `popup.html / popup.js` | Complete — selector health check section added |
| `data/keywords.js` | Complete — 4-tag keyword mapping |
| `data/slogans.js` | Complete — 20 slogans |
| `data/feed.js` | Placeholder — regenerate after sourcing clips |
| `scripts/generate-feed.mjs` | Complete — validates media/ + regenerates data/feed.js |
| `scripts/generate-icons.mjs` | Complete — rasterises SVG → 4 PNG sizes |
| `icons/icon.svg` | Complete — brain + play button design |
| `icons/icon-{16,32,48,128}.png` | ✅ Generated and committed |
| `manifest.json` | Complete — v1.0.0, MV3, correct permissions |
| Test suite | **79 passing, 7 skipped** — baseline locked |
| `PRIVACY.md` | Complete — plain text version |
| `docs/privacy.html` | Complete — GitHub Pages version (needs Pages enabled in repo settings) |
| `STORE_LISTING.md` | Complete — short desc, long desc, permission justifications, screenshot shot list |
| `STATE_AT_HANDOFF.md` | This file |
| GitHub Actions CI | `.github/workflows/test.yml` — runs tests on every push |
| `.gitignore` | `node_modules/`, `metadata.json`, `.DS_Store` |

---

## 🔴 Blocked on human action

These **cannot be done by code alone** — they require a browser or physical action:

### 1. Enable GitHub Pages (5 min)
Go to: **github.com/JoshuaLaw10/DoomBreak → Settings → Pages**  
Set source: **Deploy from branch → `main` → `/docs`**  
This publishes the privacy policy at:  
`https://joshuaLaw10.github.io/DoomBreak/privacy.html`

### 2. Capture real ChatGPT DOM fixtures (1–2 hours)
Follow `tests/fixtures/CAPTURE.md`. You need a logged-in ChatGPT session.  
Replace the 3 placeholder HTML files with real page captures.  
This activates the 7 skipped tests — **critical path** for validating that `platforms/chatgpt.js` works against the real DOM.  
If any of the 7 newly-activated tests fail, fix the selectors in `platforms/chatgpt.js` only.

### 3. Source 80 clips (several hours)
Follow `docs/SOURCING.md`. Pexels/Pixabay/Mixkit **only**.  
Place clips in `media/`, fill in `metadata.json` (copy from `metadata.template.json`).  
Then run: `npm run feed` to validate + regenerate `data/feed.js`.  
**DO NOT use YouTube/TikTok/Instagram** — instant Chrome Web Store rejection.

### 4. Take 5 screenshots (30 min)
1280×800 each. Shot list is in `STORE_LISTING.md`.  
Requires the extension loaded unpacked with real clips sourced.

### 5. Manual end-to-end test
Load extension unpacked at `chrome://extensions` → "Load unpacked" → select the repo root.  
Send a long prompt on chatgpt.com, verify:  
- [ ] Overlay appears within ~250ms
- [ ] Badge shows "Thinking" then "Typing"
- [ ] Overlay auto-closes when generation ends
- [ ] Popup shows green selector health
- [ ] Keyboard shortcut `Cmd+Shift+D` works
- [ ] Sound toggle works
- [ ] Streak counter increments

---

## What's next (in order)

```
Priority 1: Enable GitHub Pages (5 min, unblocks submission form)
Priority 2: Capture DOM fixtures → activate 7 skipped tests → fix selectors if needed
Priority 3: Source clips → npm run feed
Priority 4: Manual E2E test
Priority 5: Screenshots
Priority 6: Fill Chrome Web Store form using STORE_LISTING.md
Priority 7: Submit
```

---

## Architecture decisions that must not be undone

1. **All CSS selectors live in `platforms/chatgpt.js` only.** `content_script.js` never queries the DOM directly. If ChatGPT's markup changes, only `platforms/chatgpt.js` needs updating.

2. **`vi.resetModules()` + module cache clearing is load-bearing in the test suite.** Do not refactor the test import pattern without understanding why it exists — each test needs a fresh module singleton.

3. **No oEmbed, no network requests.** The old `service_worker.js` fetched YouTube metadata. That's gone. All clips are local MP4s.

4. **Feature freeze at v1.0.** Don't add features before the Chrome Web Store submission. Multi-LLM, Pexels API, custom feeds — all post-launch.

5. **Legal clip sourcing is non-negotiable.** Pexels/Pixabay/Mixkit only. Anything else = rejection.

---

## Known sharp dependency note

`sharp` is a dev dependency used only for `npm run icons`. It is not bundled with the extension. The generated PNGs are committed directly. Don't run `npm run icons` unless you're updating the icon design — the PNGs are already correct.

---

## Test baseline

```
Test Files  2 passed (2)
     Tests  79 passed | 7 skipped (86)
```

The 7 skipped tests are in `tests/doombreak.test.js` inside a `describe.skip('ChatGPT DOM fixture tests...')` block. Remove the `.skip` only after replacing the placeholder fixture HTML files.

**Never let the passing count drop below 79.** Every new behaviour gets new tests.
