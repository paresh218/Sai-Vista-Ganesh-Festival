const assert=require('node:assert/strict'),Time=require('./playlist-time.js');const songs=[{id:'a',size:10},{id:'b',size:20}];
assert.deepEqual(Time.summary(songs,{'a:10':549.12}),{known:1,total:2,text:'9m 9s'});
assert.deepEqual(Time.summary(songs,{'a:10':3600,'b:20':61}),{known:2,total:2,text:'1h 1m 1s'});
assert.equal(Time.summary([{id:'a',size:11}],{'a:10':549}).known,0);
assert.equal(Time.summary([],{}).text,'0m 0s');console.log('PASS: full/partial playlist totals, hour formatting and changed-file cache key');
