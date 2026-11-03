const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
const now=Date.now(),issuer='https://clerk.saivistaculturalcommittee.in';
function setup(){
  const properties={CLERK_ISSUER:issuer,CLERK_SECRET_KEY:'sk_test_not_a_real_key'},sessions=new Map(),calls=[],audit=[];
  let revoked=false,allowed=true,emailVerified=true;
  const state={id:'sess_test',user_id:'user_test',status:'active',expire_at:now+7*86400000,abandon_at:now+5*86400000};
  const context={Date,console,ClerkCrypto:require('./tools/clerk-crypto.cjs'),Utilities:{base64DecodeWebSafe:v=>Buffer.from(v,'base64url'),newBlob:v=>({getDataAsString:()=>v.toString()})},CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},galleryProps:()=>({getProperty:key=>properties[key],setProperty:(key,value)=>sessions.set(key,JSON.parse(value))}),galleryHash:v=>crypto.createHash('sha256').update(v).digest('hex'),galleryRandom:()=>crypto.randomUUID()+crypto.randomUUID(),galleryAuthFailure:message=>{const error=Error(message);error.reauthenticate=true;throw error;},GalleryPolicy:{email:v=>v.trim().toLowerCase()},residentDirectory:(email,flat)=>{if(!allowed||email!=='resident@example.com'||flat!=='A-101')throw Error('Not registered');},residentContactActivity:()=>audit.push('contact'),galleryAudit:(...args)=>audit.push(args),LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},UrlFetchApp:{fetch:(url,options)=>{
    calls.push({url,options});let result;
    if(url===issuer+'/.well-known/jwks.json')result={keys:[jwk]};
    else {assert.equal(options.headers.Authorization,'Bearer sk_test_not_a_real_key');
      if(url.endsWith('/sessions/sess_test/revoke')){revoked=true;result={};}
      else if(url.endsWith('/sessions/sess_test'))result={...state,status:revoked?'revoked':state.status};
      else if(url.endsWith('/users/user_test'))result={id:'user_test',primary_email_address_id:'email1',email_addresses:[{id:'email1',email_address:'Resident@example.com',verification:{status:emailVerified?'verified':'unverified'}}]};
      else throw Error('Unexpected API path');
    }
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};
  }}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('resident-clerk.gs','utf8'),context);
  context.galleryAccess=()=>null;context.residentClerkContact=()=>{};context.residentClerkResident=()=>allowed;context.residentReviewRequest=()=>audit.push('review');
  const base={iss:issuer,azp:'https://saivistaculturalcommittee.in',sid:'sess_test',sub:'user_test',iat:Math.floor(now/1000),nbf:Math.floor(now/1000)-5,exp:Math.floor(now/1000)+60};
  const token=(changes={},header={})=>{const unsigned=[{alg:'RS256',kid:'test-key',typ:'JWT',...header},{...base,...changes}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');};
  return {context,token,calls,sessions,state,audit,properties,setAllowed:v=>allowed=v,setVerified:v=>emailVerified=v};
}
test('real RSA signatures, issuer, origin and short token lifetime are mandatory before identity API calls',()=>{
  const s=setup();assert.equal(s.context.residentClerkClaims(s.token()).sub,'user_test');
  for(const claims of [{iss:'https://attacker.test'},{azp:'https://attacker.test'},{azp:undefined},{exp:1},{exp:Math.floor(now/1000)+3600},{nbf:Math.floor(now/1000)+60},{iat:Math.floor(now/1000)+60},{sts:'pending'},{sid:'../users/admin'}])assert.throws(()=>s.context.residentClerkClaims(s.token(claims)));
  for(const header of [{alg:'none'},{alg:'HS256'},{kid:'missing'},{crit:['x']}])assert.throws(()=>s.context.residentClerkClaims(s.token({},header)));
  const good=s.token(),parts=good.split('.');parts[1]=Buffer.from(JSON.stringify({sub:'user_attacker'})).toString('base64url');assert.throws(()=>s.context.residentClerkClaims(parts.join('.')));
  assert.ok(s.calls.every(c=>c.url===issuer+'/.well-known/jwks.json'));
});
test('only registered verified email gets a bounded resident session; caller email is ignored and no duplicate contact is created',()=>{
  const s=setup(),login=s.context.residentClerkLogin({flat:'A-101',clerkToken:s.token(),consent:true,email:'attacker@example.com'});
  assert.equal(login.email,'resident@example.com');assert.equal(login.expires,s.state.abandon_at);assert.equal(login.residentVerified,true);assert.equal(login.provider,'clerk');
  const session=[...s.sessions.values()][0];assert.equal(session.clerkSession,'sess_test');assert.equal(session.clerkUser,'user_test');assert.equal('clerkToken' in session,false);assert.doesNotMatch(JSON.stringify(s.audit),/eyJ/);
  s.context.residentClerkSession(session);s.state.status='revoked';assert.throws(()=>s.context.residentClerkSession(session));
  for(const mutate of [x=>x.setVerified(false),x=>x.state.status='pending',x=>x.state.abandon_at=now-1]){const bad=setup();mutate(bad);assert.throws(()=>bad.context.residentClerkLogin({flat:'A-101',clerkToken:bad.token(),consent:true}));assert.equal(bad.sessions.size,0);}
  const unknown=setup();unknown.setAllowed(false);const pending=unknown.context.residentClerkLogin({flat:'A-101',clerkToken:unknown.token(),consent:true});assert.equal(pending.authenticated,true);assert.equal(pending.residentVerified,false);assert.equal(pending.reviewPending,true);assert.ok(unknown.audit.includes('review'));
  const visitor=setup(),publicAccess=visitor.context.residentClerkLogin({flat:'',clerkToken:visitor.token(),consent:true,publicVisitor:true});assert.equal(publicAccess.authenticated,true);assert.equal(publicAccess.residentVerified,false);assert.equal(publicAccess.reviewPending,false);assert.equal(visitor.audit.includes('review'),false);
  assert.throws(()=>s.context.residentClerkLogin({flat:'A-101',clerkToken:s.token(),consent:false}));
});
test('Apps Script crypto bundle verifies real RSA without Node or browser globals',()=>{
  require('node:child_process').execFileSync(process.execPath,['tools/build-resident-service.cjs']);
  const s=setup(),bundle=fs.readFileSync('tmp/resident-deploy/Code.gs','utf8'),context={};vm.createContext(context);vm.runInContext(bundle,context);
  const token=s.token(),parts=token.split('.');assert.equal(context.ClerkCrypto.verify(parts[0]+'.'+parts[1],parts[2],jwk),true);assert.equal(context.ClerkCrypto.verify('changed',parts[2],jwk),false);
});

test('Google identity finds the saved flat; only a new email needs the one-time flat step',()=>{
  const known=setup();known.context.galleryAccess=()=>['resident@example.com','Resident','A-101','APPROVED'];
  const login=known.context.residentClerkLogin({flat:'',clerkToken:known.token(),consent:true,email:'attacker@example.com'});
  assert.equal(login.flat,'A-101');assert.equal(login.residentVerified,true);assert.equal(login.needsFlat,undefined);
  const fresh=setup(),prompt=fresh.context.residentClerkLogin({flat:'',clerkToken:fresh.token(),consent:true});
  assert.equal(prompt.needsFlat,true);assert.equal(prompt.email,'resident@example.com');assert.equal(fresh.sessions.size,0);assert.equal(fresh.audit.includes('review'),false);
  const publicUser=setup();publicUser.context.galleryAccess=()=>['resident@example.com','Visitor','','PENDING'];
  assert.equal(publicUser.context.residentClerkLogin({flat:'',clerkToken:publicUser.token(),consent:true}).needsFlat,undefined);
});
