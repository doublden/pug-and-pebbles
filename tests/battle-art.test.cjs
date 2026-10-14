const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=path.join(__dirname,'../battle-v7'),meta=JSON.parse(fs.readFileSync(path.join(folder,'frames.json')));
test('combat assets have actual alpha, bounded payload and twelve in-cell paw mounts per pug',()=>{
 let total=0;assert.equal(Object.keys(meta.sheets).length,5);
 for(const[id,sheet]of Object.entries(meta.sheets)){
  const b=fs.readFileSync(path.join(__dirname,'../',sheet.file));total+=b.length;assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,'alpha channel');
  assert.equal(b.readUIntLE(24,3)+1,1280);assert.equal(b.readUIntLE(27,3)+1,960);
  if(id.startsWith('pug')){assert.equal(sheet.hands.length,12);for(const[x,y]of sheet.hands){assert.ok(x>=30&&x<=290);assert.ok(y>=20&&y<=290);}}
 }
 assert.ok(total<1400000,'combat art under 1.4 MB');
});
test('both combat silhouettes stay in all supported mobile arenas and hit area covers boss center',()=>{
 const box={window:{},PugBattleRules:require('../battle-rules.js')};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../battle-render.js'),'utf8'),box);const r=box.window.PugBattleRender;
 for(const[w,h]of[[430,932],[375,812],[390,844],[393,852],[360,800],[412,915]]){
  const l=r.layout(w,h);for(const b of[l.hero,l.boss]){assert.ok(b.x>=0);assert.ok(b.x+b.size<=w+1);assert.ok(b.y>h*.3);assert.ok(b.y+b.size<h*.9);}
  const cx=l.boss.x+l.boss.size/2,cy=l.boss.y+l.boss.size/2;assert.ok(cx>=w*.49&&cx<=w*.98);assert.ok(cy>=h*.42&&cy<=h*.74);
 }
});
