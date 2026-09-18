const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('./event-registration-model.js');
const source=fs.readFileSync('event-registration.js','utf8');
const refresh=source.slice(source.indexOf('    function refreshCards()'),source.indexOf('    for(const [id,event]'));
function check(instant, expected){
 const now=Date.parse(instant),M={...model,registrationStatus:id=>model.registrationStatus(id,now)};
 const cards=Object.keys(M.events).map(id=>({id,card:{},button:{},note:{},badge:{}}));
 const links=[...Object.keys(M.events),'all'].map(id=>({dataset:{registrationLink:id}}));
 const shortcut={dataset:{registerEvent:'blood'}};
 const context={M,cards,programmeCards:[],FestivalExperience:{badge:()=>({label:'',tone:'',rank:0})},EventUX:{metadata:Object.fromEntries(cards.map(c=>[c.id,{days:[20]}]))},cardOrder:'',grid:{append(){}},filterCards(){},document:{querySelectorAll:selector=>selector==='[data-register-event]'?[shortcut]:links},current:'bollywood',dialog:{open:true},pending:false,ready:true,submit:{},form:{hidden:false},status:{}};
 vm.createContext(context);vm.runInContext(refresh+'\nrefreshCards();',context);
 for(const card of cards){assert.equal(card.button.hidden,expected.includes(card.id),instant+' '+card.id);assert.equal(links.find(l=>l.dataset.registrationLink===card.id).hidden,card.button.hidden);}
 assert.equal(shortcut.hidden,expected.includes('blood'));
 assert.equal(links.at(-1).hidden,expected.length===cards.length);
 assert.equal(context.form.hidden,expected.includes('bollywood'));
}
check('2026-09-17T23:59:59+05:30',['drawing','talent']);
check('2026-09-18T00:00:00+05:30',['drawing','talent','fancy']);
check('2026-09-19T00:00:00+05:30',['drawing','talent','fancy','bollywood']);
check('2026-09-20T00:00:00+05:30',Object.keys(model.events));
console.log('PASS: form buttons, schedule links, general registration link and open form visibility across all IST deadline boundaries.');
