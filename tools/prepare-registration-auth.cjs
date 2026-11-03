// Preserve the live project's extra gallery helpers; replace only the fund-check boundary.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
let code=fs.readFileSync('tmp/registration-backend-before.gs','utf8');
const replacements=[
  ['function verifyCulturalFund(wing,flat) {','function verifyCulturalFund(wing,flat,residentToken) {'],
  ['UrlFetchApp.fetch(FestivalRegistration.collectionUrl, {muteHttpExceptions:true,headers:{"Cache-Control":"no-cache"}})',`UrlFetchApp.fetch(FestivalRegistration.collectionUrl, {method:'post',payload:{payload:JSON.stringify({token:residentToken,flat:wing+'-'+flat})},muteHttpExceptions:true,headers:{"Cache-Control":"no-cache"}})`],
  ['const d=JSON.parse(raw);','const d=JSON.parse(raw);\n    const residentToken=d.residentToken;delete d.residentToken;'],
  ['verifyCulturalFund(d.wing,d.flatNo)','verifyCulturalFund(d.wing,d.flatNo,residentToken)']
];
for(const [before,after]of replacements){assert.equal(code.split(before).length,2,'Expected one matching registration boundary');code=code.replace(before,after);}
new vm.Script(code);fs.mkdirSync('tmp/registration-deploy',{recursive:true});fs.writeFileSync('tmp/registration-deploy/Code.gs',code);
console.log('Prepared registration fund authentication; existing helpers preserved. Nothing deployed.');
