from pathlib import Path
p=Path('navratri-player.test.cjs');s=p.read_text();s=s.replace('AbortSignal,AbortController,setTimeout','AbortSignal,AbortController,Event,crypto:require("node:crypto").webcrypto,setTimeout');s=s.replace('nodes.songDay.children.length,2','nodes.songDay.children.length,3',1)
s=s.replace("nodes.stopSong.onclick();assert.equal", """const offline=new Map();context.window.SaiVistaOffline={get:async key=>offline.get(key),put:async(key,file)=>offline.set(key,file)};
const localFile=new Blob(['local audio'],{type:'audio/mpeg'});localFile.name='My Garba.mp3';
await context.window.SaiVistaStudioBridge.importGarba(localFile);
await context.window.SaiVistaStudioBridge.importGarba(localFile);
context.window.SaiVistaStudioBridge.openGarba();await tick();
assert.equal(context.window.SaiVistaStudioBridge.songs.length,1,'Duplicate audio imports must not duplicate songs');
assert.equal(context.window.SaiVistaStudioBridge.songs[0].name,'My Garba.mp3');
const beforeOffline=downloads;context.fetch=async()=>{throw Error('offline')};
await context.window.SaiVistaStudioBridge.load(0);
assert.equal(downloads,beforeOffline,'Imported audio must play without a network download');
assert.equal(context.window.SaiVistaStudioBridge.audio.paused,false);
await nodes.refreshSongs.onclick();assert.equal(context.window.SaiVistaStudioBridge.songs.length,1,'Refresh failure must preserve imported audio');
assert.equal(offline.size,1);console.log('PASS: Garba import, deduplication, offline DJ playback and refresh preservation.');
nodes.stopSong.onclick();assert.equal""",1);p.write_text(s)
