const fs=require('node:fs'),vm=require('node:vm');
for(const name of ['payments','expense','community-gallery']){
  const code=fs.readFileSync('finance-access.gs','utf8')+'\n'+fs.readFileSync(name==='community-gallery'?'photo-gallery.gs':name+'-source.gs','utf8');new vm.Script(code);
  fs.mkdirSync('tmp/'+name+'-deploy',{recursive:true});fs.writeFileSync('tmp/'+name+'-deploy/Code.gs',code);
}
console.log('Prepared authenticated payment, expense and community-gallery services; nothing deployed.');
