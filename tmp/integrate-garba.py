from pathlib import Path
import json
p=Path('navratri-songs.js')
s=p.read_text(encoding='utf-8')
s=s.replace(" const presets=", " let localGarba=[];try{localGarba=JSON.parse(localStorage.getItem('saiVistaGarbaFiles')||'[]');if(!Array.isArray(localGarba))localGarba=[];}catch(_){}\n const withGarba=items=>[...items.filter(g=>g.key!=='garba-local'),{key:'garba-local',name:'Garba Special · saved audio',songs:localGarba}];\n const presets=",1)
s=s.replace("function fallback(song){", "function fallback(song){if(song.local)return;",1)
s=s.replace("return downloadBlob(song,group,AbortSignal.timeout(120000),background);", "if(song.local)throw Error('This saved audio is missing. Import the file again in Garba Special.');return downloadBlob(song,group,AbortSignal.timeout(120000),background);",1)
s=s.replace("async function load(i){if(!songs[i])return;", "async function load(i){if(!songs[i])return;window.dispatchEvent?.(new Event('sai-vista-dj-play'));",1)
s=s.replace("catalogue=nextGroups;groups(previous);", "catalogue=withGarba(nextGroups);groups(previous);",1)
s=s.replace("JSON.stringify(catalogue)===JSON.stringify(data.groups)", "JSON.stringify(catalogue)===JSON.stringify(withGarba(data.groups))")
s=s.replace("const resumeContext=ctx&&ctx.state!=='running';", "window.dispatchEvent?.(new Event('sai-vista-dj-play'));const resumeContext=ctx&&ctx.state!=='running';",1)
s=s.replace("normalizers,sound,load,prepare};", """normalizers,sound,load,prepare,
 async importGarba(file){
  if(!file.size||file.size>50000000)throw Error('Choose an audio file up to 50 MB.');
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  const id='local_'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const song={id,name:file.name,size:file.size,mime:file.type||({'mp3':'audio/mpeg','m4a':'audio/mp4','wav':'audio/wav','ogg':'audio/ogg','flac':'audio/flac'}[file.name.split('.').pop().toLowerCase()]||'audio/mpeg'),local:true};
  await window.SaiVistaOffline.put('garba-local:'+id+':'+song.size+':',file);
  const next=[...localGarba.filter(s=>s.id!==id),song];
  localStorage.setItem('saiVistaGarbaFiles',JSON.stringify(next));localGarba=next;
  applyLibrary(catalogue);
 },
 openGarba(){applyLibrary(catalogue);$('songDay').value='garba-local';day();}
 };""",1)
s=s.replace("window.addEventListener('pagehide',stop);refresh();", "window.addEventListener('pagehide',stop);if(localGarba.length)applyLibrary([]);refresh();")
p.write_text(s,encoding='utf-8')
data=json.loads(Path('tmp/garba-source-tracks.json').read_text(encoding='utf-8-sig'))
out={'source':'https://garba.pycnavratri.com/','slots':{k:[{f:t.get(f,'') for f in ['id','title','artist']} for t in v] for k,v in data['slots'].items()}}
Path('garba-catalogue.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8');s=s.replace('</head>','    <link rel="stylesheet" href="garba-special.css">\n</head>',1);s=s.replace('    <script src="song-popup.js"></script>','    <script src="garba-special.js"></script>\n    <script src="song-popup.js"></script>',1);p.write_text(s,encoding='utf-8')
p=Path('service-worker.js');s=p.read_text(encoding='utf-8').replace('2026-v101','2026-v102');s=s.replace('  "song-offline.js",','  "song-offline.js",\n  "garba-special.js",\n  "garba-special.css",\n  "garba-catalogue.json",');p.write_text(s,encoding='utf-8')
