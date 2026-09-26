/* Sai Vista's supplied colour calendar. Date selection always uses India time. */
const NavratriDays = (() => {
  const days = [
    ['Shailputri','Orange','#ef7d22','#963e09','#fff3e8','shailputri'],
    ['Brahmacharini','White','#ffffff','#414b58','#f3f5f8','brahmacharini'],
    ['Chandraghanta','Red','#d72e37','#a31e2a','#fff0f1','chandraghanta'],
    ['Kushmanda','Royal Blue','#3155cd','#2443a1','#edf2ff','kushmanda'],
    ['Skandamata','Yellow','#f3ca37','#71540a','#fffbea','skandamata'],
    ['Katyayani','Green','#32844b','#216437','#edf7ef','katyayani'],
    ['Kalaratri','Grey','#9399a1','#424b55','#f0f2f4','kalaratri'],
    ['Mahagauri','Purple','#8c46ac','#70308f','#f8effb','mahagauri'],
    ['Siddhidatri','Peacock Green','#087f83','#006265','#e8f8f6','siddhidatri']
  ].map(([goddess, colour, swatch, accent, pale, slug], index) => ({ day: index + 1, date: `2026-10-${11 + index}`, goddess: `Maa ${goddess}`, colour, swatch, accent, pale, image: `assets/navratri-${slug}.png` }));
  function indiaDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = key => parts.find(part => part.type === key).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  const current = (now = new Date()) => days.find(day => day.date === indiaDate(now)) || null;
  return { days, indiaDate, current };
})();
if (typeof module !== 'undefined') module.exports = NavratriDays;
if (typeof window !== 'undefined') {
  window.NavratriDays = NavratriDays;
  const dialog = document.getElementById('navratriDayDialog');
  const image = document.getElementById('navratriGoddessImage');
  let previousFocus, renderedDate;
  const format = day => new Date(day.date + 'T12:00:00+05:30').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  window.openNavratriDay = day => {
    if (!day) return;
    document.getElementById('navratriDayLabel').textContent = `NAVRATRI · DAY ${day.day}`;
    document.getElementById('navratriDayDate').textContent = format(day);
    document.getElementById('navratriDayTitle').textContent = day.goddess;
    document.getElementById('navratriDayColour').textContent = `Colour of the day: ${day.colour}`;
    dialog.style.setProperty('--day-accent', day.accent); dialog.style.setProperty('--day-pale', day.pale); dialog.style.setProperty('--day-swatch', day.swatch);
    image.hidden = false; document.getElementById('goddessImageStatus').hidden = true;
    image.alt = `Devotional illustration of ${day.goddess}`; image.src = day.image;
    if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); document.body.classList.add('day-dialog-open'); }
    document.getElementById('navratriDayTitle').focus({ preventScroll: true });
  };
  image.onerror = () => { image.hidden = true; document.getElementById('goddessImageStatus').hidden = false; };
  for (const id of ['closeNavratriDay', 'continueNavratriDay']) document.getElementById(id).onclick = () => dialog.close();
  dialog.addEventListener('close', () => { document.body.classList.remove('day-dialog-open'); previousFocus?.focus({ preventScroll: true }); });
  const cards = document.getElementById('navratriDayCards');
  for (const day of NavratriDays.days) {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'navratri-day-card'; card.dataset.date = day.date; card.style.setProperty('--swatch', day.swatch);
    const swatch = document.createElement('i'); swatch.setAttribute('aria-hidden', 'true');
    const small = document.createElement('span'); small.textContent = `Day ${day.day} · ${11 + day.day - 1} Oct`;
    const title = document.createElement('strong'); title.textContent = day.colour;
    const name = document.createElement('span'); name.textContent = day.goddess;
    card.append(swatch, small, title, name); card.setAttribute('aria-haspopup', 'dialog'); card.onclick = () => window.openNavratriDay(day); cards.append(card);
  }
  function update() {
    const today = NavratriDays.indiaDate(); if (today === renderedDate) return;
    const changed = Boolean(renderedDate); renderedDate = today;
    const day = NavratriDays.current();
    const style = document.documentElement.style;
    for (const [key, value] of Object.entries({ '--day-accent': day?.accent || '#641847', '--day-pale': day?.pale || '#f8edf4', '--day-swatch': day?.swatch || '#efbd64' })) style.setProperty(key, value);
    document.querySelector('meta[name="theme-color"]').content = day?.accent || '#641847';
    document.body.dataset.navratriDay = day?.day || '';
    document.getElementById('navratriTodayStatus').textContent = day ? `Today · Day ${day.day} · ${day.colour} · ${day.goddess}` : today < '2026-10-11' ? 'Our colour journey begins on 11 October. Explore all nine days below.' : today <= '2026-10-21' ? 'Nine colours, countless memories. Our celebrations continue through 21 October.' : 'Thank you for celebrating! Explore our Navratri 2026 colour calendar.';
    for (const card of cards.children) { if (card.dataset.date === today) card.setAttribute('aria-current', 'date'); else card.removeAttribute('aria-current'); }
    if (changed && dialog.open) { if (day) window.openNavratriDay(day); else dialog.close(); }
  }
  update(); setInterval(update, 30000); document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}
