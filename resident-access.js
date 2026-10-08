const ResidentAccess = {
  flat(wing, floor, unit) {
    if (!/^[A-F]$/.test(wing) || !/^(?:[1-9]|1[0-3])$/.test(String(floor)) || !/^0[1-4]$/.test(unit)) return null;
    return `${wing}-${floor}${unit}`;
  }
};
if (typeof module !== 'undefined') module.exports = ResidentAccess;
if (typeof document !== 'undefined') (() => {
  const config = window.SaiVistaVisitConfig || {};
  const gate = document.getElementById('residentGate');
  const form = document.getElementById('residentGateForm');
  const wing = document.getElementById('residentWing'), floor = document.getElementById('residentFloor'), unit = document.getElementById('residentUnit');
  for (const [select, values] of [[wing, [...'ABCDEF']], [floor, Array.from({ length: 13 }, (_, i) => String(i + 1))], [unit, ['01','02','03','04']]]) {
    for (const value of values) { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }
  }
  if (!config.endpoint) document.getElementById('residentLoggingNotice').textContent = 'Visit logging is not connected yet. Your flat is used only for this page visit and is not sent to a logging service. Your entered flat is self-reported, not verified residency.';
  else if (!config.capturesIp) document.getElementById('residentLoggingNotice').textContent = 'The committee records your entered flat, sections viewed, selected actions, date/time and browser/device details in private records kept for 90 days. IP addresses are not collected with this connection. Your entered flat is self-reported, not verified residency.';
  let flat, queue = [], sending = false;
  const sessionId = crypto.randomUUID();
  const device = { userAgent: navigator.userAgent.slice(0, 500), language: navigator.language, viewport: `${innerWidth}×${innerHeight}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  function record(type, target) {
    if (!flat || !config.endpoint) return;
    queue.push({ id: crypto.randomUUID(), type, target, clientTime: new Date().toISOString() });
    if (queue.length > 100) queue.shift();
    if (queue.length >= 10) flush();
  }
  async function flush() {
    if (sending || !queue.length || !config.endpoint) return;
    const batch = queue.slice(0, 20); sending = true;
    try {
      const result = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ flat, sessionId, device, events: batch }), keepalive: true, signal: AbortSignal.timeout(15000) });
      const data = await result.json(); if (result.ok && data.ok) { const sent = new Set(batch.map(event => event.id)); queue = queue.filter(event => !sent.has(event.id)); }
    } catch (_) { /* Retry in-memory on the next interval; never save visit histories on a shared device. */ }
    finally { sending = false; }
  }
  form.addEventListener('change', () => { document.getElementById('residentFlatPreview').textContent = ResidentAccess.flat(wing.value, floor.value, unit.value) || ''; });
  gate.addEventListener('cancel', event => event.preventDefault());
  gate.addEventListener('close', () => { if (!flat) gate.showModal(); });
  form.addEventListener('submit', event => {
    event.preventDefault(); const value = ResidentAccess.flat(wing.value, floor.value, unit.value);
    if (!value || !document.getElementById('residentConfirm').checked) { document.getElementById('residentGateStatus').textContent = 'Select your wing, floor and flat, then confirm to continue.'; return; }
    flat = value; window.SaiVistaResidentReady = true;
    document.documentElement.classList.remove('resident-locked'); gate.close();
    record('entry', 'site'); flush();
    // Log only meaningful named site sections, never form contents, captions or external URLs.
    const observed = new Set(), visible = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      }
    }, { threshold: 0 });
    setInterval(() => {
      if (document.hidden || document.querySelector('dialog[open]')) return;
      for (const section of visible) {
        if (!observed.has(section.id) && !section.closest('[hidden]') && section.getClientRects().length) { observed.add(section.id); record('section', section.id); }
      }
    }, 1000);
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
    window.dispatchEvent(new Event('sai-vista-resident-ready'));
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('button[id], a[href^="#"]'); if (!target || !flat || target.closest('#residentGate')) return;
    const id = target.id || target.getAttribute('href').slice(1);
    if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(id)) record('action', id);
  });
  window.addEventListener('hashchange', () => { const section = location.hash.slice(1); if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(section)) record('navigation', section); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  setInterval(flush, 10000);
  gate.showModal();
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { if (!flat) wing.focus(); }, 0));
})();
