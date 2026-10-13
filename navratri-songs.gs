// Read-only song library; all access stays inside the dedicated shared root.
const SONG_ROOT_ID = '1BkL8XO3KYJxPgAB2zyrKrbpZjIzJykma';
function songMedia(file) {
  return !file.isTrashed();
}
function songWalk(folder, path, seen, depth) {
  if (depth > 8 || seen.has(folder.getId())) return [];
  seen.add(folder.getId());
  let songs = [], files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (songMedia(file)) songs.push({id:file.getId(),name:file.getName(),size:file.getSize(),mime:file.getMimeType(),resourceKey:file.getResourceKey() || '',path});
  }
  const children = folder.getFolders();
  while (children.hasNext()) {
    const child = children.next();
    songs = songs.concat(songWalk(child, path ? path + ' / ' + child.getName() : child.getName(), seen, depth + 1));
  }
  return songs;
}
function songLibrary() {
  const root = DriveApp.getFolderById(SONG_ROOT_ID), children = root.getFolders(), groups = [];
  const rootFiles = root.getFiles(), songs = [];
  while(rootFiles.hasNext()) { const file = rootFiles.next(); if(songMedia(file)) songs.push({id:file.getId(),name:file.getName(),size:file.getSize(),mime:file.getMimeType(),resourceKey:file.getResourceKey() || '',path:''}); }
  if(songs.length) groups.push({key:'root',name:'Shared songs',folderId:root.getId(),songs});
  while(children.hasNext()) {
    const folder = children.next(), match = /^Day\s+(\d+)\b/i.exec(folder.getName());
    groups.push({key:folder.getId(),day:match ? Number(match[1]) : null,name:folder.getName(),folderId:folder.getId(),songs:songWalk(folder,'',new Set(),0)});
  }
  groups.sort((a,b)=>(a.day || 100)-(b.day || 100) || a.name.localeCompare(b.name,undefined,{numeric:true}));
  groups.forEach(group=>group.songs.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));
  return groups;
}
function doGet(e) {
  try {
    const groups = songLibrary();
    if(e && e.parameter && e.parameter.action === 'audio') {
      const p=e.parameter, group=groups.find(g=>g.key===p.group || (!p.group && g.day===Number(p.day)));
      const song=group && group.songs.find(s=>s.id===p.id);
      if(!song) return songJson({ok:false,error:'Song not found in this library.'});
      if(song.size>100000000) return songJson({ok:false,error:'This file exceeds the 100 MB DJ-player limit. Use Drive preview.'});
      const file=DriveApp.getFileById(song.id);
      return songJson({ok:true,mime:file.getMimeType(),audio:songAudio(file,song)});
    }
    return songJson({ok:true,version:5,groups,days:groups.filter(g=>g.day)});
  } catch(_) { return songJson({ok:false,error:'Songs are temporarily unavailable. Please refresh.'}); }
}
function songJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

// Base64 chunks are divisible by three bytes, so joining preserves the original audio.
function songAudio(file,song) {
  if(song.size<=50000000) return Utilities.base64Encode(file.getBlob().getBytes());
  const parts=[], chunk=12000000;
  for(let start=0;start<song.size;start+=chunk) {
    const end=Math.min(song.size,start+chunk)-1;
    const headers={Authorization:'Bearer '+ScriptApp.getOAuthToken(),Range:'bytes='+start+'-'+end};
    if(song.resourceKey) headers['X-Goog-Drive-Resource-Keys']=song.id+'/'+song.resourceKey;
    const response=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(song.id)+'?alt=media',{headers,muteHttpExceptions:true});
    if(response.getResponseCode()!==206) throw Error('Audio range download failed');
    const bytes=response.getContent();
    if(bytes.length!==end-start+1) throw Error('Incomplete audio range');
    parts.push(Utilities.base64Encode(bytes));
  }
  return parts.join('');
}
