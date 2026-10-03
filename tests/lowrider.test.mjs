import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {drive,collides,MISSIONS,reached} from '../lowrider/core.js';

test('driving accelerates, reverses, turns and respects collisions',()=>{
  const s={x:0,z:0,angle:0,speed:0};
  for(let i=0;i<120;i++)drive(s,{forward:true},1/60,[]);
  assert.ok(s.z< -20);assert.ok(s.speed>20);
  const angle=s.angle;drive(s,{left:true},.1,[]);assert.ok(s.angle>angle);
  const wall=[{x:0,z:-10,w:20,d:5}];const c={x:0,z:-4,angle:0,speed:30};
  assert.equal(drive(c,{forward:true},.1,wall),true);assert.ok(c.speed<0);assert.equal(c.z,-4);
  const reverse={x:0,z:0,angle:0,speed:0};drive(reverse,{back:true},.1,[]);assert.ok(reverse.z>0);
  assert.equal(collides(270,0,[]),true);
});
test('mission checkpoints are reachable on roads within the city',()=>{
  assert.equal(MISSIONS.length,6);
  for(const m of MISSIONS){assert.ok(m.time>=100);for(const p of m.points){assert.ok(Math.abs(p[0])<=240&&Math.abs(p[1])<=240);assert.ok(p[0]%80===0&&p[1]%80===0);assert.ok(reached({x:p[0],z:p[1]},p));}}
});
test('cosmetics unlock at milestones, persist and cannot select locked finishes',()=>{
  const store=new Map();const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  function load(){const context={localStorage,window:{dispatchEvent(){}},Event:class{}};vm.runInNewContext(readFileSync(new URL('../game/progress.js',import.meta.url),'utf8'),context);return context.window.DRProgress;}
  let p=load();assert.equal(p.select('gold'),false);p.complete(2);assert.equal(p.select('chrome'),true);p=load();assert.equal(p.equipped().id,'chrome');
  p.complete(20);assert.equal(p.rewards.filter(p.unlocked).length,8);p.complete(1);assert.equal(p.state.completed,20);p.mission(6);assert.equal(load().state.missions,6);
});
