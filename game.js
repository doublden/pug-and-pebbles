(function(root){
'use strict';
// Small immutable scientific-number type: currency continues well beyond 1e308.
class Amount {
  constructor(m=0,e=0){
    if(!Number.isFinite(m)||!Number.isFinite(e)||m<0||Math.abs(e)>1e9) throw new RangeError('Invalid amount');
    if(m===0){this.m=0;this.e=0;}else{const shift=Math.floor(Math.log10(m));this.m=m/10**shift;this.e=Math.trunc(e)+shift;}
    Object.freeze(this);
  }
  static from(v){if(v instanceof Amount)return v;if(typeof v==='number')return new Amount(v);if(v&&typeof v==='object'&&typeof v.m==='number'&&typeof v.e==='number')return new Amount(v.m,v.e);throw new TypeError('Invalid amount');}
  static log(v){if(!Number.isFinite(v))throw new RangeError('Invalid logarithm');const e=Math.floor(v);return new Amount(10**(v-e),e);}
  compare(value){const b=Amount.from(value);if(!this.m)return b.m?-1:0;if(!b.m)return 1;if(this.e!==b.e)return this.e>b.e?1:-1;const d=this.m-b.m;return Math.abs(d)<1e-12?0:d>0?1:-1;}
  add(value){const b=Amount.from(value);if(!this.m)return b;if(!b.m)return this;const hi=this.e>=b.e?this:b,lo=hi===this?b:this;if(hi.e-lo.e>16)return hi;return new Amount(hi.m+lo.m*10**(lo.e-hi.e),hi.e);}
  subtract(value){const b=Amount.from(value);if(this.compare(b)<0)throw new RangeError('Insufficient funds');if(this.compare(b)===0)return new Amount();if(this.e-b.e>16)return this;return new Amount(Math.max(0,this.m-b.m*10**(b.e-this.e)),this.e);}
  multiply(factor){if(!Number.isFinite(factor)||factor<0)throw new RangeError('Invalid multiplier');return new Amount(this.m*factor,this.e);}
  ratio(value){const b=Amount.from(value);if(!b.m)return 1;const d=this.e-b.e;if(d>4)return 1;if(d< -16)return 0;return Math.min(1,Math.max(0,this.m/b.m*10**d));}
  toNumber(){return this.m*10**this.e;}
  toJSON(){return {m:this.m,e:this.e};}
}
const TOOLS=Object.freeze([
 {key:'paw',base:0,power:1,growth:1},
 {key:'cap',base:8,power:1.3,growth:1.28},
 {key:'teaspoon',base:30,power:2,growth:1.24},
 {key:'tablespoon',base:250,power:3,growth:1.23},
 {key:'woodspoon',base:650,power:4,growth:1.225},
 {key:'sandspade',base:1400,power:5,growth:1.22},
 {key:'ladle',base:12000,power:15,growth:1.21},
 {key:'scoop',base:85000,power:45,growth:1.20},
 {key:'shovel',base:650000,power:150,growth:1.19},
 {key:'bucket',base:5000000,power:500,growth:1.18},
 {key:'digger',base:38000000,power:2000,growth:1.17},
 {key:'royalscoop',base:320000000,power:8000,growth:1.16}
].map(Object.freeze));
const PUG_COSTS=[40,90,250,650,2500,5000,10000,22000,90000,650000,10000000,240000000,9000000000,1000000000000];
const HOME_COSTS=[70,140,300,500,1500,3500,12000,80000,900000,16000000,400000000,18000000000,2500000000000];
const PUG_BOOST=[1,1.02,1.04,1.07,1.1,1.12,1.14,1.17,1.2,1.35,1.6,1.9,2.3,2.8,3.5];
const HOME_BOOST=[1,1.005,1.01,1.02,1.03,1.08,1.11,1.15,1.25,1.4,1.6,1.9,2.3,3];
const MAX_LEVEL=1000000; // A validation ceiling, unreachable in a human lifetime.
function price(base,level,growth=1.18){const n=Amount.log(Math.log10(base)+level*Math.log10(growth));return n.e<12?new Amount(Math.ceil(n.toNumber()-1e-7)):n;}
function trackPrice(level,kind){const costs=kind==='pug'?PUG_COSTS:HOME_COSTS,end=costs.length;if(level<end)return new Amount(costs[level]);const growth=kind==='pug'?2.8:3.1;return price(costs[end-1]*growth,level-end,growth);}
function trackBoostLog(level,kind){const boosts=kind==='pug'?PUG_BOOST:HOME_BOOST,last=boosts.length-1;return Math.log10(boosts[Math.min(last,level)])+Math.max(0,level-last)*Math.log10(kind==='pug'?1.05:1.04);}
function trackGain(level,kind){return 10**(trackBoostLog(level+1,kind)-trackBoostLog(level,kind))-1;}
const ACHIEVEMENTS=Object.freeze([
 {id:'first',target:1,progress:s=>s.clicks},
 {id:'hundred',target:100,progress:s=>s.clicks},
 {id:'thousand',target:1000,progress:s=>s.clicks},
 {id:'spoon',target:1,progress:s=>s.levels[2]},
 {id:'ladle',target:1,progress:s=>s.levels[6]},
 {id:'healthy',target:8,progress:s=>s.pug},
 {id:'yard',target:7,progress:s=>s.home},
 {id:'friend',target:1,progress:s=>s.bonusClicks},
 {id:'jackpot',target:1,progress:s=>s.rareBonuses},
 {id:'sneezer',target:100,progress:s=>s.sneezes}
].map(Object.freeze));
function toolPrice(index,level){return price(TOOLS[index].base,level,TOOLS[index].growth);}
function toolPower(index,level){if(index===0)return new Amount(1);if(!level)return new Amount();return Amount.log(Math.log10(TOOLS[index].power)+(level-1)*Math.log10(1.075)+Math.floor(level/25)*Math.log10(2));}
function integer(v,fallback=0){return Number.isInteger(v)&&v>=0&&v<=MAX_LEVEL?v:fallback;}
function createGame(saved){
 let state={balance:new Amount(),total:new Amount(),clicks:0,levels:[1,...Array(TOOLS.length-1).fill(0)],pug:0,home:0,bonusClicks:0,sneezes:0,farts:0,rareBonuses:0,birdPecks:0,birdsChased:0,achievements:[],testMode:false},restoreStatus='new';
 const safeCount=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 if(saved){
  restoreStatus='invalid';
  if([2,3,4].includes(saved.version))try{
   const balance=Amount.from(saved.balance),total=Amount.from(saved.total);if(balance.compare(total)>0)throw new RangeError('Corrupt balance');
   const oldPug=integer(saved.pug),oldHome=integer(saved.home),legacy=saved.version<4;
   const previousPug=saved.version===2?oldPug+(oldPug>=3?3:0):oldPug,previousHome=saved.version===2?oldHome+(oldHome>=3?2:oldHome>=1?1:0):oldHome;
   const pug=legacy?(previousPug===0?0:previousPug===1?2:previousPug+2):oldPug,home=legacy?(previousHome===0?0:previousHome===1?2:previousHome+2):oldHome;
   let levels=TOOLS.map((_,i)=>i===0?1:integer(saved.levels?.[i]));
   if(legacy){levels=[1,...Array(TOOLS.length-1).fill(0)];const map=[0,2,3,5,6,7,8,9,10,11];for(let i=1;i<map.length;i++)levels[map[i]]=integer(saved.levels?.[i]);if(levels[2])levels[1]=1;if(levels[5])levels[4]=1;}
   state={balance,total,clicks:safeCount(saved.clicks),levels,pug:Math.min(MAX_LEVEL,pug),home:Math.min(MAX_LEVEL,home),bonusClicks:safeCount(saved.bonusClicks),sneezes:safeCount(saved.sneezes),farts:safeCount(saved.farts),rareBonuses:safeCount(saved.rareBonuses),birdPecks:safeCount(saved.birdPecks),birdsChased:safeCount(saved.birdsChased),achievements:Array.isArray(saved.achievements)?[...new Set(saved.achievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))]:[],testMode:saved.testMode===true};restoreStatus=legacy?'migrated':'restored';
  }catch(_){/* Try backup storage in the UI before starting a fresh session. */}
 }
 let pending=[];
 const checkAchievements=()=>{for(const a of ACHIEVEMENTS)if(a.progress(state)>=a.target&&!state.achievements.includes(a.id)){state.achievements.push(a.id);pending.push(a.id);}};
 checkAchievements();pending=[];
 const bestTool=()=>state.levels.reduce((best,lv,i)=>toolPower(i,lv).compare(toolPower(best,state.levels[best]))>0?i:best,0);
 const power=()=>{const index=bestTool(),n=toolPower(index,state.levels[index]);return Amount.log(Math.log10(n.m)+n.e+trackBoostLog(state.pug,'pug')+trackBoostLog(state.home,'home'));};
 const spend=cost=>{if(state.balance.compare(cost)<0)return false;state.balance=state.balance.subtract(cost);return true;};
 return Object.freeze({
  restoreStatus,
  getState(){return {...state,levels:[...state.levels],achievements:[...state.achievements],tool:bestTool(),power:power(),pugStage:Math.min(14,state.pug),homeStage:Math.min(13,state.home)};},
  serialize(){return {version:4,balance:state.balance.toJSON(),total:state.total.toJSON(),clicks:state.clicks,levels:[...state.levels],pug:state.pug,home:state.home,bonusClicks:state.bonusClicks,sneezes:state.sneezes,farts:state.farts,rareBonuses:state.rareBonuses,birdPecks:state.birdPecks,birdsChased:state.birdsChased,achievements:[...state.achievements],testMode:state.testMode};},
  getToolPrice(i){if(!Number.isInteger(i)||i<1||i>=TOOLS.length)return null;return toolPrice(i,state.levels[i]);},
  getTrackPrice(kind){return ['pug','home'].includes(kind)?trackPrice(state[kind],kind):null;},
  getTrackGain(kind){return trackGain(state[kind],kind);},
  getToolPower(i,level=state.levels[i]){return toolPower(i,level);},
  getAchievements(){return ACHIEVEMENTS.map(a=>({id:a.id,target:a.target,progress:Math.min(a.target,a.progress(state)),unlocked:state.achievements.includes(a.id)}));},
  takeAchievements(){const ids=pending;pending=[];return ids;},
  dig(multiplier=1){if(!Number.isFinite(multiplier)||multiplier<1||multiplier>(state.testMode?800:8))return new Amount();const amount=power().multiply(multiplier);state.balance=state.balance.add(amount);state.total=state.total.add(amount);state.clicks=Math.min(Number.MAX_SAFE_INTEGER,state.clicks+1);checkAchievements();return amount;},
  buyTool(i){if(!Number.isInteger(i)||i<1||i>=TOOLS.length||state.levels[i]>=MAX_LEVEL)return false;if(i>1&&state.levels[i-1]===0)return false;if(!spend(toolPrice(i,state.levels[i])))return false;state.levels[i]++;checkAchievements();return true;},
  upgrade(kind){if(!['pug','home'].includes(kind)||state[kind]>=MAX_LEVEL)return false;if(!spend(trackPrice(state[kind],kind)))return false;state[kind]++;checkAchievements();return true;},
  claimBonus(multiplier){if(![2,3,4,5,8].includes(multiplier))return false;state.bonusClicks=Math.min(Number.MAX_SAFE_INTEGER,state.bonusClicks+1);if(multiplier===8)state.rareBonuses=Math.min(Number.MAX_SAFE_INTEGER,state.rareBonuses+1);checkAchievements();return true;},
  sneeze(){state.sneezes=Math.min(Number.MAX_SAFE_INTEGER,state.sneezes+1);checkAchievements();},
  enableTest(){state.testMode=true;},
  devGrant(value){const amount=Amount.from(value);state.testMode=true;state.balance=state.balance.add(amount);state.total=state.total.add(amount);},
  devStages(pug,home){state.testMode=true;state.pug=Math.min(14,integer(pug));state.home=Math.min(13,integer(home));checkAchievements();},
  devTool(index,level){if(!Number.isInteger(index)||index<1||index>=TOOLS.length)return false;state.testMode=true;for(let i=1;i<index;i++)state.levels[i]=Math.max(1,state.levels[i]);state.levels[index]=Math.max(1,Math.min(500,integer(level,1)));checkAchievements();return true;},
  birdPeck(){const tap=power(),amount=state.balance.compare(tap)>=0?tap:state.balance;state.balance=state.balance.subtract(amount);state.birdPecks=Math.min(Number.MAX_SAFE_INTEGER,state.birdPecks+1);return amount;},
  chaseBird(){state.birdsChased=Math.min(Number.MAX_SAFE_INTEGER,state.birdsChased+1);},
  fart(){state.farts=Math.min(Number.MAX_SAFE_INTEGER,state.farts+1);}
 });
}
const api=Object.freeze({Amount,TOOLS,PUG_COSTS,HOME_COSTS,PUG_BOOST,HOME_BOOST,ACHIEVEMENTS,price,toolPrice,trackPrice,trackGain,toolPower,createGame});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PugGame=api;
})(typeof window!=='undefined'?window:globalThis);
