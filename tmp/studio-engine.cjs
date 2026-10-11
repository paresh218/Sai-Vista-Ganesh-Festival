const fs=require('fs');let p=fs.readFileSync('dj-decks.js','utf8');p=p.replace('candidate={audio,url,mix:0};','candidate={audio,url,mix:0,song,group};');
p=p.replace('  pause() {',`  async stage(song,group) {
    const token=++this.stageSerial;this.release(this.staged);this.staged=null;
    const data=await this.data(song,group);if(token!==this.stageSerial)return null;
    const audio=this.options.makeAudio(),url=URL.createObjectURL(data),deck={audio,url,mix:0,song,group};
    audio.src=url;audio.preload='auto';audio.volume=0;audio.muted=this.muted;audio.playbackRate=this.options.rate();
    try{deck.connection=await this.options.connect(audio);if(token!==this.stageSerial){this.release(deck);return null;}this.staged=deck;return deck;}catch(e){this.release(deck);throw e;}
  }
  async startManual() {
    if(!this.staged)return false;this.settle();const incoming=this.staged;
    await incoming.audio.play();if(this.staged!==incoming)return false;
    this.staged=null;this.outgoing=this.active;this.active=incoming;this.manual=true;
    if(this.outgoing)this.outgoing.audio.onended=this.outgoing.audio.ontimeupdate=null;
    this.manualMix(this.outgoing?0:1);this.options.commit(incoming.audio,incoming.song);return true;
  }
  manualMix(value) {
    clearInterval(this.timer);this.timer=null;const x=Math.max(0,Math.min(1,value));
    if(this.active)this.active.mix=this.outgoing?Math.sin(x*Math.PI/2):1;
    if(this.outgoing)this.outgoing.mix=Math.cos(x*Math.PI/2);this.applyVolume();
  }
  finishManual(){this.manual=false;this.settle();}
  pause() {`);
p=p.replace('this.cache=new Map();', 'this.stageSerial=0;this.cache=new Map();');p=p.replace('    this.serial++;this.settle();this.release(this.pending);this.pending=null;\n    this.release(this.active);', '    this.stageSerial++;this.release(this.staged);this.staged=null;this.manual=false;\n    this.serial++;this.settle();this.release(this.pending);this.pending=null;\n    this.release(this.active);');fs.writeFileSync('dj-decks.js',p);
p=fs.readFileSync('navratri-songs.js','utf8');p=p.replace(' const sources=new WeakMap();',' const normalizers=new WeakMap(); const sources=new WeakMap();');p=p.replace('source.connect(bands[0]);sources.set(element,source);', 'const normalizer=ctx.createGain();source.connect(normalizer);normalizer.connect(bands[0]);normalizers.set(element,normalizer);sources.set(element,{disconnect(){source.disconnect();normalizer.disconnect();}});');p=p.replace('limiter.connect(ctx.destination);eq();','limiter.connect(ctx.destination);window.SaiVistaStudioOutput=limiter;window.SaiVistaStudioGain=gain;eq();');
p=p.replace('function prepare(){queued=', 'function prepare(){if(dj.manual)return;queued=');p=p.replace('!audio.saiVistaLoop && !loading', '!dj.manual && !audio.saiVistaLoop && !loading');p=p.replace("else if(!loading && queued>=0)","else if(!dj.manual && !loading && queued>=0)");
p=p.replace("$('songSpeed').onchange=()=>{audio.playbackRate=Number($('songSpeed').value);};", "$('songSpeed').onchange=()=>{audio.playbackRate=Number($('songSpeed').value);};");
p=p.replace(" $('songCalculateTime').onclick=",` window.SaiVistaStudioBridge={get dj(){return dj;},get songs(){return songs;},get group(){return selected();},get audio(){return audio;},get ctx(){return ctx;},get bands(){return bands;},normalizers,sound,load,prepare};
 $('songCalculateTime').onclick=`);
fs.writeFileSync('navratri-songs.js',p);
