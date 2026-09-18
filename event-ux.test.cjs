const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const M=require('./event-registration-model.js');
const context={FestivalRegistration:M,module:{exports:{}}};vm.createContext(context);vm.runInContext(fs.readFileSync('event-ux.js','utf8'),context);const U=context.module.exports;
assert.deepEqual(Object.keys(U.metadata).sort(),Object.keys(M.events).sort());
assert.equal(U.matches(U.metadata.talent,'upcoming',true,'2026-09-20'),true);
assert.equal(U.matches(U.metadata.talent,'upcoming',true,'2026-09-22'),false);
assert.equal(U.matches(U.metadata.fancy,'closed',true,'2026-09-17'),true);
assert.equal(U.matches(U.metadata.blood,'kids',false,'2026-09-17'),false);
assert.equal(U.matches(U.metadata.cooking,'adults',false,'2026-09-17'),true);
assert.equal(U.matches(U.metadata.pooja,'pooja',false,'2026-09-17'),true);
const data={event:'blood',requestId:'test-reference',firstName:'Test Only',lastName:'',wing:'A',flatNo:'101',phone:'9999999999',donatedBefore:false};
const message=U.whatsapp(data,'Blood Donation','20 September 2026','Sameer Gandhi');
assert.match(message,/Hi Sameer Gandhi/);assert.match(message,/Name: Test Only/);assert.match(message,/Flat number: 101/);assert.match(message,/Have donated blood before\?: No/);assert.doesNotMatch(message,/lastName|undefined|agreed/);
assert.ok(U.summary({...data,donatedBefore:true}).some(([key,value])=>key==='Have donated blood before?'&&value==='Yes'));
const notices=[{id:'fancy-deadline-sep17',title:'Open',body:'Open'},{id:'kurta-refund-sep17',title:'Refund',body:'Refund'}];
assert.equal(U.notices(notices,Date.parse('2026-09-17T18:29:59Z'))[0].title,'Open');
assert.match(U.notices(notices,Date.parse('2026-09-17T18:30:00Z'))[0].title,/closed/);
assert.equal(U.notices(notices,Date.parse('2026-09-20'))[1].title,'Refund');assert.equal(notices[0].title,'Open');
let catalog;const w={SaiVistaI18n:{addTranslations(value){catalog=value;},t(key){return catalog.hi[key]||w.SaiVistaUXTranslate?.(key,'hi')||key;}}};
vm.runInNewContext(fs.readFileSync('ux-translations.js','utf8'),{window:w,FestivalRegistration:M});
for(const lang of ['hi','mr']){
  for(const key of ['Name','This field is required.','Registration saved','Your registration is saved. No WhatsApp message has been sent yet.','Events & registration'])assert.ok(catalog[lang][key],`${lang}: ${key}`);
  for(const id of Object.keys(M.events).filter(id=>!['talent','drawing'].includes(id)))for(const rule of M.events[id].rules)assert.ok(catalog[lang][rule],`${lang}: ${id} guideline`);
}
assert.notEqual(w.SaiVistaUXTranslate('Name *','hi'),'Name *');
assert.notEqual(w.SaiVistaUXTranslate('Notify Sameer Gandhi on WhatsApp ↗','hi'),'Notify Sameer Gandhi on WhatsApp ↗');
console.log('PASS: filter dates/categories, complete event metadata, clean confirmation/WhatsApp details, expired notices and Hindi/Marathi active-event guideline coverage.');

// The published kurta notice expires at midnight India time; archive stays intact.
const published={window:{}};vm.runInNewContext(fs.readFileSync('site-data.js','utf8'),published);
const publishedNotices=published.window.SaiVistaContent.updates;
const kurta=publishedNotices.find(item=>item.id==='kurta-refund-sep18');
const expiry=Date.parse('2026-09-20T00:00:00+05:30');
assert.equal(Date.parse(kurta.expiresAt),expiry);
assert.ok(U.notices(publishedNotices,expiry-1).some(item=>item.id===kurta.id));
assert.ok(!U.notices(publishedNotices,expiry).some(item=>item.id===kurta.id));
assert.ok(!U.notices(publishedNotices,expiry+86400000).some(item=>item.id===kurta.id));
assert.ok(U.notices(publishedNotices,expiry).some(item=>item.id==='nominations-closed-sep17'));
assert.ok(publishedNotices.some(item=>item.id===kurta.id));
assert.match(fs.readFileSync('index.html','utf8'),/id="kurtaArchive"[\s\S]*assets\/kurta-bill-2026-09-11.jpg/);
