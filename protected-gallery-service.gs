// Deploy this gallery-only entry point as the committee account.
function doPost(event) {
  try {const data=JSON.parse(event.parameter.payload||'{}');if(typeof data.action!=='string'||!data.action.startsWith('gallery-'))throw Error('Unsupported gallery action.');return galleryJson(galleryHandle(data));}
  catch(_){return galleryJson({ok:false,error:'Could not process the gallery request.'});}
}
function galleryJson(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
