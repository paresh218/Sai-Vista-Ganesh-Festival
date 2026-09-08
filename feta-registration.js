/* One registration is for one feta. Payment status is resident-declared. */
const FETA_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwTWhqD-d-T9uyaVPCFWIwmV_msu7725uGJwUIPSCa97PmyghcDe52JHPAexp6JcfNH/exec';
const FETA_DEADLINE = Date.parse('2026-09-11T17:00:00+05:30');
function validateFeta(data) {
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{1,79}$/u.test(data.name)) return 'Enter a valid name (2–80 characters).';
  if (!/^[6-9]\d{9}$/.test(data.whatsapp)) return 'Enter a valid 10-digit Indian WhatsApp number.';
  if (!/^(?:[1-9]|1[0-3])0[1-4]$/.test(data.flatNo)) return 'Choose a flat from 101–104 through 1301–1304.';
  if (!/^[A-F]$/.test(data.wing)) return 'Choose wing A to F.';
  if (!['Yes', 'No'].includes(data.paid)) return 'Select Paid: Yes or No.';
  return '';
}
async function readFetaResponse(response) {
  const body = await response.text();
  let result;
  try { result = JSON.parse(body); } catch (_) {
    throw new Error('The registration service is not configured correctly. Please ask the coordinator to update the Feta Apps Script deployment and enable access for Anyone.');
  }
  if (!response.ok) throw new Error('The registration service is unavailable. Please try again later.');
  if (result.status !== 'success') throw new Error(result.message || 'The registration service could not save your details. Please contact Kantilal Mahajan.');
  if (!result.registrationId) throw new Error('The registration service returned an incompatible response. Please ask the coordinator to deploy the latest Feta Apps Script.');
  return result;
}
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('fetaDialog');
  const form = document.getElementById('fetaForm');
  const status = document.getElementById('fetaStatus');
  const success = document.getElementById('fetaSuccess');
  const submit = document.getElementById('submitFeta');
  let requestId = crypto.randomUUID();
  for (let floor = 1; floor <= 13; floor++) for (let unit = 1; unit <= 4; unit++) {
    const flat = String(floor * 100 + unit);
    form.elements.flatNo.add(new Option(flat, flat));
  }
  function updateDeadline() {
    const closed = Date.now() >= FETA_DEADLINE;
    document.querySelectorAll('[data-open-feta]').forEach(button => {
      button.disabled = closed;
      button.textContent = closed ? 'Feta registration closed' : 'Register for Feta';
    });
    if (closed) { submit.disabled = true; status.textContent = 'Feta registration closed on 11 September 2026 at 5 PM IST. Contact Kantilal Mahajan for queries.'; }
  }
  document.querySelectorAll('[data-open-feta]').forEach(button => button.addEventListener('click', () => { updateDeadline(); dialog.showModal(); }));
  document.getElementById('closeFeta').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  updateDeadline();
  setInterval(updateDeadline, 30000);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (Date.now() >= FETA_DEADLINE) return updateDeadline();
    const data = Object.fromEntries(new FormData(form));
    data.name = data.name.trim().replace(/\s+/g, ' ');
    data.whatsapp = data.whatsapp.replace(/[\s()-]/g, '').replace(/^(?:\+91|0091)/, '');
    const error = validateFeta(data);
    if (error) { status.textContent = error; return; }
    submit.disabled = true;
    status.textContent = 'Saving your registration…';
    try {
      const response = await fetch(FETA_ENDPOINT, { method: 'POST', body: new URLSearchParams({ ...data, requestId }), signal: AbortSignal.timeout(30000) });
      const result = await readFetaResponse(response);
      form.hidden = true;
      success.hidden = false;
      document.getElementById('fetaConfirmation').textContent = `Thank you, ${data.name}! Your registration for 1 Feta (₹70) is confirmed. Reference: ${result.registrationId}. Wing ${data.wing}, flat ${data.flatNo}. Paid: ${data.paid} (subject to verification).`;
      const message = `Hi Kantilal Mahajan, I have registered for 1 Feta for Sai Vista Ganesh Festival 2026.\nName: ${data.name}\nWhatsApp: +91 ${data.whatsapp}\nFlat: ${data.wing}-${data.flatNo}\nAmount: Rs. 70\nPaid: ${data.paid}\nReference: ${result.registrationId}`;
      document.getElementById('fetaWhatsApp').href = `https://wa.me/919403942777?text=${encodeURIComponent(message)}`;
      status.textContent = '';
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'The registration service took too long to respond. Keep this form open and retry with the same details.'
        : error instanceof TypeError
          ? 'Cannot reach the registration service. Check your connection. The coordinator should verify that the latest Apps Script is deployed with access set to Anyone.'
          : error.message;
    } finally { submit.disabled = Date.now() >= FETA_DEADLINE; }
  });
});
