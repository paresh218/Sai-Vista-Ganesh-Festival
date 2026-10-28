/* Shared browser / Apps Script rules. Dates use India time and event-day age. */
const SaiVistaMarathon = (() => {
  const event = Object.freeze({date:'2026-11-29', start:'2026-11-29T06:00:00+05:30', deadline:'2026-11-27T00:00:00+05:30', fees:{'3K':149,'5K':199}, bloodGroups:['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'], sizes:['XS','S','M','L','XL','XXL']});
  function age(dob) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return -1;
    const date=new Date(dob+'T00:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==dob)return -1;
    return 2026-date.getUTCFullYear()-((date.getUTCMonth()>10||(date.getUTCMonth()===10&&date.getUTCDate()>29))?1:0);
  }
  function validate(d,now=Date.now()) {
    if(now>=Date.parse(event.deadline))return 'Registration closed on 26 November 2026.';
    if(!Object.prototype.hasOwnProperty.call(event.fees,d.race))return 'Choose 3 km or 5 km.';
    if(typeof d.name!=='string'||d.name.trim().length<2||d.name.length>80||/[\u0000-\u001f]/.test(d.name))return 'Enter your full name (2–80 characters).';
    if(age(d.dob)<12||age(d.dob)>110)return 'Participants must be aged 12 or above on 29 November 2026.';
    if(typeof d.email!=='string'||!/^[a-z0-9][a-z0-9._%+-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(d.email)||d.email.length>254)return 'Enter a valid email address.';
    if(!/^[6-9]\d{9}$/.test(d.phone||''))return 'Enter a 10-digit Indian mobile number.';
    if(!/^[6-9]\d{9}$/.test(d.emergencyPhone||'')||d.phone===d.emergencyPhone)return 'Enter a different emergency contact mobile number.';
    if(typeof d.emergencyName!=='string'||d.emergencyName.trim().length<2||d.emergencyName.length>80)return 'Enter the emergency contact name.';
    if(!event.bloodGroups.includes(d.bloodGroup))return 'Choose a blood group, or Unknown.';
    if(!event.sizes.includes(d.shirt))return 'Choose your T-shirt size.';
    if(d.flat&&!/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(d.flat))return 'Enter a Sai Vista flat such as B-902, or leave it blank.';
    if(d.agreed!==true)return 'Accept the participation and private-data notice.';
    if(age(d.dob)<18&&(typeof d.guardian!=='string'||d.guardian.trim().length<2||d.guardian.length>80||d.guardianConsent!==true))return 'A parent or guardian must give their name and consent for a participant under 18.';
    return '';
  }
  return {event,age,validate};
})();
if(typeof module!=='undefined')module.exports=SaiVistaMarathon;
