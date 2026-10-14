(function(root){
  'use strict';
  const WEAPONS=Object.freeze([
    {id:'stick',damage:1},{id:'spoon',damage:2},{id:'shank',damage:4},
    {id:'toothbrush',damage:8},{id:'pipe',damage:16},{id:'crowbar',damage:32},
    {id:'rustsword',damage:64},{id:'templar',damage:128},{id:'paladin',damage:256},
  ].map(Object.freeze));
  const JUNK=Object.freeze(['sock','crown','label','button','spring']);
  const COSMETICS=Object.freeze({tool:500000,pug:1000000,home:1500000,food:750000});
  const DURATIONS=Object.freeze([900,3600,10800]);
  const maxTier=home=>home<6?0:Math.min(8,home-5);
  function weights(home){
    const tier=maxTier(home);if(!tier)return [];
    const rows=[{index:-1,percent:40}],sum=Array.from({length:tier},(_,i)=>.7**i).reduce((a,b)=>a+b,0);
    for(let i=1;i<=tier;i++)rows.push({index:i,percent:60*.7**(tier-i)/sum});
    return rows;
  }
  function offer(duration,home,misses,trainingDone){
    const index=DURATIONS.indexOf(duration);if(index<0)return null;
    const unlocked=home>=6,training=unlocked&&duration===900&&!trainingDone;
    return{chance:unlocked?(training||misses>=2?100:[35,80,100][index]):0,
      rolls:training?3:[1,3,8][index],training,weights:weights(home),junkCount:index+1,pity:unlocked&&misses>=2};
  }
  function roll(offer,random=Math.random){
    const weapons=[],junk=[];
    const draw=()=>Math.max(0,Math.min(.999999,Number(random())||0));
    const success=offer.chance>0&&draw()*100<offer.chance;
    if(offer.training){for(let i=0;i<3;i++)weapons.push(-1);}
    else if(success)for(let n=0;n<offer.rolls;n++){
      const p=draw()*100;let sum=0;
      for(const entry of offer.weights){sum+=entry.percent;if(p<sum){weapons.push(entry.index);break;}}
    }
    for(let n=0;n<offer.junkCount;n++)junk.push(Math.floor(draw()*JUNK.length));
    return{weaponLoot:weapons,junkLoot:junk,weaponSuccess:offer.training||success,training:offer.training};
  }
  function fresh(){return{
    weapons:[1,...Array(8).fill(0)],weaponParts:0,weapon:0,showWeapon:true,
    junk:Array(5).fill(0),expeditionMisses:0,trainingDone:false,lastLoot:[],
    cosmeticUnlocks:[],skins:{tool:null,pug:null,home:null,food:null},
    ownedToolSkins:[0],maxPugSkin:0,maxHomeSkin:0,maxHelperSkin:0,
    helperSkin:null,helperSticker:'none',helperBurstUntil:0,helperBurstNext:0,
  };}
  const api={WEAPONS,JUNK,COSMETICS,DURATIONS,maxTier,weights,offer,roll,fresh};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PugInventoryRules=api;
})(typeof window==='undefined'?globalThis:window);
