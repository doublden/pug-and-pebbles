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
 {key:'paw',base:0,power:1},
 {key:'teaspoon',base:30,power:2},
 {key:'tablespoon',base:250,power:3},
 {key:'sandspade',base:1400,power:5},
 {key:'ladle',base:12000,power:15},
 {key:'scoop',base:85000,power:45},
 {key:'shovel',base:650000,power:150},
 {key:'bucket',base:5000000,power:500},
 {key:'digger',base:38000000,power:2000},
 {key:'royalscoop',base:320000000,power:8000}
].map(Object.freeze));
const PUG_COSTS=[90,650,5000,45000,500000,8000000,180000000,6000000000,800000000000];
const HOME_COSTS=[140,1100,9000,80000,900000,16000000,400000000,18000000000,2500000000000];
const PUG_BOOST=[1,1.04,1.1,1.2,1.35,1.6,1.9,2.3,2.8,3.5];
const HOME_BOOST=[1,1.03,1.08,1.15,1.25,1.4,1.6,1.9,2.3,3];
const MAX_LEVEL=1000000; // A validation ceiling, unreachable in a human lifetime.
function price(base,level,growth=1.18){const n=Amount.log(Math.log10(base)+level*Math.log10(growth));return n.e<12?new Amount(Math.ceil(n.toNumber()-1e-7)):n;}
function trackPrice(level,kind){const costs=kind==='pug'?PUG_COSTS:HOME_COSTS;if(level<9)return new Amount(costs[level]);return price(costs[8]*(kind==='pug'?2.8:3.1),level-9,kind==='pug'?2.8:3.1);}
function trackBoostLog(level,kind){const boosts=kind==='pug'?PUG_BOOST:HOME_BOOST;return Math.log10(boosts[Math.min(9,level)])+Math.max(0,level-9)*Math.log10(kind==='pug'?1.05:1.04);}
function toolPrice(index,level){return price(TOOLS[index].base,level,1.25-index*.01);}
function toolPower(index,level){if(index===0)return new Amount(1);if(!level)return new Amount();return Amount.log(Math.log10(TOOLS[index].power)+(level-1)*Math.log10(1.075)+Math.floor(level/25)*Math.log10(2));}
function integer(v,fallback=0){return Number.isInteger(v)&&v>=0&&v<=MAX_LEVEL?v:fallback;}
function createGame(saved){
 let state={balance:new Amount(),total:new Amount(),clicks:0,levels:[1,...Array(9).fill(0)],pug:0,home:0,bonusClicks:0};
 if(saved&&saved.version===2){
  try{
   const balance=Amount.from(saved.balance),total=Amount.from(saved.total);
   if(balance.compare(total)>0)throw new RangeError('Corrupt balance');
   const levels=TOOLS.map((_,i)=>i===0?1:integer(saved.levels?.[i]));
   state={balance,total,clicks:Number.isSafeInteger(saved.clicks)&&saved.clicks>=0?saved.clicks:0,levels,pug:integer(saved.pug),home:integer(saved.home),bonusClicks:integer(saved.bonusClicks)};
  }catch(_){ /* Invalid storage never poisons a new session. */ }
 }
 const bestTool=()=>state.levels.reduce((best,lv,i)=>toolPower(i,lv).compare(toolPower(best,state.levels[best]))>0?i:best,0);
 const power=()=>{const index=bestTool();const n=toolPower(index,state.levels[index]);return Amount.log(Math.log10(n.m)+n.e+trackBoostLog(state.pug,'pug')+trackBoostLog(state.home,'home'));};
 const spend=cost=>{if(state.balance.compare(cost)<0)return false;state.balance=state.balance.subtract(cost);return true;};
 return Object.freeze({
  getState(){return {...state,levels:[...state.levels],tool:bestTool(),power:power(),pugStage:Math.min(9,state.pug),homeStage:Math.min(9,state.home)};},
  serialize(){return {version:2,balance:state.balance.toJSON(),total:state.total.toJSON(),clicks:state.clicks,levels:[...state.levels],pug:state.pug,home:state.home,bonusClicks:state.bonusClicks};},
  getToolPrice(i){if(!Number.isInteger(i)||i<1||i>=TOOLS.length)return null;return toolPrice(i,state.levels[i]);},
  getTrackPrice(kind){if(!['pug','home'].includes(kind))return null;return trackPrice(state[kind],kind);},
  getToolPower(i,level=state.levels[i]){return toolPower(i,level);},
  dig(multiplier=1){if(!Number.isFinite(multiplier)||multiplier<1||multiplier>10)return new Amount();const amount=power().multiply(multiplier);state.balance=state.balance.add(amount);state.total=state.total.add(amount);state.clicks=Math.min(Number.MAX_SAFE_INTEGER,state.clicks+1);return amount;},
  buyTool(i){if(!Number.isInteger(i)||i<1||i>=TOOLS.length||state.levels[i]>=MAX_LEVEL)return false;if(i>1&&state.levels[i-1]===0)return false;if(!spend(toolPrice(i,state.levels[i])))return false;state.levels[i]++;return true;},
  upgrade(kind){if(!['pug','home'].includes(kind)||state[kind]>=MAX_LEVEL)return false;if(!spend(trackPrice(state[kind],kind)))return false;state[kind]++;return true;},
  claimBonus(){state.bonusClicks=Math.min(MAX_LEVEL,state.bonusClicks+1);}
 });
}
const api=Object.freeze({Amount,TOOLS,PUG_COSTS,HOME_COSTS,price,toolPrice,trackPrice,toolPower,createGame});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PugGame=api;
})(typeof window!=='undefined'?window:globalThis);
