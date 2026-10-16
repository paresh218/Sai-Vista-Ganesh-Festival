// Rearrange existing controls without replacing their audio handlers.
(() => {
 const dialog=document.querySelector('.song-popup'),content=dialog?.querySelector('.player-workspace');if(!content)return;
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 dialog.classList.add('modern-player');
 const weekendOpen=document.getElementById('weekendMusicOpen');if(weekendOpen)weekendOpen.onclick=()=>{dialog.showModal();window.dispatchEvent(new Event('sai-vista-player-open'));};
 const player=content.querySelector(':scope > .advanced-player'),library=content.querySelector('.workspace-playlist'),sound=content.querySelector('.workspace-sound'),studio=content.querySelector('.workspace-dj');
 const toolbar=content.querySelector('.workspace-toolbar'),garba=content.querySelector('.garba-special');
 const browse=make('div');browse.className='modern-browse';
 const nav=make('nav');nav.className='modern-tabs';nav.setAttribute('aria-label','Music player sections');
 const offline=make('section');offline.className='modern-offline';offline.append(make('h3','Your offline collection'),make('p','Save music before the evening starts. Your files stay on this browser and device.'));
 const download=library.querySelector('.workspace-download');if(download){download.open=true;offline.append(download);}
 const upload=library.querySelector('.song-upload');if(upload)offline.append(upload);
 const limits=make('p','Online Garba supports playback, seek, volume, speed, shuffle, repeat, cues and timed loops. For EQ, beat analysis, effects, recording and two-deck mixing, attach your audio using Use my audio beside the song.');limits.className='modern-source-note';sound.prepend(limits);const studioNote=make('p',limits.textContent);studioNote.className='modern-source-note';studio.prepend(studioNote);
 const panels={playlist:library,garba,sound,studio,offline};const buttons={};
 function show(id){for(const [key,panel] of Object.entries(panels)){if(panel)panel.hidden=key!==id;buttons[key]?.setAttribute('aria-pressed',String(key===id));}content.dataset.view=id;}
 for(const [id,label]of Object.entries({playlist:'Daily songs',garba:'Garba Special',sound:'Sound',studio:'DJ studio',offline:'Offline'})){
  const b=make('button',label);b.type='button';b.onclick=()=>{show(id);if(id==='garba'&&garba.querySelector('select').options.length===0){garba.hidden=true;garbaLaunch?.click();}};buttons[id]=b;nav.append(b);
 }
 const garbaLaunch=[...library.querySelectorAll('button')].find(b=>b.textContent==='Garba Special ♫');if(garbaLaunch)garbaLaunch.hidden=true;
 if(toolbar)library.insertBefore(toolbar,library.children[1]||null);
 if(garba){
  const fileLabel=garba.querySelector('input[type=file]')?.parentElement;
  if(fileLabel){const note=fileLabel.nextElementSibling;offline.append(fileLabel);if(note)offline.append(note);}
  const saved=[...garba.querySelectorAll('button')].find(b=>b.textContent==='Open saved Garba in DJ player');if(saved){offline.append(saved);saved.addEventListener('click',()=>show('playlist'));}
 }
 for(const panel of Object.values(panels))if(panel)browse.append(panel);
 browse.prepend(nav);content.append(browse);
 const art=make('div');art.className='modern-art';art.setAttribute('aria-hidden','true');art.innerHTML='<span class="modern-art-kicker">SAI VISTA / PLAYER</span><strong class="modern-art-title">MUSIC</strong><div class="modern-equalizer"><i style="height:35%"></i><i style="height:65%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:55%"></i><i style="height:40%"></i><i style="height:72%"></i><i style="height:92%"></i><i style="height:58%"></i><i style="height:78%"></i><i style="height:100%"></i><i style="height:62%"></i><i style="height:42%"></i><i style="height:70%"></i></div><span class="modern-art-caption">RAAS · RANG · REPEAT</span>';player.prepend(art);
 const title=dialog.querySelector('.dj-popup-header strong');if(title)title.textContent='SAI VISTA / MUSIC';
 const heading=library.querySelector('h3');if(heading)heading.textContent='Made for your evening';
 const instructions=[...library.children].find(e=>e.tagName==='P'&&e.textContent.startsWith('Drag songs'));if(instructions){const details=make('details');details.className='modern-help';details.append(make('summary','Arrange your playlist'));instructions.before(details);details.append(instructions);}
 const timing=library.querySelector('.playlist-time');if(timing){const details=make('details');details.className='modern-help';details.append(make('summary','Playlist duration'));timing.before(details);details.append(timing);}
 window.addEventListener('sai-vista-garba-track',e=>{document.getElementById('songNowPlaying').textContent=e.detail.title;document.getElementById('songPlaybackStatus').textContent=e.detail.artist+' · Garba Special';});
 show('playlist');
})();
