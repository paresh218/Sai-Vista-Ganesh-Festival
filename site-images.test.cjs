const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),sharp=require('sharp');
test('public site image references exist and decode, with matching declared aspect ratios',async()=>{
 const files=fs.readdirSync('.').filter(f=>f.endsWith('.html')&&f!=='site-reference.html');
 for(const file of files){const dom=new JSDOM(fs.readFileSync(file,'utf8'));try{for(const img of dom.window.document.querySelectorAll('img[src]')){const src=img.getAttribute('src');if(!src||/^(https?:|data:|blob:)/.test(src))continue;const path=src.split('?')[0].replace(/^\//,'');assert.ok(fs.existsSync(path),file+': missing '+path);const m=await sharp(path).metadata();assert.ok(m.width&&m.height,path+': invalid image');const width=Number(img.getAttribute('width')),height=Number(img.getAttribute('height'));if(width&&height)assert.ok(Math.abs(width/height-m.width/m.height)<0.001,path+': incorrect declared ratio');}}finally{dom.window.close();}}
});
