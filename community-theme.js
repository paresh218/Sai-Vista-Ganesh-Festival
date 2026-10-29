(() => {
  const more=document.getElementById('siteMore');
  document.addEventListener('click',event=>{
    if(!more?.open)return;
    if(!more.contains(event.target)||event.target.closest('a[href^="#"]'))more.open=false;
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&more?.open){const focused=more.contains(document.activeElement);more.open=false;if(focused)more.querySelector('summary').focus();}});
  // Reuse the existing navigation links; SVGs are decorative and do not replace their accessible names.
  const icons={
    '#home':'M3 10 12 3l9 7v10H6V10M9 20v-7h6v7',
    '#marathonInterest':'m6 19 3-6 4 2 3 6M9 13l3-6 4 4 4-1M12 7 7 8l-3 4M15 3h.01',
    '#navratriVideo':'M4 5h16v14H4zM10 9l5 3-5 3z',
    '#accounts':'M4 20h16M6 16v-5M12 16V7M18 16V4',
    '#navratriArchive':'M4 7h16v13H4zM3 3h18v4H3zM9 11h6'
  };
  document.querySelectorAll('.mobile-nav a').forEach(link=>{
    const path=icons[link.getAttribute('href')];if(!path||link.querySelector('svg'))return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',path);svg.append(line);link.prepend(svg);
  });
})();
