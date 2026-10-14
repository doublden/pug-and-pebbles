(function(root){
  'use strict';
  const BOSSES=Object.freeze([
    Object.freeze({id:'raccoon',home:6,hp:200,recommendedWeapon:1}),
    Object.freeze({id:'crow',home:7,hp:400,recommendedWeapon:2}),
  ]);
  const DURATION=30000,MAX_HITS=6;
  function create(index,damage,now){
    if(!BOSSES[index]||!Number.isSafeInteger(now)||now<0||!Number.isInteger(damage)||damage<1||damage>256)return null;
    return{index,hp:BOSSES[index].hp,maxHp:BOSSES[index].hp,damage,start:now,ends:now+DURATION,lastNow:now,hits:[],status:'active',strikes:0};
  }
  function status(fight,now){
    if(!fight)return null;
    // A device clock moving backwards must never extend a fight.
    fight.lastNow=Math.max(fight.lastNow,Number.isSafeInteger(now)?now:fight.lastNow);
    if(fight.status==='active'&&fight.lastNow>=fight.ends)fight.status='lost';
    return{index:fight.index,hp:fight.hp,maxHp:fight.maxHp,damage:fight.damage,start:fight.start,ends:fight.ends,
      remaining:Math.max(0,fight.ends-fight.lastNow),status:fight.status,strikes:fight.strikes};
  }
  function hit(fight,now){
    const s=status(fight,now);if(!s||s.status!=='active')return{accepted:false,...s};
    fight.hits=fight.hits.filter(t=>fight.lastNow-t<1000);
    if(fight.hits.length>=MAX_HITS)return{accepted:false,...s};
    fight.hits.push(fight.lastNow);fight.strikes++;fight.hp=Math.max(0,fight.hp-fight.damage);
    if(!fight.hp)fight.status='won';
    return{accepted:true,...status(fight,now)};
  }
  const api={BOSSES,DURATION,MAX_HITS,create,status,hit};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PugBattleRules=api;
})(typeof window==='undefined'?globalThis:window);
