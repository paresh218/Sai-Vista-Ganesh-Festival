const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function page(hash='') {
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org/'+hash,runScripts:'outside-only'});
 for(const file of ['navratri-layout.js','community-season.js','site-data.js']) dom.window.eval(fs.readFileSync(file,'utf8'));
 return dom;
}
test('community home and separate festival archives preserve existing nodes',()=>{
 const dom=page('#navratriProgramme'),d=dom.window.document;
 assert.match(d.querySelector('#home').textContent,/Kojagiri Celebration/);
 assert.equal(new Date('2026-10-25T12:30:00Z').getUTCDay(),0);
 for(const id of ['navratriHero','navratriProgramme','weekendMusic','navratriSongs','navratriDays','raasRangArchive']) assert.ok(d.querySelector('#navratriArchive').contains(d.getElementById(id)),id);
 assert.ok(d.querySelector('#navratriArchive details').open);
 assert.ok(d.querySelector('#archive').contains(d.getElementById('registration')));
 assert.equal(d.querySelectorAll('#home').length,1);
 assert.ok(dom.window.SaiVistaContent.updates.every(x=>!x.id.startsWith('navratri-weekend')));
 dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
 dom.window.close();
});
test('running and walking forms validate and prepare distinct WhatsApp messages',()=>{
 const dom=page(),d=dom.window.document;
 const forms=[...d.querySelectorAll('.marathon-interest-form')];assert.equal(forms.length,2);
 for(const form of forms){
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.equal(form.querySelector('.interest-status a'),null);
  form.elements.name.value='Test Resident';form.elements.flat.value='A-101';form.querySelector('[type=checkbox]').checked=true;
  assert.ok(form.checkValidity());
  form.elements.flat.value='Z-999';assert.equal(form.checkValidity(),false);form.elements.flat.value='A-101';
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  const link=form.querySelector('.interest-status a'),message=new URL(link.href).searchParams.get('text');
  assert.match(message,new RegExp(form.dataset.activity+' Marathon'));
  assert.match(message,/interest only/);assert.match(message,/December 2026/);assert.match(message,/A-101/);
  assert.equal(new URL(link.href).pathname,'/918149525915');
 }
 dom.window.close();
});
