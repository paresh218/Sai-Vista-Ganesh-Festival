const fs=require('node:fs'),vm=require('node:vm');
const crypto=require('esbuild').buildSync({entryPoints:['tools/clerk-crypto.cjs'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'ClerkCrypto',define:{window:'globalThis'},minify:true,legalComments:'eof'}).outputFiles[0].text;
const code=crypto+'\n'+['protected-gallery.gs','resident-logging.gs','resident-clerk.gs','protected-gallery-service.gs'].map(path=>fs.readFileSync(path,'utf8')).join('\n');
new vm.Script(code);
fs.mkdirSync('tmp/resident-deploy',{recursive:true});
fs.writeFileSync('tmp/resident-deploy/Code.gs',code);
fs.copyFileSync('protected-gallery-appsscript.json','tmp/resident-deploy/appsscript.json');
console.log('Prepared resident/gallery Apps Script bundle in tmp/resident-deploy; nothing deployed.');
