(function(root){
 const text=new TextEncoder(),base64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 function validate(m){
  if(m?.schema!==1||m.asset!=='dandiya-2026'||!m.variants)throw Error('Invalid private video manifest.');
  for(const name of ['preview','optimised','original']){const v=m.variants[name];if(!v||!Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>600000000||!/^Sai-Vista-[A-Za-z0-9-]+\.mp4$/.test(v.filename)||!Array.isArray(v.chunks)||v.chunks.length<1||v.chunks.length>160)throw Error('Invalid private video variant.');let sum=0;
   v.chunks.forEach((c,i)=>{if(!new RegExp('^assets/protected-video/[a-z0-9-]+/'+name+'-'+String(i).padStart(4,'0')+'\\.bin$').test(c.path)||!Number.isInteger(c.bytes)||c.bytes<1||c.bytes>4194304||typeof c.iv!=='string'||base64(c.iv).length!==12)throw Error('Invalid private video chunk.');sum+=c.bytes;});if(sum!==v.bytes)throw Error('Invalid private video size.');
  }return m;
 }
 async function manifest(url,digest){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Video details could not be loaded.');const raw=await response.arrayBuffer();if(raw.byteLength>200000)throw Error('Invalid video details.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==digest)throw Error('Video security check failed. Please refresh.');return validate(JSON.parse(new TextDecoder().decode(raw)));}
 async function key(raw){const bytes=base64(raw);if(bytes.length!==32)throw Error('Invalid private video access.');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['decrypt']);}
 async function chunk(m,name,index,k,signal){const c=m.variants[name].chunks[index];let last;
  for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(c.path,{cache:'force-cache',signal});if(!response.ok)throw Error('Video connection interrupted. Retry the download.');const encrypted=await response.arrayBuffer();if(encrypted.byteLength!==c.bytes+16)throw Error('Incomplete video data.');return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:base64(c.iv),additionalData:text.encode(`${m.asset}|${name}|${index}`)},k,encrypted));}catch(error){last=error;if(signal?.aborted)throw error;}}
  throw last;
 }
 root.PrivateVideoCore={validate,manifest,key,chunk};
 if(typeof module!=='undefined')module.exports=root.PrivateVideoCore;
})(typeof self!=='undefined'?self:globalThis);
