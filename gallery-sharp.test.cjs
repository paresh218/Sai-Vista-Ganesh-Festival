const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp'),{prepare}=require('./tools/prepare-gallery.cjs');
test('Sharp prepares bounded WebP variants, rotates orientation, strips location metadata and preserves originals',async(t)=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gallery-sharp-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const source=path.join(root,'source'),out=path.join(root,'prepared');await fs.mkdir(source);const original=await sharp({create:{width:2400,height:1200,channels:3,background:'#6a264d'}}).jpeg().withMetadata({orientation:6}).toBuffer();await fs.writeFile(path.join(source,'photo.jpg'),original);
 const result=await prepare(source,out,[{id:'private_photo_id',file:'photo.jpg'}]);assert.equal(result.photos.length,1);assert.deepEqual(await fs.readFile(path.join(source,'photo.jpg')),original);
 for(const variant of result.photos[0].variants){const bytes=await fs.readFile(path.join(out,variant.file)),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.ok(meta.width<=variant.size&&meta.height<=variant.size);assert.ok(meta.height>meta.width);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);assert.equal(variant.bytes,bytes.length);assert.ok(bytes.length<original.length);}
 assert.equal(result.photos[0].variants[2].height,2400);assert.deepEqual(JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8')),result);
});
test('Sharp rejects escaped paths, duplicate IDs, corrupt input, and never marks a partial build complete',async(t)=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gallery-sharp-invalid-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const source=path.join(root,'source'),out=path.join(root,'prepared');await fs.mkdir(source);await fs.writeFile(path.join(root,'outside.jpg'),'private');await fs.writeFile(path.join(source,'bad.jpg'),'broken');
 await assert.rejects(prepare(source,source,[{id:'private_photo_id',file:'bad.jpg'}]),/separate/);
 await assert.rejects(prepare(source,out,[{id:'private_photo_id',file:'../outside.jpg'}]),/escapes/);
 await assert.rejects(prepare(source,out,[{id:'../private_photo',file:'bad.jpg'}]),/Invalid/);
 await assert.rejects(prepare(source,out,[{id:'private_photo_id',file:'bad.jpg'},{id:'private_photo_id',file:'bad.jpg'}]),/duplicate/);
 await fs.writeFile(path.join(out,'manifest.json'),'old');await assert.rejects(prepare(source,out,[{id:'private_photo_id',file:'bad.jpg'}]));await assert.rejects(fs.access(path.join(out,'manifest.json')));
});
