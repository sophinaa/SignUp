// Scroll-to-open hero. On load the nav and footer arrive around "CAFÉ".
// Scrolling then opens a gap between "CA" and "FÉ" into a slit, a circle, a
// pill and finally the whole screen, with the RSVP letter rising into view
// behind it.
//
// A scroll listener drives the timeline. (Native scroll timelines were tried:
// iOS Safari measured them against a different screen height than the pinned
// stage, so the window started part-open and stuttered.)
//
// Loaded as a classic script straight after the hero markup, so the scroll
// layout is in place before the first paint. Without JS, or with reduced
// motion, the hero stays a single static screen above the letter.
(() => {
  const hero = document.getElementById('hero');
  if (!hero || !hero.animate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (sel) => hero.querySelector(sel);
  const stage = $('.ph-stage');
  const pill = $('.ph-pill');
  const word = $('.ph-word');
  const halves = hero.querySelectorAll('.ph-half');
  const nav = $('.ph-nav');
  const foot = $('.ph-foot');
  const rule = $('.ph-rule');
  const LETTER_LEAD = 0.2; // letter starts this many screen-heights higher and rises a little slower
  const CLOSED = 0.05; // the window stays shut for the first bit of scrolling

  const DURATION = 1000; // timeline length; scroll progress maps onto it
  const E1 = 'cubic-bezier(.5,0,.3,1)';
  const E2 = 'cubic-bezier(.45,0,.3,1)';
  const E3 = 'cubic-bezier(.4,0,.2,1)';
  const SLIDE = 'cubic-bezier(.2,.8,.2,1)';

  hero.classList.add('ph-scroll');
  document.body.classList.add('ph-scroll-on');

  const isPhone = () => window.matchMedia('(max-width: 720px)').matches;

  // Holds `from` until `start`, eases to `to` by `end`, then holds.
  const hold = (prop, from, to, start, end, easing = 'ease') => [
    { offset: 0, [prop]: from },
    { offset: start, [prop]: from, easing },
    { offset: end, [prop]: to },
    { offset: 1, [prop]: to },
  ];

  // ---- Scroll timeline ---------------------------------------------------------

  // Pill sizes in px for the current viewport. The final frame overshoots the
  // screen (the pill is centred above the middle) so the opening covers it all.
  function pillFrames() {
    const vw = document.documentElement.clientWidth;
    const vh = stage.clientHeight;
    const fs = parseFloat(getComputedStyle(word).fontSize);
    const full = { width: `${vw * 1.2}px`, height: `${vh * 1.3}px`, borderRadius: '0px' };

    if (!isPhone()) {
      const h = 1.81 * fs;
      return [
        { offset: 0, width: '0px', height: `${h}px`, borderRadius: `${h / 2}px` },
        { offset: CLOSED, width: '0px', height: `${h}px`, borderRadius: `${h / 2}px`, easing: E1 },
        { offset: 0.15, width: `${0.16 * fs}px`, height: `${h}px`, borderRadius: `${h / 2}px`, easing: E2 },
        { offset: 0.35, width: `${h}px`, height: `${h}px`, borderRadius: `${h / 2}px`, easing: E3 },
        { offset: 0.6, width: `${3.62 * fs}px`, height: `${h}px`, borderRadius: `${h / 2}px`, easing: E3 },
        { offset: 1, ...full },
      ];
    }
    const w = vw - 40;
    const h = w / 1.85;
    return [
      { offset: 0, width: `${w}px`, height: '0px', borderRadius: `${h / 2}px` },
      { offset: CLOSED, width: `${w}px`, height: '0px', borderRadius: `${h / 2}px`, easing: E1 },
      { offset: 0.15, width: `${w}px`, height: `${h * 0.1}px`, borderRadius: `${h / 2}px`, easing: E2 },
      { offset: 0.35, width: `${w}px`, height: `${h * 0.55}px`, borderRadius: `${h / 2}px`, easing: E3 },
      { offset: 0.6, width: `${w}px`, height: `${h}px`, borderRadius: `${h / 2}px`, easing: E3 },
      { offset: 1, ...full },
    ];
  }

  let scrollAnims = [];

  function buildScroll() {
    scrollAnims.forEach((a) => a.cancel());
    const opts = { duration: DURATION, fill: 'both' };
    const gaps = isPhone() ? ['0.2em', '0.34em'] : ['0em', '0.085em'];
    scrollAnims = [
      pill.animate(pillFrames(), opts),
      word.animate(hold('gap', gaps[0], gaps[1], CLOSED, 0.6, E3), opts),
      ...[...halves].map((h) => h.animate(hold('opacity', 1, 0, 0.6, 0.8), opts)),
      nav.animate(hold('opacity', 1, 0, 0.6, 0.85), opts),
      foot.animate(hold('opacity', 1, 0, 0.1, 0.35), opts),
    ];
    // The letter comes after this script in the page, so look it up each build.
    // Phones skip the rise: the letter then moves only with the page scroll,
    // which the browser keeps perfectly smooth.
    const letter = document.getElementById('rsvp');
    if (letter && !isPhone()) {
      const lead = -LETTER_LEAD * stage.clientHeight;
      scrollAnims.push(letter.animate([{ transform: `translateY(${lead}px)` }, { transform: 'translateY(0)' }], opts));
    }
    scrollAnims.forEach((a) => a.pause());
    update();
  }

  function progress() {
    const travel = hero.offsetHeight - stage.offsetHeight;
    if (travel <= 0) return 1;
    return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / travel));
  }

  let ticking = false;
  function update() {
    ticking = false;
    const p = progress();
    for (const a of scrollAnims) a.currentTime = p * DURATION;
    // Fully open: hide the stage so it can't sit over the form.
    hero.classList.toggle('is-open', p >= 0.999);
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // Rebuild only when the width changes: on phones the address bar showing and
  // hiding fires height-only resizes mid-scroll, and the sizes don't depend on it.
  let resizeTimer;
  let lastWidth = document.documentElement.clientWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const width = document.documentElement.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      buildScroll();
    }, 100);
  });

  buildScroll();
  document.addEventListener('DOMContentLoaded', buildScroll);

  // ---- Getting to the letter -------------------------------------------------------
  // RSVP links and keyboard focus go to the fully open position; the plain
  // #rsvp anchor would stop part-way, with the window still half open.

  const openTop = () => window.scrollY + hero.getBoundingClientRect().top + hero.offsetHeight - stage.offsetHeight;
  const goToOpen = () => window.scrollTo({ top: openTop(), behavior: 'instant' });

  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href="#rsvp"], a[href="/#rsvp"]');
    if (!link) return;
    e.preventDefault();
    window.scrollTo({ top: openTop(), behavior: 'smooth' });
    document.getElementById('rsvp')?.focus({ preventScroll: true });
  });

  document.addEventListener('focusin', (e) => {
    const letter = document.getElementById('rsvp');
    if (progress() >= 0.999 || !letter?.contains(e.target) || e.target === letter) return;
    goToOpen();
    e.target.scrollIntoView({ block: 'nearest' });
  });

  if (location.hash === '#rsvp') document.addEventListener('DOMContentLoaded', goToOpen);

  // ---- Load intro ------------------------------------------------------------------
  // Uses transforms only, so it never fights the scroll timeline.

  const intro = { duration: 1100, fill: 'backwards' };
  const introAnims = [
    nav.animate([{ transform: 'translateY(-140%)' }, { transform: 'translateY(0)' }], { ...intro, delay: 250, easing: SLIDE }),
    foot.animate([{ transform: 'translateY(160%)' }, { transform: 'translateY(0)' }], { ...intro, delay: 300, easing: SLIDE }),
    rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { ...intro, delay: 200, duration: 1300, easing: E3 }),
  ];
  introAnims.forEach((a) => a.pause());

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    // Opening the page part-way down (e.g. a #rsvp link) skips the intro.
    if (progress() > 0) introAnims.forEach((a) => a.finish());
    else introAnims.forEach((a) => a.play());
  });
})();
