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
      if(song.size>25000000) return songJson({ok:false,error:'This file exceeds the 25 MB DJ-player limit. Use Drive preview.'});
      const file=DriveApp.getFileById(song.id), blob=file.getBlob();
      return songJson({ok:true,mime:file.getMimeType(),audio:Utilities.base64Encode(blob.getBytes())});
    }
    return songJson({ok:true,version:3,groups,days:groups.filter(g=>g.day)});
  } catch(_) { return songJson({ok:false,error:'Songs are temporarily unavailable. Please refresh.'}); }
}
function songJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
