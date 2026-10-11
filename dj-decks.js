// Two browser audio decks: keep the outgoing track until the incoming deck is ready.
class SaiVistaDJ {
  constructor(options) {
    this.options=options; this.active=null; this.outgoing=null; this.pending=null;
    this.cache=new Map(); this.serial=0; this.volume=.8; this.muted=false; this.fadeSeconds=3;
  }
  release(deck) {
    if(!deck)return;
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
      entry.promise=this.options.fetchBlob(song,group,controller.signal).finally(()=>clearTimeout(timeout));
      entry.promise.catch(()=>{if(this.cache.get(key)===entry)this.cache.delete(key);});
      this.cache.set(key,entry);
      while(this.cache.size>2){const old=this.cache.keys().next().value;const oldEntry=this.cache.get(old);oldEntry.controller.abort();this.cache.delete(old);}
    }
    return this.cache.get(key).promise;
  }
  preload(song,group) { if(song && song.size<=25000000)this.data(song,group).catch(()=>{}); }
  async switch(song,group) {
    const token=++this.serial; this.settle();
    this.release(this.pending); this.pending=null;
    let candidate;
    try {
      const data=await this.data(song,group);
      if(token!==this.serial)return false;
      const audio=this.options.makeAudio(),url=URL.createObjectURL(data);
      candidate={audio,url,mix:0};this.pending=candidate;
      audio.preload='auto';audio.src=url;audio.volume=0;audio.muted=this.muted;
      audio.playbackRate=this.options.rate();
      candidate.connection=await this.options.connect(audio);
      await audio.play(); // Resolution confirms the incoming deck has started.
      if(token!==this.serial){this.release(candidate);return false;}
      this.pending=null;
      const old=this.active;
      this.active=candidate;
      if(old && !old.audio.paused && this.fadeSeconds>0) {
        this.outgoing=old;
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
  pause() {this.settle();this.active?.audio.pause();}
  cancelSwitch() {this.serial++;this.settle();this.release(this.pending);this.pending=null;for(const entry of this.cache.values())entry.controller.abort();this.cache.clear();}
  stop() {
    this.serial++;this.settle();this.release(this.pending);this.pending=null;
    this.release(this.active);this.active=null;
    for(const entry of this.cache.values())entry.controller.abort();this.cache.clear();
  }
}
if(typeof window!=='undefined')window.SaiVistaDJ=SaiVistaDJ;
if(typeof module!=='undefined')module.exports=SaiVistaDJ;



