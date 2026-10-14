// Deterministic comparison, not a promise of playtime. No hidden live state.
// Policy: buy the available upgrade with the smallest cost / extra tap power.
const fs=require('node:fs'),vm=require('node:vm');
const current=require('../game.js');
const baseline={PUG_COSTS:[40,90,250,650,2500,5000,10000,22000,90000,650000,10000000,240000000,9000000000,1000000000000],HOME_COSTS:[70,140,300,500,1500,3500,12000,80000,900000,16000000,400000000,18000000000,2500000000000],PUG_BOOST:[1,1.02,1.04,1.07,1.1,1.12,1.14,1.17,1.2,1.35,1.6,1.9,2.3,2.8,3.5],HOME_BOOST:[1,1.005,1.01,1.02,1.03,1.08,1.11,1.15,1.25,1.4,1.6,1.9,2.3,3]};
let source=fs.readFileSync(require.resolve('../game.js'),'utf8');for(const[key,value]of Object.entries(baseline))source=source.replace(new RegExp('const '+key+' = \\[[\\s\\S]*?\\];'),'const '+key+' = '+JSON.stringify(value)+';');
const box={module:{exports:{}},require:id=>require('../'+id.replace('./',''))};vm.runInNewContext(source,box);const old=box.module.exports;
function simulate(api,tapsPerSecond,extras={}){
 let game=api.createGame(),seconds=0,checkpoints=[];
 for(let turn=0;turn<6000;turn++){
  const state=game.getState(),p=state.power.toNumber(),choices=[];
  for(let i=1;i<api.TOOLS.length;i++)if(i===1||state.levels[i-1]){const before=game.getToolPower(state.tool).toNumber(),after=game.getToolPower(i,state.levels[i]+1).toNumber(),gain=Math.max(0,after-before)*p/before;if(gain>0)choices.push({kind:'tool',i,cost:game.getToolPrice(i).toNumber(),gain});}
  for(const kind of ['pug','home'])if(state[kind]<(kind==='pug'?14:13))choices.push({kind,cost:game.getTrackPrice(kind).toNumber(),gain:p*game.getTrackGain(kind)});
  choices.sort((a,b)=>a.cost/a.gain-b.cost/b.gain);const choice=choices[0];if(!choice)break;
  // Optional average bonuses are independent scenario assumptions, not simulated catches.
  let rate=tapsPerSecond*(extras.combo||1)*(extras.coins||1)+(state.pug>=4?(extras.helper||0):0);
  if(extras.minis&&state.pug>=2)rate=rate*(1-95/600)+(extras.minis==='old'?75:760)/600;
  const wait=Math.max(0,choice.cost-state.balance.toNumber())/(p*rate);seconds+=wait;
  const save=game.serialize();save.bossWins=[true,true];const earned=wait*p*rate+choice.cost*1e-12;save.balance=api.Amount.from(state.balance.toNumber()+earned).toJSON();save.total=api.Amount.from(state.total.toNumber()+earned).toJSON();game=api.createGame(save);
  if(choice.kind==='tool')game.buyTool(choice.i);else{game.upgrade(choice.kind);checkpoints.push({kind:choice.kind,level:game.getState()[choice.kind],seconds:Math.round(seconds)});}
  if(game.getState().pug===14&&game.getState().home===13)break;
 }
 return{hours:Number((seconds/3600).toFixed(3)),checkpoints};
}
if(require.main===module){const rows=[];for(const rate of [2,4,6])for(const scenario of ['manual','events','events+minis']){
 const extras=scenario==='manual'?{}:{combo:1.1,coins:1.5,helper:1,...scenario==='events+minis'?{minis:true}:{}};
 const a=simulate(old,rate,{...extras,helper:scenario==='manual'?0:.15,...extras.minis?{minis:'old'}:{}}),b=simulate(current,rate,extras);rows.push({rate,scenario,oldHours:a.hours,newHours:b.hours,changePercent:Number((100*(b.hours/a.hours-1)).toFixed(1)),healthyMinutes:Number((b.checkpoints.find(x=>x.kind==='pug'&&x.level===8).seconds/60).toFixed(1))});
 }console.log(JSON.stringify({assumptions:'Continuous payback policy; event scenario averages combo 1.1, coin 1.5, helper level 1 free after stage 4 (old 0.15P/s, new 1P/s); minis perfect every 600s with 95s manual opportunity cost. Boss combat and loot waiting excluded. Not a forecast.',rows},null,2));}
module.exports={simulate,baseline};
