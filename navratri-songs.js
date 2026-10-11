(() => {
  const config = window.SaiVistaSongs, select = document.getElementById('songDay'), status = document.getElementById('songStatus'), list = document.getElementById('songList'), player = document.getElementById('songPlayer'), upload = document.getElementById('songUploadLink');
  let catalogue = [];
  for (const day of config.days) {
    const option = document.createElement('option'); option.value = day.day;
    option.textContent = 'Day ' + day.day + ' · ' + new Date(day.date + 'T12:00:00+05:30').toLocaleDateString('en-IN', {day:'numeric',month:'long',timeZone:'Asia/Kolkata'});
    select.append(option);
  }
  select.value = window.NavratriDays?.current()?.day || 1;
  const stop = () => { player.replaceChildren(); player.hidden = true; };
  function render() {
    stop(); list.replaceChildren();
    const day = config.days.find(day => day.day === Number(select.value));
    upload.href = 'https://drive.google.com/drive/folders/' + day.folderId;
    upload.textContent = 'Upload songs for Day ' + day.day + ' in Google Drive ↗';
    const songs = catalogue.find(entry => entry.day === day.day)?.songs || [];
    if (!config.endpoint) { status.textContent = 'Song playback is being set up. Open the day’s folder in Google Drive.'; return; }
    status.textContent = songs.length ? songs.length + ' songs · Day ' + day.day : 'No songs uploaded for this day yet.';
    for (const song of songs) {
      if (!/^[A-Za-z0-9_-]+$/.test(song.id)) continue;
      const row = document.createElement('article'); row.className = 'song-row';
      const title = document.createElement('h3'); title.textContent = song.name;
      const play = document.createElement('button'); play.type = 'button'; play.className = 'btn btn-dark'; play.textContent = 'Play song'; play.setAttribute('aria-label','Play ' + song.name);
      play.onclick = () => {
        stop(); const frame = document.createElement('iframe');
        const key = song.resourceKey ? '?resourcekey=' + encodeURIComponent(song.resourceKey) : '';
        frame.src = 'https://drive.google.com/file/d/' + song.id + '/preview' + key;
        frame.title = 'Song player: ' + song.name; frame.allow = 'autoplay';
        const name = document.createElement('p'); name.textContent = song.name;
        const open = document.createElement('a'); open.href = 'https://drive.google.com/file/d/' + song.id + '/view' + key; open.textContent = 'Open song in Google Drive ↗'; open.target = '_blank'; open.rel = 'noopener';
        player.append(name,frame,open); player.hidden = false;
      };
      row.append(title,play); list.append(row);
    }
  }
  async function refresh() {
    if (!config.endpoint) { render(); return; }
    const button = document.getElementById('refreshSongs'); button.disabled = true; status.textContent = 'Loading songs…';
    try {
      const response = await fetch(config.endpoint,{signal:AbortSignal.timeout(30000),cache:'no-store'}), data = await response.json();
      if (!response.ok || data.ok !== true || !Array.isArray(data.days)) throw Error('Unavailable');
      catalogue = data.days; render();
    } catch (_) { stop(); list.replaceChildren(); status.textContent = 'Could not load songs. Try Refresh songs or open the day’s Drive folder.'; }
    finally { button.disabled = false; }
  }
  select.onchange = render; document.getElementById('refreshSongs').onclick = refresh; document.getElementById('stopSong').onclick = stop;
  render(); refresh();
})();
