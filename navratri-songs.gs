// Separate read-only Apps Script web app owned by the committee.
const SONG_DAYS = [{"day":1,"date":"2026-10-11","folderId":"1pCKc18l9oPHSSNdA8_ZInqXRhiLH-87m"},{"day":2,"date":"2026-10-12","folderId":"1EV-51lEpcHoS918-Q-Imz2vgmVmg9e3L"},{"day":3,"date":"2026-10-13","folderId":"1AQgF8K4v_uowKlKhXhl6soGil8I8Is89"},{"day":4,"date":"2026-10-14","folderId":"1_3wZGFotGFfisiBf1mygsSbkbTAPhvme"},{"day":5,"date":"2026-10-15","folderId":"1VW3Nza8YLCv1gyWw2V0w0lMRAui_2vGO"},{"day":6,"date":"2026-10-16","folderId":"1fw4keYJdD3dGWw34ZhBg6IDB54nqC_Zx"},{"day":7,"date":"2026-10-17","folderId":"1-JdSWkBLrC3xbN6IegD2-IoQhezoexUZ"},{"day":8,"date":"2026-10-18","folderId":"1ZQAy8S2St9TEPuRHeCxiYqjQ6x-vpJ-C"},{"day":9,"date":"2026-10-19","folderId":"1oMoRgBU8ittTh0Di-23j-h13IbEGFEBD"}];
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'audio') return songAudio(e.parameter);
  try {
    const days = SONG_DAYS.map(day => {
      const files = DriveApp.getFolderById(day.folderId).getFiles(), songs = [];
      while (files.hasNext()) {
        const file = files.next();
        if (!file.getMimeType().startsWith('audio/') || file.isTrashed()) continue;
        songs.push({ id: file.getId(), name: file.getName(), size: file.getSize(), resourceKey: file.getResourceKey() || '' });
      }
      songs.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      return { day: day.day, songs };
    });
    return songJson({ ok: true, days });
  } catch (_) { return songJson({ ok: false, error: 'Songs are temporarily unavailable.' }); }
}
function songJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function verifySongFolders() { SONG_DAYS.forEach(day => DriveApp.getFolderById(day.folderId).getName()); }
// Only audio directly in one of the configured day folders can be downloaded.
function songAudio(params) {
  try {
    const day = SONG_DAYS.find(day => day.day === Number(params.day));
    if (!day || !/^[A-Za-z0-9_-]+$/.test(params.id || '')) throw Error('Invalid song.');
    const files = DriveApp.getFolderById(day.folderId).getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getId() !== params.id) continue;
      if (file.isTrashed() || !file.getMimeType().startsWith('audio/')) throw Error('Not an audio file.');
      if (file.getSize() > 25000000) return songJson({ok:false,error:'This song exceeds the 25 MB advanced-player limit. Use Drive preview instead.'});
      return songJson({ok:true,mime:file.getMimeType(),audio:Utilities.base64Encode(file.getBlob().getBytes())});
    }
    throw Error('Song not found.');
  } catch (_) { return songJson({ok:false,error:'Unable to load this song. Try Drive preview.'}); }
}
