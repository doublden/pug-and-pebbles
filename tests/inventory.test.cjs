const test=require('node:test'),assert=require('node:assert/strict');
const {createGame,Amount}=require('../game.js'),rules=require('../inventory-rules.js');
const funded=(extra={},random=()=>.9,clock=()=>1000)=>createGame({version:7,balance:{m:1,e:18},total:{m:1,e:18},pug:8,home:6,helper:1,levels:[1,...Array(11).fill(1)],...extra},random,clock);
test('helper baseline is one ordinary tap each second and levels grow independently of coins',()=>{
 const g=funded(),s=g.getState();assert.equal(s.helperRate.compare(s.power),0);g.claimBonus(8);assert.equal(g.work(1).compare(s.power),0);g.buyHelper();assert.equal(g.getState().helperRate.compare(s.power.multiply(2**.35)),0);
});
test('helper burst persists cooldown, doubles ten seconds and is unavailable while away or ready',()=>{
 let now=1000;const g=funded({},()=>.9,()=>now),p=g.getState().power;
 assert.ok(g.activateHelper());assert.equal(g.work(1).compare(p.multiply(2)),0);assert.equal(g.activateHelper(),false);now=11000;assert.equal(g.work(1).compare(p),0);
 const h=createGame(g.serialize(),()=>.9,()=>now);assert.equal(h.activateHelper(),false);now=301000;assert.ok(h.activateHelper());assert.ok(h.sendExpedition(900));assert.equal(h.getState().helperRate.m,0);assert.equal(h.activateHelper(),false);now+=900000;assert.equal(h.activateHelper(),false);h.claimExpedition();assert.ok(h.activateHelper());
});
test('training loot, money and duplicate compensation are snapshotted and paid once',()=>{
 const g=funded(),p=g.getState().power;g.sendExpedition(900,1000);const ex=g.getState().expedition;assert.deepEqual(ex.weaponLoot,[-1,-1,-1]);assert.equal(ex.reward.compare(p.multiply(900*1.15)),0);
 g.devTool(11,100);const h=createGame(g.serialize(),()=>0);assert.equal(h.claimExpedition(901000).compare(ex.reward),0);assert.equal(h.getState().weaponParts,3);assert.ok(h.getState().trainingDone);assert.equal(h.claimExpedition(901000).m,0);assert.ok(h.mergeWeapon(-1));assert.equal(h.getState().weapons[1],1);
});
test('normal expedition chances and conditional weights are explicit and sum to 100',()=>{
 for(const home of [6,7,9,13])for(const [d,chance,rolls]of [[900,35,1],[3600,80,3],[10800,100,8]]){const offer=rules.offer(d,home,0,true);assert.equal(offer.chance,chance);assert.equal(offer.rolls,rolls);assert.ok(Math.abs(offer.weights.reduce((n,w)=>n+w.percent,0)-100)<1e-10);assert.ok(offer.weights.every(w=>w.index<=rules.maxTier(home)));}
 assert.equal(rules.offer(900,6,2,true).chance,100);assert.equal(rules.offer(900,5,0,false).chance,0);
});
test('pity advances on completed unsuccessful trips only; cancellation gives nothing',()=>{
 const g=funded({trainingDone:true});const bank=g.getState().balance;g.sendExpedition(900,1000);assert.ok(g.cancelExpedition(901000,2000));assert.equal(g.getState().balance.compare(bank),0);assert.equal(g.getState().expeditionMisses,0);
 for(let n=0;n<2;n++){g.sendExpedition(900,1000);g.claimExpedition(901000);}assert.equal(g.expeditionLootOffer(900).chance,100);assert.ok(g.sendExpedition(900,1000));assert.ok(g.getState().expedition.weaponLoot.length>0);g.claimExpedition(901000);assert.equal(g.getState().expeditionMisses,0);
});
test('notification is deferred during battles and menus, then shown only once across reload',()=>{
 const g=funded();g.sendExpedition(900,1000);assert.equal(g.expeditionNotice(900999),false);assert.equal(g.expeditionNotice(901000,true),false);assert.ok(g.expeditionNotice(901000,false));assert.equal(createGame(g.serialize()).expeditionNotice(9999999),false);assert.equal(g.cancelExpedition(901000,901000),false);assert.ok(g.claimExpedition(901000).m);
});
test('junk duplicates add at most six starting-power taps to the three-hour trip',()=>{
 const g=funded({junk:[0,0,0,0,1],home:13,trainingDone:true}),p=g.getState().power;g.sendExpedition(10800,1000);const ex=g.getState().expedition;assert.deepEqual(ex.junkLoot,[4,4,4]);g.devTool(11,300);assert.equal(g.claimExpedition(10801000).compare(ex.reward.add(p.multiply(6))),0);assert.equal(g.getState().junk[4],4);
});
test('three-to-one crafting consumes items and equips the resulting weapon without affecting tap power',()=>{
 const weapons=[1,3,0,...Array(6).fill(0)],g=funded({home:7,weapons,weapon:1}),p=g.getState().power;assert.ok(g.mergeWeapon(1));assert.equal(g.getState().weapon,2);assert.equal(g.getState().weapons[1],0);assert.equal(g.getState().weapons[2],1);assert.equal(g.mergeWeapon(1),false);assert.equal(g.getState().power.compare(p),0);assert.equal(g.equipWeapon(8),false);
});
test('skins cost once, cannot select locked looks and never change actual production',()=>{
 const g=funded(),s=g.getState();for(const kind of Object.keys(rules.COSMETICS)){const bank=g.getState().balance;assert.ok(g.buyCosmetic(kind));assert.equal(g.getState().balance.compare(bank.subtract(rules.COSMETICS[kind])),0);assert.equal(g.buyCosmetic(kind),false);assert.ok(g.chooseSkin(kind,0));assert.equal(g.getState().power.compare(s.power),0);assert.equal(g.chooseSkin(kind,999),false);assert.ok(g.chooseSkin(kind,null));}
 assert.equal(g.chooseHelperSkin(1),false);g.buyBulk('helper',0,10);assert.ok(g.chooseHelperSkin(1));assert.equal(g.chooseHelperSticker('script'),false);
});
test('new life keeps weapon and appearance collection but gates strong weapons for the next run',()=>{
 const g=funded({pug:14,home:13,weapons:[1,...Array(8).fill(3)],weapon:8,helper:100});g.buyCosmetic('pug');g.chooseSkin('pug',14);g.sendExpedition(900,1000);assert.ok(g.newLife());const s=g.getState();assert.equal(s.weaponEquipped,0);assert.equal(s.weaponsUnlocked,false);assert.equal(s.weapons[8],3);assert.equal(s.pugAppearance,14);assert.equal(s.pug,0);assert.equal(s.expedition,null);assert.equal(s.helperBurstNext,0);assert.deepEqual(createGame(g.serialize()).serialize(),g.serialize());
});
test('bird weapon fragments are a 0.2 percent chance, gated and weak only',()=>{
 let count=0;for(let n=0;n<10000;n++){const g=funded({},()=>(n+.5)/10000);g.chaseBird('crow');count+=g.getState().weaponParts;assert.ok(g.getState().weapons.slice(1).every(v=>v===0));}assert.equal(count,20);const g=funded({home:5},()=>0);g.chaseBird('pirate');assert.equal(g.getState().weaponParts,0);
});
test('state snapshots cannot mutate inventory or already rolled expedition loot',()=>{
 const g=funded();g.sendExpedition(900,1000);const s=g.getState();s.weapons[1]=999;s.skins.pug=14;s.expedition.weaponLoot.length=0;s.expedition.junkLoot[0]=999;const live=g.getState();assert.equal(live.weapons[1],0);assert.equal(live.skins.pug,null);assert.equal(live.expedition.weaponLoot.length,3);assert.ok(live.expedition.junkLoot[0]<5);
});
test('helper growth stays smaller than the reference bowl and fully inside all six mobile widths',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),box={window:{},PugGame:{HATS:[]}};vm.runInNewContext(fs.readFileSync(require.resolve('../extras.js'),'utf8'),box);
 const world={images:{helperRig:{}},state:{homeStage:0},reduced:false,uiPaused:false},extras=new box.window.PugExtras(world);
 extras.frame=()=>({canvas:{},x:0,y:0,w:240,h:200});
 const ctx={globalAlpha:1,save(){},restore(){},drawImage(){},translate(){},rotate(){},beginPath(){},rect(){},clip(){},fill(){},stroke(){},closePath(){},moveTo(){},lineTo(){},ellipse(){}};
 for(const [w,h]of [[430,932],[375,812],[390,844],[393,852],[360,800],[412,915]])for(const tier of [0,5,10]){world.state.helperTier=tier;for(let now=0;now<30000;now+=300){extras.helper(ctx,now,w,h,100);const b=extras.helperBounds;assert.ok(b.x>=0);assert.ok(b.x+b.w<=w);assert.ok(b.w<=w*.6171);}}
});
test('raster material cache preserves alpha and leaves neutral cabin pixels alone',()=>{
 const fs=require('node:fs'),vm=require('node:vm');let output;
 const pixels=new Uint8ClampedArray([220,170,40,255,30,32,33,128]);const c={drawImage(){},getImageData(){return{data:pixels}},putImageData(value){output=value.data}};
 const box={window:{},document:{createElement(){return{getContext:()=>c}}}};vm.runInNewContext(fs.readFileSync(require.resolve('../extras.js'),'utf8'),box);
 const e=new box.window.PugExtras({}),f={x:0,y:0,w:2,h:1,canvas:{}};const first=e.metalFrame(f,3);assert.equal(output[3],255);assert.equal(output[7],128);assert.deepEqual([...output.slice(4,7)],[30,32,33]);assert.ok(output[1]>output[0]);assert.equal(e.metalFrame(f,3),first);
});
test('buying a stage shows its new appearance instead of hiding it behind a selected old skin',()=>{
 for(const kind of ['pug','home']){const g=funded({home:8});g.buyCosmetic(kind);g.chooseSkin(kind,0);assert.equal(g.getState()[kind+'Appearance'],0);g.upgrade(kind);assert.equal(g.getState().skins[kind],null);assert.equal(g.getState()[kind+'Appearance'],g.getState()[kind+'Stage']);}
});
test('new developer helpers mark test progress and never create duplicate expedition payouts',()=>{
 const g=funded();g.devInventory();assert.ok(g.getState().testMode);assert.ok(g.getState().weapons.every(n=>n>=3));assert.equal(g.devExpeditionReady(),false);g.sendExpedition(900,1000);assert.ok(g.devExpeditionReady(1000));assert.ok(g.claimExpedition(1000).m);assert.equal(g.claimExpedition(1000).m,0);g.activateHelper(1000);g.devHelperReady();assert.ok(g.activateHelper(1001));
});
