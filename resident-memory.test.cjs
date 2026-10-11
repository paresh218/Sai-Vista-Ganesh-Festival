const assert=require('node:assert/strict'),Access=require('./resident-access.js');
const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
Access.remember(storage,'a 1302');assert.equal(Access.remembered(storage),'A-1302');
values.set('saiVistaResidentFlat','bad');assert.equal(Access.remembered(storage),null);
assert.equal(Access.remembered(undefined),null);Access.remember(undefined,'A-101');
console.log('PASS: remembered flat validation and unavailable storage fallback');
