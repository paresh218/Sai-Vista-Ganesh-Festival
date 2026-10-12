(() => {
 let opened;
 const db=()=>opened||=new Promise((resolve,reject)=>{let expired=false;const timer=setTimeout(()=>{expired=true;reject(Error('Storage timed out'));},3000),r=indexedDB.open('sai-vista-offline-songs',1);r.onupgradeneeded=()=>r.result.createObjectStore('songs');r.onsuccess=()=>{clearTimeout(timer);if(expired){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();opened=null;};resolve(r.result);};r.onerror=r.onblocked=()=>{clearTimeout(timer);reject(r.error||Error('Storage unavailable'));};}).catch(error=>{opened=null;throw error;});
 const run=async(mode,action)=>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('songs',mode),r=action(tx.objectStore('songs'));let value;r.onsuccess=()=>value=r.result;r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Storage unavailable'));});};
 window.SaiVistaOffline={get:key=>run('readonly',s=>s.get(key)),has:async key=>(await run('readonly',s=>s.getKey(key)))!==undefined,put:(key,blob)=>run('readwrite',s=>s.put(blob,key)),clear:()=>run('readwrite',s=>s.clear())};
})();
