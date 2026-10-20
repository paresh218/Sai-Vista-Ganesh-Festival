/* ─────────────────────────────────────────────────────────────
   Shared YouTube-iframe player.

   The sound comes from a 1x1 iframe parked off-screen; everything
   visible is the site's own chrome. Extracted from Truck Wala so
   the next site doesn't write this a third time.

   Carried forward deliberately:
     - progress is polled slowly and extrapolated per frame, because
       the YT API only reports a new currentTime a few times a second
       and reading it straight into the DOM gives a bar that lurches
     - onError skips, so a region-blocked or pulled video doesn't
       strand the player
     - visibilitychange resamples, because background tabs freeze rAF
       and the extrapolator would otherwise slam to the end on return
   ───────────────────────────────────────────────────────────── */

export function createPlayer({ mountId, onReady, onEnded, onPlayState, onProgress }) {
  let yt = null;
  const state = { ready: false, playing: false, scrubbing: false, started: false };
  const poll = { at: 0, time: 0, duration: 0 };
  let lastSecond = -1;
  let lastDuration = -1;

  /* Nothing is ever shown, so ask YouTube for the smallest rendition it has
     and stop paying for pixels nobody sees. The embed has no audio-only mode;
     this plus the 1x1 size is as close as it gets. YouTube may override the
     hint, hence the try. */
  const preferAudio = () => {
    try {
      yt?.setPlaybackQuality?.('tiny');
    } catch {
      /* the API ignores the hint on some videos */
    }
  };

  function resetPoll() {
    lastSecond = -1;
    lastDuration = -1;
    poll.time = 0;
    poll.duration = 0;
  }

  function sample() {
    if (!yt || typeof yt.getCurrentTime !== 'function') return;
    poll.time = yt.getCurrentTime() || 0;
    poll.duration = yt.getDuration() || 0;
    poll.at = performance.now();
    // Paint from here too. rAF is suspended in a hidden tab and throttled in a
    // backgrounded one, and without this the glass simply freezes at whatever
    // level it held when the tab went away. Timers keep running (throttled),
    // so this keeps it honest at a coarser rate and costs nothing when rAF is
    // healthy - emit() is idempotent for a given second.
    emit();
  }

  function emit() {
    if (!yt || state.scrubbing || !poll.duration) return;

    const drift = state.playing ? (performance.now() - poll.at) / 1000 : 0;
    const current = Math.min(poll.duration, poll.time + drift);
    const fraction = clamp01(current / poll.duration);

    const second = Math.floor(current);
    const secondChanged = second !== lastSecond;
    const durationChanged = poll.duration !== lastDuration;
    if (secondChanged) lastSecond = second;
    if (durationChanged) lastDuration = poll.duration;

    onProgress?.({ current, duration: poll.duration, fraction, secondChanged, durationChanged });
  }

  function paint() {
    requestAnimationFrame(paint);
    emit();
  }

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    sample();
  });

  const api = {
    get ready() {
      return state.ready;
    },
    get playing() {
      return state.playing;
    },
    get started() {
      return state.started;
    },

    boot(firstVideoId) {
      window.onYouTubeIframeAPIReady = () => {
        yt = new YT.Player(mountId, {
          height: '1',
          width: '1',
          videoId: firstVideoId,
          playerVars: { playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: () => {
              state.ready = true;
              preferAudio();
              onReady?.();
            },
            onStateChange: (e) => {
              const S = YT.PlayerState;
              if (e.data === S.PLAYING) {
                state.playing = true;
                preferAudio();
                onPlayState?.(true);
              } else if (e.data === S.PAUSED) {
                state.playing = false;
                onPlayState?.(false);
              } else if (e.data === S.ENDED) {
                onEnded?.();
              }
            },
            onError: () => {
              // Region-blocked or pulled down - roll on rather than stall.
              if (state.started) onEnded?.();
            },
          },
        });

        setInterval(sample, 250);
        requestAnimationFrame(paint);
      };

      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.append(s);
    },

    load(videoId) {
      if (!yt) return;
      state.started = true;
      resetPoll();
      yt.loadVideoById(videoId);
    },

    /** Swap the loaded video without starting it. loadVideoById always plays,
     *  so anything that changes the track before the visitor has pressed play
     *  has to come through here or the page starts making noise on its own. */
    cue(videoId) {
      if (!yt || typeof yt.cueVideoById !== 'function') return;
      resetPoll();
      yt.cueVideoById(videoId);
    },

    play() {
      if (!yt || !state.ready) return;
      state.started = true;
      yt.playVideo();
    },

    pause() {
      yt?.pauseVideo();
    },

    toggle() {
      if (!yt || !state.ready) return;
      state.playing ? api.pause() : api.play();
    },

    duration: () => yt?.getDuration?.() || 0,
    currentTime: () => yt?.getCurrentTime?.() || 0,

    seekToFraction(f) {
      const d = api.duration();
      if (!d || !yt) return;
      yt.seekTo(d * clamp01(f), true);
      sample();
    },

    nudge(seconds) {
      if (!yt) return;
      yt.seekTo(Math.max(0, api.currentTime() + seconds), true);
      sample();
    },

    getVolume: () => (typeof yt?.getVolume === 'function' ? yt.getVolume() : null),
    setVolume: (v) => yt?.setVolume?.(Math.round(v)),

    setScrubbing(on) {
      state.scrubbing = on;
      if (!on) sample();
    },
  };

  return api;
}

