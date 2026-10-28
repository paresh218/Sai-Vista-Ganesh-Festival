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
  // Historical interest responses remain in their private sheets; entries now use the marathon module.
})();
