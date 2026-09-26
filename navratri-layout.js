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
})();
