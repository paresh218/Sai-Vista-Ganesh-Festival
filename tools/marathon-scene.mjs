import * as THREE from 'three';

// Original stylised illustrations, with broad appearance cues from the supplied community reference photos.
export function buildMarathonScene(){
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
  const materials=[],geometries=[],textures=[];
  const material=(color,metalness=0,roughness=.6)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness});materials.push(m);return m;};
  const navy=material('#142c55'),blue=material('#2361a0'),orange=material('#ff741c'),white=material('#fff9ee'),gold=material('#eab84a',.65,.28),dark=material('#263a50');
  let jerseyLabel;
  if(typeof document!=='undefined'){
    const label=document.createElement('canvas');label.width=512;label.height=160;
    const ctx=label.getContext('2d');
    if(ctx){ctx.fillStyle='#142c55';ctx.textAlign='center';ctx.font='bold 68px Arial';ctx.fillText('SAI VISTA',256,66);ctx.font='bold 40px Arial';ctx.fillText('MARATHON',256,120);const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);jerseyLabel=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.push(jerseyLabel);}
  }
  function mesh(parent,geometry,mat,x=0,y=0,z=0){geometries.push(geometry);const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;}
  function ball(parent,mat,x,y,z,sx,sy=sx,sz=sx){const m=mesh(parent,new THREE.SphereGeometry(1,16,10),mat,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function tube(parent,points,radius,mat){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,6,false),mat);}
  function plate(parent,points,depth,mat,z=0){const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:2,steps:1}),mat,0,0,z);}
  scene.add(new THREE.HemisphereLight('#fff6df','#9b7861',2.5));
  const light=new THREE.DirectionalLight('#fff1d5',3.5);light.position.set(-3,6,7);scene.add(light);
  const rim=new THREE.DirectionalLight('#c6dcf2',1.7);rim.position.set(3,3,-5);scene.add(rim);

  const medal=new THREE.Group();medal.name='finisher-medal';world.add(medal);medal.position.set(2.03,1.7,.3);medal.rotation.set(.12,-.2,.08);medal.scale.setScalar(.48);
  plate(medal,[[-.53,1.12],[-.25,1.18],[.16,.18],[-.08,.05]],.045,orange,-.06);
  plate(medal,[[.22,1.18],[.52,1.12],[.1,.05],[-.12,.18]],.045,blue,-.03);
  const disk=mesh(medal,new THREE.CylinderGeometry(.49,.49,.12,40),gold,0,-.15,0);disk.rotation.x=Math.PI/2;
  mesh(medal,new THREE.TorusGeometry(.42,.025,6,40),gold,0,-.15,.08);
  const emblem=new THREE.Shape();emblem.moveTo(-.2,-.1);emblem.lineTo(-.04,-.3);emblem.lineTo(.28,.14);emblem.lineTo(.16,.21);emblem.lineTo(-.04,-.08);emblem.lineTo(-.11,.02);emblem.closePath();
  mesh(medal,new THREE.ExtrudeGeometry(emblem,{depth:.018,bevelEnabled:false}),navy,0,-.12,.08);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(medal,gold,Math.cos(a)*.35,-.15+Math.sin(a)*.35,.09,.013);}

  const runners=[];
  function runner({x,z,scale,skin,hair,phase,glasses=false,beard=false,pony=false,longHair=false}){
    const root=new THREE.Group();root.name='community-runner';root.userData.appearance={glasses,beard,pony,longHair};root.position.set(x,0,z);root.scale.setScalar(scale);root.rotation.y=-.22;world.add(root);
    const skinMat=material(skin),hairMat=material(hair),body=new THREE.Group();root.add(body);body.rotation.x=.12;
    const jersey=ball(body,white,0,.68,0,.245,.405,.155);jersey.name='sai-vista-marathon-jersey';
    ball(body,blue,-.198,.59,-.005,.052,.25,.135);ball(body,blue,.198,.59,-.005,.052,.25,.135);
    ball(body,navy,0,.29,0,.235,.15,.155);
    if(jerseyLabel)mesh(body,new THREE.PlaneGeometry(.34,.11),jerseyLabel,0,.63,.162);
    tube(body,[[-.1,.86,.14],[-.02,.76,.17],[.12,.94,.12]],.027,orange);
    tube(body,[[-.13,.86,.13],[-.04,.74,.17]],.027,blue);
    const raceBib=mesh(body,new THREE.PlaneGeometry(.24,.15),white,0,.41,.161);raceBib.name='race-bib';
    // Race numbers identify the illustration only; they are not issued registration BIBs.
    for(let i=0;i<3;i++)mesh(body,new THREE.BoxGeometry(.025,.055,.004),navy,-.06+i*.06,.41,.169);
    const head=new THREE.Group();head.position.set(0,1.25,0);body.add(head);
    mesh(body,new THREE.CapsuleGeometry(.075,.12,3,10),skinMat,0,1.075,0);
    ball(head,skinMat,0,0,0,.174,.218,.165);
    const crown=mesh(head,new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.46),hairMat,0,.018,-.013);crown.scale.set(.18,.21,.168);
    ball(head,skinMat,-.172,0,0,.034,.052,.025);ball(head,skinMat,.172,0,0,.034,.052,.025);
    ball(head,skinMat,0,-.015,.163,.028,.04,.032);
    for(const side of [-1,1]){
      ball(head,dark,side*.065,.033,.157,.013,.018,.007);ball(head,white,side*.062,.04,.164,.0035,.004,.002);
      tube(head,[[side*.1,.08,.145],[side*.065,.087,.16],[side*.035,.08,.153]],.008,hairMat);
    }
    if(pony){ball(head,hairMat,.02,.1,-.21,.095,.095,.13);ball(head,hairMat,.03,-.03,-.25,.07,.17,.07);}
    if(longHair){ball(head,hairMat,0,-.1,-.12,.19,.32,.1);ball(head,hairMat,-.155,-.03,.01,.045,.2,.08);}
    if(beard){const beardMat=material('#49352d');const jaw=mesh(head,new THREE.SphereGeometry(1,18,10,0,Math.PI*2,Math.PI/2,Math.PI/2),beardMat,0,-.04,.008);jaw.scale.set(.167,.145,.163);}
    tube(head,[[-.055,-.09,.165],[0,-.108,.174],[.055,-.09,.165]],.009,beard?white:dark);
    if(glasses){const frame=mesh(head,new THREE.TorusGeometry(.043,.0055,5,16),dark,-.064,.035,.175);frame.scale.y=.8;const other=frame.clone();other.position.x=.064;head.add(other);tube(head,[[-.021,.035,.18],[.021,.035,.18]],.005,dark);}
    const arms=[],legs=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.255,.88,0);body.add(arm);arms.push(arm);
      const sleeve=mesh(arm,new THREE.CapsuleGeometry(.09,.11,4,10),white,0,-.07,0);sleeve.rotation.z=side*.1;
      mesh(arm,new THREE.CapsuleGeometry(.058,.24,4,10),skinMat,0,-.235,0);
      const elbow=new THREE.Group();elbow.position.y=-.4;elbow.rotation.x=-1.25;arm.add(elbow);
      mesh(elbow,new THREE.CapsuleGeometry(.05,.25,4,10),skinMat,0,-.14,0);ball(elbow,skinMat,0,-.32,0,.057,.075,.052);
      if(glasses&&side===-1)mesh(elbow,new THREE.CylinderGeometry(.057,.057,.035,12),navy,0,-.26,0);
      const leg=new THREE.Group();leg.position.set(side*.12,.23,0);root.add(leg);legs.push(leg);
      mesh(leg,new THREE.CapsuleGeometry(.09,.16,4,10),navy,0,-.09,0);
      mesh(leg,new THREE.CapsuleGeometry(.066,.29,4,10),skinMat,0,-.29,0);
      const knee=new THREE.Group();knee.position.y=-.5;leg.add(knee);leg.userData.knee=knee;
      mesh(knee,new THREE.CapsuleGeometry(.052,.3,4,10),skinMat,0,-.16,0);
      mesh(knee,new THREE.CylinderGeometry(.053,.05,.12,10),white,0,-.34,0);
      const foot=new THREE.Group();foot.position.set(0,-.43,.07);knee.add(foot);leg.userData.foot=foot;
      ball(foot,white,0,0,.035,.088,.068,.17);ball(foot,orange,0,-.045,.035,.09,.022,.172);
      tube(foot,[[-.055,.03,.065],[0,.06,.08],[.055,.03,.065]],.009,blue);
    }
    const shadowMaterial=new THREE.MeshBasicMaterial({color:'#613c22',transparent:true,opacity:.12,depthWrite:false});materials.push(shadowMaterial);
    const shadow=mesh(world,new THREE.CircleGeometry(.37,24),shadowMaterial,x,-.775,z);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;
    runners.push({root,body,head,arms,legs,phase,shadow,baseZ:z});
  }
  runner({x:-1.65,z:-.65,scale:1.02,skin:'#b77d55',hair:'#25232b',phase:0,pony:true});
  runner({x:-.52,z:-.03,scale:1.08,skin:'#b7835b',hair:'#24242a',phase:1.4,glasses:true,beard:true});
  runner({x:.62,z:-.45,scale:1.01,skin:'#c38f64',hair:'#2c252a',phase:2.8,longHair:true});
  runner({x:1.68,z:-1.05,scale:1.05,skin:'#ad7954',hair:'#25242a',phase:4.2,beard:true});

  // A single grounded track replaces the floating product podiums.
  const sand=material('#d6c7a8'),track=material('#72945d'),laneMaterial=material('#f4ead9'),archMaterial=material('#173860');
  const platform=mesh(world,new THREE.CylinderGeometry(3.45,3.5,.12,64),sand,0,-.88,-.4);platform.scale.z=1.25;
  const trackSurface=mesh(world,new THREE.BoxGeometry(4.9,.035,5.8),track,0,-.802,-.45);trackSurface.name='society-lawn';
  for(let i=0;i<18;i++)mesh(world,new THREE.BoxGeometry(.24,.012,.18),i%2?navy:white,-2.1+i*.24,-.77,-1.85);
  const arch=new THREE.Group();arch.name='sai-vista-start-arch';arch.position.set(-.25,-.78,-3.1);world.add(arch);
  mesh(arch,new THREE.CapsuleGeometry(.12,2.45,4,12),archMaterial,-2.45,1.32,0);mesh(arch,new THREE.CapsuleGeometry(.12,2.45,4,12),archMaterial,2.45,1.32,0);
  mesh(arch,new THREE.BoxGeometry(4.95,.55,.25),archMaterial,0,2.66,0);
  for(const side of [-1,1]){mesh(arch,new THREE.BoxGeometry(.26,.14,.28),orange,side*2.45,.3,0);mesh(arch,new THREE.BoxGeometry(.26,.14,.28),orange,side*2.45,.55,0);}
  if(typeof document!=='undefined'){
    const label=document.createElement('canvas');label.width=1024;label.height=128;const ctx=label.getContext('2d');
    if(ctx){ctx.fillStyle='#fff8ea';ctx.textAlign='center';ctx.font='bold 70px Arial';ctx.fillText('START · SAI VISTA',512,88);const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.push(mat);mesh(arch,new THREE.PlaneGeometry(4.3,.44),mat,0,2.66,.131);}
  }
  // Balcony towers and the planted lawn edge reference the supplied Sai Vista courtyard photograph.
  const society=new THREE.Group();society.name='sai-vista-society';world.add(society);
  const facade=material('#eee9df'),wall=material('#d7d0c2'),glass=material('#64746f',.15,.4),rail=material('#777e78'),leaf=material('#48704e'),trunk=material('#8c7251');
  const boxes=new THREE.BoxGeometry(1,1,1);geometries.push(boxes);
  const details=[];
  function detail(x,y,z,sx,sy,sz,mat){details.push({x,y,z,sx,sy,sz,mat});}
  function tower(x,z,width,height){
    const building=mesh(society,new THREE.BoxGeometry(width,height,.85),facade,x,-.8+height/2,z);building.name='balcony-tower';
    mesh(society,new THREE.BoxGeometry(width+.07,.1,.93),wall,x,height-.74,z);
    for(let floor=0;floor<13;floor++)for(let bay=0;bay<3;bay++){
      const xx=x-width*.34+bay*width*.34,yy=-.56+floor*(height-.25)/13;
      detail(xx,yy,z+.436,width*.2,.15,.025,glass);
      detail(xx,yy-.105,z+.49,width*.29,.035,.17,facade);
      detail(xx,yy-.048,z+.575,width*.28,.065,.012,rail);
      detail(xx-width*.145,yy-.048,z+.52,.012,.065,.13,rail);
    }
    for(const side of [-1,1])detail(x+side*width*.48,height/2-.8,z+.47,.045,height,.07,facade);
  }
  tower(-2.05,-4.6,1.65,4.1);tower(-.22,-5.1,1.65,4.1);tower(1.65,-5.7,1.55,3.95);
  for(const mat of [facade,glass,rail]){
    const parts=details.filter(p=>p.mat===mat),batch=new THREE.InstancedMesh(boxes,mat,parts.length),dummy=new THREE.Object3D();
    parts.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});society.add(batch);
  }
  mesh(society,new THREE.BoxGeometry(6.2,.7,.3),wall,-.1,-.48,-3.9);
  mesh(society,new THREE.BoxGeometry(6.2,.28,.04),glass,-.1,-.48,-3.72);
  for(let i=0;i<6;i++){
    const x=-2.75,z=-2.9+i*.9;
    mesh(world,new THREE.BoxGeometry(.42,.22,.55),wall,x,-.68,z);mesh(world,new THREE.CylinderGeometry(.025,.035,.55,6),trunk,x,-.35,z);
    ball(world,leaf,x,.03,z,.21,.27,.19);ball(world,leaf,x-.11,.03,z+.06,.15,.19,.15);
  }
  const lampMat=new THREE.MeshBasicMaterial({color:'#ffe5a2'});materials.push(lampMat);
  for(let i=0;i<6;i++)for(const side of [-1,1]){
    const x=side*2.56,z=-2.8+i*.9;mesh(world,new THREE.CylinderGeometry(.025,.035,.32,8),navy,x,-.6,z);mesh(world,new THREE.BoxGeometry(.09,.08,.09),lampMat,x,-.4,z);
  }
  const flags=[];
  for(const side of [-1,1]){
    const pole=new THREE.Group();pole.name='start-flag';pole.position.set(side*2.7,-.76,-1.7);world.add(pole);
    mesh(pole,new THREE.CylinderGeometry(.018,.025,2.1,8),navy,0,1.05,0);
    const fabric=mesh(pole,new THREE.PlaneGeometry(.5,.78,8,8),side<0?orange:blue,.27,1.62,0);fabric.material.side=THREE.DoubleSide;
    fabric.userData.original=Float32Array.from(fabric.geometry.attributes.position.array);flags.push(fabric);
  }
  function update(time,tilt=0){
    world.rotation.y=tilt*.04;
    medal.rotation.y=-.2+Math.sin(time*.65)*.2;medal.position.y=1.7+Math.sin(time*.9+.7)*.035;
    for(const r of runners){const t=time*6.5+r.phase;r.root.position.y=0+Math.abs(Math.sin(t))*.045;r.body.rotation.z=Math.sin(t)*.025;r.head.rotation.y=Math.sin(t*.5)*.025;
      r.legs.forEach((leg,i)=>{const swing=Math.sin(t+i*Math.PI);leg.rotation.x=-swing*.68;leg.userData.knee.rotation.x=.12+Math.max(0,-swing)*1.3;leg.userData.foot.rotation.x=-.12+Math.max(0,swing)*.15;});
      r.arms.forEach((arm,i)=>{arm.rotation.x=Math.sin(t+i*Math.PI)*.58;arm.rotation.z=(i?1:-1)*.11;});
      r.shadow.scale.set(1-Math.abs(Math.sin(t))*.15,.65,1);
    }
    flags.forEach((flag,i)=>{const p=flag.geometry.attributes.position,a=flag.userData.original;for(let j=0;j<p.count;j++)p.setZ(j,a[j*3+2]+Math.sin(time*2.8+a[j*3]*6+i)*.055*(a[j*3]+.26));p.needsUpdate=true;flag.geometry.computeVertexNormals();});
  }
  update(0);
  function dispose(){new Set(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.clear();}
  return {scene,world,medal,runners,update,dispose};
}

export function mountMarathonScene(host,{onFailure=()=>{},onReady=()=>{}}={}){
  let model,renderer,resize,frame=0,disposed=false,visible=false,paused=false,last=0,time=0,tilt=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),connection=navigator.connection;
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);frame=0;resize?.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',sync);document.removeEventListener('toggle',sync,true);dialogObserver.disconnect();motion.removeEventListener('change',preferences);connection?.removeEventListener?.('change',preferences);window.removeEventListener('pagehide',dispose);host.removeEventListener('pointermove',pointer);model?.dispose();renderer?.dispose();canvas.remove();}
  function failure(){host.dataset.scene='fallback';dispose();onFailure();}
  function preferences(){if(motion.matches||connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||''))failure();}
  function canAnimate(){return !disposed&&visible&&!paused&&!document.hidden&&!document.querySelector('dialog[open]')&&!motion.matches;}
  function render(now){frame=0;if(!canAnimate())return;if(now-last>=1000/30){time+=Math.min((now-last)/1000,.05);last=now;model.update(time,tilt);renderer.render(model.scene,camera);}frame=requestAnimationFrame(render);}
  function sync(){if(canAnimate()){if(!frame){last=performance.now();frame=requestAnimationFrame(render);}}else{cancelAnimationFrame(frame);frame=0;}}
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.02});
  const dialogObserver=new MutationObserver(sync);
  const camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(1.8,2.3,10);camera.lookAt(0,.3,0);
  function pointer(e){if(e.pointerType==='mouse'){const r=host.getBoundingClientRect();tilt=(e.clientX-r.left)/r.width-.5;}}
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<600?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    model=buildMarathonScene();
    function size(){if(disposed)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;const vertical=Math.max(5.2,6.2/camera.aspect);camera.position.set(1.8,2.3,10).normalize().multiplyScalar(vertical/(2*Math.tan(THREE.MathUtils.degToRad(17))));camera.lookAt(0,width<600?.95:.42,-.5);camera.updateProjectionMatrix();renderer.setSize(width,height,false);renderer.render(model.scene,camera);}
    size();host.append(canvas);host.dataset.scene='ready';resize=new ResizeObserver(size);resize.observe(host);intersection.observe(host);
    document.addEventListener('visibilitychange',sync);document.addEventListener('toggle',sync,true);document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
    motion.addEventListener('change',preferences);connection?.addEventListener?.('change',preferences);window.addEventListener('pagehide',dispose,{once:true});host.addEventListener('pointermove',pointer);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failure();},{once:true});onReady();
  }catch(error){console.warn('Marathon 3D unavailable; showing event poster.',error.message);failure();}
  return {pause(value){paused=value;sync();},dispose};
}
