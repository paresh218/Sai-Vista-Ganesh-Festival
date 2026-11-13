const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const {audit,publicUrls}=require('./tools/audit-public-seo.cjs'),M=require('./marathon-model.js');
const base='https://saivistaculturalcommittee.in/';
test('canonical public pages have distinct complete metadata and valid structured data',()=>{
  const rows=audit();assert.equal(rows.length,6);assert.equal(new Set(rows.map(x=>x.title)).size,rows.length);assert.equal(new Set(rows.map(x=>x.description)).size,rows.length);
  for(const row of rows){assert.deepEqual(row.issues,[],row.file);assert.ok(row.descriptionLength>=100&&row.descriptionLength<=170,row.file);assert.ok(row.bytes<2000000);assert.ok(row.schemas.length,row.file);}
});
test('public event and committee guides work without sign-in scripts and link to real destinations',()=>{
  for(const file of ['about.html','marathon-2026.html','sponsorship.html']){const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:base+file}),d=dom.window.document;try{
    assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelectorAll('script[src],form,dialog').length,0);assert.equal(d.querySelector('#marathonMyEntriesGrid,#galleryGrid'),null);assert.equal(d.querySelector('link[rel="canonical"]').href,base+file);
    for(const a of d.querySelectorAll('a[href]')){const url=new URL(a.href);if(url.origin!==new URL(base).origin)continue;const target=url.pathname==='/'?'index.html':url.pathname.slice(1);assert.ok(fs.existsSync(target),file+' links to '+target);if(url.hash&&target.endsWith('.html')){const linked=new JSDOM(fs.readFileSync(target,'utf8'));try{assert.ok(linked.window.document.getElementById(decodeURIComponent(url.hash.slice(1))),a.href);}finally{linked.window.close();}}}
    assert.ok(d.querySelector('.skip-link'));assert.match(d.body.textContent,/Rahatani/);assert.match(d.body.textContent,/8149525915/);
  }finally{dom.window.close();}}
});
test('marathon structured data matches real dates fees venue and participant rules',()=>{
  const dom=new JSDOM(fs.readFileSync('marathon-2026.html','utf8')),d=dom.window.document;try{
    const graph=JSON.parse(d.querySelector('[type="application/ld+json"]').textContent)['@graph'],event=graph.find(x=>x['@type']==='SportsEvent');assert.ok(event);assert.equal(event.startDate,M.event.start);assert.equal(event.location.name,'Sai Vista Multipurpose Court');assert.equal(event.url,base+'marathon-2026.html');assert.equal(event.location.address.addressCountry,'IN');assert.equal(event.location.address.postalCode,undefined);
    assert.deepEqual(event.offers.map(x=>x.price).sort(),Object.values(M.event.fees).sort());for(const offer of event.offers){assert.equal(offer.priceCurrency,'INR');assert.equal(offer.validThrough,M.event.deadline);assert.equal(offer.availability,undefined);}
    assert.equal(d.querySelectorAll('tbody tr').length,M.schedule.length+2);assert.match(d.body.textContent,/All ages are welcome/);assert.match(d.body.textContent,/12 and under must be accompanied/);assert.match(d.body.textContent,/200 total participant registrations/);assert.match(d.body.textContent,/14 November 2026 at 5:00 PM IST/);
    for(const node of graph)assert.ok(!['Review','AggregateRating','Product','LocalBusiness'].includes(node['@type']));
  }finally{dom.window.close();}
});
test('discovery lists public canonical pages and IndexNow uses a matching public ownership file',()=>{
  const {buildSubmission}=require('./tools/submit-indexnow.cjs'),payload=buildSubmission();assert.deepEqual(payload.urlList,publicUrls());assert.equal(payload.host,'saivistaculturalcommittee.in');const directory=fs.readFileSync('llms.txt','utf8');for(const path of ['about.html','marathon-2026.html','sponsorship.html'])assert.ok(directory.includes(base+path));assert.doesNotMatch(directory,/script\.google\.com|token[=:]|paymentProof/);
  const fixture=new JSDOM(fs.readFileSync('site-reference.html','utf8'));try{assert.match(fixture.window.document.querySelector('meta[name="robots"]').content,/noindex/);}finally{fixture.window.close();}
  const robots=fs.readFileSync('robots.txt','utf8');assert.match(robots,/Allow: \//);assert.doesNotMatch(robots,/Disallow: \/(?:assets|marathon-2026\.html|about\.html)/);assert.match(robots,/Sitemap: https:\/\/saivistaculturalcommittee.in\/sitemap.xml/);
});
