// tests/telemetry.test.js
// Tests for platforms/chatgpt.js selector telemetry internals.
//
// Isolation: each test calls _resetTelemetry() to clear in-memory state,
// and resets chrome mock as needed.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome mock (module-level, reset per test)
// ---------------------------------------------------------------------------

function makeChromeStub() {
  return {
    storage: {
      local: {
        get:  vi.fn((_keys, cb) => { if (cb) cb({}); }),
        set:  vi.fn(),
      },
    },
    runtime: { lastError: null },
  };
}

// ---------------------------------------------------------------------------
// Load the adapter (once; tests reset via _resetTelemetry)
// ---------------------------------------------------------------------------

// We need to set up the chrome global before the module executes.
// Since vitest isolates modules per file, this is safe.

let ChatGPT, _resetTelemetry, _forceFlush, _getTelemetryBuffer;

beforeEach(async () => {
  global.chrome = makeChromeStub();

  // Reset module between tests so the singleton telemetry state is fresh
  vi.resetModules();
  const mod = await import('../platforms/chatgpt.js?t=' + Date.now());
  ChatGPT          = mod.ChatGPT;
  _resetTelemetry  = mod._resetTelemetry;
  _forceFlush      = mod._forceFlush;
  _getTelemetryBuffer = mod._getTelemetryBuffer;
});

// ---------------------------------------------------------------------------
// getSelectorTelemetry — public API
// ---------------------------------------------------------------------------

describe('getSelectorTelemetry()', () => {
  it('returns an empty object when nothing has matched', () => {
    expect(ChatGPT.getSelectorTelemetry()).toEqual({});
  });

  it('returns a copy — mutating the result does not affect internal state', () => {
    const snap = ChatGPT.getSelectorTelemetry();
    snap['injected:key'] = { count: 99, lastMatch: 0 };
    expect(ChatGPT.getSelectorTelemetry()['injected:key']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getStopSelectorKeys — public API
// ---------------------------------------------------------------------------

describe('getStopSelectorKeys()', () => {
  it('returns an array of strings', () => {
    const keys = ChatGPT.getStopSelectorKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(k => expect(typeof k).toBe('string'));
  });

  it('includes the primary testid key', () => {
    expect(ChatGPT.getStopSelectorKeys()).toContain('stop:testid');
  });

  it('includes the fallback aria key', () => {
    expect(ChatGPT.getStopSelectorKeys()).toContain('stop:composer-aria');
  });
});

// ---------------------------------------------------------------------------
// detectGenerating — DOM-level
// ---------------------------------------------------------------------------

describe('detectGenerating()', () => {
  it('returns false when no stop button is present', () => {
    document.body.innerHTML = '<main><p>Hello</p></main>';
    expect(ChatGPT.detectGenerating()).toBe(false);
  });

  it('returns true when [data-testid="stop-button"] is present', () => {
    document.body.innerHTML = '<button data-testid="stop-button">Stop</button>';
    expect(ChatGPT.detectGenerating()).toBe(true);
  });

  it('returns true for aria-label="Stop generating"', () => {
    document.body.innerHTML = '<button aria-label="Stop generating">Stop</button>';
    expect(ChatGPT.detectGenerating()).toBe(true);
  });

  it('returns true for aria-label="Stop streaming"', () => {
    document.body.innerHTML = '<button aria-label="Stop streaming">Stop</button>';
    expect(ChatGPT.detectGenerating()).toBe(true);
  });

  it('returns false after stop button is removed', () => {
    document.body.innerHTML = '<button data-testid="stop-button">Stop</button>';
    expect(ChatGPT.detectGenerating()).toBe(true);
    document.body.innerHTML = '';
    expect(ChatGPT.detectGenerating()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAssistantTurnCount — DOM-level
// ---------------------------------------------------------------------------

describe('getAssistantTurnCount()', () => {
  it('returns 0 when no conversation turns exist', () => {
    document.body.innerHTML = '<main></main>';
    expect(ChatGPT.getAssistantTurnCount()).toBe(0);
  });

  it('counts only assistant turns', () => {
    document.body.innerHTML = `
      <article data-testid="conversation-turn-1" data-message-author-role="user">User</article>
      <article data-testid="conversation-turn-2" data-message-author-role="assistant">Asst</article>
    `;
    expect(ChatGPT.getAssistantTurnCount()).toBe(1);
  });

  it('counts multiple assistant turns', () => {
    document.body.innerHTML = `
      <article data-testid="conversation-turn-1" data-message-author-role="user">U</article>
      <article data-testid="conversation-turn-2" data-message-author-role="assistant">A1</article>
      <article data-testid="conversation-turn-3" data-message-author-role="user">U2</article>
      <article data-testid="conversation-turn-4" data-message-author-role="assistant">A2</article>
    `;
    expect(ChatGPT.getAssistantTurnCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getLastUserPrompt — DOM-level
// ---------------------------------------------------------------------------

describe('getLastUserPrompt()', () => {
  it('returns empty string when no turns', () => {
    document.body.innerHTML = '<main></main>';
    expect(ChatGPT.getLastUserPrompt()).toBe('');
  });

  it('returns the last user prompt text', () => {
    document.body.innerHTML = `
      <article data-testid="conversation-turn-1" data-message-author-role="user">First question</article>
      <article data-testid="conversation-turn-2" data-message-author-role="assistant">Answer</article>
      <article data-testid="conversation-turn-3" data-message-author-role="user">  Second question  </article>
    `;
    expect(ChatGPT.getLastUserPrompt()).toBe('Second question');
  });
});

// ---------------------------------------------------------------------------
// getStateSnapshot — single-pass correctness
// ---------------------------------------------------------------------------

describe('getStateSnapshot()', () => {
  it('returns all four fields', () => {
    document.body.innerHTML = '<main></main>';
    const snap = ChatGPT.getStateSnapshot();
    expect(snap).toHaveProperty('generating');
    expect(snap).toHaveProperty('turnCount');
    expect(snap).toHaveProperty('signature');
    expect(snap).toHaveProperty('lastUserPrompt');
  });

  it('generating reflects stop-button presence', () => {
    document.body.innerHTML = '<button data-testid="stop-button">Stop</button>';
    expect(ChatGPT.getStateSnapshot().generating).toBe(true);
    document.body.innerHTML = '';
    expect(ChatGPT.getStateSnapshot().generating).toBe(false);
  });

  it('snapshot is consistent with individual accessors', () => {
    document.body.innerHTML = `
      <article data-testid="conversation-turn-1" data-message-author-role="user">Hello</article>
      <article data-testid="conversation-turn-2" data-message-author-role="assistant">
        <div class="markdown">World</div>
      </article>
    `;
    const snap = ChatGPT.getStateSnapshot();
    expect(snap.turnCount).toBe(ChatGPT.getAssistantTurnCount());
    expect(snap.lastUserPrompt).toBe(ChatGPT.getLastUserPrompt());
  });
});

// ---------------------------------------------------------------------------
// getObserverTarget — fallback chain
// ---------------------------------------------------------------------------

describe('getObserverTarget()', () => {
  it('returns document.documentElement as ultimate fallback', () => {
    document.body.innerHTML = '';
    // Remove main if any
    const main = document.querySelector('main');
    if (main) main.remove();
    const target = ChatGPT.getObserverTarget();
    expect(target).toBeTruthy();
  });

  it('prefers <main> when present', () => {
    document.body.innerHTML = '<main id="testmain"></main>';
    expect(ChatGPT.getObserverTarget().id).toBe('testmain');
  });
});
