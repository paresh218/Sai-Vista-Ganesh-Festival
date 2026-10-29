const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('script.js','utf8');
const fixtures=[
 {wing:'A',flat:'101',paid:true,amount:2500},
 {wing:'A',flat:'101 Tenant',paid:true,amount:1000},
 {wing:'F',flat:'1304',paid:false,amount:2500},
 {wing:'SPONSORSHIP',flat:'Test donor',paid:true,amount:5000},
 {wing:'2025 GANPATI SURPLUS',flat:'Surplus',paid:true,amount:1000},
 {wing:'AARTI COLLECTION',flat:'Day 1',paid:true,amount:100},
 {wing:'FUN N FAIR',flat:'Stall fees',paid:false,amount:500}
];
function page(t,rows=fixtures){
 const dom=new JSDOM('<div id="paymentDashboard"></div>',{runScripts:'outside-only'}),w=dom.window;t.after(()=>w.close());
 w.t=(key,values={})=>key.replace(/\{(\w+)\}/g,(_,key)=>values[key]??'');
 w.paymentRupees=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
 w.eval(source.slice(source.indexOf('function escapeHtml('),source.indexOf('function parsePaymentCsv('))+source.slice(source.indexOf('function groupPaymentContributions('),source.indexOf('document.addEventListener("DOMContentLoaded", initPaymentDashboard)')));
 w.renderPaymentDashboard(w.document.querySelector('#paymentDashboard'),rows);
 return w;
}
test('donor/surplus collections stay separate, total receipts reconcile and flat counts deduplicate tenant entries',t=>{
 const w=page(t),d=w.document,summary=d.querySelector('.collection-summary');
 assert.equal(summary.querySelectorAll('strong')[0].textContent,'2');
 assert.equal(summary.querySelectorAll('article')[1].querySelector('small').textContent,'Sponsorship amount');
 assert.equal(summary.querySelectorAll('strong')[1].textContent,'₹5,000');
 assert.equal(summary.querySelectorAll('strong')[2].textContent,'₹9,600');
 assert.equal(summary.querySelectorAll('strong')[3].textContent,'₹2,500');
 assert.equal(summary.querySelectorAll('strong')[4].textContent,'50.0%');
 const other=d.getElementById('otherContributionsTitle').closest('article');
 assert.match(other.textContent,/₹6,100/);assert.match(other.textContent,/₹3,500/);
 assert.equal(other.querySelectorAll('tbody tr').length,4);
 assert.equal(d.querySelector('.payment-toolbar').closest('article').querySelectorAll('tbody tr').length,3);
 assert.deepEqual([...d.querySelectorAll('.wing-row button')].map(b=>b.dataset.wing),['A','B','C','D','E','F']);
 assert.match(d.querySelector('.wing-count').textContent,/1 paid \/ 1/);
});
test('resident filters and keyboard wing drilldown never include other collections or discard their section',t=>{
 const w=page(t),d=w.document;
 d.querySelector('.wing-bar[data-wing="F"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.equal(d.querySelector('#paymentWing').value,'F');
 const records=()=>d.querySelector('.payment-toolbar').closest('article').querySelectorAll('tbody tr');
 assert.equal(records().length,1);assert.match(records()[0].textContent,/1304/);
 const status=d.querySelector('#paymentStatus');status.value='true';status.dispatchEvent(new w.Event('change'));assert.equal(records().length,0);
 assert.equal(d.getElementById('otherContributionsTitle').closest('article').querySelectorAll('tbody tr').length,4);
 d.querySelector('.dashboard-details').open=false;d.dispatchEvent(new w.Event('sai-vista-language-change'));assert.equal(d.querySelector('.dashboard-details').open,false);
});
test('registry boundaries, unknown rows and HTML donor names are handled safely',t=>{
 const w=page(t,[{wing:'A',flat:'1304',paid:true,amount:100},{wing:'A',flat:'1401',paid:true,amount:200},{wing:'G',flat:'101',paid:true,amount:300},{wing:'<img src=x onerror=alert(1)>',flat:'<svg onload=alert(1)>',paid:true,amount:400}]);
 assert.equal(w.document.querySelector('.collection-summary strong').textContent,'1');
 assert.equal(w.document.querySelectorAll('img,svg').length,0);
 assert.equal(w.document.getElementById('otherContributionsTitle').closest('article').querySelectorAll('tbody tr').length,3);
});
test('resident-only source keeps a clear empty donor group and no invented missing-flat payments',t=>{
 const w=page(t,fixtures.slice(0,1));assert.match(w.document.getElementById('otherContributionsTitle').closest('article').textContent,/No donor, surplus/);
 assert.equal(w.document.querySelector('.collection-summary strong').textContent,'1');assert.match(w.document.querySelector('.payment-viz').textContent,/missing records are not marked unpaid/);
});
