export const ROADS = [-240, -160, -80, 0, 80, 160, 240];
export const MISSIONS = [
  {name:'First cruise',time:100,points:[[0,-80],[80,-80],[80,0]],reward:'Cruiser badge'},
  {name:'Coastal delivery',time:125,points:[[160,0],[240,0],[240,-160],[160,-160]],reward:'Ocean-blue underglow'},
  {name:'Hydraulic showcase',time:110,points:[[0,-80],[0,-160]],hops:4,reward:'Showtime hydraulics'},
  {name:'Downtown circuit',time:130,points:[[-80,-160],[-160,-160],[-160,0],[-80,0],[0,0]],reward:'Chrome wire wheels'},
  {name:'Sunset express',time:150,points:[[80,80],[240,80],[240,240],[0,240],[0,160]],reward:'Sunset underglow'},
  {name:'Boulevard crown',time:175,points:[[-80,160],[-240,160],[-240,-160],[0,-160],[0,0]],hops:6,reward:'City legend badge + gold wheels'},
];
export function collides(x,z,blocks) {
  return Math.abs(x)>266 || Math.abs(z)>266 || blocks.some(b=>Math.abs(x-b.x)<b.w/2+1.8 && Math.abs(z-b.z)<b.d/2+1.8);
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
