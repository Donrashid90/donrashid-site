import * as THREE from './vendor/three.module.min.js';
import {ROADS, MISSIONS, drive, reached} from './core.js';

const $ = id => document.getElementById(id);
const world=$('world'), progress=window.DRProgress;
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas:$('cityCanvas'),antialias:true,powerPreference:'high-performance'});
} catch(error) {
  $('loadingMessage').textContent='3D graphics are unavailable in this browser. Enable hardware acceleration or try a current Chrome or Safari. Night Run still works without WebGL.';
  $('startButton').textContent='3D unavailable';
}
if(renderer) {
  try { init(); }
  catch(error) {
    console.error('City initialization failed',error);
    $('loadingMessage').textContent='The city could not start. Reload the page or try Night Run using the link below.';
    $('startButton').disabled=true;$('startButton').textContent='Could not load city';
  }
}

function init(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene(); scene.background=new THREE.Color('#d29189');
  scene.fog=new THREE.Fog('#cb9291',100,390);
  const camera=new THREE.PerspectiveCamera(58,1,.15,850);
  scene.add(new THREE.HemisphereLight('#c6d3ff','#664334',2.5));
  const sunLight=new THREE.DirectionalLight('#ffd4a0',3.3);sunLight.position.set(-140,90,-180);scene.add(sunLight);
  const rim=new THREE.DirectionalLight('#999dff',1.1);rim.position.set(100,35,90);scene.add(rim);
  const scenery=new THREE.Group();scene.add(scenery);
  const cube=new THREE.BoxGeometry(1,1,1), cylinder=new THREE.CylinderGeometry(1,1,1,8);
  const materials=new Map();
  const mat=(color,metalness=0,roughness=.85)=>{
    const key=`${color}/${metalness}/${roughness}`;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness,roughness}));
    return materials.get(key);
  };
  const glow=color=>new THREE.MeshBasicMaterial({color});
  const asphalt=mat('#30343d'), sidewalk=mat('#afa59a'), chrome=mat('#c4d2da',.8,.23);
  const gold=mat('#e8bf6e',.75,.24), rubber=mat('#11141a'), white=mat('#e6e5d7');
  const glass=mat('#182d40',.5,.15), trunkMat=mat('#766152'), leafMat=mat('#214943');
  const roadPaint=mat('#e9c478'), pink=glow('#f17cae'), aqua=glow('#68dfd3');
  function box(w,h,d,x,y,z,material,parent=scenery){
    const mesh=new THREE.Mesh(cube,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function cyl(radius,height,x,y,z,material,parent=scenery){
    const mesh=new THREE.Mesh(cylinder,material);mesh.scale.set(radius,height,radius);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  box(550,.3,550,0,-.25,0,mat('#8c8171'));
  box(160,.15,900,355,-.35,0,mat('#367d86',.3,.3));
  box(26,.2,560,281,-.06,0,mat('#dcc7a1'));
  for(const r of ROADS){
    box(23,.12,550,r,.02,0,asphalt);box(550,.12,23,0,.025,r,asphalt);
    for(let t=-263;t<268;t+=12){
      if(ROADS.some(j=>Math.abs(t-j)<16))continue;
      box(.24,.025,5,r,.095,t,roadPaint);box(5,.025,.24,t,.1,r,roadPaint);
    }
    for(const s of ROADS){
      for(let k=-3;k<=3;k++){
        box(1.4,.025,3,r+k*2.4,.11,s+13.5,white);
        box(3,.025,1.4,r+13.5,.12,s+k*2.4,white);
      }
    }
  }
  const blocks=[];
  const windowWarm=glow('#efc498'), windowCool=glow('#9fbdbd');
  let seed=51;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function building(x,z,w,d,h,index){
    blocks.push({x,z,w,d});
    const wall=mat(['#566679','#a18b83','#786e8b','#586d72','#8c7777'][index%5]);
    box(w,h,d,x,h/2,z,wall);box(w+1,.7,d+1,x,h+.25,z,mat('#d0bbae'));
    box(w*.5,1.7,d*.5,x,h+1.35,z,wall);
    for(let y=3;y<h-1;y+=3.8){
      for(let wx=-w/2+2;wx<w/2-1;wx+=3.6){
        const material=rand()>.45?windowWarm:windowCool;
        box(1.35,1.6,.12,x+wx,y,z+d/2+.07,material);box(1.35,1.6,.12,x+wx,y,z-d/2-.07,material);
      }
      for(let wz=-d/2+2;wz<d/2-1;wz+=3.6){
        box(.12,1.6,1.35,x+w/2+.07,y,z+wz,windowWarm);box(.12,1.6,1.35,x-w/2-.07,y,z+wz,windowCool);
      }
    }
    box(w,.3,.3,x,2.5,z+d/2+.2,index%2?pink:aqua);
  }
  for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){
    const x=-200+ix*80,z=-200+iz*80;
    box(54,.35,54,x,.13,z,sidewalk);
    // Lower coastal blocks, taller downtown, an open customs courtyard.
    if(ix===3&&iz===3){box(37,.12,38,x,.36,z,mat('#49434d'));continue;}
    const height=(ix<2?20:9)+rand()*22;
    building(x-12,z,19,37,height,ix+iz);
    building(x+12,z-9,18,18,height*.65,ix+iz+1);
    building(x+12,z+13,18,18,height*.45,ix+iz+2);
  }
  const leafGeometry=new THREE.ConeGeometry(1,1,4);
  function palm(x,z,h=14){
    const trunk=cyl(.34,h,x,h/2,z,trunkMat);trunk.rotation.z=.04;
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2;
      const leaf=new THREE.Mesh(leafGeometry,leafMat);leaf.scale.set(.9,6,.24);
      leaf.position.set(x+Math.cos(a)*2.3,h+.2,z+Math.sin(a)*2.3);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(a),-.18,Math.sin(a)).normalize());scenery.add(leaf);
    }
  }
  for(let z=-248;z<=248;z+=26){palm(260,z,13+rand()*4);palm(-14,z,11+rand()*4);}
  for(let x=-220;x<240;x+=40){palm(x,14,12);palm(x,174,13);}
  for(let z=-230;z<250;z+=40){
    cyl(.16,8,13,4,z,chrome);box(3,.15,.25,11.6,8,z,chrome);box(1.8,.12,.7,10.9,7.9,z,windowWarm);
  }
  // Horizon: layered hills and a low sun, all world-space geometry.
  for(let i=0;i<18;i++){
    const hill=new THREE.Mesh(new THREE.ConeGeometry(38+rand()*42,35+rand()*50,6),mat('#827a93'));
    hill.position.set(-460+i*52,4,-355-rand()*35);scenery.add(hill);
  }
  const sun=new THREE.Mesh(new THREE.SphereGeometry(23,24,16),glow('#ffd498'));sun.position.set(-175,55,-330);scene.add(sun);
  function sign(text,x,y,z,color='#f4d18e',rotation=0){
    const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
    g.fillStyle='#141d29';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=6;g.strokeRect(5,5,502,118);
    g.font='bold 45px sans-serif';g.textAlign='center';g.fillStyle=color;g.fillText(text,256,81);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(18,4.5),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;scenery.add(mesh);
  }
  sign('DON RASHID',-40,12,-20);sign('CHROME CUSTOMS',40,6,62,'#70efdb');sign('AFTER DARK',-120,11,-20,'#ff9acc');
  sign('PACIFIC COAST',253,7,-35,'#f4d18e',Math.PI/2);sign('3072 RECORDS',-40,9,100);
  box(25,5,10,40,2.9,58,mat('#353443'));blocks.push({x:40,z:58,w:25,d:10});
  // Instance static repeated geometry to keep mobile draw calls low.
  scenery.updateMatrixWorld(true);
  const batches=new Map();
  for(const obj of [...scenery.children]){
    if(!obj.isMesh||obj.material.map)continue;
    const key=obj.geometry.uuid+obj.material.uuid;
    if(!batches.has(key))batches.set(key,{geometry:obj.geometry,material:obj.material,matrices:[]});
    batches.get(key).matrices.push(obj.matrixWorld.clone());scenery.remove(obj);
  }
  for(const b of batches.values()){
    const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);
    b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));scenery.add(mesh);
  }
  // Original long-body lowrider, chrome grille, whitewalls and spoke rims.
  const car=new THREE.Group(),body=new THREE.Group();car.add(body);scene.add(car);
  const paint=new THREE.MeshStandardMaterial({color:'#369f9e',metalness:.58,roughness:.26});
  box(2.55,.64,6.3,0,.91,0,paint,body);box(2.46,.24,2.05,0,1.35,-1.85,paint,body);
  box(2.46,.2,1.65,0,1.33,2.08,paint,body);
  box(2.22,.7,2.35,0,1.64,.05,glass,body);box(2.3,.13,2.45,0,2.03,.05,paint,body);
  for(const x of [-1.18,1.18]){
    box(.085,.81,.09,x,1.65,-1.06,chrome,body);box(.085,.81,.09,x,1.65,1.16,chrome,body);
    box(.065,.085,5.9,x*1.08,1.06,0,chrome,body);box(.07,.1,.34,x*1.09,1.35,.5,chrome,body);
    box(.19,.14,.35,x*1.17,1.57,-.9,chrome,body);
  }
  box(2.65,.19,.27,0,.7,-3.22,chrome,body);box(2.65,.19,.27,0,.7,3.22,chrome,body);
  box(2.36,.39,.06,0,1,-3.18,chrome,body);box(1.15,.29,.075,0,1,-3.23,rubber,body);
  for(let i=-5;i<=5;i++)box(.04,.26,.02,i*.1,1,-3.28,chrome,body);
  for(const x of [-1,-.66,.66,1]){
    const light=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.06,16),glow('#fff4c4'));
    light.rotation.x=Math.PI/2;light.position.set(x,1.04,-3.24);body.add(light);
  }
  for(const x of [-.9,-.6,.6,.9])box(.22,.18,.05,x,1.08,3.2,glow('#fa465f'),body);
  box(.52,.22,.05,0,.84,3.37,white,body);
  const wheels=[],rimMeshes=[];
  for(const x of [-1.28,1.28])for(const z of [-1.94,1.98]){
    const wheel=new THREE.Group();wheel.position.set(x,.57,z);car.add(wheel);wheels.push(wheel);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.54,.54,.32,24),rubber);tire.rotation.z=Math.PI/2;wheel.add(tire);
    const side=Math.sign(x)*.17;
    const wall=new THREE.Mesh(new THREE.TorusGeometry(.41,.065,8,24),white);wall.rotation.y=Math.PI/2;wall.position.x=side;wheel.add(wall);
    const rimMesh=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.35,24),chrome);rimMesh.rotation.z=Math.PI/2;wheel.add(rimMesh);rimMeshes.push(rimMesh);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI;const spoke=box(.035,.63,.024,side*1.1,0,0,chrome,wheel);spoke.rotation.x=a;
    }
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:'#0d111b',transparent:true,opacity:.4,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.85,3.65,1);shadow.position.y=.13;car.add(shadow);
  const underglow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,6.4),new THREE.MeshBasicMaterial({color:'#55ede0',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));
  underglow.rotation.x=-Math.PI/2;underglow.position.y=.15;car.add(underglow);
  const marker=new THREE.Group();scene.add(marker);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(6.5,.24,8,48),glow('#ffe193'));ring.rotation.x=-Math.PI/2;ring.position.y=.4;marker.add(ring);
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(6.4,6.4,13,32,1,true),new THREE.MeshBasicMaterial({color:'#ffdf8d',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));beacon.position.y=6.5;marker.add(beacon);marker.visible=false;
  const pointer=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.5,4),glow('#ffe193'));pointer.rotation.z=Math.PI;pointer.position.y=9;marker.add(pointer);
  // Decorative traffic loops stay in lanes; contact slows your car.
  const traffic=[];
  for(let i=0;i<8;i++){
    const t=new THREE.Group();scene.add(t);const m=mat(['#773a53','#3c7583','#c3b59d','#494d66'][i%4],.25,.45);
    box(2.4,.8,5.1,0,.9,0,m,t);box(2.1,.7,2.5,0,1.55,0,glass,t);
    for(const x of [-1.17,1.17])for(const z of [-1.65,1.65]){const w=cyl(.48,.3,x,.5,z,rubber,t);w.rotation.z=Math.PI/2;}
    traffic.push({mesh:t,phase:i*63,road:ROADS[1+i%5]+5,vertical:i%2===0});
  }
  const s={x:0,z:27,speed:0,angle:0};
  let started=false,paused=false,inGarage=false,mission=null,missionIndex=progress.state.missions%6,pointIndex=0,timeLeft=0,hops=0;
  let hopHeight=0,hopVelocity=0,hopCooldown=0,last=0,clock=0,crashCooldown=0,toastTime=0,camMode=0;
  const keys=new Set(),touch=new Set();
  const map=$('minimap').getContext('2d');
  const missionPrizes=['Cruiser badge','Ocean-blue underglow','Showtime hydraulics','Chrome wire wheels','Sunset underglow','City legend + gold wheels'];
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=4;}
  function applyPaint(){
    const selected=progress.equipped(),done=progress.state.missions;
    paint.color.set(selected?.color||'#369f9e');
    underglow.visible=!!(selected?.level>=10||done>=2);
    underglow.material.color.set(selected?.level>=10?selected.color:done>=5?'#ff9954':'#6de7f1');
    rimMeshes.forEach(r=>{r.material=selected?.level>=15||done>=6?gold:chrome;});
    $('badge').textContent=selected?.id==='crown'?'BOULEVARD LEGEND':done>=6?'CITY LEGEND':done>=1?'CERTIFIED CRUISER':'STREET CRUISER';
  }
  function drawGarage(){
    $('paintGrid').replaceChildren();
    for(const reward of [{id:'stock',name:'Pacific Teal',color:'#369f9e',level:0},...progress.rewards]){
      const b=document.createElement('button');b.style.setProperty('--paint',reward.color);b.disabled=!!reward.level&&!progress.unlocked(reward);
      b.setAttribute('aria-pressed',String((progress.equipped()?.id||'stock')===reward.id));
      const name=document.createElement('strong');name.textContent=reward.name;
      const note=document.createElement('small');note.textContent=reward.level?`Night Run · Level ${reward.level}${b.disabled?' · Locked':''}`:'Standard finish';
      b.append(name,note);b.addEventListener('click',()=>{progress.select(reward.id);drawGarage();});$('paintGrid').append(b);
    }
    $('cityRewards').replaceChildren();
    missionPrizes.forEach((name,i)=>{const el=document.createElement('div');el.className=progress.state.missions>i?'':'locked';const label=document.createElement('span');label.textContent=`${i+1}. ${name}`;const status=document.createElement('b');status.textContent=progress.state.missions>i?'Unlocked':'Locked';el.append(label,status);$('cityRewards').append(el);});
    $('saveStatus').textContent=progress.saved?'Cosmetics and mission progress are saved only in this browser. No wallet or payment needed.':'Storage is unavailable. Progress will not survive closing this page.';
  }
  function resetCar(){s.x=0;s.z=27;s.angle=0;s.speed=0;hopHeight=hopVelocity=0;keys.clear();touch.clear();}
  function startMission(){
    if(!started||paused||inGarage)return;
    mission=MISSIONS[missionIndex];pointIndex=0;timeLeft=mission.time;hops=0;resetCar();setMarker();
    world.focus();
    $('missionButton').textContent='Restart mission';toast(`${mission.name} · Follow the gold checkpoint`);
  }
  function setMarker(){
    marker.visible=!!mission;if(!mission)return;
    const p=mission.points[Math.min(pointIndex,mission.points.length-1)];marker.position.set(p[0],0,p[1]);
  }
  function finishMission(){
    const completed=missionIndex+1;progress.mission(completed);toast(`MISSION COMPLETE · ${mission.reward}`);
    mission=null;marker.visible=false;missionIndex=completed%MISSIONS.length;
    $('missionButton').textContent=completed===6?'Replay missions':'Next mission';
  }
  function hop(){
    if(!started||paused||inGarage||hopCooldown>0||hopHeight>.02)return;
    hopVelocity=progress.state.missions>=3?5.4:4.2;hopCooldown=.8;
    if(mission?.hops&&pointIndex===mission.points.length&&Math.abs(s.speed)<2&&reached(s,mission.points.at(-1))){
      hops++;if(hops>=mission.hops)finishMission();else toast(`SHOWTIME · ${hops} / ${mission.hops} hydraulic hops`);
    }
  }
  function pause(value){
    if(!started||inGarage)return;paused=value;keys.clear();touch.clear();
    $('pauseOverlay').hidden=!paused;$('pauseButton').textContent=paused?'Resume':'Pause';
    if(!paused)world.focus();
  }
  function garage(){inGarage=true;keys.clear();touch.clear();drawGarage();$('garage').showModal();}
  $('garage').addEventListener('close',()=>{inGarage=false;keys.clear();touch.clear();if(started)world.focus();});
  $('closeGarage').onclick=()=>$('garage').close();$('garageButton').onclick=garage;
  $('startButton').onclick=()=>{started=true;$('startOverlay').hidden=true;world.focus();toast('WASD / arrows to drive · Space for hydraulics');};
  $('pauseButton').onclick=()=>pause(!paused);$('resumeButton').onclick=()=>pause(false);
  $('missionButton').onclick=startMission;$('resetButton').onclick=()=>{resetCar();world.focus();toast('Back on Palm Boulevard');};
  $('cameraButton').onclick=()=>{camMode=(camMode+1)%3;world.focus();};$('hopTouch').onpointerdown=e=>{e.preventDefault();hop();};
  $('cityCanvas').onpointerdown=()=>world.focus();
  $('fullscreenButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await world.requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
  document.addEventListener('keydown',e=>{
    if(inGarage||e.target.closest('input,select,textarea'))return;
    if(e.target.closest('button,a')&&e.code==='Space')return;
    const actions=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight'];
    if(actions.includes(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.repeat)return;
    if(e.code==='Space')hop();if(e.code==='KeyP'||e.code==='Escape')pause(!paused);if(e.code==='KeyC')camMode=(camMode+1)%3;
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  for(const b of document.querySelectorAll('[data-key]')){
    b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.key);b.classList.add('active');};
    const release=()=>{touch.delete(b.dataset.key);b.classList.remove('active');};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  }
  window.addEventListener('blur',()=>{keys.clear();touch.clear();if(started&&!inGarage)pause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!inGarage)pause(true);});
  window.addEventListener('dr-progress',applyPaint);
  $('cityCanvas').addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);$('pauseOverlay').querySelector('p').textContent='The graphics connection was lost. Reload this page to resume. Your saved rewards are safe.';$('resumeButton').textContent='Reload game';$('resumeButton').onclick=()=>location.reload();});
  const held=(...names)=>names.some(n=>keys.has(n)||touch.has(n));
  function minimap(){
    map.fillStyle='#141e2a';map.fillRect(0,0,220,220);
    const xy=v=>110+v*.37;
    map.fillStyle='#29606a';map.fillRect(211,0,9,220);
    map.strokeStyle='#596675';map.lineWidth=6;
    for(const r of ROADS){map.beginPath();map.moveTo(xy(r),8);map.lineTo(xy(r),212);map.moveTo(8,xy(r));map.lineTo(212,xy(r));map.stroke();}
    if(mission){
      const p=mission.points[Math.min(pointIndex,mission.points.length-1)];
      map.strokeStyle='#e5c273';map.lineWidth=1.5;map.setLineDash([3,4]);map.beginPath();map.moveTo(xy(s.x),xy(s.z));map.lineTo(xy(p[0]),xy(p[1]));map.stroke();map.setLineDash([]);
      map.fillStyle='#ffe09a';map.beginPath();map.arc(xy(p[0]),xy(p[1]),5,0,Math.PI*2);map.fill();
    }
    map.save();map.translate(xy(s.x),xy(s.z));map.rotate(-s.angle);map.fillStyle='#fff7e6';map.beginPath();map.moveTo(0,-7);map.lineTo(5,5);map.lineTo(0,2);map.lineTo(-5,5);map.closePath();map.fill();map.restore();
  }
  function hud(){
    const district=s.x>200?'PACIFIC COAST':s.x< -100?'DOWNTOWN':s.z>120?'SUNSET STRIP':'PALM BOULEVARD';
    $('districtName').textContent=district;$('mapLabel').textContent=district;
    $('speed').textContent=Math.round(Math.abs(s.speed)*3.6);$('gear').textContent=s.speed<-.3?'R':s.speed<.3?'N':String(Math.min(4,1+Math.floor(s.speed/9)));
    $('missionTag').textContent=mission?`MISSION ${missionIndex+1} / 6`:'FREE ROAM';
    $('missionName').textContent=mission?.name||'The boulevard is yours.';
    $('timer').textContent=mission?`${Math.ceil(timeLeft)}s`:'—';
    if(mission){
      const show=pointIndex===mission.points.length;
      const target=mission.points[Math.min(pointIndex,mission.points.length-1)];
      $('missionHint').textContent=show?'Stop in the gold ring. Press Space / HOP for the hydraulic show.':`Drive through the gold ring · ${Math.round(Math.hypot(s.x-target[0],s.z-target[1]))} m away`;
      $('checkpoint').textContent=show?`${hops} / ${mission.hops} hops`:`Checkpoint ${pointIndex+1} / ${mission.points.length}`;
    }else{
      $('missionHint').textContent=`Next: ${MISSIONS[missionIndex].name}. Start when you are ready.`;
      $('checkpoint').textContent=`${progress.state.missions} / 6 complete`;
    }
  }
  function resize(){const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(world);resize();applyPaint();
  camera.position.set(10,7,42);
  const desired=new THREE.Vector3(),look=new THREE.Vector3();
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.04);last=now;
    const active=started&&!paused&&!inGarage;
    if(active){
      clock+=dt;hopCooldown=Math.max(0,hopCooldown-dt);crashCooldown=Math.max(0,crashCooldown-dt);
      const hit=drive(s,{forward:held('KeyW','ArrowUp'),back:held('KeyS','ArrowDown'),left:held('KeyA','ArrowLeft'),right:held('KeyD','ArrowRight'),brake:held('ShiftLeft','ShiftRight')},dt,blocks);
      if(hit&&crashCooldown===0){toast('Easy on the chrome!');crashCooldown=2;}
      hopVelocity-=12*dt;hopHeight=Math.max(0,hopHeight+hopVelocity*dt);if(hopHeight===0)hopVelocity=0;
      if(mission){
        timeLeft-=dt;
        if(timeLeft<=0){mission=null;marker.visible=false;$('missionButton').textContent='Retry mission';toast('Time is up. Try the route again.');}
        else if(pointIndex<mission.points.length&&reached(s,mission.points[pointIndex])){
          pointIndex++;
          if(pointIndex===mission.points.length&&!mission.hops)finishMission();
          else{setMarker();toast(pointIndex===mission.points.length?'Park inside the ring and hit the hydraulics.':'Checkpoint cleared');}
        }
      }
      for(const t of traffic){
        const pos=((clock*7+t.phase+260)%520)-260;t.mesh.position.set(t.vertical?t.road:pos,0,t.vertical?pos:t.road);t.mesh.rotation.y=t.vertical?Math.PI:-Math.PI/2;
        if(Math.hypot(s.x-t.mesh.position.x,s.z-t.mesh.position.z)<3.7&&Math.abs(s.speed)>3&&crashCooldown===0){s.speed*=-.25;crashCooldown=2;toast('Traffic contact · Watch your lane');}
      }
    }
    car.position.set(s.x,0,s.z);car.rotation.y=s.angle;
    body.position.y=hopHeight;body.rotation.x=Math.sin(hopHeight*2)*.13;
    wheels.forEach(w=>{w.position.y=.57+hopHeight*.55;w.rotation.x-=active?s.speed*dt*1.8:0;});
    marker.rotation.y=clock*.5;pointer.position.y=9+Math.sin(clock*3)*.7;
    if(!started){const a=now*.00008;desired.set(s.x+Math.sin(a)*11,5.2,s.z+Math.cos(a)*11);look.set(s.x,1,s.z);}
    else if(camMode===2){desired.set(s.x,44,s.z+12);look.set(s.x,0,s.z-7);}
    else{const dist=camMode===0?12:20;desired.set(s.x+Math.sin(s.angle)*dist,camMode===0?6.3:10,s.z+Math.cos(s.angle)*dist);look.set(s.x-Math.sin(s.angle)*6,1.1,s.z-Math.cos(s.angle)*6);}
    camera.position.lerp(desired,1-Math.exp(-5*dt));camera.lookAt(look);
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
    hud();minimap();renderer.render(scene,camera);
  }
  renderer.render(scene,camera);
  $('startButton').disabled=false;$('startButton').textContent='Enter the city';$('loadingMessage').textContent='Keyboard or touch controls · Progress saved on this device';
  requestAnimationFrame(frame);
}
