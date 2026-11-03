// Shared by the existing payment and expense services. No finance data is returned before this check.
function financeResidentRequest(event) {
  if(!event?.postData||event.postData.contents.length>4096)throw Error('Only verified residents can view restricted data.');
  const data=JSON.parse(event.parameter.payload||'{}');
  if(typeof data.token!=='string'||data.token.length>100||!data.token||!/^([A-F])-(?:[1-9]|1[0-3])0[1-4]$/.test(data.flat||''))throw Error('Only verified residents can view restricted data.');
  const response=UrlFetchApp.fetch('https://script.google.com/macros/s/AKfycbxXf8vcp2d6xxsMx_11VM_7PRTNVNunsH8Eb9ArTFf_Fc3rQyH0KbMPY0IwDHnfmhtaeA/exec',{method:'post',payload:{payload:JSON.stringify({action:'gallery-finance-access',token:data.token,flat:data.flat})},muteHttpExceptions:true});
  const result=JSON.parse(response.getContentText());
  if(response.getResponseCode()!==200||result.ok!==true||result.residentVerified!==true)throw Error('Only verified residents can view restricted data.');
  return data;
}
