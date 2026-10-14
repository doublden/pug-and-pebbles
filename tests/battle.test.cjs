const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../battle-rules.js'),{createGame,Amount}=require('../game.js');
function funded(overrides={},clock=()=>1000){return createGame({version:8,balance:{m:1,e:15},total:{m:1,e:15},pug:8,home:6,helper:1,levels:[1,...Array(11).fill(1)],weapons:[1,3,3,...Array(6).fill(0)],weapon:1,...overrides},()=>0,clock);}
function defeat(g,index=0,start=1000){assert.ok(g.startBoss(index,start));let r;for(let t=start;t<start+30000;t+=250){r=g.attackBoss(t);if(r.status==='won')return r;}throw Error('not defeated');}
test('stick cannot defeat raccoon and spoon cannot defeat crow even at six credited hits/s',()=>{
 for(const [index,damage]of[[0,1],[1,2]]){const f=B.create(index,damage,1000);for(let t=1000;t<31000;t+=5)B.hit(f,t);assert.equal(B.status(f,31000).status,'lost');assert.ok(f.hp>0);assert.ok(f.strikes<=180);}
});
test('recommended weapons win at four taps/s with bounded duplicates and no late strikes',()=>{
 for(const [index,damage]of[[0,2],[1,4]]){const f=B.create(index,damage,1000);for(let t=1000;t<31000;t+=250)B.hit(f,t);assert.equal(f.status,'won');assert.equal(f.strikes,100);assert.equal(B.hit(f,31000).accepted,false);}
 const f=B.create(0,2,1000);for(let i=0;i<20;i++)B.hit(f,1000);assert.equal(f.strikes,6);assert.equal(B.hit(f,31000).accepted,false);
});
test('absolute deadline continues in background and backwards clock cannot extend it',()=>{
 const f=B.create(0,2,1000);assert.equal(B.status(f,15000).remaining,16000);assert.equal(B.status(f,2000).remaining,16000);assert.equal(B.status(f,40000).status,'lost');assert.equal(B.hit(f,2000).accepted,false);
});
test('home purchase and notification require boss victory; pug and tools remain available',()=>{
 const g=funded();assert.equal(g.bossGate(),0);assert.ok(g.quote('home').locked);assert.equal(g.shopAvailability().home,false);assert.equal(g.upgrade('home'),false);assert.equal(g.buyBulk('home',0,'max'),0);assert.ok(g.upgrade('pug'));assert.ok(g.buyTool(2));defeat(g);assert.equal(g.bossGate(),null);assert.equal(g.quote('home').locked,undefined);assert.equal(g.shopAvailability().home,true);assert.ok(g.upgrade('home'));assert.equal(g.bossGate(),1);
});
test('reward fixed at unlock, paid only once and capped at five percent of next home cost',()=>{
 const g=funded(),reward=g.bossOffer().reward,before=g.getState().balance;g.devTool(11,40);assert.equal(g.bossOffer().reward.compare(reward),0);const r=defeat(g);assert.equal(r.reward.compare(reward),0);assert.equal(g.getState().balance.compare(before.add(reward)),0);assert.ok(reward.compare(g.getTrackPrice('home').multiply(.05))<=0);const restored=createGame(g.serialize());assert.equal(restored.bossGate(),null);assert.equal(defeat(restored).reward.m,0);assert.equal(restored.getState().bossCollection[0],1);
});
test('entering home snapshots reward immediately through bulk purchase too',()=>{
 const g=funded({home:5});assert.ok(g.buyBulk('home',0,10));const value=g.getState().bossOffers[0];assert.ok(value);g.devTool(11,50);assert.equal(g.bossOffer().reward.compare(value),0);
});
test('old purchases grandfather boss clearance without claiming rewards or achievements',()=>{
 for(const version of[4,5,6,7])for(const home of[6,7,8,13]){const g=funded({version,home});assert.deepEqual(g.getState().bossWins,[home>6,home>7]);assert.deepEqual(g.getState().bossCollection,[0,0]);assert.ok(!g.getState().achievements.includes('raccoon'));assert.equal(g.getState().home,home);}
});
test('failed and cancelled fights allow free retries and pause automatic/manual income and mini-games',()=>{
 const g=funded(),balance=g.getState().balance;g.startBoss(0,1000);assert.equal(g.dig(8,1.2).m,0);assert.equal(g.work(1).m,0);assert.equal(g.beginMini('catch'),false);assert.equal(g.sendExpedition(900),false);assert.equal(g.buyBulk('pug'),false);assert.equal(g.getState().balance.compare(balance),0);g.cancelBoss();assert.ok(g.startBoss(0,2000));assert.equal(g.battleStatus(40000).status,'lost');assert.ok(g.startBoss(0,50000));assert.equal(g.getState().weapon,1);
});
test('winning retains separate home price and new life keeps trophy but resets run gates',()=>{
 const g=funded({pug:14});defeat(g);assert.ok(g.getState().achievements.includes('raccoon'));assert.ok(g.newLife());assert.deepEqual(g.getState().bossWins,[false,false]);assert.deepEqual(g.getState().bossCollection,[1,0]);assert.deepEqual(g.getState().bossOffers,[null,null]);
});
test('weapon damage snapshots, cosmetics do not affect it, and state copies cannot mutate victories',()=>{
 const g=funded();g.startBoss(0,1000);g.equipWeapon(0);assert.equal(g.attackBoss(1000).damage,2);const s=g.getState();s.bossWins[0]=true;s.bossCollection[0]=999;assert.equal(g.bossGate(),0);assert.equal(g.getState().bossCollection[0],0);
});
