# Capturing ChatGPT DOM Fixtures

The test suite contains a `chatgpt-fixtures` describe block that runs the
platform adapter against real ChatGPT DOM snapshots. **You need to capture
those snapshots manually** because they require a logged-in ChatGPT session.

This is a 2-minute process. Do it once now, and again whenever you suspect
ChatGPT has changed its markup (typically every few months).

---

## What you're capturing

Three HTML files representing the three states the adapter cares about:

| File | When to capture |
|---|---|
| `chatgpt-idle.html` | After login, with at least one prior assistant response visible. No generation in progress. |
| `chatgpt-thinking.html` | Within the first ~500ms after sending a message to a reasoning model (o1, o3-style). The model is "thinking" but no streamed text has appeared yet. |
| `chatgpt-typing.html` | Mid-stream: a response is actively appearing character by character. Easiest to catch on a long response (e.g. "write a 500 word essay"). |

---

## How to capture (Chrome DevTools)

1. Open `https://chatgpt.com` in Chrome and log in.
2. Open DevTools → Console (F12 or ⌘⌥J).
3. Get into the state you want to capture (idle / thinking / typing).
4. Paste this into the Console and press Enter:

   ```js
   copy(document.querySelector('main').outerHTML);
   ```

   *(`copy()` is a DevTools-only helper that copies its argument to clipboard.)*

5. Paste into the appropriate fixture file in this directory.

For **thinking** captures, you need to be fast — pause the JS debugger right
after submit if needed:

```js
// In Console BEFORE submitting your prompt:
const obs = new MutationObserver(() => {
  if (document.querySelector('[data-testid="stop-button"]')) {
    debugger;  // pauses execution, freezing the DOM
  }
});
obs.observe(document.body, { childList: true, subtree: true });
```

Then submit your prompt. When the debugger pauses, run `copy(document.querySelector('main').outerHTML)`,
paste into `chatgpt-thinking.html`, then resume.

---

## Troubleshooting

**"`copy` is not defined"** — You're not in DevTools. The `copy()` helper only
exists inside Chrome DevTools Console. If you're running this from a regular
JS context, replace it with `console.log(document.querySelector('main').outerHTML)`
and copy the output manually.

**ChatGPT shows a Cloudflare challenge** — wait for the challenge to clear
before capturing. The capture should reflect the actual app DOM, not the
challenge page.

**You're logged out** — log in first. The DOM differs significantly between
the logged-out marketing landing page and the logged-in app shell. Captures
of the marketing site are useless for these tests.

**ChatGPT isn't available in your region** — use a VPN, or ask someone with
access to capture for you. The fixtures don't need to come from your own
account; they need to come from the real ChatGPT app.

**The `<main>` element is missing** — recent ChatGPT versions wrap the
conversation in different containers. If `document.querySelector('main')`
returns `null`, try `document.querySelector('[role="main"]')` or
`document.querySelector('#__next')`. If those don't work, capture the
whole `document.body.outerHTML` as a fallback.

---

## After capturing

Run `npx vitest run` — the `chatgpt-fixtures` tests will exercise the real
DOM and verify each adapter method returns the expected value.

If a test fails after a re-capture, that means ChatGPT changed something
the adapter relies on. Update `platforms/chatgpt.js` accordingly.

---

## Schema

Each fixture must be the `outerHTML` of an element that contains:
- A `<main>` element (or the snapshot IS a `<main>` element)
- For typing/thinking: at least one `data-testid^="conversation-turn-"` element
- For typing/thinking: a `[data-testid="stop-button"]` somewhere in the page
- For thinking: an assistant turn that exists but has empty/loading content
- For typing: an assistant turn with non-empty `.markdown` or `.prose` content

If ChatGPT changes any of these structural assumptions, that's what the
fixture tests are designed to catch.
