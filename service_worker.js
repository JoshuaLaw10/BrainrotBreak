// service_worker.js
// ============================================================
// Doomscroll Break — background service worker (MV3).
//
// Responsibilities:
//   1. Initialise chrome.storage.local on first install.
//   2. Route messages from the popup / content script.
//
// NOTE: No external network calls are made. The old oEmbed
// integration has been removed — all clips are local MP4 assets.
// ============================================================

'use strict';

// ---------------------------------------------------------------------------
// Install / update handler
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(function(details) {
  // Set sensible defaults on first install; don't overwrite on update.
  if (details.reason === 'install') {
    chrome.storage.local.set({
      enabled:     true,    // extension on by default
      soundOn:     false,   // sound off by default
      promptMode:  false,   // prompt-aware mode off by default
      sloganIndex: 0,
      autoCloseStreak: {},
      selectorTelemetry: {},
    });
  }
});

// ---------------------------------------------------------------------------
// Message routing
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (!msg || typeof msg.type !== 'string') return;

  if (msg.type === 'PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return; // synchronous
  }

  // Unrecognised message type — respond gracefully.
  sendResponse({ ok: false, error: 'unknown message type: ' + msg.type });
});
