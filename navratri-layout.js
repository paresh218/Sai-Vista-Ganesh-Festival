// Move the original, intact Ganesh sections before navigation captures its sections.
(() => {
  const archive = document.getElementById('archive');
  const heading = document.createElement('h3');
  heading.textContent = 'Ganesh Festival · 14–25 September 2026';
  archive.prepend(heading);
  for (const selector of ['.bappa-feature', '#registration', '#aarti', '#sponsors', '#wallpapers']) {
    const section = document.querySelector(selector);
    if (section) archive.append(section);
  }
  const forms = document.createElement('details');
  forms.innerHTML = '<summary>Original Ganesh Festival forms · archive reference</summary><p>The 2026 Ganesh Festival has concluded. These original form links are retained for reference.</p>';
  for (const [label, url] of [
    ['All Event Registration', 'https://forms.gle/LZDdZCUgNTp34tar5'],
    ['Satyanarayan Pooja', 'https://forms.gle/xkEiQqAmXVQ75Keb8'],
    ['Bollywood Night', 'https://forms.gle/28994c4UexrtNWbXA'],
    ['Satyanarayan Prasad Availability', 'https://forms.gle/KC1wqmx4xjHbMRtz7'],
    ['Fun Fair Stall Entry', 'https://forms.gle/2YapGuBbkc962JuZ6']
  ]) {
    const row = document.createElement('p'), link = document.createElement('a');
    link.href = url; link.textContent = label; link.target = '_blank'; link.rel = 'noopener'; row.append(link); forms.append(row);
  }
  document.getElementById('registration').append(forms);
  const accounts = document.getElementById('accounts');
  document.querySelector('.quick-grid').after(accounts);
  const uploads = document.getElementById('communityPhotoForm');
  document.querySelector('#communityPhotos .section-heading').after(uploads);
  // Keep secondary sharing options compact on phones.
  const sharing = document.querySelector('.celebration-share');
  const sharingDetails = document.createElement('details'); sharingDetails.className = 'sharing-details';
  const sharingSummary = document.createElement('summary'); sharingSummary.textContent = 'Share our celebration on Instagram or Facebook';
  sharing.before(sharingDetails); sharingDetails.append(sharingSummary, sharing);
  const reels = document.querySelector('.media-submit-grid');
  const reelDetails = document.createElement('details'); reelDetails.className = 'sharing-details';
  const reelSummary = document.createElement('summary'); reelSummary.textContent = 'Have an Instagram Reel? Share its link';
  reels.before(reelDetails); reelDetails.append(reelSummary, reels);
  document.addEventListener('DOMContentLoaded', () => {
    const message = window.SaiVistaContent?.archivedUpdates.find(update => update.id === 'ganesh-thank-you-2026');
    if (!message) return;
    const card = document.createElement('article');
    card.className = 'update-card';
    const title = document.createElement('h3'), body = document.createElement('p');
    title.textContent = message.title;
    body.textContent = message.body;
    card.append(title, body);
    heading.after(card);
    const welcome = document.getElementById('committeeWelcome');
    const letter = document.getElementById('committeeWelcomeMessage');
    for (const paragraph of message.body.split('\n\n')) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      letter.append(p);
    }
    welcome.querySelectorAll('button').forEach(button => button.addEventListener('click', () => welcome.close()));
    welcome.addEventListener('close', () => {
      document.body.classList.remove('welcome-open');
      document.querySelector('.brand')?.focus({ preventScroll: true });
    });
    // Run after the other initial page handlers have finished setting navigation focus.
    const openWelcome = () => setTimeout(() => {
      const day = window.NavratriDays?.current();
      if (day) { window.openNavratriDay(day); return; }
      welcome.showModal();
      document.body.classList.add('welcome-open');
      document.getElementById('committeeWelcomeTitle').focus({ preventScroll: true });
    }, 0);
    if (window.SaiVistaResidentReady) openWelcome();
    else window.addEventListener('sai-vista-resident-ready', openWelcome, { once: true });
  });
})();
