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
 assert.match(d.querySelector('#home').textContent,/Kojagiri Celebration/);
 for(const id of ['navratriHero','navratriProgramme','weekendMusic','navratriSongs','navratriDays','raasRangArchive']) assert.ok(d.querySelector('#navratriArchive').contains(d.getElementById(id)),id);
 assert.ok(d.querySelector('#navratriArchive details').open);
 assert.ok(d.querySelector('#archive').contains(d.getElementById('registration')));
 assert.equal(d.querySelectorAll('#home').length,1);
 dom.window.close();
});
test('interest forms open in a labelled popup and close back to their trigger',()=>{
 const dom=page(),d=dom.window.document;
 const dialog=d.getElementById('marathonInterestDialog');assert.ok(dialog);
 assert.ok(d.getElementById(dialog.getAttribute('aria-labelledby')));
 const triggers=[...d.querySelectorAll('[data-interest-open]')];assert.equal(triggers.length,2);
 for(const trigger of triggers){trigger.click();assert.ok(dialog.open);assert.equal(dialog.querySelector('form').dataset.activity,trigger.dataset.interestOpen);d.getElementById('closeMarathonInterest').click();assert.equal(dialog.open,false);}
 assert.equal(d.querySelector('#marathonInterest form'),null,'long forms stay out of the banner');
 dom.window.close();
});
test('no unconnected save and no false success on failure; confirmed save returns reference',async(t)=>{
 const dom=page(),w=dom.window,d=w.document;
 t.after(()=>dom.window.close());
 let saved;
 w.fetch=async(url,options)=>{if(!options?.method)return {ok:true,json:async()=>({status:'success',service:'sai-vista-events-v1',config:{marathonInterest:true}})};saved=JSON.parse(options.body.get('payload'));return {ok:true,json:async()=>({status:'success',registrationId:saved.requestId})};};
 d.querySelector('[data-interest-open="Running"]').click();
 await new Promise(r=>setImmediate(r));
 const form=d.querySelector('#marathonInterestDialog form');
 form.elements.name.value='Test Resident';form.elements.flat.value='A-101';form.elements.count.value='2';form.elements.agreed.checked=true;
 assert.ok(form.checkValidity());
 form.elements.flat.value='Z-999';assert.equal(form.checkValidity(),false);form.elements.flat.value='A-101';
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));
 assert.equal(saved.activity,'Running');assert.equal(saved.flat,'A-101');assert.equal(saved.count,2);
 assert.match(d.querySelector('#marathonInterestStatus').textContent,/Saved/);
 assert.match(d.querySelector('#marathonInterestStatus').textContent,new RegExp(saved.requestId));
 d.getElementById('closeMarathonInterest').click();d.querySelector('[data-interest-open="Walking"]').click();await new Promise(r=>setImmediate(r));
 assert.equal(form.elements.name.disabled,false,'reopening after success restores editable inputs');
 form.elements.name.value='Test Resident';form.elements.flat.value='B-102';form.elements.agreed.checked=true;
 w.fetch=async()=>{throw Error('offline');};
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));
 assert.doesNotMatch(d.querySelector('#marathonInterestStatus').textContent,/Saved/);
 assert.match(d.querySelector('#marathonInterestStatus').textContent,/retry/i);
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
