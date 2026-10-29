/* Shared browser / Apps Script rules. Dates use India time and event-day age. */
const SaiVistaMarathon = (() => {
  const event = Object.freeze({date:'2026-11-29', start:'2026-11-29T05:45:00+05:30', deadline:'2026-11-11T00:00:00+05:30', upi:'8149525915@ybl', fees:{'3K':149,'5K':199}, bloodGroups:['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'], sizes:['XS','S','M','L','XL','XXL'], genders:['Female','Male','Non-binary','Prefer not to say'], medical:['No','Yes','Prefer not to say']});
  const schedule = Object.freeze([
    ['05:45 AM','Reporting time','Arrival & BIB check-in','Arrival & BIB check-in'],
    ['06:00 AM','Zumba & warm-up','Group warm-up session','Group warm-up session'],
    ['06:20 AM','Route instructions','Safety & route briefing','Safety & route briefing'],
    ['06:30 AM','5 km flag-off','Race start','Line up at start area'],
    ['06:40 AM','3 km flag-off','On course','Race start'],
    ['07:15–07:30 AM','Finish & refreshments','Medals, hydration & snacks','Medals, hydration & snacks'],
    ['07:40 AM','Trophies & awards','Trophies & awards','Trophies & awards']
  ]);
  function age(dob) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return -1;
    const date=new Date(dob+'T00:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==dob)return -1;
    return 2026-date.getUTCFullYear()-((date.getUTCMonth()>10||(date.getUTCMonth()===10&&date.getUTCDate()>29))?1:0);
  }
  function validate(d,now=Date.now()) {
    if(now>=Date.parse(event.deadline))return 'Registration closed on 10 November 2026.';
    if(!Object.prototype.hasOwnProperty.call(event.fees,d.race))return 'Choose 3 km or 5 km.';
    if(typeof d.name!=='string'||d.name.trim().length<2||d.name.length>80||/[\u0000-\u001f]/.test(d.name))return 'Enter your full name (2–80 characters).';
    if(typeof d.bibName!=='string'||!d.bibName.trim()||d.bibName.length>30||/[\u0000-\u001f\u007f]/.test(d.bibName))return 'Enter the name on your BIB (1–30 characters).';
    if(age(d.dob)<12||age(d.dob)>110)return 'Participants must be aged 12 or above on 29 November 2026.';
    if(typeof d.email!=='string'||!/^[a-z0-9][a-z0-9._%+-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(d.email)||d.email.length>254)return 'Enter a valid email address.';
    if(!/^[6-9]\d{9}$/.test(d.phone||''))return 'Enter a 10-digit Indian mobile number.';
    if(!/^[6-9]\d{9}$/.test(d.emergencyPhone||'')||d.phone===d.emergencyPhone)return 'Enter a different emergency contact mobile number.';
    if(typeof d.emergencyName!=='string'||d.emergencyName.trim().length<2||d.emergencyName.length>80)return 'Enter the emergency contact name.';
    if(!event.bloodGroups.includes(d.bloodGroup))return 'Choose a blood group, or Unknown.';
    if(!event.sizes.includes(d.shirt))return 'Choose your T-shirt size.';
    if(!event.genders.includes(d.gender))return 'Choose a gender option.';
    if(!event.medical.includes(d.medical))return 'Choose a medical discomfort option.';
    if(typeof (d.medicalDetails||'')!=='string'||(d.medicalDetails||'').length>500)return 'Keep the medical note within 500 characters.';
    if(typeof d.flat!=='string'||(!/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(d.flat)&&!/^VISITOR$/i.test(d.flat)))return 'Enter your Sai Vista flat such as B-902, or Visitor if you live outside the society.';
    if(d.medical==='Yes'&&(!d.medicalDetails||d.medicalDetails.trim().length<2))return 'Add a brief medical note, or choose No / Prefer not to say.';
    if(d.agreed!==true)return 'Accept the participation and private-data notice.';
    if(age(d.dob)<18&&(typeof d.guardian!=='string'||d.guardian.trim().length<2||d.guardian.length>80||d.guardianConsent!==true))return 'A parent or guardian must give their name and consent for a participant under 18.';
    return '';
  }
  function paymentLink(race){return 'upi://pay?pa='+encodeURIComponent(event.upi)+'&pn='+encodeURIComponent('PARESHKUMAR DASHRATH KALE')+'&am='+event.fees[race]+'&cu=INR&tn='+encodeURIComponent('Sai Vista Marathon '+race);}
  function proofIssue(d){
    if(d.paymentDeclared!==true)return 'Confirm that you completed the payment.';
    if(!/^\d{12}$/.test(d.paymentReference||''))return 'Enter the 12-digit UPI transaction reference (UTR).';
    if(!d.proof||!['image/jpeg','image/png','image/webp'].includes(d.proof.type)||typeof d.proof.base64!=='string'||d.proof.base64.length<16||d.proof.base64.length>4194304||!/^[A-Za-z0-9+/]+={0,2}$/.test(d.proof.base64))return 'Attach a JPG, PNG or WebP payment screenshot (up to 3 MB).';
    return '';
  }
  return {event,schedule,age,validate,paymentLink,proofIssue};
})();
if(typeof module!=='undefined')module.exports=SaiVistaMarathon;
