// Keys and download grants live only in this worker's memory, never in caches.
importScripts('private-video-core.js?v=2');
const videoGrants=new Map(),videoActive=new Map(),videoPrefix='/__private-video/';
function videoNotify(grant,data){self.clients.get(grant.clientId).then(c=>c?.postMessage({type:'private-video-progress',id:grant.id,...data}));}
self.addEventListener('message',event=>{
 const d=event.data;if(!d||!event.source?.id)return;
 if(['private-video-pause','private-video-resume'].includes(d.type)){const active=videoActive.get(d.id),grant=videoGrants.get(d.id);if(grant?.clientId===event.source.id&&active){active.flow[d.type==='private-video-pause'?'pause':'resume']();}return;}
 if(d.type==='private-video-cancel'){const active=videoActive.get(d.id),grant=videoGrants.get(d.id);if(grant?.clientId===event.source.id){active?.abort();videoGrants.delete(d.id);}return;}
 if(d.type!=='private-video-grant')return;
 event.waitUntil((async()=>{try{
  for(const [id,g] of videoGrants)if(g.expires<=Date.now())videoGrants.delete(id);
  if(d.protocol!==2||new URL(event.source.url).origin!==self.location.origin||!['optimised','original'].includes(d.variant)||!/^\w{8}-[\w-]{27}$/.test(d.id)||d.expires<=Date.now()||d.expires>Date.now()+3605000)throw Error('Invalid download access.');
  const m=await PrivateVideoCore.manifest('assets/protected-video/20261025a/manifest.json',d.manifestSha256),k=await PrivateVideoCore.key(d.key);
  videoGrants.set(d.id,{id:d.id,clientId:event.source.id,pageURL:event.source.url.split('#')[0],expires:d.expires,m,k,variant:d.variant});event.ports[0]?.postMessage({ok:true,protocol:2,url:videoPrefix+d.id});
 }catch(_){event.ports[0]?.postMessage({ok:false,error:'The private download could not be prepared. Please retry.'});}})());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(videoPrefix))return;
 let finish;const done=new Promise(resolve=>finish=resolve);event.waitUntil(done);
 event.respondWith((async()=>{
  const grant=videoGrants.get(url.pathname.slice(videoPrefix.length));
  // Native attachment navigations use a child client; the grant stays in this browser only.
  const owner=grant&&(grant.clientId===event.clientId||(event.request.mode==='navigate'&&event.request.referrer===grant.pageURL));
  if(event.request.method!=='GET'||!grant||grant.expires<=Date.now()||!owner){finish();return new Response('Verify your email on the site before downloading.',{status:403,headers:{'Cache-Control':'no-store'}});}
  if(videoActive.has(grant.id)){finish();return new Response('Download already active.',{status:409});}
  const v=grant.m.variants[grant.variant],range=event.request.headers.get('Range');let start=0,end=v.bytes-1;
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){finish();return new Response(null,{status:416});}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=v.bytes){finish();return new Response(null,{status:416});}}
  let index=0,offset=0,delivered=0;while(offset+v.chunks[index].bytes<=start){offset+=v.chunks[index].bytes;index++;}
  const abort=new AbortController();const flow=PrivateVideoCore.transfer(abort.signal);videoActive.set(grant.id,{abort:()=>abort.abort(),flow});
  const cleanup=()=>{videoActive.delete(grant.id);finish();};
  const stream=new ReadableStream({async pull(controller){try{
   await flow.wait();const plain=await PrivateVideoCore.chunk(grant.m,grant.variant,index,grant.k,abort.signal,attempt=>videoNotify(grant,{state:'retrying',attempt}));await flow.wait();const from=Math.max(0,start-offset),to=Math.min(plain.length,end-offset+1),part=plain.subarray(from,to);controller.enqueue(part);delivered+=part.length;offset+=plain.length;index++;
   videoNotify(grant,{received:delivered,total:end-start+1,state:'progress'});
   if(offset>end){controller.close();videoNotify(grant,{received:delivered,total:end-start+1,state:'complete'});cleanup();}
  }catch(_){abort.abort();controller.error(Error('Download interrupted. Please retry.'));videoNotify(grant,{state:'error'});cleanup();}},cancel(){abort.abort();videoNotify(grant,{state:'cancelled'});cleanup();}});
  const headers={'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="'+v.filename+'"','Content-Length':String(end-start+1),'Cache-Control':'no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
  if(range)headers['Content-Range']=`bytes ${start}-${end}/${v.bytes}`;
  return new Response(stream,{status:range?206:200,headers});
 })().catch(()=>{finish();return new Response('Download could not start.',{status:503});}));
});
