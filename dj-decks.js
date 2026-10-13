// Two browser audio decks: keep the outgoing track until the incoming deck is ready.
class SaiVistaDJ {
  constructor(options) {
    this.options=options; this.active=null; this.outgoing=null; this.pending=null;
    this.stageSerial=0;this.cache=new Map(); this.serial=0; this.volume=.8; this.muted=false; this.fadeSeconds=3;
  }
  release(deck) {
    if(!deck)return;
    deck.audio.onplaying=deck.audio.onwaiting=deck.audio.onstalled=deck.audio.onseeking=deck.audio.onseeked=deck.audio.ondurationchange=null;
    deck.audio.onplay=deck.audio.onpause=deck.audio.onended=deck.audio.ontimeupdate=deck.audio.onerror=deck.audio.onloadedmetadata=null;
    deck.connection?.disconnect(); deck.audio.pause(); deck.audio.removeAttribute('src'); deck.audio.load();
    URL.revokeObjectURL(deck.url); deck.audio.remove();
  }
  settle() {
    clearInterval(this.timer); this.timer=null; this.fadeStartedPaused=false;
    this.release(this.outgoing); this.outgoing=null;
    if(this.active) {this.active.mix=1;this.applyVolume();}
  }
  applyVolume() {
    for(const deck of [this.active,this.outgoing])if(deck){deck.audio.volume=Math.min(1,this.volume*deck.mix);deck.audio.muted=this.muted;}
  }
  data(song,group) {
    const key=group+':'+song.id;
    if(!this.cache.has(key)) {
      const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),120000);
      const entry={controller,promise:null};
      entry.promise=this.options.fetchBlob(song,group,controller.signal).then(blob=>{entry.ready=true;return blob;}).finally(()=>clearTimeout(timeout));
      entry.promise.catch(()=>{if(this.cache.get(key)===entry)this.cache.delete(key);});
      this.cache.set(key,entry);
      // Eviction must not cancel a download already awaited by Deck B or analysis.
      while(this.cache.size>2){const old=this.cache.keys().next().value;this.cache.delete(old);}
    }
    return this.cache.get(key).promise;
  }
  preload(song,group) {
    if(!song||song.size>50000000)return;const key=group+':'+song.id;
    if(this.prepared?.key===key)return;
    this.discardPrepared();const entry={key,deck:null};this.prepared=entry;
    entry.promise=this.data(song,group).then(data=>{
      if(this.prepared!==entry)return null;
      const audio=this.options.makeAudio(),url=URL.createObjectURL(data);
      const deck={audio,url,mix:0,song,group};entry.deck=deck;
      audio.preload='auto';audio.src=url;audio.volume=0;audio.muted=this.muted;audio.load();return deck;
    }).catch(()=>{if(this.prepared===entry)this.prepared=null;return null;});
  }
  discardPrepared(){const old=this.prepared;this.prepared=null;if(old?.deck)this.release(old.deck);}
  async switch(song,group) {
    this.manual=false;const token=++this.serial; this.settle();
    this.release(this.pending); this.pending=null;
    let candidate;
    try {
      const entry=this.prepared?.key===group+':'+song.id?this.prepared:null;
      candidate=entry?await entry.promise:null;
      if(token!==this.serial)return false;
      if(candidate)this.prepared=null;
      else{const data=await this.data(song,group);if(token!==this.serial)return false;const audio=this.options.makeAudio(),url=URL.createObjectURL(data);candidate={audio,url,mix:0,song,group};}
      const {audio,url}=candidate;this.pending=candidate;
      audio.preload='auto';if(audio.src!==url)audio.src=url;audio.volume=0;audio.muted=this.muted;
      audio.playbackRate=this.options.rate();
      candidate.connection=await this.options.connect(audio);
      await this.options.beforePlay?.(candidate,this.active);
      await audio.play(); // Resolution confirms the incoming deck has started.
      if(token!==this.serial){this.release(candidate);return false;}
      this.pending=null;
      const old=this.active;
      this.active=candidate;
      if(old && !old.audio.paused && this.fadeSeconds>0) {
        this.outgoing=old;
        old.audio.onplaying=old.audio.onwaiting=old.audio.onstalled=old.audio.onseeking=old.audio.onseeked=old.audio.ondurationchange=null;
        old.audio.onplay=old.audio.onpause=old.audio.onended=old.audio.ontimeupdate=old.audio.onerror=old.audio.onloadedmetadata=null;
        const start=Date.now(),duration=this.fadeSeconds*1000;
        this.timer=setInterval(()=>{
          // Freeze the fade when the listener pauses.
          if(this.active.audio.paused){this.fadeStartedPaused=true;return;}
          if(this.fadeStartedPaused){this.settle();return;}
          const fraction=Math.min(1,(Date.now()-start)/duration);
          this.active.mix=Math.sin(fraction*Math.PI/2);this.outgoing.mix=Math.cos(fraction*Math.PI/2);this.applyVolume();
          if(fraction===1)this.settle();
        },40);
      } else {this.release(old);this.active.mix=1;this.applyVolume();}
      this.options.commit(audio,song);
      return true;
    } catch(error) {
      if(candidate && candidate!==this.active)this.release(candidate);
      if(token===this.serial){this.pending=null;this.options.error(error);}
      return false;
    }
  }
  async stage(song,group) {
    const token=++this.stageSerial;
    const data=await this.data(song,group);if(token!==this.stageSerial)return null;
    const audio=this.options.makeAudio(),url=URL.createObjectURL(data),deck={audio,url,mix:0,song,group};
    audio.src=url;audio.preload='auto';audio.volume=0;audio.muted=this.muted;audio.playbackRate=this.options.rate();
    try{deck.connection=await this.options.connect(audio);if(token!==this.stageSerial){this.release(deck);return null;}const old=this.staged;this.staged=deck;this.release(old);return deck;}catch(e){this.release(deck);throw e;}
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
  pause() {this.settle();this.active?.audio.pause();}
  cancelSwitch() {this.discardPrepared();this.serial++;this.settle();this.release(this.pending);this.pending=null;for(const entry of this.cache.values())entry.controller.abort();this.cache.clear();}
  stop() {
    this.discardPrepared();
    this.stageSerial++;this.release(this.staged);this.staged=null;this.manual=false;
    this.serial++;this.settle();this.release(this.pending);this.pending=null;
    this.release(this.active);this.active=null;
    for(const entry of this.cache.values())entry.controller.abort();this.cache.clear();
  }
}
SaiVistaDJ.math={
 normalize:rms=>Math.min(2,Math.max(.25,.12/rms)),
 sync:(a,b)=>{if(!(a.bpm>0&&b.bpm>0))throw Error('BPM required');const rate=a.bpm*a.rate/b.bpm;if(rate<.5||rate>2)throw Error('Tempo difference too large');const ba=60/a.bpm,bb=60/b.bpm,phase=((a.time-(a.offset||0))%ba+ba)%ba/ba,beat=Math.round((b.time-(b.offset||0))/bb-phase);return{rate,time:Math.max(0,(b.offset||0)+(beat+phase)*bb)};},
 loop:(time,bpm,offset,beats,duration)=>{const beat=60/bpm,start=Math.max(0,offset+Math.floor((time-offset)/beat)*beat),end=start+beats*beat;return end<=duration?{start,end}:null;}
};
if(typeof window!=='undefined')window.SaiVistaDJ=SaiVistaDJ;
if(typeof module!=='undefined')module.exports=SaiVistaDJ;



