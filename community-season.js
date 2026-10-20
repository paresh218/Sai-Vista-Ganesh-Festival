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
  const revealArchive = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target && contents.contains(target)) {
      contents.open = true;
      target.scrollIntoView?.();
    }
  };
  window.addEventListener('hashchange', revealArchive);
  revealArchive();
  for (const form of document.querySelectorAll('.marathon-interest-form')) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const message = `Hi Paresh, I am interested in the Sai Vista ${form.dataset.activity} Marathon.\nName: ${data.get('name').trim()}\nWing & flat: ${data.get('flat').trim().toUpperCase()}\nInterested participants: ${data.get('count')}\nTentative window: early to mid December 2026. I understand this is interest only; the event and details are not confirmed.`;
      const status = form.querySelector('.interest-status');
      status.replaceChildren();
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = 'https://wa.me/918149525915?text=' + encodeURIComponent(message);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open WhatsApp and press Send →';
      status.append('Your message is ready. Your interest has not been sent yet. ', link);
    });
  }
})();
