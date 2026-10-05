// Slide content generator for Slideshow Karaoke.
//
// Rather than shipping a fixed list of a few dozen slides, we combine:
//   - a large pool of royalty-free stock photo IDs (picsum.photos)
//   - a combinatorial "corporate buzzword" title generator
// so every speaker in a session gets guaranteed-unique slides, with enough
// headroom for very large groups and many replays.

(function (global) {
  'use strict';

  const OPENERS = [
    'Reimagining', 'Disrupting', 'Synergizing', 'Operationalizing', 'Monetizing',
    'Pivoting Toward', 'Leveraging', 'Unlocking', 'Scaling', 'Democratizing',
    'Future-Proofing', 'Accelerating', 'Streamlining', 'Humanizing', 'Weaponizing',
    'Rebranding', 'Automating', 'Crowdsourcing', 'Gamifying', 'Decentralizing',
    'Supercharging', 'Reinventing', 'Championing', 'Optimizing',
  ];

  const MODIFIERS = [
    'Artisanal', 'Quantum', 'Blockchain-Enabled', 'AI-Powered', 'Sustainable',
    'Hyperlocal', 'Frictionless', 'Omnichannel', 'Next-Gen', 'Cloud-Native',
    'Data-Driven', 'Turnkey', 'Bespoke', 'Disruptive', 'Holistic', 'Agile',
    'Serverless', 'Vertically-Integrated', 'Mission-Critical', 'Paradigm-Shifting',
    'Farm-to-Table', 'Gluten-Free', 'Zero-Trust', 'Open-Source',
  ];

  const NOUNS = [
    'Kombucha Supply Chain', 'Giraffe Logistics', 'Pigeon Delivery Network',
    'Interpretive Dance Platform', 'Artisanal Mayonnaise', 'Office Snack Economy',
    'Haunted House Startup', 'Competitive Napping League', 'Llama Grooming Services',
    'Garage Band Monetization', 'Parking Lot Ecosystem', 'Karaoke Machine Uprising',
    'Sock Puppet Workforce', 'Discount Mattress Empire', 'Backyard Chicken IPO',
    'Treehouse Real Estate', 'Glitter Manufacturing', 'Bureaucratic Paperclip Reform',
    'Interdimensional Mail Service', 'Sentient Toaster Division', 'Squirrel-Based Energy Grid',
    'Novelty Mustache Trade', 'Underground Cheese Cartel', 'Recreational Filing Cabinet League',
  ];

  const TEMPLATES = [
    (o, m, n) => `${o} the ${m} ${n}`,
    (o, m, n) => `${m} ${n}: A Roadmap`,
    (o, m, n) => `How We're ${o} ${n}`,
    (o, m, n) => `${n}: Key Learnings & Next Steps`,
    (o, m, n) => `The Future of ${m} ${n}`,
    (o, m, n) => `${o} ${m} ${n} (Internal Use Only)`,
    (o, m, n) => `${n}: A ${m} Case Study`,
    (o, m, n) => `Q4 Deep Dive: ${m} ${n}`,
  ];

  const SUBTITLES = [
    '+127% YoY growth (unverified)', 'Projected to disrupt by Q3', 'Patent pending, probably',
    'As seen in nobody’s inbox', 'Built on a napkin', 'Approved by zero focus groups',
    'Now with 40% more synergy', 'Results may vary. They will.', 'Certified buzzword-compliant',
    'Endorsed by our intern', 'Confidential. Mostly.', 'Subject to change without notice',
    'Not legal advice', 'Figures rounded for drama', 'Pending board approval (the dog)',
    'Slide 1 of ∞', 'Translated from jargon', 'See appendix that does not exist',
    'Powered by three espressos', 'A collaboration nobody asked for',
  ];

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

  // Builds `totalNeeded` guaranteed-unique slides (unique photo id AND unique
  // title combo) for one session, deterministically from `code`.
  function buildSessionSlides(totalNeeded, code) {
    const rng = makeRng(code);
    const comboSpace = OPENERS.length * MODIFIERS.length * NOUNS.length;
    const imagePool = shuffledRange(IMAGE_ID_POOL_SIZE, rng);
    const comboPool = shuffledRange(comboSpace, rng);

    const slides = [];
    for (let i = 0; i < totalNeeded; i++) {
      const comboIdx = comboPool[i % comboPool.length];
      const nounIdx = comboIdx % NOUNS.length;
      const rem1 = Math.floor(comboIdx / NOUNS.length);
      const modIdx = rem1 % MODIFIERS.length;
      const openIdx = Math.floor(rem1 / MODIFIERS.length) % OPENERS.length;

      const templateIdx = Math.floor(rng() * TEMPLATES.length);
      const subtitleIdx = Math.floor(rng() * SUBTITLES.length);

      slides.push({
        imageId: imagePool[i % imagePool.length],
        title: TEMPLATES[templateIdx](OPENERS[openIdx], MODIFIERS[modIdx], NOUNS[nounIdx]),
        subtitle: SUBTITLES[subtitleIdx],
      });
    }
    return slides;
  }

  global.SlideBank = { buildSessionSlides, randomCode };
})(window);
