const assert=require('node:assert/strict'),state=require('./song-mini.js');const deck=(name,paused=false)=>({song:{name},audio:{src:'blob:test',paused,ended:false}});
assert.deepEqual(state({}, {active:true,track:{title:'Online Garba'},player:{getPlayerState:()=>1}}),{title:'Online Garba',playing:true,status:'Playing'});
assert.equal(state({active:deck('Old song')},{active:true,track:{title:'Online Garba'},player:{getPlayerState:()=>2}}).title,'Online Garba');
assert.equal(state({}, {active:true,player:{getPlayerState:()=>3}}).status,'Loading');
// Closing the dialog must expose a working mini-player, including before playback starts.
const vm=require('node:vm'),fs=require('node:fs');
class El{constructor(){this.children=[];this.classList={toggle(){}};}append(...els){this.children.push(...els);}setAttribute(){}addEventListener(type,fn){this[type]=fn;}showModal(){this.open=true;}}
const styles={};El.prototype.getBoundingClientRect=()=>({top:700});
const body=new El(),dialog=new El(),garba={active:true,track:{title:'Garba'},player:{getPlayerState:()=>1},toggle(){this.toggled=true;},stop(){this.active=false;}},stop={click(){}};
body.style={setProperty:(name,value)=>styles[name]=value};dialog.open=true;const context={window:{innerHeight:800,SaiVistaStudioBridge:{dj:{}},SaiVistaGarba:garba,dispatchEvent(){}},Event,document:{body,createElement:()=>new El(),querySelector:()=>dialog,getElementById:()=>stop,addEventListener(){}},setInterval(){}};
vm.runInNewContext(fs.readFileSync('song-mini.js','utf8'),context);
const bar=body.children[0];assert.equal(bar.hidden,true);dialog.open=false;dialog.close();assert.equal(bar.hidden,false,'Minimised Garba player must be visible');assert.equal(styles['--song-mini-clearance'],'112px','Update notice must clear the measured mini-player');
bar.children[1].onclick();assert.equal(garba.toggled,true);garba.active=false;dialog.close();assert.equal(bar.hidden,false,'Minimising before playback must retain Open player');assert.equal(bar.children[1].disabled,true);bar.children[2].onclick();assert.equal(dialog.open,true);assert.equal(bar.hidden,true);
assert.equal(state({}),null);assert.deepEqual(state({active:deck('Garba')}),{title:'Garba',playing:true,status:'Playing'});assert.equal(state({active:deck('Garba',true)}).status,'Paused');assert.equal(state({active:deck('B'),outgoing:deck('A')}).title,'B + A');assert.equal(state({active:deck('B'),outgoing:deck('A')}).status,'Mixing');assert.equal(state({active:deck('B'),muted:true}).status,'Playing · muted');assert.equal(state({active:deck('B',true),outgoing:deck('A')}).title,'A');console.log('PASS: mini-player stopped, playing, paused, mixed, muted and outgoing-deck states');
