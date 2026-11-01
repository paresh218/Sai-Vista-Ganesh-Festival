const fs=require('node:fs'),vm=require('node:vm');
const code=['resident-access-config.js','resident-access.js'].map(path=>fs.readFileSync(path,'utf8')).join('\n');
new vm.Script(code);fs.writeFileSync('assets/resident-access-v5.js',code);console.log('Built versioned resident client.');
