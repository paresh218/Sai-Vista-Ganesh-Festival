(() => {
 const content=document.querySelector('.dj-popup-content'),player=content?.querySelector('.advanced-player');if(!player)return;
 content.classList.add('player-workspace');
 const heading=content.querySelector('.section-heading');if(heading)heading.hidden=true;
 const toolbar=content.querySelector('.song-toolbar');toolbar.classList.add('workspace-toolbar');
 const playlist=document.createElement('section');playlist.className='workspace-playlist';playlist.setAttribute('aria-label','Playlist');const title=document.createElement('h3');title.textContent='Your playlist';playlist.append(title);
 const sound=document.createElement('section');sound.className='workspace-sound';sound.setAttribute('aria-label','Sound controls');const soundTitle=document.createElement('h3');soundTitle.textContent='Sound & visualization';sound.append(soundTitle);
 for(const node of [...content.children])if(node!==heading&&node!==toolbar&&node!==player)playlist.append(node);
 for(const selector of ['.song-equalizer','.retro-panel']){const node=player.querySelector(selector);if(node)sound.append(node);}
 const dj=document.createElement('section');dj.className='workspace-dj advanced-player';dj.setAttribute('aria-label','DJ mixing tools');const djTitle=document.createElement('h3');djTitle.textContent='DJ mixing tools';dj.append(djTitle);for(const id of ['djStudioOpen','djStudioHost']){const node=document.getElementById(id);if(node)dj.append(node);}
 const extras=document.createElement('details');extras.className='workspace-extras';const summary=document.createElement('summary');summary.textContent='Cue, jump & loop controls';extras.append(summary);const controls=player.querySelector('.player-controls');for(const button of [...controls.children])if(!button.id)extras.append(button);const hint=controls.nextElementSibling;if(hint?.textContent==='Cue and loop controls apply to the current song.')extras.append(hint);player.append(extras);
 const download=playlist.querySelector('#songSaveDevice')?.parentElement;if(download){const box=document.createElement('details');box.className='workspace-download';const label=document.createElement('summary');label.textContent='Save playlist for local playback';box.append(label);download.before(box);box.append(download);}
 const transitions=player.querySelector('.player-settings');if(transitions){const box=document.createElement('details');box.className='workspace-transitions';const label=document.createElement('summary');label.textContent='Transitions · Smooth Auto Mix & crossfade';box.append(label);transitions.before(box);box.append(transitions);} content.append(player,playlist,sound,dj);
})();
