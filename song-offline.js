(() => {
 let opened;
 const db=()=>opened||=(new Promise((resolve,reject)=>{const r=indexedDB.open('sai-vista-offline-songs',1);r.onupgradeneeded=()=>r.result.createObjectStore('songs');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
 const run=async(mode,action)=>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('songs',mode),r=action(tx.objectStore('songs'));let value;r.onsuccess=()=>value=r.result;r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Storage unavailable'));});};
 window.SaiVistaOffline={get:key=>run('readonly',s=>s.get(key)),put:(key,blob)=>run('readwrite',s=>s.put(blob,key)),clear:()=>run('readwrite',s=>s.clear())};
})();
