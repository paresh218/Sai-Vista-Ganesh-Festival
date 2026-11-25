const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const sharp = require('sharp');

test('race day shows separate route maps and one current text schedule', async t => {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'));
  t.after(() => dom.window.close());
  const d = dom.window.document;
  const routes = [...d.querySelectorAll('#marathonRoute article')];
  assert.equal(routes.length, 2);
  for (const [i, race] of ['3K', '5K'].entries()) {
    const image = routes[i].querySelector('img');
    const path = 'assets/sai-vista-' + race + '-route-map.png';
    assert.equal(image.getAttribute('src'), path);
    assert.equal(routes[i].querySelector('a').getAttribute('href'), path);
    assert.match(routes[i].querySelector('h3').textContent, new RegExp(race + '.*' + (i + 1) + ' loop'));
    const {width, height} = await sharp(path).metadata();
    assert.equal(image.width, width);
    assert.equal(image.height, height);
  }
  const schedule = d.getElementById('marathonSchedule');
  assert.deepEqual([...schedule.querySelectorAll('tbody tr')].map(row => [...row.cells].map(cell => cell.textContent)), [
    ['5K', '5:45 AM', '6:00 AM', '6:30 AM'],
    ['3K and 3K Kids', '5:45 AM', '6:00 AM', '6:40 AM'],
    ['After you finish', 'Medal and breakfast (show your bib)'],
    ['7:30 AM', 'Cool-down and Zumba'],
    ['8:00 AM', 'Lucky draw, fun games and prize distribution']
  ]);
  assert.equal(schedule.querySelector('img'), null);
  assert.equal(d.querySelector('[src*="marathon-route.js"], [href*="marathon-route-2026.jpeg"]'), null);
});
