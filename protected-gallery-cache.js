(() => {
  const CACHE='sai-vista-private-gallery-v2',TTL=7*86400000,LIMIT=64*1024*1024;
  let epoch=0;
  window.SaiVistaGalleryCache={
    async key(owner,kind,id){if(!globalThis.caches||!crypto.subtle)return null;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner));const scope=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');return new Request(location.origin+'/__private_gallery__/'+scope+'/'+kind+'/'+id);},
    async get(owner,kind,id){try{const key=await this.key(owner,kind,id);if(!key)return null;const cache=await caches.open(CACHE),reply=await cache.match(key);if(!reply)return null;if(Date.now()-Number(reply.headers.get('X-Saved-At'))>TTL){await cache.delete(key);return null;}return await reply.json();}catch(_){return null;}},
    async put(owner,kind,id,image){const expected=epoch;try{const key=await this.key(owner,kind,id);if(!key||expected!==epoch)return;const cache=await caches.open(CACHE),json=JSON.stringify(image);await cache.put(key,new Response(json,{headers:{'Content-Type':'application/json','X-Saved-At':String(Date.now()),'X-Bytes':String(json.length)}}));if(expected!==epoch){await cache.delete(key);return;}let bytes=0,count=0;const keys=await cache.keys(),rows=await Promise.all(keys.map(async k=>({key:k,reply:await cache.match(k)})));for(const row of rows){bytes+=Number(row.reply?.headers.get('X-Bytes'))||0;count++;}for(const row of rows){if(bytes<=LIMIT&&count<=160)break;await cache.delete(row.key);bytes-=Number(row.reply?.headers.get('X-Bytes'))||0;count--;}}catch(_){/* Storage quota or private mode falls back to network. */}},
    async clear(){epoch++;try{await caches.delete(CACHE);}catch(_){} }
  };
})();
