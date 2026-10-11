const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('navratri-songs.gs', 'utf8');
let unavailable = false;
const file = (id, name, mime, trashed = false) => ({ getId:()=>id, getName:()=>name, getMimeType:()=>mime, isTrashed:()=>trashed, getResourceKey:()=> 'key' });
const context = {
  DriveApp: { getFolderById: id => {
    if (unavailable) throw Error('private failure');
    const files = [file('b','02 Garba.mp3','audio/mpeg'),file('a','01 Aarti.mp3','audio/mpeg'),file('c','photo.jpg','image/jpeg'),file('d','Deleted.mp3','audio/mpeg',true)];
    return {getFiles:()=>({hasNext:()=>files.length > 0,next:()=>files.shift()})};
  } },
  ContentService: {MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}
};
vm.createContext(context); vm.runInContext(source,context);
const result = context.doGet(); assert.equal(result.ok,true); assert.equal(result.days.length,9);
for (const day of result.days) { assert.equal(day.songs.length,2); assert.equal(day.songs[0].name,'01 Aarti.mp3'); assert.equal(day.songs[0].resourceKey,'key'); }
unavailable = true; const failed = context.doGet(); assert.equal(failed.ok,false); assert.ok(!JSON.stringify(failed).includes('private failure'));
console.log('PASS: nine day folders, numeric song ordering, audio-only listings, deleted-file filtering, resource keys, safe service failures.');
