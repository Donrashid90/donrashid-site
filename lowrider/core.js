export const WORLD_LIMIT = 506;
export const ROADS = Array.from({length:13},(_,i)=>(i-6)*80);
export const DISTRICTS = [
  {id:'ghost',name:'GHOST TOWN',x:-320,z:-240,color:'#756b68',ground:'#82725c'},
  {id:'neon',name:'NEON TOWN',x:0,z:-240,color:'#a52cba',ground:'#252339'},
  {id:'desert',name:'DESERT HIGHWAY',x:320,z:-240,color:'#d69b55',ground:'#c79a62'},
  {id:'barrio',name:'BARRIO COLORS',x:-320,z:240,color:'#da745f',ground:'#ad8a76'},
  {id:'palm',name:'PALM BOULEVARD',x:0,z:240,color:'#749f88',ground:'#8c8171'},
  {id:'coast',name:'PACIFIC COAST',x:320,z:240,color:'#439aaa',ground:'#c5b18b'},
];
export function districtAt(x,z){return DISTRICTS[(z<0?0:3)+(x< -160?0:x<160?1:2)];}
export const MISSIONS = [
  {name:'First cruise',time:100,points:[[0,-80],[80,-80],[80,0]],reward:'Cruiser badge'},
  {name:'Pacific coast cruise',time:190,points:[[160,0],[400,0],[400,320],[160,320]],reward:'Ocean-blue underglow'},
  {name:'Neon hydraulic show',time:160,points:[[0,160],[0,-160],[0,-320]],hops:4,reward:'Showtime hydraulics'},
  {name:'Ghost town run',time:200,points:[[-160,-320],[-400,-320],[-400,-80],[-240,80],[-240,240]],reward:'Chrome wire wheels'},
  {name:'Desert sunset express',time:240,points:[[-160,240],[160,240],[320,0],[320,-400],[480,-400]],reward:'Sunset underglow'},
  {name:'Six district crown',time:340,points:[[320,-240],[0,-240],[-320,-240],[-320,240],[0,240],[320,240],[0,0]],hops:6,reward:'City legend badge + gold wheels'},
];
export function collides(x,z,blocks) {
  return Math.abs(x)>WORLD_LIMIT || Math.abs(z)>WORLD_LIMIT || blocks.some(b=>Math.abs(x-b.x)<b.w/2+1.8 && Math.abs(z-b.z)<b.d/2+1.8);
}
export function drive(s,input,dt,blocks) {
  const accel = input.forward ? 17 : input.back ? -20 : 0;
  s.speed += accel*dt;
  s.speed *= Math.exp(-(input.brake ? 3.2 : accel ? .12 : .65)*dt);
  s.speed = Math.max(-10,Math.min(35,s.speed));
  if (Math.abs(s.speed)<.04) s.speed=0;
  const steer=(input.left?1:0)-(input.right?1:0);
  s.angle += steer*Math.min(1,Math.abs(s.speed)/6)*(input.brake?1.9:1.12)*Math.sign(s.speed)*dt;
  const x=s.x-Math.sin(s.angle)*s.speed*dt;
  const z=s.z-Math.cos(s.angle)*s.speed*dt;
  if(collides(x,z,blocks)){s.speed*=-.25;return true;}
  s.x=x;s.z=z;return false;
}
export function reached(s,point) {return Math.hypot(s.x-point[0],s.z-point[1])<9;}
