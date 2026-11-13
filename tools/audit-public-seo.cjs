const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const base='https://saivistaculturalcommittee.in/';
function publicUrls(root=process.cwd()){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'application/xml'});
  try{return [...dom.window.document.querySelectorAll('url > loc')].map(node=>node.textContent.trim());}finally{dom.window.close();}
}
function audit(root=process.cwd()){
  return publicUrls(root).map(url=>{
    const file=new URL(url).pathname==='/'?'index.html':new URL(url).pathname.slice(1),html=fs.readFileSync(path.join(root,file),'utf8');
    const dom=new JSDOM(html,{url}),d=dom.window.document,issues=[];
    try{
      const title=d.title,description=d.querySelector('meta[name="description"]')?.content||'',canonical=d.querySelector('link[rel="canonical"]')?.href||'',robots=d.querySelector('meta[name="robots"]')?.content||'';
      const schemas=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(node=>{try{const value=JSON.parse(node.textContent);return value['@graph']||[value];}catch(_){issues.push('invalid-jsonld');return [];}});
      if(!title)issues.push('missing-title');if(!description)issues.push('missing-description');if(canonical!==url)issues.push('canonical-mismatch');if(/noindex/i.test(robots))issues.push('noindex-in-sitemap');
      for(const property of ['og:title','og:description','og:url','og:image'])if(!d.querySelector(`meta[property="${property}"]`)?.content)issues.push('missing-'+property);
      if(d.querySelector('meta[property="og:url"]')?.content!==url)issues.push('social-url-mismatch');
      for(const image of d.querySelectorAll('img[src]')){if(!image.hasAttribute('alt'))issues.push('missing-image-alt');if(!image.getAttribute('width')||!image.getAttribute('height'))issues.push('missing-image-dimensions');}
      return {url,file,title,description,descriptionLength:description.length,canonical,robots,h1:[...d.querySelectorAll('h1')].map(x=>x.textContent.trim()),schemas:schemas.map(x=>x['@type']),bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex'),scriptRequests:[...d.querySelectorAll('script[src]')].length,issues:[...new Set(issues)]};
    }finally{dom.window.close();}
  });
}
if(require.main===module){const rows=audit();const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify({checkedOn:'2026-11-13',scope:'Local public-page facts; not a search ranking or Core Web Vitals measurement',pages:rows},null,2)+'\n');for(const row of rows)console.log(row.file+': '+(row.issues.length?row.issues.join(', '):'metadata checks passed')+'; '+row.bytes+' bytes; '+row.scriptRequests+' script requests');}
module.exports={audit,publicUrls};
