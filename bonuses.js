(function(root){'use strict';
const TYPES=Object.freeze([{value:2,weight:45,pet:0},{value:3,weight:28,pet:1},{value:4,weight:15,pet:2},{value:5,weight:9,pet:3},{value:8,weight:3,pet:4}].map(Object.freeze));
function choose(random=Math.random){let n=Math.min(1-Number.EPSILON,Math.max(0,random()))*100;for(const type of TYPES){if(n<type.weight)return type;n-=type.weight;}return TYPES[4];}
function position(coin,clock,width,height){const p=Math.max(0,(clock-coin.start)/coin.duration),r=43;return {x:Math.max(r+8,Math.min(width-r-8,coin.x*width+coin.drift*width*p+Math.sin(p*Math.PI*coin.waves+coin.phase)*coin.sway*width*Math.sin(Math.PI*p))),y:-r+(height+r*2)*p,angle:coin.spin*Math.sin(p*Math.PI),p};}
function create(random=Math.random){let clock=0,next=35000,coin=null,serial=0,until=0,multiplier=1,speed=1;const make=type=>({...type,id:++serial,start:clock,duration:6500+random()*2500,x:.22+random()*.56,drift:(random()-.5)*.35,sway:.05+random()*.13,waves:1+Math.floor(random()*3),phase:random()*Math.PI,spin:(random()-.5)*40});return {
 tick(delta,eligible,width,height){if(eligible)clock+=Math.max(0,Math.min(1000,delta));let expired=false;if(coin&&clock-coin.start>=coin.duration){coin=null;expired=true;}if(!coin&&eligible&&clock>=next){const type=choose(random);coin=make(type);next=clock+(50000+random()*40000)/speed;}return {coin:coin?{...coin,...position(coin,clock,width,height)}:null,multiplier:clock<until?multiplier:1,seconds:Math.max(0,Math.ceil((until-clock)/1000)),expired};},
 catch(id){if(!coin||coin.id!==id||clock-coin.start>=coin.duration)return null;const picked={...coin};multiplier=clock<until?Math.max(multiplier,coin.value):coin.value;until=clock+30000;coin=null;return {value:picked.value,multiplier,pet:picked.pet};},
 force(value){const type=TYPES.find(t=>t.value===value);if(!type)return false;coin=make(type);next=clock+(50000+random()*40000)/speed;return true;},
 setSpeed(value){speed=[1,3,10].includes(value)?value:1;next=Math.min(next,clock+35000/speed);},
 cancelCoin(){coin=null;},
 getClock(){return clock;}
};}
const api={TYPES,choose,position,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PugBonuses=api;
})(typeof window!=='undefined'?window:globalThis);
