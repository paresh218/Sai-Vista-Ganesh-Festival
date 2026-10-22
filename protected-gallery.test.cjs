const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function service(){
 let time=Date.now(),serial=0;const props={GALLERY_SECRET:'private-test-secret',GALLERY_BOOK_ID:'private-book'},sheets=new Map(),mails=[],cache=new Map();
 const headers={'Gallery access':['Email','Name','Flat (self-reported)','Status','Requested at','Approved by / notes'],'Gallery activity':['Time','Event','Email','Photo','Mode','Browser','Language','Viewport','Timezone','Reference'],'Gallery photos':['Photo reference','Private Drive file ID','Name','MIME type','Enabled']};
 for(const [name,header]of Object.entries(headers)){const rows=[header];sheets.set(name,{rows,getLastRow:()=>rows.length,getLastColumn:()=>header.length,appendRow:r=>rows.push(r),getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w))})});}
 const p={getProperty:k=>props[k]??null,setProperty(k,v){props[k]=v;return this;},deleteProperty:k=>delete props[k],getProperties:()=>({...props})};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
 const ctx={Date:Clock,console:{error(){}},PropertiesService:{getScriptProperties:()=>p},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets.get(n)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:v=>mails.push(v)},Utilities:{getUuid:()=> (++serial).toString(16).padStart(32,'0'),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,s)=>[...crypto.createHash(alg).update(s).digest()]}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('protected-gallery.gs','utf8'),ctx);
 return {ctx,props,sheets,mails,advance:ms=>time+=ms,call:d=>ctx.galleryHandle(d),code:()=>mails.at(-1).body.match(/code is (\d{6})/)[1]};
}
const profile={action:'gallery-otp',email:'Resident@example.com',name:'Test Resident',flat:'A-101',consent:true};
function verified(s){const req=s.call(profile);assert.equal(req.ok,true);const data=s.call({action:'gallery-verify',challenge:req.challenge,code:s.code()});assert.equal(data.ok,true);return {...data,challenge:req.challenge};}
test('OTP validates ownership; committee approval is required for every photo operation',()=>{
 const s=service(),login=verified(s);assert.equal(login.status,'PENDING');assert.equal(s.sheets.get('Gallery access').rows[1][0],'resident@example.com');
 for(const action of ['gallery-page','gallery-thumbs','gallery-image','gallery-download','gallery-event'])assert.equal(s.call({action,token:login.token,page:0,ids:['x'],photo:'x'}).ok,false,action);
 assert.equal(s.call({action:'gallery-status',token:login.token}).status,'PENDING');
 s.sheets.get('Gallery access').rows[1][3]='APPROVED';
 s.sheets.get('Gallery photos').rows.push(['opaque-reference','secret-drive-id','private-name.jpg','image/jpeg','YES']);
 const page=s.call({action:'gallery-page',token:login.token,page:0});assert.equal(page.ok,true);assert.equal(page.total,1);assert.deepEqual(JSON.parse(JSON.stringify(page.photos)),[{id:'opaque-reference',number:1}]);assert.doesNotMatch(JSON.stringify(page),/secret-drive|private-name|drive\.google/);
 s.sheets.get('Gallery access').rows[1][3]='REVOKED';assert.equal(s.call({action:'gallery-page',token:login.token,page:0}).ok,false);
});
test('unauthenticated, expired and logged-out tokens cannot read photos or list metadata',()=>{
 const s=service();for(const action of ['gallery-page','gallery-thumbs','gallery-image','gallery-download'])assert.equal(s.call({action,token:'fake',page:0,photo:'x'}).ok,false);
 const login=verified(s);s.sheets.get('Gallery access').rows[1][3]='APPROVED';assert.equal(s.call({action:'gallery-logout',token:login.token}).ok,true);assert.equal(s.call({action:'gallery-status',token:login.token}).ok,false);
 const other=service(),old=verified(other);other.advance(8*3600000+1);assert.equal(other.call({action:'gallery-status',token:old.token}).ok,false);
});
test('OTP is single-use, expires, has attempt limits and is stored only as a hash',()=>{
 const s=service(),req=s.call(profile),code=s.code();assert.doesNotMatch(JSON.stringify(s.props),new RegExp('"'+code+'"'));
 for(let i=0;i<5;i++)assert.equal(s.call({action:'gallery-verify',challenge:req.challenge,code:code==='000000'?'111111':'000000'}).ok,false);
 assert.equal(s.call({action:'gallery-verify',challenge:req.challenge,code}).ok,false);
 const x=service(),login=verified(x);assert.equal(x.call({action:'gallery-verify',challenge:login.challenge,code:x.code()}).ok,false);
 const y=service(),pending=y.call(profile);y.advance(600001);assert.equal(y.call({action:'gallery-verify',challenge:pending.challenge,code:y.code()}).ok,false);
});
test('invalid profiles, email abuse and cross-folder photo requests fail safely',()=>{
 const s=service();for(const patch of [{email:'bad'},{email:'a@b.c\r\nBcc:x@y.z'},{name:' '},{flat:'A-1401'},{consent:false}])assert.equal(s.call({...profile,...patch}).ok,false);
 assert.equal(s.mails.length,0);const login=verified(s);assert.equal(s.call(profile).ok,false);s.sheets.get('Gallery access').rows[1][3]='APPROVED';assert.equal(s.call({action:'gallery-download',token:login.token,photo:'not-in-private-index'}).ok,false);
 assert.equal(s.ctx.gallerySafe('=IMPORTXML("x")').startsWith("'="),true);
});
test('public code never embeds the original folder or Drive image URLs',()=>{
 const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('protected-gallery.js','utf8');assert.doesNotMatch(html+js,/1R3nufrPj10hEpmfkqpshH_oenAWHuDCT|drive\.google\.com\/drive\/folders|drive\.google\.com\/thumbnail/);
 assert.match(js,/Sai Vista Navratri 2026/);assert.match(js,/gallery-download/);assert.match(js,/toBlob/);
});
const {JSDOM}=require('jsdom');
test('gallery UI keeps photos locked until approval, then renders thumbnails and clears them on logout',async(t)=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org',runScripts:'outside-only'}),w=dom.window,d=w.document;t.after(()=>w.close());
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.HTMLImageElement.prototype.decode=async()=>{};w.URL.createObjectURL=()=> 'blob:test-image';w.URL.revokeObjectURL=()=>{};w.SaiVistaRegistrationConfig={endpoint:'https://example.org/api'};
 let approved=false;const actions=[];
 w.fetch=async(url,options)=>{const input=JSON.parse(options.body.get('payload'));actions.push(input.action);let data;
 if(input.action==='gallery-otp')data={ok:true,challenge:'test-challenge',message:'Check your email.'};
 else if(input.action==='gallery-verify')data={ok:true,token:'verified-token',email:'resident@example.com',expires:Date.now()+100000,status:'PENDING'};
 else if(input.action==='gallery-status')data={ok:true,email:'resident@example.com',status:approved?'APPROVED':'PENDING',expires:Date.now()+100000};
 else if(input.action==='gallery-page'){assert.equal(input.token,'verified-token');assert.ok(approved);data={ok:true,page:0,total:1,photos:[{id:'opaque',number:1}]};}
 else if(input.action==='gallery-thumbs')data={ok:true,images:[{id:'opaque',mime:'image/png',base64:'aGVsbG8='}]};
 else data={ok:true};return {ok:true,json:async()=>data};};
 w.eval(fs.readFileSync('protected-gallery.js','utf8'));d.getElementById('openPrivateGallery').click();assert.equal(d.getElementById('galleryAlbum').hidden,true);
 d.getElementById('galleryEmail').value='resident@example.com';d.getElementById('galleryName').value='Test Resident';d.getElementById('galleryFlat').value='A-101';d.getElementById('galleryConsent').checked=true;
 d.getElementById('galleryRequestForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('galleryOtpForm').hidden,false);
 d.getElementById('galleryCode').value='123456';d.getElementById('galleryOtpForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));
 assert.equal(d.getElementById('galleryPending').hidden,false);assert.equal(actions.includes('gallery-page'),false);assert.equal(d.getElementById('galleryGrid').children.length,0);
 approved=true;d.getElementById('galleryCheckApproval').click();await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('galleryAlbum').hidden,false);assert.equal(d.getElementById('galleryGrid').children.length,1);
 d.getElementById('galleryModelist').click();assert.ok(d.getElementById('galleryGrid').classList.contains('private-gallery-list'));
 d.getElementById('galleryLogout').click();await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('galleryGrid').children.length,0);assert.equal(d.getElementById('galleryAuth').hidden,false);assert.equal(w.sessionStorage.getItem('saiVistaPrivateGallery'),null);
});
