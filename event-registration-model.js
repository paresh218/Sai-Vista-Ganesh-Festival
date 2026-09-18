/* Shared validation: also included in the paste-ready Apps Script. */
const FestivalRegistration = (() => {
  const gift = "Children receive only ONE participation gift across all competitions, regardless of the number of entries.";
  const judging = "Judging is confidential. The judges’ decision is final and binding. Please do not approach Event SPOCs or the Cultural Team about judging or results; they are not involved in judging.";
  const events = {
    blood: {title:"Blood Donation", date:"20 September 2026", sheet:"Blood Donation", rules:["Register your interest in donating blood. Coordinators: Sameer Gandhi (9326199515) and Deepak Karade.", "After saving, open WhatsApp and press Send to share your details with Sameer Gandhi."]},
    bollywood: {title:"Bollywood Night", date:"18 September 2026", sheet:"Bollywood Night", rules:["One entry per wing (A–F), with 5–6 players. Provide each player’s first name, last name and phone number."]},
    drawing: {title:"Drawing & Colouring", date:"20 September 2026", sheet:"Drawing", rules:["Ages 3–6: Colouring; 7–12: Drawing & Colouring; oldest group: awaiting confirmation (13–16 or 13–18).", "Drawing sheets are provided. Bring your own colours, pencils, erasers and only necessary stationery.", "One winner per age group.", gift, judging]},
    talent: {title:"Talent Show", date:"19 & 21 September 2026", sheet:"Talent Show", rules:["Each participant may enter at most once for solo and once for group: maximum two performances. Each group member must register individually using the same group name.", "Solo: maximum 2 minutes. Group: maximum 4 minutes. Dance, singing, act, mime, instrumental and other suitable performances are welcome.", "Performance day and sequence are allotted by draw. No changes after allotment; be ready for your turn.", "Submit actual audio files by 15 September 2026 using the designated music link. YouTube and other song/video links are not accepted. File name: Participant Name_Song Name (example: Priyanka_Meri_Moti_Veerana).", "Select respectful songs and acts suitable for the Ganpati festival. Gifts are distributed on the Ganpati Visarjan day before the miravnuk (25 September).", gift]},
    treasure: {title:"Treasure Hunt", date:"20 September 2026", sheet:"Treasure Hunt", rules:["Event guidelines are awaiting committee confirmation. Register your interest; the coordinator will share the details."]},
    rangoli: {title:"Rangoli Competition", date:"20 September 2026", sheet:"Rangoli", rules:["Venue: Clubhouse. Start time: to be announced. Duration: 1.5 hours. Theme: Ganpati Bappa Morya.", "Create the entire design at the venue within the allotted time. Bring all materials.", "Judging: concept and theme, originality and design, colour harmony, finishing and overall presentation. One winner.", judging]},
    thali: {title:"Pooja Thali Decoration", date:"20 September 2026", sheet:"Pooja Thali", rules:["Theme: Eco-Friendly Green. Use natural, biodegradable materials available at home; reuse creatively. Avoid plastic, thermocol and non-biodegradable materials.", "Decorate at home and bring the completed thali to the Pandal at 6:00 PM, ready for display.", "Three prizes: first, second and third.",judging]},
    funfair: {title:"Fun n Fair", date:"20 September 2026", sheet:"Fun n Fair", rules:["₹500 per entry/table. No refund. This form records a table request; pay Neeraj Upadhyay using UPI ID neeraj18upadhyay1@ybl or the supplied QR. Submission is not proof of payment."]},
    fancy: {title:"Fancy Dress", date:"22 September 2026", sheet:"Fancy Dress", rules:["Maximum performance: 1 minute. Share your child’s costume/character in advance for the introduction.", "Report 10 minutes before the event. Sequence by draw; no changes. Parents must ensure children are ready when called.", "Nominations close at the end of 17 September 2026 (IST). No entries after the deadline.",gift]},
    cooking: {title:"No Stove Cooking", date:"23 September 2026", sheet:"No Stove Cooking", rules:["Adults aged 18+ only. One participant per team. Participation gift for all; gifts worth ₹10,000 in total, sponsored by Artisanal Sweets.", "Purely vegetarian dishes. No stove, fire, preservatives or food colours. Bring all ingredients, equipment and water; only a working table is provided.", "Do not bring cut, chopped or grated raw materials. Prepare them on the spot. Non-electric mixers, choppers, juicers and graters are allowed.", "Use hygienic ingredients approved in advance. Judging: taste, presentation, originality, creativity and hygiene. Give your dish a creative name.", "Maintain respect and good sportsmanship. The final cooking duration and ingredient approval process will be confirmed by the committee."]},
    pooja: {title:"Satyanarayan Pooja", date:"24 September 2026", sheet:"Satyanarayan Pooja", rules:["Register your household for Satyanarayan Pooja. Further arrangements will be shared by the coordinator."]},
    prasad: {title:"Mahaprasad Count", date:"24 September 2026 · 7–10 PM", sheet:"Mahaprasad", rules:["Enter the number of adults and children attending from your household. Submit once per household so the catering count stays accurate."]}
  };
  // Exclusive cutoffs: entries remain open through the stated final day in India.
  function deadline(event) {
    return event === "fancy" ? "2026-09-18T00:00:00+05:30"
      : event === "bollywood" ? "2026-09-19T00:00:00+05:30"
      : "2026-09-20T00:00:00+05:30";
  }
  function registrationStatus(event, now=Date.now()) {
    const closed=["drawing","talent"].includes(event) || now>=Date.parse(deadline(event));
    const day=event==="fancy"?"17":event==="bollywood"?"18":"19";
    return {closed, label:closed?"Nominations closed":"Last day: "+day+" September 2026 · 11:59 PM IST"};
  }
  const text = value => String(value ?? "").trim();
  const phone = value => text(value).replace(/[\s()+-]/g, "").replace(/^(?:0091|91)(?=\d{10}$)/, "");
  const identity = d => [d.firstName,d.lastName,d.wing,d.flatNo].map(v=>text(v).toLowerCase().replace(/\s+/g," ")).join("|");
  const integer = (v,min,max) => /^\d+$/.test(text(v)) && Number(v)>=min && Number(v)<=max;
  function validate(d, config={}) {
    if (!events[d.event]) return "Choose a valid event.";
    if (!/^[a-f0-9-]{36}$/i.test(text(d.requestId))) return "Invalid registration reference. Reopen the form.";
    for (const key of (d.event === "prasad" ? [] : d.event === "blood" ? ["firstName"] : ["firstName","lastName"])) if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{0,79}$/u.test(text(d[key]))) return "Enter a valid first and last name.";
    if (!/^[A-F]$/.test(d.wing) || !/^(?:[1-9]|1[0-3])0[1-4]$/.test(d.flatNo)) return "Select a valid wing and flat number.";
    if (d.event !== "prasad" && !/^[6-9]\d{9}$/.test(phone(d.phone))) return "Enter a valid Indian mobile number.";
    if (d.event === "blood" && typeof d.donatedBefore !== "boolean") return "Confirm whether you have donated blood before.";
    if (d.agreed !== true) return "Please read and accept the event details.";
    if (JSON.stringify(d).length>18000) return "Entry is too long.";
    if (["drawing","talent","treasure","fancy"].includes(d.event) && !integer(d.age,1,120)) return "Enter the participant’s age in completed years.";
    if (d.event === "drawing") {
      if (![16,18].includes(Number(config.drawingMaxAge))) return "Drawing registration awaits confirmation of the oldest age group.";
      if (!integer(d.age,3,Number(config.drawingMaxAge))) return "Age is outside the drawing competition groups.";
    }
    if (d.event === "fancy" && !integer(d.age,1,17)) return "Fancy Dress is for children under 18.";
    if (d.event === "bollywood") {
      if (!Array.isArray(d.players) || d.players.length<5 || d.players.length>6) return "Provide 5–6 players.";
      const first=d.players[0];
      if(text(first.firstName)!==text(d.firstName)||text(first.lastName)!==text(d.lastName)||phone(first.phone)!==phone(d.phone)) return "Player 1 must match the wing contact details.";
      const names = new Set();
      for (const p of d.players) {
        if (![p.firstName,p.lastName].every(n=>/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{0,79}$/u.test(text(n))) || !/^[6-9]\d{9}$/.test(phone(p.phone))) return "Enter each player’s first name, last name and valid phone.";
        const key = (text(p.firstName)+" "+text(p.lastName)).toLowerCase();
        if (names.has(key)) return "Each Bollywood player must be listed only once.";
        names.add(key);
      }
    }
    const required = {talent:["performanceType","actType","performanceTitle"],treasure:["teamName"],funfair:["stallName","stallDetails"],fancy:["costume"]}[d.event] || [];
    for (const key of required) if (!text(d[key]) || text(d[key]).length>1000) return "Complete all event details (maximum 1,000 characters each).";
    if (d.event === "talent") {
      if (!["Solo","Group"].includes(d.performanceType)) return "Choose solo or group.";
      if (!integer(d.durationSeconds,1,d.performanceType==="Solo"?120:240)) return "Solo must be at most 120 seconds; group at most 240 seconds.";
      if (d.performanceType==="Group" && (!text(d.groupName) || text(d.groupName).length>100)) return "Enter your group name (up to 100 characters).";
    }
    if (d.event === "prasad" && (!integer(d.adults,0,100) || !integer(d.children,0,100) || Number(d.adults)+Number(d.children)<1)) return "Enter valid adult and child counts, with at least one attendee.";
    return "";
  }
  const collectionUrl = "https://script.google.com/macros/s/AKfycbyYbNoSxhBIT2sSVfMSFY06YXAWGN99E_HunGAA2UMLA8vlJMn-_qdGCiQ1a8s6PsW3/exec?action=payments";
  function culturalFundStatus(payload, wing, flat) {
    if(payload?.status!=="success" || !Array.isArray(payload.payments)) return {paid:false,message:"We could not verify the cultural fund payment right now. Please try again shortly."};
    const rows=payload.payments.filter(row=>text(row.wing).toUpperCase()===wing && text(row.flat)===flat);
    if(rows.length!==1)return {paid:false,message:"We could not confirm your household’s payment record. Please contact the cultural committee or try again after the collection sheet is updated."};
    if(text(rows[0].paid).toLowerCase()!=="yes")return {paid:false,message:"Please pay the cultural fund first to register your Fun n Fair stall. Thank you for supporting our festival! If you have already paid, please ask the committee to update the collection sheet, then try again."};
    return {paid:true,message:"Cultural fund payment verified. You can now complete your stall registration. The separate ₹500 table fee still applies."};
  }
  return {events,deadline,registrationStatus,gift,text,phone,identity,validate,collectionUrl,culturalFundStatus};
})();
if (typeof module !== "undefined") module.exports = FestivalRegistration;
