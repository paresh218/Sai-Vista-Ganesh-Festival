/* Resident navigation and date-aware homepage. Uses India time throughout. */
const FestivalExperience = (() => {
  const dayKey = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  function agenda(events, now = new Date()) {
    const today = dayKey(now);
    const entries = Object.entries(events).map(([key, event]) => {
      const [month, day] = key.split('-');
      return {date:`2026-${month.padStart(2,'0')}-${day.padStart(2,'0')}`, ...event};
    }).sort((a,b)=>a.date.localeCompare(b.date));
    return {today:entries.find(event=>event.date===today),next:entries.find(event=>event.date>today)};
  }
  function badge(event, now = new Date()) {
    const state=FestivalRegistration.registrationStatus(event,now.getTime());
    if(state.closed)return {label:'Closed',tone:'closed',rank:2};
    const lastDay=dayKey(new Date(Date.parse(FestivalRegistration.deadline(event))-1));
    return lastDay===dayKey(now)?{label:'Closing today',tone:'urgent',rank:0}:{label:'Open',tone:'open',rank:1};
  }
  return {dayKey,agenda,badge};
})();
if(typeof module!=='undefined')module.exports=FestivalExperience;
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
  const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
  function renderAgenda(){
    const agenda=FestivalExperience.agenda(window.SaiVistaContent?.festivalEvents||{});
    for(const kind of ['today','next']){
      const container=document.getElementById(kind+'Agenda');if(!container)continue;
      const event=agenda[kind];container.replaceChildren();
      container.append(text('span',kind==='today'?'TODAY AT SAI VISTA':'UP NEXT','agenda-kicker'));
      if(event){
        const date=new Date(event.date+'T12:00:00+05:30');
        container.append(text('h3',date.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'short'})),text('p',event.message.replace(/^\d+ Sep — /,''),'agenda-message'),text('p',event.time+' · '+event.place,'agenda-meta'));
      }else container.append(text('h3',kind==='today'?'A day for community':'Thank you, Sai Vista!'),text('p',kind==='today'?'No festival activity is listed for today. Explore the programme below.':'No more upcoming events are listed. Browse the festival programme and memories.'));
      const link=text('a','View programme →','text-link');link.href='#schedule';container.append(link);
    }
  }
  function priorityNotice(){
    const updates=EventUX.notices(window.SaiVistaContent?.updates||[]);
    const priority=updates.find(update=>update.priority)||updates.find(update=>update.id.includes('deadline')&&!update.title.includes('closed'))||updates[0];
    document.getElementById('noticeBar').hidden=!priority;
    if(priority){document.getElementById('priorityTitle').textContent=priority.title;document.getElementById('priorityBody').textContent=priority.body;const link=document.querySelector('#noticeBar a');link.href=priority.href||'#committeeUpdates';link.textContent=priority.priority?'View bill & shop details →':'View all notices →';}
  }
  renderAgenda();priorityNotice();setInterval(()=>{renderAgenda();priorityNotice();},60000);
  const separate=new Set(['registration','accounts','archive','resident-businesses','wallpapers']);
  const sections=[...document.querySelectorAll('main > section')];
  function route(scroll=true){
    const requested=location.hash.slice(1)||'home';
    const id=requested==='schedule'?'registration':requested;
    const selected=id==='mainContent'?(document.body.dataset.view||'main'):separate.has(id)?id:'main';
    document.body.dataset.view=selected;
    for(const section of sections)section.hidden=selected==='main'?separate.has(section.id):section.id!==selected;
    for(const link of document.querySelectorAll('.mobile-nav a, #siteNav a')){
      const target=link.getAttribute('href')==='#schedule'?'#registration':link.getAttribute('href');
      if(target==='#'+id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    const nav=document.getElementById('siteNav');nav?.classList.remove('open');
    const toggle=document.querySelector('.menu-toggle');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open menu');
    if(scroll){const target=document.getElementById(id);if(target){if(id==='home')window.scrollTo({top:0,behavior:'instant'});else target.scrollIntoView({block:'start',behavior:'instant'});if(target.matches('section')){target.tabIndex=-1;target.focus({preventScroll:true});}}}
  }
  for(const id of separate){
    const section=document.getElementById(id);if(!section)continue;
    const back=text('a','← Back to festival','view-back');back.href='#home';section.prepend(back);
  }
  window.addEventListener('hashchange',()=>route());
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(link && link.hash===location.hash)route();
  });
  const copyWallpaper=document.getElementById('copyWallpaperLink');
  copyWallpaper?.addEventListener('click',async()=>{
    const field=document.getElementById('wallpaperShareLink');
    const status=document.getElementById('wallpaperShareStatus');
    const translate=key=>window.SaiVistaI18n?.t(key)||key;
    try{await navigator.clipboard.writeText(field.value);status.textContent=translate('Wallpaper link copied.');}
    catch(_){field.focus();field.select();status.textContent=translate('Select and copy the link above.');}
  });
  route(Boolean(location.hash));
});
