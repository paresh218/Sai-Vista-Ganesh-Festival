const assert = require('node:assert/strict');
const fs = require('node:fs');
const calendar = require('./navratri-days.js');
assert.equal(calendar.days.length, 9);
assert.deepEqual(calendar.days.map(day => day.colour), ['Orange','White','Red','Royal Blue','Yellow','Green','Grey','Purple','Peacock Green']);
assert.equal(calendar.current(new Date('2026-10-10T18:29:59Z')), null);
assert.equal(calendar.current(new Date('2026-10-10T18:30:00Z')).day, 1);
for (const day of calendar.days) {
  assert.equal(calendar.current(new Date(day.date + 'T00:00:00+05:30')).day, day.day);
  assert.equal(calendar.current(new Date(day.date + 'T23:59:59+05:30')).goddess, day.goddess);
  assert.ok(fs.existsSync(day.image), day.image);
}
assert.equal(calendar.current(new Date('2026-10-19T18:30:00Z')), null);
assert.equal(calendar.current(new Date('2027-10-11T12:00:00+05:30')), null);
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(s => parseInt(s,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
};
for (const day of calendar.days) {
  assert.ok(1.05/(luminance(day.accent)+0.05)>=4.5, `${day.colour}: white button text contrast`);
  assert.ok((luminance(day.pale)+0.05)/(luminance(day.accent)+0.05)>=4.5, `${day.colour}: accent text contrast`);
}
console.log('PASS: all nine dates/goddesses/assets, India-midnight boundaries, year/end isolation, readable theme contrast.');
