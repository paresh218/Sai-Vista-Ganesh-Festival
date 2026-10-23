const CulturalFundReminder = {
  status(payload, flat) {
    const parsed = ResidentAccess.parse(flat);
    if (!parsed || payload?.status !== 'success' || !Array.isArray(payload.payments)) return 'unknown';
    const [wing, unit] = parsed.split('-');
    const rows = payload.payments.filter(row => row && String(row.wing || '').trim().toUpperCase() === wing && String(row.flat || '').trim() === unit);
    if (rows.length !== 1) return 'unknown';
    const paid = String(rows[0].paid || '').trim().toLowerCase();
    return paid === 'yes' ? 'paid' : paid === 'no' ? 'pending' : 'unknown';
  }
};
if (typeof module !== 'undefined') module.exports = CulturalFundReminder;
if (typeof document !== 'undefined') (() => {
  const dialog = document.getElementById('culturalFundReminder');
  if (!dialog) return;
  const countdown = document.getElementById('fundReminderCountdown');
  let currentFlat, state = 'unknown', checkedAt = 0, checking = false, started = false, closeTimer, countTimer;
  let seconds = 8, previousFocus, audio, muted = false;
  const voices = new Set(), soundButton = document.getElementById('fundReminderSound');
  const Audio = window.AudioContext || window.webkitAudioContext;
  function stopSound() {
    for (const voice of voices) { try { voice.stop(); } catch (_) {} }
    voices.clear();
  }
  function playSound() {
    if (muted || !audio || audio.state !== 'running' || voices.size) return;
    try {
      const start = audio.currentTime;
      // Soft cartoon boings, generated locally; no audio download or tracking.
      for (let i = 0; i < 16; i++) {
        const at = start + i * .5, oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime([440,660,330,550][i % 4], at);
        oscillator.frequency.exponentialRampToValueAtTime(120, at + .45);
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(.035, at + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .49);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        voices.add(oscillator); oscillator.start(at); oscillator.stop(at + .5);
      }
    } catch (_) { stopSound(); }
  }
  function unlockSound() {
    if (!Audio || muted) return;
    try {
      audio ||= new Audio();
      Promise.resolve(audio.resume()).then(() => { if (dialog.open) playSound(); }).catch(() => {});
    } catch (_) { /* The reminder still works when browser sound is unavailable. */ }
  }
  document.addEventListener('pointerdown', unlockSound, {capture:true});
  document.addEventListener('keydown', unlockSound, {capture:true});
  if (!Audio) { soundButton.disabled = true; soundButton.textContent = 'Sound unavailable'; }
  soundButton.addEventListener('click', () => {
    muted = !muted; soundButton.textContent = muted ? 'Enable sound' : 'Mute sound';
    soundButton.setAttribute('aria-pressed', String(muted));
    if (muted) stopSound(); else unlockSound();
  });
  function flat() {
    try { return ResidentAccess.remembered(window.localStorage); } catch (_) { return null; }
  }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer); clearInterval(countTimer);
    stopSound();
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  });
  document.getElementById('fundReminderClose').addEventListener('click', close);
  async function check() {
    if (checking) return;
    checking = true; state = 'unknown';
    const requestedFlat = flat(); currentFlat = requestedFlat;
    try {
      const response = await fetch(FestivalRegistration.collectionUrl, {cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw Error('Payment check unavailable');
      const payload = await response.json();
      if (flat() === requestedFlat) state = CulturalFundReminder.status(payload, requestedFlat);
    } catch (_) { state = 'unknown'; }
    finally { checkedAt = Date.now(); checking = false; }
  }
  async function tick() {
    if (document.hidden || !window.SaiVistaResidentReady || !flat()) return;
    if (flat() !== currentFlat || Date.now() - checkedAt >= 60000) await check();
    if (checking || state !== 'pending' || document.hidden || flat() !== currentFlat) return;
    // Never interrupt another form, gallery, player popup or native dialog.
    if (document.querySelector('dialog[open], .modal:not(.hidden):not([hidden]), [aria-modal="true"]:not(dialog):not([hidden]):not([aria-hidden="true"])')) return;
    previousFocus = document.activeElement;
    seconds = 8; countdown.textContent = 'Closes automatically in 8 seconds';
    dialog.showModal();
    playSound();
    countTimer = setInterval(() => { seconds--; countdown.textContent = `Closes automatically in ${seconds} seconds`; }, 1000);
    closeTimer = setTimeout(close, 8000);
  }
  function start() {
    if (started) return;
    started = true; check().then(() => { tick(); setInterval(tick, 10000); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('sai-vista-resident-ready', start);
  if (window.SaiVistaResidentReady) start();
})();
