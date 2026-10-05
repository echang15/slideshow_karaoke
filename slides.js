// Slide content generator for Slideshow Karaoke.
//
// Slides are intentionally just random images with no forced caption or
// topic — the speaker improvises freely off whatever appears. (For an
// optional topic, see the separate "Suggest a Topic" feature in app.js,
// which pulls from topics.md.)
//
// We draw from a large pool of royalty-free stock photo IDs
// (picsum.photos) so every speaker in a session gets guaranteed-unique
// slides, with enough headroom for large groups and many replays.

(function (global) {
  'use strict';

  const IMAGE_ID_POOL_SIZE = 500; // picsum.photos has well over this many stable IDs

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    // FNV-1a
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function shuffledRange(n, rng) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeRng(code) {
    return mulberry32(hashSeed(String(code)));
  }

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // Builds `totalNeeded` guaranteed-unique slides (unique photo id) for one
  // session, deterministically from `code`.
  function buildSessionSlides(totalNeeded, code) {
    const rng = makeRng(code);
    const imagePool = shuffledRange(IMAGE_ID_POOL_SIZE, rng);

    const slides = [];
    for (let i = 0; i < totalNeeded; i++) {
      slides.push({ imageId: imagePool[i % imagePool.length] });
    }
    return slides;
  }

  global.SlideBank = { buildSessionSlides, randomCode };
})(window);
