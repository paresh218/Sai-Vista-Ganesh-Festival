(() => {
  let loading, clerk, generation=0;
  const pendingKey='saiVistaSocialPending';
  const config=()=>window.SaiVistaSocialConfig||{};
  const returnUrl=()=>location.origin+location.pathname+'?resident-sign-in=1';
  function script(src, key) {
    return new Promise((resolve,reject)=>{
      const el=document.createElement('script');el.src=src;el.async=true;el.crossOrigin='anonymous';
      const timeout=setTimeout(()=>{el.remove();reject(Error('Social sign-in timed out. Please try again or use email verification.'));},30000);
      if(key)el.setAttribute('data-clerk-publishable-key',key);
      el.onload=()=>{clearTimeout(timeout);resolve();};el.onerror=()=>{clearTimeout(timeout);el.remove();reject(Error('Social sign-in could not load. Use email verification or try again.'));};
      document.head.append(el);
    });
  }
  async function load() {
    if(!config().enabled||!/^pk_live_[A-Za-z0-9]+={0,2}$/.test(config().publishableKey)||config().frontendApi!=='https://clerk.saivistaculturalcommittee.in')throw Error('Social sign-in is not connected yet. Use email verification.');
    if(!loading)loading=(async()=>{
      await script(config().frontendApi+'/npm/@clerk/ui@1/dist/ui.browser.js');
      await script(config().frontendApi+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js',config().publishableKey);
      clerk=window.Clerk;
      await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},signInForceRedirectUrl:returnUrl(),signUpForceRedirectUrl:returnUrl()});
      return clerk;
    })().catch(error=>{loading=null;throw error;});
    return loading;
  }
  window.SaiVistaSocialAuth={
    async start(flat) {
      const current=++generation;
      // Store only the chosen flat and a short-lived continuation, never identity or a provider token.
      try{sessionStorage.setItem(pendingKey,JSON.stringify({flat,expires:Date.now()+600000}));}catch(_){throw Error('Allow this browser’s session storage for social sign-in, or use email verification.');}
      const api=await load();
      if(current!==generation)return null;
      if(api.session)return api.session.getToken();
      api.mountSignIn(document.getElementById('residentSocialMount'),{routing:'hash',withSignUp:true,oauthFlow:'redirect',forceRedirectUrl:returnUrl(),signUpForceRedirectUrl:returnUrl(),appearance:{elements:{rootBox:{width:'100%'},cardBox:{width:'100%',maxWidth:'100%',boxShadow:'none'}}}});
      return null;
    },
    pending() {
      if(!config().enabled)return null;
      try{const pending=JSON.parse(sessionStorage.getItem(pendingKey)||'null');return pending?.expires>Date.now()?pending.flat:null;}catch(_){return null;}
    },
    clear() {generation++;try{sessionStorage.removeItem(pendingKey);}catch(_){}if(clerk)clerk.unmountSignIn(document.getElementById('residentSocialMount'));},
    async signOut() {if(clerk)await clerk.signOut();}
  };
})();
