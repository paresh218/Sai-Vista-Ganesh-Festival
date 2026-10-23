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
  let seconds = 5, previousFocus;
  function flat() {
    try { return ResidentAccess.remembered(window.localStorage); } catch (_) { return null; }
  }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer); clearInterval(countTimer);
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
    seconds = 5; countdown.textContent = 'Closes automatically in 5 seconds';
    dialog.showModal();
    countTimer = setInterval(() => { seconds--; countdown.textContent = `Closes automatically in ${seconds} seconds`; }, 1000);
    closeTimer = setTimeout(close, 5000);
  }
  function start() {
    if (started) return;
    started = true; check(); setInterval(tick, 30000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('sai-vista-resident-ready', start);
  if (window.SaiVistaResidentReady) start();
})();
