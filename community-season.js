// Preserve festival content and player nodes, including their existing listeners.
(() => {
  const archive = document.createElement('section');
  archive.id = 'navratriArchive';
  archive.className = 'section alt-section';
  archive.innerHTML = '<div class="section-heading"><span>FESTIVAL MEMORIES</span><h2>Navratri 2026 Archival</h2><p>Our Navratri programme, daily colours, music and celebration spotlights, preserved together.</p></div>';
  document.getElementById('archive').before(archive);
  const contents = document.createElement('details');
  contents.className = 'form-card';
  contents.innerHTML = '<summary>Explore the Navratri 2026 programme &amp; memories</summary>';
  archive.append(contents);
  for (const id of ['navratriHero', 'navratriProgramme', 'weekendMusic', 'navratriSongs', 'navratriDays', 'raasRangArchive']) {
    const section = document.getElementById(id);
    if (section) contents.append(section);
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (const update of window.SaiVistaContent?.navratriUpdates || []) {
      const card = document.createElement('article');
      card.className = 'update-card';
      const title = document.createElement('h3'), body = document.createElement('p');
      title.textContent = update.title;
      body.textContent = update.body;
      card.append(title, body);
      contents.append(card);
    }
  });
  for (const section of [archive, document.getElementById('archive')]) {
    const tabs = document.createElement('nav');
    tabs.className = 'archive-switcher';
    tabs.setAttribute('aria-label', 'Festival archives');
    for (const [id, label] of [['navratriArchive','Navratri 2026'],['archive','Ganesh Festival 2026']]) {
      const link = document.createElement('a');
      link.href = '#' + id; link.textContent = label;
      tabs.append(link);
    }
    section.querySelector('.section-heading').after(tabs);
  }
  const revealArchive = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target && contents.contains(target)) {
      contents.open = true;
      target.scrollIntoView?.();
    }
  };
  window.addEventListener('hashchange', revealArchive);
  revealArchive();
  const dialog = document.getElementById('marathonInterestDialog');
  const form = document.getElementById('marathonInterestForm');
  const status = document.getElementById('marathonInterestStatus');
  const submit = document.getElementById('marathonInterestSubmit');
  const close = document.getElementById('closeMarathonInterest');
  let opener, ready = false, pending = false, reference, attempt, checkVersion = 0;
  const endpoint = window.SaiVistaRegistrationConfig?.endpoint;
  for (const trigger of document.querySelectorAll('[data-interest-open]')) {
    trigger.addEventListener('click', async () => {
      opener = trigger;
      form.reset(); form.hidden = false;
      try { form.elements.flat.value = typeof ResidentAccess === 'undefined' ? '' : ResidentAccess.remembered(window.localStorage) || ''; } catch (_) {}
      form.elements.name.setCustomValidity('');
      for (const input of form.querySelectorAll("input")) input.disabled = false;
      form.dataset.activity = trigger.dataset.interestOpen;
      document.getElementById('marathonInterestTitle').textContent = trigger.dataset.interestOpen + ' Marathon Interest';
      // A retry keeps its reference and exact payload until acknowledged.
      reference = crypto.randomUUID(); attempt = null; ready = false; pending = false;
      submit.disabled = true; submit.textContent = 'Save my interest';
      const version = ++checkVersion;
      status.textContent = 'Connecting to the private response sheet…';
      dialog.showModal();
      form.elements.name.focus();
      try {
        if (!endpoint) throw Error('setup');
        const response = await fetch(endpoint, {cache:'no-store', signal:AbortSignal.timeout(45000)});
        const data = await response.json();
        if (version !== checkVersion || !dialog.open) return;
        if (!response.ok || data.status !== 'success' || data.service !== 'sai-vista-events-v1' || data.config?.marathonInterest !== true) throw Error('setup');
        ready = true; submit.disabled = false; status.textContent = 'Ready. Your response will be saved privately for the committee.';
      } catch (_) {
        if (version === checkVersion && dialog.open) status.textContent = 'Online interest collection is not available yet. Nothing has been saved. Please contact the Cultural Committee, or close and reopen this form to retry.';
      }
    });
  }
  close.addEventListener('click', () => { if (!pending) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
  dialog.addEventListener('close', () => { checkVersion++; opener?.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || pending || !form.reportValidity()) return;
    if (!form.elements.name.value.trim()) { form.elements.name.setCustomValidity('Please enter your name.'); form.elements.name.reportValidity(); return; }
    if (!attempt) attempt = {action:'marathon-interest', requestId:reference, activity:form.dataset.activity, name:form.elements.name.value.trim(), flat:form.elements.flat.value.trim().toUpperCase().replace(' ', '-').replace(/^([A-F])(\d)/,'$1-$2'), count:Number(form.elements.count.value), agreed:form.elements.agreed.checked};
    pending = true; submit.disabled = true; close.disabled = true;
    for (const input of form.querySelectorAll('input')) input.disabled = true;
    submit.textContent = 'Saving…'; status.textContent = 'Saving your interest. Please keep this form open.';
    try {
      const response = await fetch(endpoint, {method:'POST', body:new URLSearchParams({payload:JSON.stringify(attempt)}), signal:AbortSignal.timeout(60000)});
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || data.registrationId !== reference) throw Error(data.message || 'Unable to confirm the save.');
      form.hidden = true;
      status.textContent = `Saved — thank you! Your ${attempt.activity.toLowerCase()} interest is in the committee’s private ${attempt.activity} tab. Reference: ${reference}. The event is still tentative.`;
    } catch (error) {
      // Preserve the payload after an uncertain save; a retry must not create a second row.
      status.textContent = 'We could not confirm your save. Please retry with the same details. ' + (error.message === 'offline' ? '' : error.message);
      submit.disabled = false; submit.textContent = 'Retry saving my interest';
    } finally {
      pending = false; close.disabled = false;
    }
  });
  form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
})();
