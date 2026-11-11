const fs=require('node:fs'),vm=require('node:vm');
const code=['resident-access-config.js','resident-social-config.js','resident-social.js','resident-access.js','finance-access.js'].map(path=>fs.readFileSync(path,'utf8')).join('\n');
new vm.Script(code);fs.writeFileSync('assets/resident-access-v9.js',code);console.log('Built versioned resident client.');
for(const name of ['script','expense-dashboard','cultural-fund-reminder','event-registration','photo-gallery','community-media']){
  const source=fs.readFileSync(name+'.js','utf8');new vm.Script(source);fs.writeFileSync('assets/'+name+'-auth-v1.js',source);
}
