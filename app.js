(function () {
  'use strict';

  const STORAGE_KEY = 'skaraoke-settings-v1';

  // ---------- DOM refs ----------
  const setupScreen = document.getElementById('setup-screen');
  const presenterScreen = document.getElementById('presenter-screen');
  const doneScreen = document.getElementById('done-screen');

  const setupForm = document.getElementById('setup-form');
  const playerCountInput = document.getElementById('player-count');
  const playerNamesInput = document.getElementById('player-names');
  const speechLengthInput = document.getElementById('speech-length');
  const slideLengthInput = document.getElementById('slide-length');
  const computedSlidesEl = document.getElementById('computed-slides');
  const slideStyleInput = document.getElementById('slide-style');
  const soundToggleInput = document.getElementById('sound-toggle');
  const sessionCodeInput = document.getElementById('session-code');
  const rerollCodeBtn = document.getElementById('reroll-code');

  const speakerChipsEl = document.getElementById('speaker-chips');
  const overallProgressBar = document.getElementById('overall-progress-bar');
  const speakerNameEl = document.getElementById('speaker-name');
  const slideCard = document.getElementById('slide-card');
  const slideImage = document.getElementById('slide-image');
  const plainSlideNumberEl = document.getElementById('plain-slide-number');
  const slideDotsEl = document.getElementById('slide-dots');
  const timerRingFg = document.getElementById('timer-ring-fg');
  const timerSecondsEl = document.getElementById('timer-seconds');
  const turnStatusEl = document.getElementById('turn-status');

  const suggestTopicBtn = document.getElementById('suggest-topic-btn');
  const topicDisplay = document.getElementById('topic-display');
  const topicTextEl = document.getElementById('topic-text');
  const rerollTopicBtn = document.getElementById('reroll-topic-btn');
  const clearTopicBtn = document.getElementById('clear-topic-btn');

  const startPauseBtn = document.getElementById('start-pause-btn');
  const skipSlideBtn = document.getElementById('skip-slide-btn');
  const restartTurnBtn = document.getElementById('restart-turn-btn');
  const nextSpeakerBtn = document.getElementById('next-speaker-btn');
  const backToSetupBtn = document.getElementById('back-to-setup');
  const muteToggleBtn = document.getElementById('mute-toggle');
  const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');

  const playAgainBtn = document.getElementById('play-again-btn');
  const newGameBtn = document.getElementById('new-game-btn');

  const RING_CIRCUMFERENCE = 2 * Math.PI * 54;

  // ---------- Persisted settings ----------
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  function applySettingsToForm(s) {
    if (!s) return;
    if (s.playerCount) playerCountInput.value = s.playerCount;
    if (s.names) playerNamesInput.value = s.names;
    if (s.speechLength) speechLengthInput.value = s.speechLength;
    if (s.slideLength) slideLengthInput.value = s.slideLength;
    if (s.slideStyle) slideStyleInput.value = s.slideStyle;
    if (typeof s.soundOn === 'boolean') soundToggleInput.checked = s.soundOn;
  }

  function updateComputedSlides() {
    const speech = Number(speechLengthInput.value) || 0;
    const slide = Number(slideLengthInput.value) || 1;
    const count = Math.max(1, Math.round(speech / slide));
    computedSlidesEl.textContent = `= ${count} slide${count === 1 ? '' : 's'} per speaker`;
    return count;
  }

  [speechLengthInput, slideLengthInput].forEach((el) => {
    el.addEventListener('input', updateComputedSlides);
  });

  // ---------- Audio ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, startOffset, duration, type) {
    if (!game.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function playSlideChangeSound() { tone(620, 0, 0.12, 'triangle'); tone(840, 0.1, 0.14, 'triangle'); }
  function playWarningSound() { tone(520, 0, 0.18, 'sine'); }
  function playTurnEndSound() { tone(300, 0, 0.3, 'sawtooth'); tone(200, 0.28, 0.4, 'sawtooth'); }

  // ---------- Game state ----------
  const game = {
    players: [],          // [{ name, slides: [...] }]
    slidesPerPlayer: 0,
    slideLength: 30,
    slideStyle: 'photo',
    soundOn: true,
    code: '',
    currentPlayerIndex: 0,
    currentSlideIndex: 0,
    turnState: 'idle',     // idle | running | paused | finished
    remaining: 0,          // ms remaining on current slide
    duration: 0,           // ms total for current slide
    tickHandle: null,
    warnPlayed: false,
  };

  function buildPlayers(settings) {
    const total = settings.playerCount * settings.slidesPerPlayer;
    const allSlides = SlideBank.buildSessionSlides(total, settings.code);
    const names = settings.names
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const players = [];
    for (let i = 0; i < settings.playerCount; i++) {
      const name = names[i] || `Speaker ${i + 1}`;
      const slice = allSlides.slice(i * settings.slidesPerPlayer, (i + 1) * settings.slidesPerPlayer);
      players.push({ name, slides: slice });
    }
    return players;
  }

  // ---------- Setup screen ----------
  function initSetupScreen() {
    const saved = loadSettings();
    applySettingsToForm(saved);
    sessionCodeInput.value = (saved && saved.code) || SlideBank.randomCode();
    updateComputedSlides();
  }

  rerollCodeBtn.addEventListener('click', () => {
    sessionCodeInput.value = SlideBank.randomCode();
  });

  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerCount = Math.max(1, Math.min(30, Number(playerCountInput.value) || 10));
    const speechLength = Math.max(10, Number(speechLengthInput.value) || 90);
    const slideLength = Math.max(5, Number(slideLengthInput.value) || 30);
    const slidesPerPlayer = Math.max(1, Math.round(speechLength / slideLength));
    const code = (sessionCodeInput.value || SlideBank.randomCode()).trim() || SlideBank.randomCode();

    const settings = {
      playerCount,
      names: playerNamesInput.value,
      speechLength,
      slideLength,
      slidesPerPlayer,
      slideStyle: slideStyleInput.value,
      soundOn: soundToggleInput.checked,
      code,
    };
    saveSettings(settings);

    game.players = buildPlayers(settings);
    game.slidesPerPlayer = slidesPerPlayer;
    game.slideLength = slideLength;
    game.slideStyle = settings.slideStyle;
    game.soundOn = settings.soundOn;
    game.code = code;

    muteToggleBtn.textContent = game.soundOn ? '🔊' : '🔇';
    renderChips();
    goToScreen('presenter');
    loadPlayerTurn(0);
  });

  // ---------- Screen switching ----------
  function goToScreen(name) {
    setupScreen.classList.toggle('hidden', name !== 'setup');
    presenterScreen.classList.toggle('hidden', name !== 'presenter');
    doneScreen.classList.toggle('hidden', name !== 'done');
  }

  backToSetupBtn.addEventListener('click', () => {
    stopTimer();
    goToScreen('setup');
  });
  newGameBtn.addEventListener('click', () => {
    goToScreen('setup');
  });
  playAgainBtn.addEventListener('click', () => {
    goToScreen('presenter');
    loadPlayerTurn(0);
  });

  // ---------- Chips ----------
  function renderChips() {
    speakerChipsEl.innerHTML = '';
    game.players.forEach((p, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = p.name;
      chip.addEventListener('click', () => {
        if (game.turnState === 'running') return; // avoid yanking a live timer
        loadPlayerTurn(i);
      });
      speakerChipsEl.appendChild(chip);
    });
  }

  function updateChipStates() {
    Array.from(speakerChipsEl.children).forEach((chip, i) => {
      chip.classList.toggle('active', i === game.currentPlayerIndex);
      chip.classList.toggle('done', i < game.currentPlayerIndex);
    });
  }

  // ---------- Turn / slide loading ----------
  function loadPlayerTurn(index) {
    stopTimer();
    game.currentPlayerIndex = index;
    game.currentSlideIndex = 0;
    game.turnState = 'idle';
    speakerNameEl.textContent = game.players[index].name;
    updateChipStates();
    loadSlide(0, false);
    updateControlsForState();
    turnStatusEl.textContent = 'Press Space or Start when ready';
    turnStatusEl.classList.remove('finished');
    updateOverallProgress();
    resetTopicBox();
  }

  function loadSlide(slideIndex, animate) {
    game.currentSlideIndex = slideIndex;
    game.duration = game.slideLength * 1000;
    game.remaining = game.duration;
    game.warnPlayed = false;
    renderSlide();
    renderDots();
    updateRing();
    if (animate) {
      slideCard.classList.remove('flash');
      // eslint-disable-next-line no-unused-expressions
      slideCard.offsetWidth; // restart animation
      slideCard.classList.add('flash');
    }
  }

  function renderSlide() {
    const player = game.players[game.currentPlayerIndex];
    const slide = player.slides[game.currentSlideIndex];
    plainSlideNumberEl.textContent = `Slide ${game.currentSlideIndex + 1}`;

    if (game.slideStyle === 'photo') {
      slideCard.classList.remove('text-only');
      slideImage.classList.remove('text-mode');
      slideImage.onerror = () => {
        slideCard.classList.add('text-only');
        slideImage.classList.add('text-mode');
      };
      slideImage.src = `https://picsum.photos/id/${slide.imageId}/900/700`;
      slideImage.alt = `Slide ${game.currentSlideIndex + 1}`;
    } else {
      slideCard.classList.add('text-only');
      slideImage.classList.add('text-mode');
      slideImage.removeAttribute('src');
    }
  }

  function renderDots() {
    slideDotsEl.innerHTML = '';
    for (let i = 0; i < game.slidesPerPlayer; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (i < game.currentSlideIndex) dot.classList.add('past');
      if (i === game.currentSlideIndex) dot.classList.add('current');
      slideDotsEl.appendChild(dot);
    }
  }

  function updateRing() {
    const frac = Math.max(0, game.remaining / game.duration);
    timerRingFg.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - frac));
    const secs = Math.ceil(game.remaining / 1000);
    timerSecondsEl.textContent = String(Math.max(0, secs));
    timerRingFg.classList.toggle('warn', secs <= 10 && secs > 5);
    timerRingFg.classList.toggle('danger', secs <= 5);
  }

  function updateOverallProgress() {
    const slideFrac = game.duration ? 1 - game.remaining / game.duration : 0;
    const playerFrac = game.turnState === 'finished'
      ? 1
      : (game.currentSlideIndex + Math.max(0, slideFrac)) / game.slidesPerPlayer;
    const overall = (game.currentPlayerIndex + Math.min(1, playerFrac)) / game.players.length;
    overallProgressBar.style.width = `${Math.min(100, overall * 100)}%`;
  }

  // ---------- Timer ----------
  let lastTick = null;

  function startTimer() {
    ensureAudio();
    if (game.turnState === 'finished') return;
    game.turnState = 'running';
    lastTick = performance.now();
    if (game.tickHandle) clearInterval(game.tickHandle);
    game.tickHandle = setInterval(tick, 100);
    updateControlsForState();
  }

  function pauseTimer() {
    game.turnState = 'paused';
    stopTimer();
    updateControlsForState();
  }

  function stopTimer() {
    if (game.tickHandle) {
      clearInterval(game.tickHandle);
      game.tickHandle = null;
    }
  }

  function tick() {
    const now = performance.now();
    const elapsed = now - lastTick;
    lastTick = now;
    game.remaining -= elapsed;

    const secsLeft = game.remaining / 1000;
    if (!game.warnPlayed && secsLeft <= 5 && secsLeft > 4.8) {
      playWarningSound();
      game.warnPlayed = true;
    }

    if (game.remaining <= 0) {
      advanceSlide(true);
      return;
    }
    updateRing();
    updateOverallProgress();
  }

  function advanceSlide(auto) {
    const isLast = game.currentSlideIndex >= game.slidesPerPlayer - 1;
    if (isLast) {
      finishTurn();
      return;
    }
    if (auto) playSlideChangeSound();
    loadSlide(game.currentSlideIndex + 1, true);
    updateOverallProgress();
    if (game.turnState === 'running') {
      lastTick = performance.now();
    }
  }

  function finishTurn() {
    stopTimer();
    game.remaining = 0;
    game.turnState = 'finished';
    updateRing();
    updateOverallProgress();
    playTurnEndSound();
    turnStatusEl.textContent = `Time! 🔔 Nice work, ${game.players[game.currentPlayerIndex].name}.`;
    turnStatusEl.classList.add('finished');
    updateControlsForState();
  }

  function restartTurn() {
    stopTimer();
    turnStatusEl.classList.remove('finished');
    loadPlayerTurn(game.currentPlayerIndex);
  }

  function goToNextSpeaker() {
    stopTimer();
    if (game.currentPlayerIndex + 1 >= game.players.length) {
      overallProgressBar.style.width = '100%';
      goToScreen('done');
      return;
    }
    loadPlayerTurn(game.currentPlayerIndex + 1);
  }

  function updateControlsForState() {
    const running = game.turnState === 'running';
    const finished = game.turnState === 'finished';
    startPauseBtn.textContent = running ? '⏸ Pause' : (finished ? '▶ Start' : '▶ Start');
    startPauseBtn.disabled = finished;
    skipSlideBtn.disabled = finished;
  }

  // ---------- Controls ----------
  startPauseBtn.addEventListener('click', () => {
    if (game.turnState === 'running') pauseTimer();
    else if (game.turnState !== 'finished') startTimer();
  });

  skipSlideBtn.addEventListener('click', () => {
    if (game.turnState === 'finished') return;
    advanceSlide(false);
  });

  restartTurnBtn.addEventListener('click', restartTurn);
  nextSpeakerBtn.addEventListener('click', goToNextSpeaker);

  muteToggleBtn.addEventListener('click', () => {
    game.soundOn = !game.soundOn;
    muteToggleBtn.textContent = game.soundOn ? '🔊' : '🔇';
  });

  fullscreenToggleBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener('keydown', (e) => {
    if (presenterScreen.classList.contains('hidden')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      startPauseBtn.click();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      skipSlideBtn.click();
    } else if (e.key === 'n' || e.key === 'N') {
      nextSpeakerBtn.click();
    } else if (e.key === 'r' || e.key === 'R') {
      restartTurnBtn.click();
    }
  });

  // ---------- Suggest a Topic ----------
  const FALLBACK_TOPICS = [
    'Describe your perfect weekend',
    'A skill you wish you had',
    'The best advice you ever ignored',
    'Your most useless talent',
    'A food combination everyone should try',
  ];

  let topicsPromise = null;

  function loadTopics() {
    if (!topicsPromise) {
      topicsPromise = fetch('topics.md')
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error('fetch failed'))))
        .then((text) => {
          const lines = text
            .split('\n')
            .map((line) => line.match(/^\s*[-*]\s+(.*)/))
            .filter(Boolean)
            .map((m) => m[1].trim())
            .filter(Boolean);
          return lines.length ? lines : FALLBACK_TOPICS;
        })
        .catch(() => FALLBACK_TOPICS);
    }
    return topicsPromise;
  }

  function pickRandomTopic(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function showTopic(text) {
    topicTextEl.textContent = text;
    topicDisplay.classList.remove('hidden');
    suggestTopicBtn.classList.add('hidden');
  }

  function resetTopicBox() {
    topicTextEl.textContent = '';
    topicDisplay.classList.add('hidden');
    suggestTopicBtn.classList.remove('hidden');
  }

  function suggestTopic() {
    loadTopics().then((list) => showTopic(pickRandomTopic(list)));
  }

  suggestTopicBtn.addEventListener('click', suggestTopic);
  rerollTopicBtn.addEventListener('click', suggestTopic);
  clearTopicBtn.addEventListener('click', resetTopicBox);

  // ---------- Init ----------
  initSetupScreen();
})();
