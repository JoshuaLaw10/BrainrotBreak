# Chrome Web Store Listing Copy

> Copy-paste these into the Chrome Web Store developer dashboard.  
> Category: **Productivity**

---

## Store title
*(This is the manifest `name` — highest-weight search field)*

```
Brainrot Break: Cat & Dog Reels While ChatGPT Thinks
```

## Short description
*(≤ 132 characters — currently 121; second-highest search weight)*

```
Cat videos, dog reels, calm scenery & sports while ChatGPT or Gemini thinks. Auto-closes the moment your answer is ready.
```

---

## Detailed description
*(Plain text — every vibe named for store search indexing)*

```
Brainrot Break solves a specific problem: when ChatGPT or Gemini is generating, you instinctively open YouTube or TikTok — and don't come back.

Instead of fighting that habit, Brainrot Break works with it. The moment the AI starts thinking, a reel overlay opens. Scroll cat videos while you wait. The moment your answer is ready, it closes itself — no tap required.

PICK YOUR VIBE
🐱 Cats — cat videos and kitten clips, nothing else (yes, there's a cats-only button)
🐶 Dogs — puppies, goldens, happy dogs at the beach
😂 Funny — funny animal reels and absurd moments
🌊 Calm — ocean waves, rain on glass, forest streams
🏀 Sport — basketball, skateboarding, surfing highlights
🎯 Focus — keyboards, coffee pours, study ambience
Pick one, mix a few, or leave them all on for variety.

HOW IT WORKS
Send any prompt on chatgpt.com or gemini.google.com. Brainrot Break opens instantly. Scroll with your wheel or trackpad to snap to the next reel — scroll up to go back. When the AI finishes generating, the overlay auto-closes and you're back at your answer.

FEATURES
• Auto-closes the instant your answer is ready — you never miss it
• Scrollable reels — wheel or swipe to the next clip, scroll up for history
• Mini Player mode — a small corner player instead of full-screen
• Prompt-Aware Mode (on by default): ask about workouts, get sports clips; ask something calm, get calm scenery
• Live status badge shows Thinking → Typing as the response develops
• Daily streak counter, sound toggle, keyboard shortcut (Cmd/Ctrl+Shift+D)
• Selector health check warns you if the AI site changed its page structure

PRIVACY
100% local. No data leaves your device. No analytics. No servers. All clips are bundled with the extension — zero network requests, ever.

Works on chatgpt.com and gemini.google.com.
```

---

## Permission justifications
*(For the "Permissions" section of the submission form)*

### `storage`
> Brainrot Break uses `chrome.storage.local` to persist user preferences (on/off, mute, prompt-aware mode), a daily auto-close streak counter, and per-selector match telemetry that powers the popup health check. No data is transmitted externally.

### Host access: `https://chatgpt.com/*` and `https://gemini.google.com/*` (content script match patterns)
> A content script runs on chatgpt.com and gemini.google.com to observe the DOM via MutationObserver and detect when the AI begins and finishes generating a response. This is the core function of the extension and requires direct page access. No page content is read, stored, or transmitted.

---

## Store metadata

| Field | Value |
|---|---|
| Category | Productivity |
| Language | English |
| Regions | All regions |
| Pricing | Free |
| Mature content | No |
| Single purpose | Detects AI generation state and shows a self-closing, scrollable reel overlay |

---

## Reviewer notes
*(Include in the "Notes for reviewer" field)*

```
This extension:
- Runs a content script on chatgpt.com only
- Uses MutationObserver to detect when ChatGPT's stop button appears/disappears
- Shows a full-screen overlay of local MP4 video clips while generation is active
- Closes the overlay automatically when generation ends
- Makes zero network requests; all clips are local assets
- Uses chrome.storage.local for preferences only — no external data transmission

To test: enable the extension, open chatgpt.com, send any prompt. The overlay
should appear within ~250ms of generation starting and close within ~850ms of
the stop button disappearing.
```

---

## Screenshot shot list
*(1280×800 each — take after clips are sourced and extension is installed)*

| # | What to show | Notes |
|---|---|---|
| 1 | **Hero** — 3-panel overlay active on ChatGPT | Send a long prompt, capture mid-generation |
| 2 | **Thinking badge** — overlay with "Thinking" badge visible | Capture in the first second before text appears |
| 3 | **Typing badge** — overlay with "Typing" badge + green dot | Capture once text starts streaming |
| 4 | **Popup** — control panel with Prompt-Aware toggle and health check | Open popup with a healthy selector state |
| 5 | **Streak** — overlay footer showing "🔥 5 breaks today" | Use after several auto-closes in one session |
