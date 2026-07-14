# 🧠 Brainrot Break

**Cat & dog reels (and calmer things) while ChatGPT thinks. Auto-closes the moment your answer is ready.**

When ChatGPT is generating, you instinctively open a new tab and start scrolling — and don't come back. Brainrot Break doesn't fight the habit; it contains it. The moment ChatGPT starts generating, a full-screen short-clip overlay opens. The moment your answer is ready, it closes itself. No discipline required.

**[Technical writeup](docs/WRITEUP.md) · [Privacy policy](https://joshualaw10.github.io/BrainrotBreak/privacy.html) · [Original pitch](docs/ORIGINAL_PITCH.md)**

---

## Features

- **Auto-close** — the overlay disappears the instant the AI finishes, so you never miss your answer
- **Scrollable reels** — wheel or swipe to snap to the next clip, scroll up to go back
- **Live status badge** — Thinking → Typing as the response develops
- **Prompt-Aware Mode** (on by default) — ask about sports, get sports clips; ask something calm, get calm clips
- **Daily streak counter** — see how many times it pulled you back today
- **Sound toggle** and keyboard shortcut (Cmd/Ctrl+Shift+D)
- **Selector health check** — the popup warns you if ChatGPT changed its DOM and detection might be degraded
- **100% local** — zero network requests, no analytics, no servers; all clips ship inside the extension

## Install

From source (Chrome Web Store listing pending):

```bash
git clone https://github.com/JoshuaLaw10/BrainrotBreak
cd BrainrotBreak
PEXELS_API_KEY=xxx npm run source   # download clips (free key: pexels.com/api)
npm run feed                        # validate + generate data/feed.js
```

Then `chrome://extensions` → enable Developer Mode → "Load unpacked" → select the repo root. Open chatgpt.com and send a prompt.

---

## The engineering

ChatGPT's DOM changes frequently and without notice. Most extensions that scrape it break silently — users find out before the developer does. Brainrot Break was built around that problem, and the patterns below are the interesting part of this repo.

### Platform adapter pattern

Every selector lives in one file: [`platforms/chatgpt.js`](platforms/chatgpt.js). The content script never touches raw CSS. When OpenAI ships a markup change, there's exactly one file to update, one diff to review.

```
content_script.js       ← state machine, overlay lifecycle, no selectors
platforms/chatgpt.js    ← all selectors, all DOM logic, nothing else
```

This paid off immediately: the July 2026 fixture capture caught ChatGPT switching conversation turns from `<article>` to `<section>`. The fix was one line, in one file.

### Selector telemetry as a production canary

How do you know your selectors still work in production, on real users' ChatGPT sessions, without building a backend?

Every successful selector match records a timestamp in `chrome.storage.local`. The popup reads those timestamps and surfaces a health warning if no stop-button selector has matched in 3+ days:

```
stop:testid         ✓ 4h ago    ← primary, most specific
stop:aria-stop-gen  ✓ 4h ago    ← fallback #1
stop:composer-aria  — 7d ago    ← fallback #2, stale
```

No server. No crash reporting service. The canary fires automatically in production, on real sessions, with zero infrastructure.

### State machine with signature-based typing detection

The tricky detection problem: ChatGPT shows a stop button while it's "thinking" (computing, no text yet) and while it's "typing" (streaming text). Both states look the same from the stop-button perspective, but the overlay wants to show a different badge for each.

The naive fix — track text length — breaks immediately. Streaming responses don't always increase text length monotonically; they can replace, reformat, or reorder. The reliable signal is a `signature`:

```javascript
// Single DOM pass. Multiplying length × capped HTML gives a number that
// changes whenever content changes, regardless of whether length increased.
signature = (text.length * 1000) + Math.min(html.length, 200_000)
```

`signature === 0` → thinking. `signature > 0 && signature !== lastSignature` → typing started.

### Single-pass DOM reads via `getStateSnapshot()`

The heartbeat runs every 250ms while generating. The naive pattern calls four separate `querySelectorAll` operations per tick. `getStateSnapshot()` batches them into one DOM walk:

```javascript
ChatGPT.getStateSnapshot()
// → { generating, turnCount, signature, lastUserPrompt }
// One walk of the conversation tree. Not four.
```

### Testing browser-embedded scripts without Puppeteer

Content scripts run in the browser's page context — they set globals, they can't be `import`ed cleanly, and they depend on `chrome.*` APIs. The test pattern:

```javascript
// Each test re-executes the module by clearing vitest's registry.
// vi.resetModules() alone isn't enough — require.cache must also be cleared.
// This is the only way to get a fresh singleton per test.
vi.resetModules();
const mod = await import('../content_script.js?t=' + Date.now());
mod._resetForTest();
```

The `?t=` cache-buster forces vitest to treat each dynamic import as a new module, which re-runs all top-level initialization. Paired with `if (typeof module !== 'undefined') { module.exports = {...} }` at the bottom of the script, this gives full unit testability without spinning up a real browser.

**Result: 127 passing tests**, including fixture suites that run the adapters against real captured ChatGPT and Gemini DOM (July 2026), plus a Playwright E2E harness that drives the real extension against the live sites (`npm run e2e`, `npm run shots`).

---

## Architecture

```
manifest.json           — Extension entrypoint (MV3)
content_script.js       — State machine + overlay lifecycle
service_worker.js       — Install init, keyboard command relay, message routing
popup.html / popup.js   — Control panel + selector health check

data/
  keywords.js           — Prompt keyword → tag mapping (prompt-aware mode)
  slogans.js            — Rotating overlay slogans (20)
  feed.js               — Clip manifest (auto-generated by scripts/generate-feed.mjs)

platforms/
  chatgpt.js            — All ChatGPT selectors, telemetry, state derivation

scripts/
  source-clips.mjs      — Pexels API clip downloader + ffmpeg compressor
  generate-feed.mjs     — Validates media/ + regenerates data/feed.js
  generate-icons.mjs    — SVG → 4× PNG rasterizer (requires sharp)
  package.mjs           — Builds the Chrome Web Store upload zip

tests/
  doombreak.test.js     — Content script unit tests + real-DOM fixture tests
  telemetry.test.js     — Platform adapter tests
  fixtures/             — ChatGPT DOM captures (see CAPTURE.md)

docs/
  SOURCING.md           — Clip curation guide
  WRITEUP.md            — Full technical writeup
  ORIGINAL_PITCH.md     — Original product pitch (historical)
  privacy.html          — Privacy policy (GitHub Pages)
```

### State machine

```
idle ──► thinking ──► typing ──► idle
         (stop btn,   (signature   (stop btn
         no text)     changes)     disappears
                                   → auto-close)
```

### Detection lifecycle

```
MutationObserver (edge-triggered, debounced 400ms)
        +
setInterval heartbeat (250ms, observer disconnects during tick)
        ↓
ChatGPT.getStateSnapshot()   ← single DOM pass
        ↓
_tick(snapshot)              ← state machine
```

---

## Development

```bash
npm install
npx vitest run          # 127 passing
npm run source          # download clips from Pexels (needs PEXELS_API_KEY)
npm run feed            # validate media/ + regenerate data/feed.js
npm run package         # build dist/doombreak-vX.Y.Z.zip for the store
```

---

## Privacy

Zero network requests at runtime. All data stays in `chrome.storage.local`. See the [privacy policy](https://joshualaw10.github.io/BrainrotBreak/privacy.html) for the full storage key listing.

---

## Design notes

Honest retrospective, kept because it's useful:

- **PiP over full-screen.** A floating 320×480 panel would let you watch the response start streaming underneath — a gentler auto-close than a full-screen yank.
- **Pre-bundled clips aren't an algorithmic feed.** Curated Pexels clips are a screensaver, not TikTok. That's also what makes the extension shippable (no scraping, no embeds, store-compliant).
- **Streaks measure the habit, not the cure.** "🔥 7 breaks today" rewards getting distracted. A better metric: how fast you returned to your answer.
- **Platforms absorb point solutions.** ChatGPT later shipped background notifications. The niche this fills now: you'd rather have something to watch than a notification to wait for.
