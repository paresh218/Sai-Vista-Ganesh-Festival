const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function service(){
 let time=Date.now(),serial=0;const props={GALLERY_SECRET:'private-test-secret',GALLERY_BOOK_ID:'private-book'},sheets=new Map(),mails=[],cache=new Map();
 const headers={'Gallery access':['Email','Name','Flat (self-reported)','Status','Requested at','Approved by / notes'],'Gallery activity':['Time','Event','Email','Photo','Mode','Browser','Language','Viewport','Timezone','Reference'],'Gallery photos':['Photo reference','Private Drive file ID','Name','MIME type','Enabled']};
 for(const [name,header]of Object.entries(headers)){const rows=[header];sheets.set(name,{rows,getLastRow:()=>rows.length,getLastColumn:()=>header.length,appendRow:r=>rows.push(r),getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w)),setValues:values=>values.forEach((v,i)=>v.forEach((x,j)=>rows[r-1+i][c-1+j]=x))})});}
 const p={getProperty:k=>props[k]??null,setProperty(k,v){props[k]=v;return this;},deleteProperty:k=>delete props[k],getProperties:()=>({...props})};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
 const ctx={Session:{getEffectiveUser:()=>({getEmail:()=> 'saivistaculturalcommittee@gmail.com'})},Date:Clock,console:{error(){}},PropertiesService:{getScriptProperties:()=>p},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets.get(n)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:v=>mails.push(v)},Utilities:{getUuid:()=> (++serial).toString(16).padStart(32,'0'),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,s)=>[...crypto.createHash(alg).update(s).digest()]}};
 ctx.Utilities.Charset={UTF_8:'UTF-8'};ctx.Utilities.base64EncodeWebSafe=s=>Buffer.from(s).toString('base64url');ctx.Gmail={Users:{Messages:{send:({raw})=>{ctx.MailApp.sendEmail({body:Buffer.from(raw,'base64url').toString('utf8').split('\r\n\r\n')[1]});return {id:'test-message'};}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('protected-gallery.gs','utf8'),ctx);
 return {ctx,props,sheets,mails,advance:ms=>time+=ms,call:d=>ctx.galleryHandle({flat:'A-101',...d}),code:()=>mails.at(-1).body.match(/code is (\d{6})/)[1]};
}
const profile={action:'gallery-otp',email:'Resident@example.com',name:'Test Resident',flat:'A-101',consent:true};
function verified(s){const req=s.call(profile);assert.equal(req.ok,true);const data=s.call({action:'gallery-verify',challenge:req.challenge,code:s.code()});assert.equal(data.ok,true);return {...data,challenge:req.challenge};}
test('correct OTP grants automatic access; unverified, wrong-flat and revoked sessions remain locked',()=>{
 const s=service();assert.equal(s.call({action:'gallery-page',token:'fake',page:0}).ok,false);
 const login=verified(s);assert.equal(login.status,'APPROVED');assert.equal(login.flat,'A-101');assert.equal(s.sheets.get('Gallery access').rows[1][3],'APPROVED');
 s.sheets.get('Gallery photos').rows.push(['opaque-reference','secret-drive-id','private-name.jpg','image/jpeg','YES']);
 const page=s.call({action:'gallery-page',token:login.token,page:0});assert.equal(page.ok,true);assert.equal(page.total,1);assert.deepEqual(JSON.parse(JSON.stringify(page.photos)),[{id:'opaque-reference',number:1}]);assert.doesNotMatch(JSON.stringify(page),/secret-drive|private-name|drive\.google/);
 assert.equal(s.call({action:'gallery-page',token:login.token,page:0,flat:'B-902'}).ok,false);
 s.sheets.get('Gallery access').rows[1][3]='REVOKED';for(const action of ['gallery-page','gallery-image','gallery-download','gallery-cache'])assert.equal(s.call({action,token:login.token,page:0,photo:'opaque-reference'}).ok,false);
});
test('unauthenticated, expired and logged-out tokens cannot read photos or list metadata',()=>{
 const s=service();for(const action of ['gallery-page','gallery-thumbs','gallery-image','gallery-download'])assert.equal(s.call({action,token:'fake',page:0,photo:'x'}).ok,false);
 const login=verified(s);s.sheets.get('Gallery access').rows[1][3]='APPROVED';assert.equal(s.call({action:'gallery-logout',token:login.token}).ok,true);assert.equal(s.call({action:'gallery-status',token:login.token}).ok,false);
 const other=service(),old=verified(other);other.advance(90*86400000+1);assert.equal(other.call({action:'gallery-status',token:old.token}).ok,false);
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
 const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('protected-gallery.js','utf8');assert.doesNotMatch(html+js,/drive\.google\.com\/drive\/folders|drive\.google\.com\/thumbnail/);
 assert.match(js,/Sai Vista Navratri 2026/);assert.match(js,/media\('download'/);assert.match(js,/toBlob/);
});
const {JSDOM}=require('jsdom');
test('gallery automatically opens after OTP, reuses flat, persists verification and clears data on logout',async(t)=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org',runScripts:'outside-only'}),w=dom.window,d=w.document;t.after(()=>w.close());
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.HTMLImageElement.prototype.decode=async()=>{};w.URL.createObjectURL=()=> 'blob:test-image';w.URL.revokeObjectURL=()=>{};w.SaiVistaGalleryConfig={endpoint:'https://example.org/api'};w.ResidentAccess=require('./resident-access.js');w.localStorage.setItem('saiVistaResidentFlat','B-902');w.eval('var ResidentAccess=window.ResidentAccess;');
 const actions=[];let cleared=false;w.SaiVistaGalleryCache={get:async()=>null,put:async()=>{},clear:async()=>{cleared=true;}};
 w.fetch=async(url,options)=>{const input=JSON.parse(options.body.get('payload'));actions.push(input.action);assert.equal(input.flat,'B-902');let data;
 if(input.action==='gallery-otp'){assert.equal(input.email,'resident@example.com');data={ok:true,challenge:'test-challenge',message:'Check your email.'};}
 else if(input.action==='gallery-verify')data={ok:true,token:'verified-token',email:'resident@example.com',expires:Date.now()+90*86400000,flat:'B-902',status:'APPROVED'};
 else if(input.action==='gallery-status')data={ok:true,email:'resident@example.com',flat:'B-902',status:'APPROVED',expires:Date.now()+90*86400000};
 else if(input.action==='gallery-page'){assert.equal(input.token,'verified-token');data={ok:true,page:0,total:1,photos:[{id:'opaque',number:1}]};}
 else if(input.action==='gallery-thumbs')data={ok:true,images:[{id:'opaque',mime:'image/png',base64:'aGVsbG8='}]};else data={ok:true};return {ok:true,json:async()=>data};};
 const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
 w.eval(fs.readFileSync('protected-gallery.js','utf8'));d.getElementById('openPrivateGallery').click();assert.equal(d.getElementById('galleryFlat').value,'B-902');assert.equal(d.getElementById('galleryFlat').readOnly,true);assert.equal(d.getElementById('galleryAlbum').hidden,true);
 d.getElementById('galleryEmail').value='resident@example.com';d.getElementById('galleryName').value='Test Resident';d.getElementById('galleryConsent').checked=true;d.getElementById('galleryRequestForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal(d.getElementById('galleryOtpForm').hidden,false);assert.equal(d.getElementById('galleryResend').disabled,true);assert.equal(actions.includes('gallery-page'),false);
 d.getElementById('galleryCode').value='123456';d.getElementById('galleryOtpForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal(d.getElementById('galleryAlbum').hidden,false);assert.equal(d.getElementById('galleryGrid').children.length,1);const saved=JSON.parse(w.localStorage.getItem('saiVistaPrivateGallery'));assert.equal(saved.flat,'B-902');assert.equal(saved.token,'verified-token');
 d.getElementById('closePrivateGallery').click();d.getElementById('openPrivateGallery').click();await settle();assert.equal(actions.filter(x=>x==='gallery-otp').length,1);assert.equal(d.getElementById('galleryAlbum').hidden,false);
 w.dispatchEvent(new w.StorageEvent('storage',{key:'saiVistaPrivateGallery',newValue:JSON.stringify(saved)}));assert.equal(JSON.parse(w.localStorage.getItem('saiVistaPrivateGallery')).token,'verified-token');d.getElementById('openPrivateGallery').click();await settle();
 d.getElementById('galleryLogout').click();await settle();assert.equal(d.getElementById('galleryGrid').children.length,0);assert.equal(w.localStorage.getItem('saiVistaPrivateGallery'),null);assert.equal(cleared,true);
});
test('thumbnail batches fetch in parallel, cache private copies and reject unexpected preview hosts',()=>{
 const s=service(),calls=[];s.ctx.ScriptApp={getOAuthToken:()=> 'private-oauth'};s.ctx.Utilities.base64Encode=()=> 'aW1hZ2U=';
 s.ctx.UrlFetchApp={fetchAll(requests){calls.push(requests);return requests.map(request=>request.url.includes('www.googleapis.com')?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({thumbnailLink:'https://lh3.googleusercontent.com/private=s220'})}:{getResponseCode:()=>200,getBlob:()=>({getContentType:()=> 'image/jpeg',getBytes:()=>[1,2,3]})});}};
 const rows=[['one','private-one'],['two','private-two']];assert.equal(s.ctx.galleryImages(rows,320).length,2);assert.deepEqual(calls.map(c=>c.length),[2,2]);assert.ok(calls[1].every(r=>r.url.endsWith('=s320')));assert.doesNotMatch(JSON.stringify(s.ctx.galleryImages(rows,320)),/private-oauth|googleusercontent|private-one/);assert.equal(calls.length,2);
 s.ctx.UrlFetchApp.fetchAll=()=>[{getResponseCode:()=>200,getContentText:()=>JSON.stringify({thumbnailLink:'https://untrusted.example/private=s220'})}];assert.throws(()=>s.ctx.galleryImages([['other','secret']],320),/does not have a preview/);
});

test('OTP resend is allowed after 30 seconds, while guesses, replay and email quotas remain bounded',()=>{const s=service();const first=s.call(profile);assert.equal(first.ok,true);s.advance(29999);assert.equal(s.call(profile).ok,false);s.advance(1);assert.equal(s.call(profile).ok,true);const old=s.call({action:'gallery-verify',challenge:first.challenge,code:'999999'});assert.equal(old.ok,false);s.props['gallery.mailBudget']=JSON.stringify({started:Date.now(),count:450});s.advance(30000);assert.equal(s.call(profile).ok,false);});

test('sender cannot silently fall back to a personal account and concurrent OTP mail does not hold the write lock',()=>{const s=service();s.ctx.Session.getEffectiveUser=()=>({getEmail:()=> 'other@example.org'});assert.equal(s.call(profile).ok,false);assert.equal(s.mails.length,0);const x=service();let held=false;x.ctx.LockService.getScriptLock=()=>({tryLock:()=>{if(held)return false;held=true;return true;},releaseLock:()=>{held=false;}});x.ctx.MailApp.sendEmail=()=>assert.equal(held,false);assert.equal(x.call(profile).ok,true);});

test('resending invalidates the previous challenge and sessions are isolated for 300 distinct verified users',()=>{const s=service(),first=s.call(profile);s.advance(30000);const second=s.call(profile),code=s.code();assert.equal(s.call({action:'gallery-verify',challenge:first.challenge,code}).ok,false);assert.equal(s.call({action:'gallery-verify',challenge:second.challenge,code}).ok,true);const x=service(),tokens=new Set();for(let i=0;i<300;i++){const request=x.call({...profile,email:'resident'+i+'@example.org'}),login=x.call({action:'gallery-verify',challenge:request.challenge,code:x.code()});assert.equal(login.ok,true);tokens.add(login.token);}assert.equal(tokens.size,300);assert.equal(x.sheets.get('Gallery access').rows.length,301);});

test('existing pending profiles auto-approve with the currently verified flat; registration cannot send gallery OTP',()=>{const s=service();s.sheets.get('Gallery access').rows.push(['resident@example.com','Old name','F-1304','PENDING']);const login=verified(s);assert.equal(login.status,'APPROVED');assert.deepEqual(s.sheets.get('Gallery access').rows[1].slice(1,4),['Test Resident','A-101','APPROVED']);const client=fs.readFileSync('protected-gallery.js','utf8');assert.doesNotMatch(client,/SaiVistaRegistrationConfig/);const router=fs.readFileSync('event-registration.gs','utf8');assert.match(router,/The gallery has moved/);assert.doesNotMatch(router,/return eventJson\(galleryHandle/);});
