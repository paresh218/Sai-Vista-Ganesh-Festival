/* ─────────────────────────────────────────────────────────────
   PYC ગરબા Juke Box

   Eight collections, eight cloths. The axis is era-and-sound - what
   a set sounds like - because that is what anyone actually means
   when they say they want a particular garba vibe.

   You pick the collection and you pick the song: `આગળ` moves the
   night along, and picking from `ગરબા` plays that track there and
   then. It used to queue it behind the current one, on the argument
   that nobody queues songs at a ninety-thousand-person ground. True
   of the ground, wrong of a tap: you press a song, you expect the
   song.
   ───────────────────────────────────────────────────────────── */

import { $, fmt, shuffle } from './core/util.js';
import { createPlayer } from './core/player.js';
import { createClock, createPresence } from './core/chrome.js';
import { bindKeys } from './core/keys.js';
import * as audio from './core/audio.js';
import { VOICES } from './voices.js';
import { THEMES, themeById } from './themes.js';
import { createScene } from './scene.js';
import { track } from './analytics.js';

audio.registerVoices(VOICES);
audio.primeOnFirstGesture();

const BUILT = THEMES.filter((t) => t.built);

const state = {
  data: {},
  theme: BUILT[0],
  order: [],
  pos: 0,
  track: null,
  marked: new Set(), // listen milestones already sent for the current track
  playedId: null, // the last track counted as a play
};

const LISTEN_MARKS = [30, 120, 300];

const el = {
  clock: $('clock'),
  crowd: $('crowd'),
  themes: $('theme-list'),
  cover: $('cover'),
  track: $('track'),
  artist: $('artist'),
  elapsed: $('elapsed'),
  total: $('total'),
  play: $('play'),
  next: $('next'),
  songs: $('songs'),
  beat: $('beat'),
  sheet: $('sheet'),
  sheetList: $('sheet-list'),
  sheetClose: $('sheet-close'),
  toast: $('toast'),
  brandMark: $('brand-mark'),
  ytMark: $('yt-mark'),
  ytCredit: $('yt-credit'),
  joinHint: $('join-hint'),
  floor: $('floor'),
  fs: $('fs'),
};

createClock({ el: el.clock, timeZone: 'Asia/Kolkata' });

/* Where a recording actually came from. The audio plays out of an embedded
   player, so the only attribution worth anything to whoever posted the video
   is a way back to it - every track carries one, in the dock and in the list. */
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

let toastTimer = null;
function toast(html) {
  el.toast.innerHTML = html;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
}

/* ── Scene ──────────────────────────────────────────────────── */

const scene = createScene({
  canvas: $('floor'),
  onSeek({ phase, fraction }) {
    if (phase === 'start') {
      player.setScrubbing(true);
    } else {
      player.setScrubbing(false);
      player.seekToFraction(fraction);
      audio.play('manjira', 0.5);
    }
  },
  onJoin() {
    track('join_circle', { collection: state.theme.id });
    placeJoinHint();
  },
  /* Swiped across the floor. The scene handles the movement and tells us which
     way; picking the cloth is this side's business because the running order
     lives here. It wraps, so the set has no dead end in either direction. */
  onSwipe(dir) {
    const at = BUILT.indexOf(state.theme);
    const next = BUILT[(at + dir + BUILT.length) % BUILT.length];
    setTheme(next, { announce: true, play: true, source: 'swipe' });
  },
});

/* After the scene: createPresence publishes synchronously and that first
   callback paints the floor. */
const presence = createPresence({
  drift: BUILT[0].crowd,
  onCount: (n) => {
    el.crowd.textContent = n.toLocaleString('en-IN');
    scene.setCrowd(n);
  },
});

/* ── Player ─────────────────────────────────────────────────── */

const player = createPlayer({
  mountId: 'yt',
  onReady() {
    if (state.track) paintTrack(state.track);
  },
  onEnded() {
    advance();
  },
  onPlayState(on) {
    document.body.classList.toggle('playing', on);
    el.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    scene.setPlaying(on);
    /* The bed belongs to the music, not to the page. It used to start with the
       first play and then run for the rest of the visit, so pausing left the
       room humming to itself with nothing playing. */
    if (on) audio.startBed(0.045);
    else audio.stopBed();
    // Once a track, not once a resume: a scrub or a pause should not inflate it.
    if (on && state.track && state.playedId !== state.track.id) {
      state.playedId = state.track.id;
      track('play', { collection: state.theme.id, title: state.track.title });
    }
  },
  onProgress({ current, duration, fraction, secondChanged, durationChanged }) {
    scene.setProgress(fraction);
    if (secondChanged) el.elapsed.textContent = fmt(current);
    if (durationChanged) el.total.textContent = fmt(duration);
    /* Did anybody stay. A play count on its own cannot tell a listener from a
       visitor who pressed the button and left, so the milestones are the
       measure and the play is only the denominator. Each fires once a track. */
    if (secondChanged) {
      for (const mark of LISTEN_MARKS) {
        if (current >= mark && !state.marked.has(mark)) {
          state.marked.add(mark);
          track('listen', { seconds: mark, collection: state.theme.id });
        }
      }
    }
  },
});

/* ── The genre switcher ─────────────────────────────────────────
   Type, wearing each cloth's two colours, and nothing else.

   An earlier pass made this a shade card of real fabric swatches. The
   idea survived the build and did not survive being looked at: at fifty
   pixels wide no weave is legible, so seven textures read as seven flat
   chips, and the pinked edge and colourway strip turned into noise. The
   colours were always the part that carried anyway.

   Built once; switching only moves a class.                          */

function buildThemes() {
  el.themes.innerHTML = '';
  THEMES.forEach((t) => {
    const li = document.createElement('li');
    // Ascending, so the card fans the way samples do on a counter. The
    // selected one overrides this in CSS and comes to the front.
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.theme = t.id;
    b.title = `${t.name} - ${t.cloth}. ${t.note}`;

    /* A collection whose cloth is not woven yet has no palette to wear, and
       asking it for one is how this crashed the first time khelaiya went in.
       It shows in the strip regardless, struck through and inert, so the set
       reads as eight rather than quietly hiding what is outstanding. */
    if (!t.built) {
      b.classList.add('pending');
      b.disabled = true;
      b.title = `${t.name} - ${t.cloth}. Tracks are curated; the cloth is not woven yet.`;
    } else {
      const { bg, ink } = t.palette.chip;
      b.style.background = bg;
      b.style.color = ink;
      // Its own ink, so the ring belongs to the genre rather than to the page.
      b.style.setProperty('--chip-ink', ink);
    }

    const gu = document.createElement('span');
    gu.className = 'sw-gu';
    gu.lang = 'gu';
    gu.textContent = t.guj;

    // Kept in the DOM whatever the state, and hidden with opacity rather than
    // display, so the accessible name is always the genre and never "button".
    const en = document.createElement('span');
    en.className = 'sw-en';
    en.textContent = t.name;

    b.append(gu, en);
    if (t.built) b.addEventListener('click', () => setTheme(t, { announce: true, play: true }));
    li.append(b);
    el.themes.append(li);
  });
}

function markActive() {
  el.themes.querySelectorAll('.swatch').forEach((b) => {
    const on = b.dataset.theme === state.theme.id;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });

  /* The card scrolls on a narrow screen, so the current genre can land
     off-view - arriving at ?theme=techno showed six swatches and none of them
     picked. `nearest` so a swatch already visible does not make it jump. */
  el.themes.querySelector('.swatch.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

/* ── Beat indicator ─────────────────────────────────────────── */

const BEAT_DOTS = 4;
function buildBeat() {
  el.beat.innerHTML = '';
  for (let i = 0; i < BEAT_DOTS; i++) el.beat.append(document.createElement('i'));
}

let lastDot = -1;
function tickBeat() {
  requestAnimationFrame(tickBeat);
  const at = scene.beatPhase(BEAT_DOTS);
  if (at === lastDot) return;
  lastDot = at;
  [...el.beat.children].forEach((d, i) => d.classList.toggle('hit', i === at));
}

/* ── Themes ─────────────────────────────────────────────────── */

function setTheme(theme, { announce = false, play = false, source = 'switcher' } = {}) {
  state.theme = theme;
  /* The one question the site exists to answer: which of the eight anybody
     actually wants. `source` separates a deliberate pick from an arrival on a
     shared ?theme= link, which are very different signals. */
  track('collection', { collection: theme.id, source });
  const list = state.data[theme.id] || [];
  state.order = shuffle(list.map((_, i) => i));
  state.pos = 0;

  scene.setTheme({ ...theme.palette, bpm: theme.bpm });
  presence.retarget(theme.crowd);
  markActive();
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.dataset.ground = theme.ground;
  /* PYC's rule: indigo-and-orange on light, white-and-orange on dark. Swapping
     the source rather than toggling two images means only the one on screen is
     ever fetched. */
  /* PYC's rule: indigo-and-orange on light, white-and-orange on dark. Swapping
     the source rather than toggling two images means only the one on screen is
     ever fetched. */
  const dark = theme.ground === 'dark';
  el.brandMark.src = `/assets/brand/pyc-garba-jukebox-${dark ? 'night' : 'day'}.png`;
  /* YouTube names their two files after the ink, not the ground, so the one
     called "light" is the white one for dark cloths. These are renamed on the
     way in to say where they go, because reading it the other way round is a
     mistake you only catch by looking. */
  el.ytMark.src = `/assets/brand/youtube-logo-on-${dark ? 'dark' : 'light'}.png`;

  if (announce) toast(`<span lang="gu">${theme.guj}</span> - ${theme.note}`);
  if (play) {
    audio.play('dhol', 0.45);
    playAt(0);
  }
  return list;
}

/* ── Tracks ─────────────────────────────────────────────────── */

const currentList = () => state.data[state.theme.id] || [];

function paintTrack(t) {
  state.track = t;
  state.marked.clear();
  el.track.textContent = t.title;
  el.track.href = watchUrl(t.id);
  // The platform credit points at the thing actually playing, not the home page.
  el.ytCredit.href = watchUrl(t.id);
  el.artist.textContent = t.artist || '-';
  el.total.textContent = t.duration ? fmt(t.duration) : '-:-';
  el.elapsed.textContent = '0:00';
  if (t.cover) {
    el.cover.src = t.cover;
    el.cover.alt = `${t.title} cover art`;
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist || '',
      album: t.album || state.theme.name,
      artwork: t.cover ? [{ src: t.cover, sizes: '600x600', type: 'image/jpeg' }] : [],
    });
  }
}

function playAt(pos, { cue = false } = {}) {
  const list = currentList();
  if (!list.length) return;
  state.pos = ((pos % list.length) + list.length) % list.length;
  const t = list[state.order[state.pos]];
  paintTrack(t);
  cue ? player.cue(t.id) : player.load(t.id);
}

function advance() {
  playAt(state.pos + 1);
}

/* ── The song list ──────────────────────────────────────────── */

function openSheet() {
  el.sheetList.innerHTML = '';
  currentList().forEach((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="s-title"></span><span class="s-artist"></span>';
    b.querySelector('.s-title').textContent = t.title;
    b.querySelector('.s-artist').textContent = t.artist || '';
    if (state.track && t.id === state.track.id) {
      b.disabled = true;
      b.querySelector('.s-artist').textContent = 'playing';
    }
    b.addEventListener('click', () => {
      closeSheet();
      audio.play('manjira', 0.6);
      /* Straight to it. `order` is the shuffled running order and `i` indexes
         the list as written, so finding the track's place in that order keeps
         the set coherent: whatever follows it in the shuffle still follows it
         here, and the night carries on from where you jumped to. */
      const at = state.order.indexOf(i);
      if (at > -1) playAt(at);
      track('pick_track', { collection: state.theme.id, title: t.title });
    });

    /* A sibling rather than a child: the row is a button, and an anchor inside
       a button is neither valid nor operable. It stays enabled on the playing
       row, where the button does not. */
    const src = document.createElement('a');
    src.className = 's-src';
    src.href = watchUrl(t.id);
    src.target = '_blank';
    src.rel = 'noopener';
    src.setAttribute('aria-label', `Open ${t.title} on YouTube`);
    src.addEventListener('click', () =>
      track('source_click', { collection: state.theme.id, title: t.title, from: 'list' }),
    );
    src.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M9.4 14.6 18 6M12.6 5.9H18v5.4M15.2 13.6v4.8H5.6V8.8h4.9" /></svg>';

    li.append(b, src);
    el.sheetList.append(li);
  });

  el.sheet.hidden = false;
  el.songs.setAttribute('aria-expanded', 'true');
  el.sheetClose.focus();
}

function closeSheet() {
  el.sheet.hidden = true;
  el.songs.setAttribute('aria-expanded', 'false');
  el.songs.focus();
}

/* ── Wiring ─────────────────────────────────────────────────── */

el.play.addEventListener('click', () => {
  player.toggle();
  audio.play('dhol', 0.34);
});
el.next.addEventListener('click', () => {
  audio.play('dhol', 0.4);
  playAt(state.pos + 1);
});
/* The dock title is the other way back to the source. Worth its own `from`,
   because the two answer different questions: one is somebody browsing the
   list, the other is somebody stopping on what is playing right now. */
el.track.addEventListener('click', () => {
  if (!el.track.getAttribute('href')) return;
  track('source_click', { collection: state.theme.id, title: state.track?.title || '', from: 'dock' });
});

el.songs.addEventListener('click', () => {
  if (el.sheet.hidden) track('open_songs', { collection: state.theme.id });
  el.sheet.hidden ? openSheet() : closeSheet();
});
el.sheetClose.addEventListener('click', closeSheet);
el.sheet.addEventListener('click', (e) => {
  if (e.target === el.sheet) closeSheet();
});

/* Escape needs handling here as well as in bindKeys: bindKeys deliberately
   yields the key to whatever is focused, and opening the sheet moves focus
   onto its close button - so the global binding never fires while the sheet
   is the only thing you would want to close. */
el.sheet.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSheet();
  }
});

/* ── Fullscreen ─────────────────────────────────────────────────
   The whole point of this page is a floor you watch, so it should be able to
   have the screen. Prefixed forms are still what older Safari answers to.

   The control is removed rather than disabled where there is no element
   fullscreen at all - iPhone Safari - because a button that cannot work is
   worse than no button. No key binding: `f` already opens the song list, and
   taking it back would break a habit for a feature nobody has yet. */
const fsRoot = document.documentElement;
const enterFs = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

if (!enterFs) {
  el.fs.hidden = true;
} else {
  const syncFs = () => {
    fsRoot.dataset.fs = fsOn() ? 'on' : 'off';
    el.fs.setAttribute('aria-label', fsOn() ? 'Leave fullscreen' : 'Fullscreen');
  };
  el.fs.addEventListener('click', () => {
    audio.play('manjira', 0.4);
    if (!fsOn()) track('fullscreen', { collection: state.theme.id });
    /* Both can reject - a browser may refuse the request, and exiting throws
       if something else already left. Neither is worth interrupting for. */
    Promise.resolve(fsOn() ? exitFs.call(document) : enterFs.call(fsRoot)).catch(() => {});
  });
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  syncFs();
}

bindKeys({
  ' ': () => {
    player.toggle();
    audio.play('dhol', 0.34);
  },
  n: () => playAt(state.pos + 1),
  f: () => (el.sheet.hidden ? openSheet() : closeSheet()),
  Escape: () => !el.sheet.hidden && closeSheet(),
  ArrowRight: () => player.nudge(10),
  ArrowLeft: () => player.nudge(-10),
});

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => player.play());
  navigator.mediaSession.setActionHandler('pause', () => player.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => playAt(state.pos + 1));
}

/* ── The join hint ──────────────────────────────────────────────
   The newcomer is a small outlined figure standing off the edge of the floor,
   and nothing on screen said she could be tapped. The scene knows where she is
   but paints no text, so the words live here and get parked under her.

   Positioned rather than anchored because she moves: her radius is a function
   of the floor's, so every resize puts her somewhere new. Recomputed on resize
   and once she sets off, which is every time it can actually change - there is
   no need to touch the DOM on a frame that only spun the circle. */
function placeJoinHint() {
  const hint = el.joinHint;
  const at = scene.newcomerHint();
  if (!at) {
    hint.classList.remove('show');
    return;
  }
  const box = el.floor.getBoundingClientRect();
  const overHer = box.left + at.x;
  hint.style.top = `${box.top + at.y + at.r + 12}px`;
  hint.classList.add('show');

  /* Centre it under her, then push it back inside the viewport if that would
     hang it off the edge - she stands close to the right rail, and on a phone
     there is not half a bubble's width to spare out there. The notch is told
     where she actually is so it keeps pointing at her either way. */
  const half = hint.offsetWidth / 2;
  const edge = 12;
  const left = Math.min(Math.max(overHer, half + edge), window.innerWidth - half - edge);
  hint.style.left = `${left}px`;
  hint.style.setProperty('--notch', `${half + (overHer - left)}px`);
}

window.addEventListener('resize', placeJoinHint);

/* ── Boot ───────────────────────────────────────────────────── */

async function boot() {
  state.data = (await fetch('/tracks.json').then((r) => r.json())).slots || {};

  const wanted = themeById(new URLSearchParams(location.search).get('theme'));
  buildThemes();
  setTheme(wanted?.built ? wanted : BUILT[0], { source: wanted?.built ? 'link' : 'default' });

  buildBeat();
  toast(`<span lang="gu">${state.theme.guj}</span> - ${state.theme.note}`);
  playAt(0, { cue: true });
  player.boot(currentList()[state.order[0]].id);
  tickBeat();
  placeJoinHint();
}

/* Report what actually broke. Swallowing every boot failure behind "the
   playlist did not load" sent me hunting a network problem that was really a
   thrown reference three lines further down. */
boot().catch((err) => {
  console.error('boot failed:', err);
  el.track.textContent = 'The playlist did not load';
  el.track.removeAttribute('href'); // an <a> with no href is text, not a dead link
  el.artist.textContent = 'Reload, or try again in a moment';
});

