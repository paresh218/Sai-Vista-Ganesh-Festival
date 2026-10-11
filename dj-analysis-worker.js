// Analysis runs in a worker; no audio playback or network work happens here.
function analyseSamples(samples,rate=1000){
 const bins=240,peaks=Array(bins).fill(0);let energy=0;
 for(let i=0;i<samples.length;i++){const x=samples[i];energy+=x*x;const b=Math.min(bins-1,Math.floor(i*bins/samples.length));peaks[b]=Math.max(peaks[b],Math.abs(x));}
 const hop=Math.max(1,Math.round(rate*.01)),env=[];let last=0;
 for(let i=0;i<samples.length;i+=hop){let e=0;for(let j=i;j<Math.min(i+hop,samples.length);j++)e+=samples[j]*samples[j];e=Math.sqrt(e/hop);env.push(Math.max(0,e-last));last=e;}
 let best=0,lagBest=0;for(let lag=33;lag<=100;lag++){let score=0;for(let i=lag;i<env.length;i++)score+=env[i]*env[i-lag];if(score>best){best=score;lagBest=lag;}}
 let sum=0;for(const e of env)sum+=e*e;const confidence=sum?best/sum:0;let offset=0,phaseScore=-1;
 if(lagBest)for(let phase=0;phase<lagBest;phase++){let score=0;for(let i=phase;i<env.length;i+=lagBest)score+=env[i];if(score>phaseScore){phaseScore=score;offset=phase*.01;}}
 return{peaks,rms:Math.sqrt(energy/Math.max(1,samples.length)),bpm:confidence>.12?Math.round(6000/lagBest*10)/10:null,offset,confidence,duration:samples.length/rate};
}
if(typeof module!=='undefined')module.exports=analyseSamples;
if(typeof self!=='undefined')self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:analyseSamples(e.data.samples,e.data.rate)})}catch(error){self.postMessage({id:e.data.id,error:error.message})}};
