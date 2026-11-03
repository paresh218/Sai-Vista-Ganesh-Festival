window.SaiVistaFinanceRequest = (url, options = {}) => {
  const session=window.SaiVistaResidentSession;
  if(session?.residentVerified!==true)return Promise.reject(Error('Only verified residents can view restricted data.'));
  return fetch(url,{...options,method:'POST',cache:'no-store',body:new URLSearchParams({payload:JSON.stringify({token:session.token,flat:session.flat})})});
};
