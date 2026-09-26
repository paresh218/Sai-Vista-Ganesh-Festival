(() => {
  const root = document.getElementById('goddessSlideshow');
  const days = window.NavratriDays.days;
  const image = document.getElementById('heroGoddessImage');
  const caption = document.getElementById('heroGoddessCaption');
  const pause = document.getElementById('pauseGoddesses');
  const status = document.getElementById('goddessSlideStatus');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, paused = reducedMotion.matches, loading = false, hovered = false, visible = true;
  function pauseLabel() {
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', paused ? 'Play goddess slideshow' : 'Pause goddess slideshow');
    caption.setAttribute('aria-live', paused ? 'polite' : 'off');
  }
  async function show(next) {
    if (loading) return;
    const target = (next + days.length) % days.length, day = days[target];
    loading = true; root.setAttribute('aria-busy', 'true'); status.textContent = '';
    try {
      const loaded = new Image(); loaded.src = day.image;
      await loaded.decode();
      image.src = day.image; image.alt = `Devotional illustration of ${day.goddess}`;
      index = target;
      document.getElementById('openHeroGoddess').setAttribute('aria-label', `View ${day.goddess} and her festival day`);
      document.getElementById('heroGoddessDay').textContent = `DAY ${day.day} · ${day.day + 10} OCTOBER · ${day.colour.toUpperCase()}`;
      document.getElementById('heroGoddessName').textContent = day.goddess;
      document.getElementById('goddessSlideCount').textContent = `${day.day} / ${days.length}`;
      root.style.setProperty('--slide-accent', day.accent);
      root.style.setProperty('--slide-pale', day.pale);
      if (!reducedMotion.matches) image.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
    } catch (_) {
      paused = true; pauseLabel(); status.textContent = 'The next illustration could not load. Try the arrows again.';
    } finally { loading = false; root.removeAttribute('aria-busy'); }
  }
  document.getElementById('previousGoddess').onclick = () => { paused = true; pauseLabel(); show(index - 1); };
  document.getElementById('nextGoddess').onclick = () => { paused = true; pauseLabel(); show(index + 1); };
  document.getElementById('openHeroGoddess').onclick = () => { paused = true; pauseLabel(); window.openNavratriDay(days[index]); };
  pause.onclick = () => { paused = !paused; pauseLabel(); };
  // Keyboard interaction stops rotation until the visitor explicitly chooses Play.
  root.addEventListener('focusin', event => { if (!root.contains(event.relatedTarget)) { paused = true; pauseLabel(); } });
  root.addEventListener('mouseenter', () => { hovered = true; });
  root.addEventListener('mouseleave', () => { hovered = false; });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { paused = true; pauseLabel(); } });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.15 }).observe(root);
  setInterval(() => {
    if (!paused && !hovered && visible && !loading && !document.hidden && !document.querySelector('dialog[open]')) show(index + 1);
  }, 7000);
  pauseLabel();
  show((window.NavratriDays.current()?.day || 1) - 1);
})();
