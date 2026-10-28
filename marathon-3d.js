(() => {
  const host=document.getElementById('marathon3d'),button=document.getElementById('marathon3dPause');
  if(!host||!button)return;
  const fallback=host.parentElement.querySelector('img'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=navigator.connection;
  let started=false,stopped=false,controller,paused=false;
  function allowed(){return !motion.matches&&!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'')&&!(navigator.deviceMemory&&navigator.deviceMemory<=2)&&'WebGL2RenderingContext' in window;}
  function showFallback(){host.dataset.scene='fallback';host.setAttribute('aria-hidden','true');fallback.removeAttribute('aria-hidden');button.hidden=true;}
  function preferences(){if(!allowed()){stopped=true;controller?.dispose();showFallback();}}
  const observer=new IntersectionObserver(async entries=>{
    if(started||stopped||!entries.some(e=>e.isIntersecting)||!allowed())return;
    started=true;observer.disconnect();
    try{
      const module=await import('./assets/marathon-scene-v2.js');
      if(stopped||!allowed())return;
      controller=module.mountMarathonScene(host,{onFailure:showFallback,onReady:()=>{host.setAttribute('aria-hidden','false');fallback.setAttribute('aria-hidden','true');button.hidden=false;}});
    }catch(error){console.warn('Marathon 3D could not load; showing event poster.',error.message);showFallback();}
  },{rootMargin:'120px'});
  if(allowed())observer.observe(host);
  button.addEventListener('click',()=>{paused=!paused;controller?.pause(paused);button.textContent=paused?'Play motion':'Pause motion';button.setAttribute('aria-pressed',String(paused));});
  motion.addEventListener('change',preferences);connection?.addEventListener?.('change',preferences);
  window.addEventListener('pagehide',()=>{stopped=true;observer.disconnect();controller?.dispose();showFallback();motion.removeEventListener('change',preferences);connection?.removeEventListener?.('change',preferences);},{once:true});
})();
