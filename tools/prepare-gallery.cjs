// Run locally. Keep originals and generated copies outside the public site.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const variants=[{size:320,quality:70},{size:1600,quality:78},{size:2560,quality:86}];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function atomic(file,bytes){const temporary=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}}
async function prepare(sourceDir,outputDir,entries){
  const source=await fs.realpath(sourceDir),output=path.resolve(outputDir);
  await fs.mkdir(output,{recursive:true});const actualOutput=await fs.realpath(output);
  if(actualOutput===source||actualOutput.startsWith(source+path.sep)||source.startsWith(actualOutput+path.sep))throw Error('Input and output folders must be separate.');
  if(!Array.isArray(entries)||!entries.length||entries.length>5000)throw Error('Supply between 1 and 5000 photos.');
  const seen=new Set();for(const entry of entries){if(!/^[A-Za-z0-9_-]{10,100}$/.test(entry.id)||seen.has(entry.id))throw Error('Invalid or duplicate Drive photo ID.');seen.add(entry.id);if(typeof entry.file!=='string'||path.isAbsolute(entry.file))throw Error('Use relative source paths.');}
  await fs.rm(path.join(output,'manifest.json'),{force:true});
  const manifest={version:1,recipe:'sharp-webp-v1',photos:[]};let next=0,stopped=false;
  const worker=async()=>{while(!stopped&&next<entries.length){const entry=entries[next++],file=await fs.realpath(path.resolve(source,entry.file));if(!file.startsWith(source+path.sep))throw Error('Source path escapes the input folder.');const original=await fs.readFile(file),sourceHash=hash(original),record={id:entry.id,sourceBytes:original.length,sourceHash,variants:[]};
    for(const variant of variants){const name=entry.id+'.'+variant.size+'.webp',target=path.join(output,name);let bytes;
      // Never trust a previous partial build: decode and regenerate before publishing a manifest.
      bytes=await sharp(original,{limitInputPixels:80000000,animated:false}).rotate().resize({width:variant.size,height:variant.size,fit:'inside',withoutEnlargement:true}).webp({quality:variant.quality,effort:4}).toBuffer();
      if(bytes.length>6000000)throw Error('Prepared photo exceeds the gallery limit.');
      const metadata=await sharp(bytes).metadata();await atomic(target,bytes);record.variants.push({size:variant.size,file:name,bytes:bytes.length,width:metadata.width,height:metadata.height,sha256:hash(bytes)});
    }manifest.photos.push(record);
  }};
  // Wait for both workers even on failure; never leave background writes after reporting failure.
  const results=await Promise.allSettled([worker(),worker()].map(task=>task.catch(error=>{stopped=true;throw error;})));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  manifest.photos.sort((a,b)=>a.id.localeCompare(b.id));await atomic(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));return manifest;
}
module.exports={prepare,variants};
if(require.main===module){const [source,output,index]=process.argv.slice(2);if(!source||!output||!index){console.error('Usage: node tools/prepare-gallery.cjs SOURCE OUTPUT PRIVATE_INDEX_JSON');process.exitCode=1;}else fs.readFile(index,'utf8').then(JSON.parse).then(entries=>prepare(source,output,entries)).then(result=>{const original=result.photos.reduce((n,p)=>n+p.sourceBytes,0),prepared=result.photos.reduce((n,p)=>n+p.variants.reduce((s,v)=>s+v.bytes,0),0);console.log(JSON.stringify({photos:result.photos.length,originalBytes:original,preparedBytes:prepared}));}).catch(error=>{console.error(error.message);process.exitCode=1;});}
