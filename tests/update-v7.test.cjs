const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createGame,MINI_SECONDS}=require('../game.js');
const funded=(extra={})=>createGame({version:6,pug:8,home:5,levels:[1,...Array(11).fill(1)],balance:{m:1,e:25},total:{m:1,e:25},...extra});
test('home and pug always buy one even when bulk or max requested',()=>{
 for(const kind of ['pug','home'])for(const mode of [1,10,'max']){const g=funded(),before=g.getState(),q=g.quote(kind,0,mode);assert.equal(q.count,1);assert.equal(g.buyBulk(kind,0,mode),1);assert.equal(g.getState()[kind],before[kind]+1);assert.equal(g.getState().balance.compare(before.balance.subtract(q.cost)),0);}
});
test('tool upgrade preview equals actual change in total power, including inactive tools and bulk',()=>{
 for(const i of [1,2,11])for(const count of [1,10]){const g=funded(),before=g.getState().power,gain=g.toolGain(i,count);g.buyBulk('tool',i,count);assert.equal(gain.compare(g.getState().power.subtract(before)),0);}
 const g=funded({pug:20000,home:20000,levels:[1,1,15000,...Array(9).fill(0)],balance:{m:1,e:10000},total:{m:1,e:10000}});assert.ok(g.toolGain(2).e>308);assert.equal(g.toolGain(1).m,0);assert.equal(g.toolGain(-1).m,0);
});
test('main shop badge excludes owned upgrades, hats and helper; category badges remain useful',()=>{
 const g=funded({pug:4,home:4,balance:{m:1,e:3},total:{m:1,e:3}}),a=g.shopAvailability();assert.equal(a.main,false);assert.equal(a.tools,true);assert.equal(a.hats,true);assert.equal(a.helper,true);assert.equal(a.pug,false);assert.equal(a.home,false);
 const fresh=createGame();for(let n=0;n<8;n++)fresh.dig();assert.equal(fresh.shopAvailability().main,true);fresh.buyTool(1);assert.equal(fresh.shopAvailability().main,false);
});
test('every mini uses fixed duration, start power and proportional score; no duplicate or coin amplification',()=>{
 assert.equal(funded().miniRewardLimit('toString').m,0);
 for(const kind of Object.keys(MINI_SECONDS))for(const score of [.25,1,100]){const g=funded(),p=g.getState().power;assert.equal(g.miniRewardLimit(kind).compare(p.multiply(8*MINI_SECONDS[kind])),0);g.claimBonus(8);g.beginMini(kind,1000);g.upgrade('pug');g.devTool(11,200);const reward=g.finishMini(kind,score);assert.equal(reward.compare(p.multiply(8*MINI_SECONDS[kind]*Math.min(1,score))),0);assert.equal(g.finishMini(kind,1).m,0);assert.equal(createGame(g.serialize()).beginMini(kind,1001),false);}
});
test('mini assistance hats never increase the perfect payout cap',()=>{
 for(const [hat,kind]of [['bunny','brush'],['pan','catch']]){const g=funded({hats:[hat],hat});const p=g.getState().power;g.beginMini(kind,0);assert.equal(g.finishMini(kind,1,true).compare(p.multiply(8*MINI_SECONDS[kind])),0);}
});
test('old v6 wallets, purchases, collection and expedition reward survive exactly',()=>{
 const old={...funded().serialize(),helper:12,hats:['carrot','pirate'],hat:'carrot',miniNext:{brush:1234,catch:5678,match:9999},expedition:{ends:9001000,duration:900,reward:{m:3.5,e:8}}};const g=createGame(old),s=g.serialize();for(const key of ['balance','total','pug','home','levels','helper','hats','hat','miniNext','expedition'])assert.deepEqual(JSON.parse(JSON.stringify(s[key])),JSON.parse(JSON.stringify(old[key])));assert.deepEqual(createGame(s).serialize(),s);
});
function world(){const box={window:{},performance:{now:()=>3000}};vm.runInNewContext(fs.readFileSync(require.resolve('../world.js'),'utf8'),box);return box.window.PugWorld.prototype;}
test('normal pug motion draws exactly one opaque body at every transition and action phase',()=>{
 const proto=world(),draws=[],fake={images:{'mid-pawlick':{},'mid-scratch':{},'mid-back':{},rear:{}},poseStart:0,reduced:false,poseFrame:proto.poseFrame,dog(...a){draws.push(a);}};
 for(const pose of ['pawlick','scratch','back','sleep','splay'])for(const p of [0,.1,.3,.5,.7,.9,1]){draws.length=0;proto.motionDog.call(fake,{},8,pose,{x:10,y:20,size:200},p);assert.equal(draws.length,1);assert.equal(draws[0][6],1);}
});
test('head and bird attach to the held visible frame, including entry and mirrored rear view',()=>{
 const proto=world(),fake={images:{'mid-pawlick':{}},state:{pugStage:7},poseStart:0,poseEnd:10000,pose:'pawlick',reduced:false,activePose(){return this.pose;},poseFrame:proto.poseFrame,poseProgress:proto.poseProgress,visiblePug:proto.visiblePug,prepare(p){return{head:{x:p==='idle'?.4:.7,y:p==='idle'?.2:.6,w:.3}};}};
 assert.equal(proto.currentHead.call(fake,100).pose,'idle');assert.equal(proto.currentHead.call(fake,500).pose,'mid-pawlick');fake.pose='rear';fake.idleEvent={kind:'pee',elapsed:1500,duration:6000};const h=proto.currentHead.call(fake,1500);assert.ok(Math.abs(h.head.x-.3)<1e-10);
});
test('portrait composition applies requested scale without moving pug anchor',()=>{
 const proto=world(),fake={w:430,h:932,state:{homeStage:0},images:{},prepared:new Map()};const l=proto.layout.call(fake,1000);assert.equal(l.size,430*.5265);assert.equal(l.x,-430*.065);assert.equal(l.base,932*.79);
});
test('catcher remains completable within thirty seconds with saucepan assistance',()=>{
 const c=require('../minigames.js').catcher(()=>.5,1.15);c.select(2);let s;for(let n=0;n<300;n++){s=c.tick(100);if(s.done)break;}assert.equal(s.perfect,true);assert.equal(s.caught,24);assert.ok(s.elapsed<=30000);
});
