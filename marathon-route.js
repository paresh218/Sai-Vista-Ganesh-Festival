// Image coordinates keep the overlay aligned with the committee's supplied route.
(() => {
  const root = document.getElementById('marathonRoute');
  if (!root) return;
  const svg = root.querySelector('svg'), path = root.querySelector('[data-route-path]');
  const runner = root.querySelector('[data-route-runner]');
  const play = root.querySelector('[data-route-play]');
  const status = root.querySelector('[data-route-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shared = [[266,290],[278,302],[275,375],[320,380],[325,377],[275,380],[195,378],[100,392],[140,459],[169,499],[211,568],[252,646],[296,724],[338,796],[390,875]];
  const extension = [[424,931],[471,991],[526,1053],[584,1120],[640,1178],[704,1240],[761,1290],[801,1310]];
  let race = '3', length = 0, progress = 0, previous = null, frame = 0;
  let playing = !reduced.matches, visible = false;
  function draw() {
    path.style.strokeDashoffset = String(1 - progress);
    if (length) {
      const point = path.getPointAtLength(progress * length);
      runner.setAttribute('transform', `translate(${point.x} ${point.y})`);
    }
  }
  function sync() {
    play.textContent = playing ? 'Pause animation' : 'Play animation';
    play.setAttribute('aria-pressed', String(playing));
    cancelAnimationFrame(frame);
    previous = null;
    if (playing && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(time) {
    if (previous !== null) progress = Math.min(1, progress + Math.min(time - previous, 100) / (race === '3' ? 14000 : 20000));
    previous = time;
    // Quantize only the graphic overlay to the skill's 12 fps cadence.
    const actual = progress;
    progress = Math.floor(progress * (race === '3' ? 168 : 240)) / (race === '3' ? 168 : 240);
    draw();
    progress = actual;
    if (progress >= 1) { playing = false; status.textContent = `${race} km route complete · back at Sai Vista.`; sync(); }
    else frame = requestAnimationFrame(tick);
  }
  function select(value) {
    race = value;
    const outbound = race === '5' ? shared.concat(extension) : shared;
    const points = outbound.concat(outbound.slice(0, -1).reverse());
    path.setAttribute('d', points.map((p, i) => `${i ? 'L' : 'M'}${p.join(' ')}`).join(' '));
    length = path.getTotalLength();
    progress = reduced.matches ? 1 : 0;
    playing = !reduced.matches;
    root.querySelectorAll('[data-route-race]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.routeRace === race)));
    status.textContent = `${race} km · Sai Vista → ${race === '3' ? '1.5' : '2.5'} km turnaround → Sai Vista.`;
    draw(); sync();
  }
  root.querySelectorAll('[data-route-race]').forEach(button => button.addEventListener('click', () => select(button.dataset.routeRace)));
  play.addEventListener('click', () => { if (progress >= 1) progress = 0; playing = !playing; draw(); sync(); });
  root.querySelector('[data-route-replay]').addEventListener('click', () => { progress = 0; playing = true; draw(); sync(); });
  reduced.addEventListener('change', () => { if (reduced.matches) { playing = false; progress = 1; draw(); sync(); } });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(svg);
  else visible = true;
  select('3');
  svg.removeAttribute('hidden');
})();
