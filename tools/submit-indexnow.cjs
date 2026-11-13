const fs=require('node:fs'),{publicUrls}=require('./audit-public-seo.cjs');
function buildSubmission(){
  const {host,key,keyLocation}=JSON.parse(fs.readFileSync('indexnow-config.json','utf8'));
  if(host!=='saivistaculturalcommittee.in'||!/^[a-f0-9]{32}$/.test(key)||keyLocation!==`https://${host}/${key}.txt`||fs.readFileSync(key+'.txt','utf8').trim()!==key)throw Error('Invalid IndexNow ownership configuration.');
  const urlList=publicUrls();if(!urlList.length||urlList.some(value=>{const url=new URL(value);return url.protocol!=='https:'||url.host!==host||url.hash||url.search;}))throw Error('Submit only canonical public URLs.');
  return {host,key,keyLocation,urlList};
}
async function submit(){
  const data=buildSubmission();
  const proof=await fetch(data.keyLocation,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!proof.ok||(await proof.text()).trim()!==data.key)throw Error('Ownership file is not live. Deploy and verify it before notifying search engines.');
  const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
  if(![200,202].includes(response.status))throw Error('IndexNow returned HTTP '+response.status+'. No automatic retry was made.');
  console.log(`IndexNow HTTP ${response.status}: ${data.urlList.length} public URLs received. This confirms receipt, not indexing or ranking.`);
}
if(require.main===module){if(process.argv.includes('--submit'))submit().catch(error=>{console.error(error.message);process.exitCode=1;});else console.log(JSON.stringify(buildSubmission(),null,2));}
module.exports={buildSubmission};
