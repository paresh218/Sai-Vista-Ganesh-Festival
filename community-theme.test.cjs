const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('community-theme.css','utf8');
function page(){const dom=new JSDOM(html,{url:'https://example.org',runScripts:'outside-only'});dom.window.eval(fs.readFileSync('community-theme.js','utf8'));return dom;}
test('shared theme loads last, fonts are self-hosted, and all private feature anchors remain',()=>{
 const dom=page(),d=dom.window.document,styles=[...d.querySelectorAll('link[rel=stylesheet]')];assert.equal(styles.at(-1).getAttribute('href'),'community-theme.css?v=4');assert.equal(styles.some(link=>link.href.includes('fonts.googleapis.com')),false);
 for(const id of ['marathonEntryForm','privateGallery','navratriVideoPlayer','videoCommentForm','galleryLocalSave','accounts','navratriSongs','residentGate'])assert.ok(d.getElementById(id),id);
 for(const file of ['outfit-latin.woff2','work-sans-latin.woff2'])assert.equal(fs.readFileSync('assets/fonts/'+file).subarray(0,4).toString(),'wOF2');
 assert.ok(fs.statSync('assets/fonts/outfit-latin.woff2').size+fs.statSync('assets/fonts/work-sans-latin.woff2').size<100000);dom.window.close();
});
test('More menu closes on outside clicks, navigation and Escape, preserving focus',()=>{
 const dom=page(),w=dom.window,d=w.document,more=d.getElementById('siteMore'),summary=more.querySelector('summary');
 more.open=true;d.querySelector('.community-intro h2').click();assert.equal(more.open,false);
 more.open=true;more.querySelector('a').addEventListener('click',e=>e.preventDefault());more.querySelector('a').click();assert.equal(more.open,false);
 more.open=true;more.querySelector('a').focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(more.open,false);assert.equal(d.activeElement,summary);
 dom.window.close();
});
test('five mobile destinations have accessible names and decorative icons, without duplicated controls',()=>{
 const dom=page(),w=dom.window,d=w.document,links=[...d.querySelectorAll('.mobile-nav a')];assert.equal(links.length,5);assert.deepEqual(links.map(a=>a.getAttribute('href')),['#home','#marathonInterest','#navratriVideo','#accounts','#navratriArchive']);
 for(const link of links){assert.ok(link.textContent.trim());assert.equal(link.querySelectorAll('svg').length,1);assert.equal(link.querySelector('svg').getAttribute('aria-hidden'),'true');assert.ok(d.getElementById(link.hash.slice(1))||link.hash==='#navratriArchive');}
 w.eval(fs.readFileSync('community-theme.js','utf8'));assert.equal(d.querySelectorAll('.mobile-nav svg').length,5);dom.window.close();
});
function ratio(a,b){const luminance=c=>{const rgb=c.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('chosen text / surface pairs meet AA contrast and shared theme honours reduced motion',()=>{
 const token=name=>css.match(new RegExp('--'+name+':(#[a-f0-9]{6})'))[1];
 for(const [a,b] of [[token('ink'),token('canvas')],[token('muted'),token('canvas')],[token('brand'),'#ffffff'],[token('accent'),'#ffffff'],['#d1c0cf','#241d29'],['#e3c391','#241d29']])assert.ok(ratio(a,b)>=4.5,`${a} / ${b}: ${ratio(a,b)}`);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/body \[hidden\]\{display:none!important\}/);
});
