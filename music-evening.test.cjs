const assert=require('node:assert/strict'),{tonightGroup,savedSongKey,playlistReadiness}=require('./music-evening.js');
(async()=>{
 const groups=[{key:'day5',day:5,songs:[{id:'old'}]},{key:'day6',day:6,songs:[{id:'one',name:'First',size:25,modifiedTime:'v1'},{id:'two',name:'Second'}]}];
 assert.equal(tonightGroup(groups,6).key,'day6');assert.equal(tonightGroup(groups,7),undefined);assert.equal(tonightGroup(groups,undefined),undefined);
 assert.equal(savedSongKey('day6',groups[1].songs[0]),'day6:one:25:v1');
 const partial=await playlistReadiness(groups[1],async key=>key==='day6:one:25:v1');assert.equal(partial.saved,1);assert.equal(partial.total,2);assert.deepEqual(partial.missing,['Second']);
 const ready=await playlistReadiness(groups[1],async()=>true);assert.equal(ready.saved,2);assert.equal(ready.missing.length,0);
 assert.equal((await playlistReadiness(null,async()=>false)).total,0);
 await assert.rejects(playlistReadiness(groups[1],async()=>{throw Error('storage blocked');}));
 console.log('PASS: Tonight selects the correct day; readiness counts exact saved versions, lists missing songs and reports storage failures.');
})().catch(e=>{console.error(e);process.exitCode=1;});
