// tests/setup.js
// jsdom doesn't implement HTMLMediaElement.pause / load / play.
// Stub them so tests don't emit "Not implemented" stderr noise.

window.HTMLMediaElement.prototype.pause = function() {};
window.HTMLMediaElement.prototype.load  = function() {};
window.HTMLMediaElement.prototype.play  = function() { return Promise.resolve(); };
