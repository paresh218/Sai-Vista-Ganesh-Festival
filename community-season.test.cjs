const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function page(hash='') {
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org/'+hash,runScripts:'outside-only'});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
 for(const file of ['event-registration-config.js','navratri-layout.js','community-season.js','site-data.js']) dom.window.eval(fs.readFileSync(file,'utf8'));
 return dom;
}
test('community home and archives preserve sections and reveal deep links',()=>{
 const dom=page('#navratriProgramme'),d=dom.window.document;
 assert.match(d.querySelector('#home').textContent,/Thank you, Sai Vista family!/);
 for(const id of ['navratriHero','navratriProgramme','weekendMusic','navratriSongs','navratriDays','raasRangArchive']) assert.ok(d.querySelector('#navratriArchive').contains(d.getElementById(id)),id);
 assert.ok(d.querySelector('#navratriArchive details').open);
 assert.ok(d.querySelector('#archive').contains(d.getElementById('registration')));
 assert.equal(d.querySelectorAll('#home').length,1);
 dom.window.close();
});
test('Navratri archive is a separate view and nested links select the right festival',(t)=>{
 const dom=page(),w=dom.window,d=w.document;
 t.after(()=>dom.window.close());
 w.eval(['event-registration-model.js','event-ux.js','festival-experience.js'].map(file=>fs.readFileSync(file,'utf8')).join('\n'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(d.getElementById('navratriArchive').hidden,true);
 w.location.hash='#navratriProgramme';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal(d.body.dataset.view,'navratriArchive');assert.equal(d.getElementById('home').hidden,true);
 assert.equal(d.getElementById('navratriArchive').hidden,false);
 w.location.hash='#raasRangPreview';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal(d.body.dataset.view,'navratriArchive');
 dom.window.close();
});

test('confirmed marathon replaces interest promotion and leads the main content',()=>{
 const dom=page(),w=dom.window,d=w.document;
 const banner=d.getElementById('marathonInterest');assert.equal(d.querySelector('main').firstElementChild,banner);assert.match(banner.textContent,/29 NOVEMBER 2026/);assert.match(banner.textContent,/Pay, submit, get confirmed/);assert.equal(d.querySelectorAll('[data-interest-open]').length,0);assert.equal(d.getElementById('marathonInterestDialog'),null);assert.ok(d.querySelector('.mobile-nav a[href="#marathonInterest"]'));assert.ok(d.getElementById('marathonEntryDialog'));
 w.close();
});

test('Home prevents the native thank-you anchor jump and restores the main view',(t)=>{
 const dom=page('#navratriArchive'),w=dom.window,d=w.document;let top;
 t.after(()=>dom.window.close());
 w.scrollTo=options=>{top=options.top;};
 w.eval(['event-registration-model.js','event-ux.js','festival-experience.js'].map(file=>fs.readFileSync(file,'utf8')).join('\n'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});
 d.querySelector('#siteNav a[href="#home"]').dispatchEvent(click);
 assert.equal(click.defaultPrevented,true);assert.equal(w.location.hash,'#home');
 assert.equal(d.body.dataset.view,'main');assert.equal(top,0);assert.equal(d.getElementById('navratriArchive').hidden,true);
 dom.window.close();
});
