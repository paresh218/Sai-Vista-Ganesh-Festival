// Publish encrypted media only. Keep the generated settings file outside public assets.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function prepare(inputs,out,settings){
 out=path.resolve(out);settings=path.resolve(settings);if(settings.startsWith(out+path.sep))throw Error('Private settings must be outside published assets.');
 await fs.mkdir(out,{recursive:false});const keys={},manifest={schema:1,asset:'dandiya-2026',duration:192,variants:{}};
 for(const [name,file] of Object.entries(inputs)){
  if(!['preview','optimised','original'].includes(name))throw Error('Invalid video variant');
  const key=crypto.randomBytes(32);keys[name]=key.toString('base64');const handle=await fs.open(file,'r'),size=(await handle.stat()).size,hash=crypto.createHash('sha256'),parts=[];
  try{let offset=0;while(offset<size){const plain=Buffer.alloc(Math.min(4*1024*1024,size-offset));const {bytesRead}=await handle.read(plain,0,plain.length,offset);if(bytesRead!==plain.length)throw Error('Incomplete source read');hash.update(plain);
   const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(`dandiya-2026|${name}|${parts.length}`));const encrypted=Buffer.concat([cipher.update(plain),cipher.final(),cipher.getAuthTag()]);
   const filename=name+'-'+String(parts.length).padStart(4,'0')+'.bin';await fs.writeFile(path.join(out,filename),encrypted,{flag:'wx'});
   const check=crypto.createDecipheriv('aes-256-gcm',key,iv);check.setAAD(Buffer.from(`dandiya-2026|${name}|${parts.length}`));check.setAuthTag(encrypted.subarray(-16));if(!Buffer.concat([check.update(encrypted.subarray(0,-16)),check.final()]).equals(plain))throw Error('Encryption round trip failed');
   parts.push({path:path.relative(process.cwd(),path.join(out,filename)).replaceAll('\\','/'),iv:iv.toString('base64'),bytes:plain.length});offset+=plain.length;
  }}finally{await handle.close();}
  manifest.variants[name]={bytes:size,filename:`Sai-Vista-Navratri-2026-${name}.mp4`,sha256:hash.digest('hex'),chunks:parts};
 }
 const raw=JSON.stringify(manifest);await fs.writeFile(path.join(out,'manifest.json'),raw,{flag:'wx'});await fs.writeFile(settings,JSON.stringify({keys,manifestSha256:crypto.createHash('sha256').update(raw).digest('hex')}),{flag:'wx'});return manifest;
}
module.exports={prepare};
if(require.main===module){const [preview,optimised,original,out,settings]=process.argv.slice(2);if(!settings)throw Error('Usage: node tools/prepare-private-video.cjs PREVIEW OPTIMISED ORIGINAL OUTPUT PRIVATE_SETTINGS');prepare({preview,optimised,original},out,settings).then(m=>console.log(JSON.stringify(Object.fromEntries(Object.entries(m.variants).map(([k,v])=>[k,{bytes:v.bytes,chunks:v.chunks.length}]))))).catch(e=>{console.error(e.message);process.exitCode=1;});}
