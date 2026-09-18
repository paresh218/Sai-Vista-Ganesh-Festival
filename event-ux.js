// Presentation metadata only; submission rules remain in FestivalRegistration.
const EventUX = (() => {
  const metadata={
    blood:{days:[20],categories:['adults'],time:'09:00AM-02:00PM',venue:'Sai Vista, Rahatani'},
    bollywood:{days:[18],categories:['adults'],time:'08:30PM onwards',venue:'Sai Vista, Rahatani'},
    drawing:{days:[19],categories:['kids'],time:'11:00AM-01:00PM',venue:'Sai Vista, Rahatani'},
    talent:{days:[19,21],categories:['kids'],time:'08:30PM-10:30PM',venue:'Sai Vista, Rahatani'},
    treasure:{days:[20],categories:['kids','adults'],time:'10:00AM-01:00PM',venue:'Sai Vista, Rahatani'},
    rangoli:{days:[20],categories:['adults'],time:'05:00PM-07:00PM',venue:'Clubhouse'},
    thali:{days:[20],categories:['adults','pooja'],time:'02:00PM-04:00PM',venue:'Clubhouse'},
    funfair:{days:[20],categories:['adults'],time:'08:00PM onwards',venue:'Sai Vista, Rahatani'},
    fancy:{days:[22],categories:['kids'],time:'08:00PM onwards',venue:'Sai Vista, Rahatani'},
    cooking:{days:[23],categories:['adults'],time:'08:00PM onwards',venue:'Sai Vista, Rahatani'},
    pooja:{days:[24],categories:['pooja'],time:'05:30PM onwards',venue:'Sai Vista, Rahatani'},
    prasad:{days:[24],categories:['pooja'],time:'7:00 PM – 10:00 PM',venue:'Sai Vista, Rahatani'}
  };
  const programme=[
    {id:'opening',title:'Mirvanuk • Lezim • Ganesh Sthapana',days:[14],categories:['pooja'],time:'Mirvanuk: 2:30–6:30 PM · Sthapana: 7:00 PM'},
    {id:'housie',title:'Housie',days:[15],categories:['adults'],time:'Evening'},
    {id:'races',title:'Lemon & Spoon • Three-legged Race',days:[16],categories:['kids','adults']},
    {id:'chairs',title:'Musical Chairs',days:[17],categories:['kids','adults']},
    {id:'dhol',title:'Dhol Tasha Vaadan',days:[19],categories:['kids','adults'],time:'4:00 PM – 6:00 PM',venue:'Ground floor, near the Pandal'},
    {id:'aarti',title:'Ganesh Aarti',days:[15,16,17,18,19,20,21,22,23],categories:['pooja'],time:'Morning & evening',href:'#aarti'},
    {id:'visarjan',title:'Visarjan • Lezim • DJ',days:[25],categories:['pooja'],time:'As scheduled'}
  ];
  function matches(meta,filter,closed,today){
    if(filter==='closed')return closed;
    if(filter==='upcoming')return meta.days.some(day=>`2026-09-${String(day).padStart(2,'0')}`>=today);
    return filter==='all'||meta.categories.includes(filter);
  }
  function summary(data){
    const entries=[['Name',[data.firstName,data.lastName].filter(Boolean).join(' ')],['Wing',data.wing],['Flat number',data.flatNo],['Mobile number',data.phone]];
    const labels={age:'Age',performanceType:'Performance category',actType:'Act type',performanceTitle:'Performance title',durationSeconds:'Duration in seconds',groupName:'Group name',teamName:'Team name',stallName:'Stall name',stallDetails:'Stall details',costume:'Costume / character',adults:'Adults attending',children:'Children attending'};
    for(const [key,label] of Object.entries(labels))if(data[key]!==undefined && data[key]!=='')entries.push([label,String(data[key])]);
    if(data.event==='blood')entries.push(['Have donated blood before?',data.donatedBefore?'Yes':'No']);
    if(data.players)data.players.forEach((player,index)=>entries.push(['Player '+(index+1),`${player.firstName} ${player.lastName} · ${player.phone}`]));
    return entries.filter(([,value])=>value!==undefined && value!=='');
  }
  function whatsapp(data,title,date,recipient){return [`Hi ${recipient}, I registered for ${title} (${date}).`,`Reference: ${data.requestId}`,...summary(data).map(([label,value])=>`${label}: ${value}`)].join('\n');}
  function notices(updates,now=Date.now()){
    return updates.filter(update=>!update.expiresAt || now < Date.parse(update.expiresAt)).map(update=>{
      const event=update.id.startsWith('fancy-deadline')?'fancy':update.id.startsWith('bollywood-deadline')?'bollywood':update.id.startsWith('events-deadline')?'blood':null;
      if(!event||!FestivalRegistration.registrationStatus(event,now).closed)return {...update};
      return {...update,title:(event==='fancy'?'Fancy Dress':event==='bollywood'?'Bollywood Night':'Other events')+': nominations closed',body:'The registration deadline has passed. New entries are closed.'};
    });
  }
  return {metadata,programme,matches,summary,whatsapp,notices};
})();
if(typeof module!=='undefined')module.exports=EventUX;
