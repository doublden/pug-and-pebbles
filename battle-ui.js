(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  class BattleUI {
    constructor(options){
      Object.assign(this,options);this.active=false;this.loading=false;this.generation=0;
      $('boss-close').onclick=()=>this.closeMenu();
      $('boss-dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeMenu();});
      $('boss-start').onclick=()=>this.start();
      $('boss-inventory').onclick=()=>{this.closeMenu();this.inventory();};
      $('boss-home').onclick=()=>{this.closeMenu();this.home();};
      $('battle-exit').onclick=()=>this.finish(true);
      $('boss-target').addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();this.attack();}});
      $('boss-target').addEventListener('keydown',e=>{if(!e.repeat&&[' ','Enter'].includes(e.key)){e.preventDefault();this.attack();}});
    }
    open(index){
      if(this.active||this.loading)return;
      const game=this.getGame(),offer=game.bossOffer(index);if(!offer)return;
      this.index=offer.index;this.result=null;game.ackBossIntro();this.changed();this.renderMenu();$('boss-dialog').showModal();
    }
    renderMenu(){
      const offer=this.getGame().bossOffer(this.index),w=this.words();if(!offer)return;
      $('boss-title').textContent=w.bossNames[this.index];
      $('boss-copy').textContent=this.result?this.result.status==='won'?w.bossWon:w.bossLost:w.bossIntro;
      $('boss-stats').textContent=`${offer.hp} HP · ${w.damage}: ${offer.damage} · 30 ${w.secondsShort}`;
      $('boss-advice').textContent=w.bossAdvice.replace('{weapon}',w.weaponNames[offer.recommendedWeapon]);
      $('boss-reward').textContent=(offer.won?w.bossCleared:w.bossReward+' '+this.format(offer.reward)+' '+w.currency);
      $('boss-start').textContent=this.result?w.bossRetry:w.bossStart;
      $('boss-inventory').textContent=w.inventory;$('boss-home').textContent=w.bossHome;
      $('boss-home').hidden=!offer.won;$('boss-start').disabled=this.loading;
      $('boss-note').textContent=w.bossRules;
      $('boss-image').src=`battle-v7/${PugBattleRules.BOSSES[this.index].id}.webp`;
      $('boss-image').alt=w.bossNames[this.index];
    }
    async start(){
      if(this.loading||this.active||!this.isActive())return;
      this.loading=true;const token=++this.generation,game=this.getGame(),state=game.getState();
      const group=state.pugAppearance<6?'lean':state.pugAppearance<12?'healthy':'rich';
      $('boss-start').disabled=true;$('boss-start').textContent=this.words().loading;
      try{
        if(!this.metadata){const r=await fetch('battle-v7/frames.json');if(!r.ok)throw Error('frames');this.metadata=await r.json();}
        const keep=new Set(['battle-pug-'+group,'battle-'+PugBattleRules.BOSSES[this.index].id]);
        for(const key of Object.keys(this.world.images))if(key.startsWith('battle-')&&!keep.has(key)){delete this.world.images[key];this.world.loadingImages.delete(key);}
        await Promise.all([
          this.world.image('battle-pug-'+group,`battle-v7/pug-${group}.webp`),
          this.world.image('battle-'+PugBattleRules.BOSSES[this.index].id,`battle-v7/${PugBattleRules.BOSSES[this.index].id}.webp`),
          this.world.image('weapon-'+state.weaponEquipped,`weapons/${PugInventoryRules.WEAPONS[state.weaponEquipped].id}.svg`),
        ]);
        if(token!==this.generation||game!==this.getGame()||!this.isActive())return;
        this.wallStart=Date.now();this.monotonicStart=performance.now();
        if(!game.startBoss(this.index,this.wallStart))return;
        $('boss-dialog').close();this.active=true;this.result=null;this.ending=null;
        this.world.bossActive=true;this.world.setIdle(null);this.world.drops=[];this.world.particles=[];
        this.world.battle={index:this.index,group,weapon:state.weaponEquipped,metadata:this.metadata,started:performance.now(),
          attackAt:-10000,guardAt:-10000,bossAttackAt:-10000,hitAt:-10000,variant:0,bossVariant:0,status:'active'};
        this.nextBoss=performance.now()+3800;
        this.sound.unlock();this.sound.setBattle(true);this.sound.play('battleStart');
        document.getElementById('app').classList.add('in-battle');$('battle-hud').hidden=false;$('boss-target').hidden=false;
        $('boss-target').focus({preventScroll:true});this.changed();
      }catch(_){if(token===this.generation)this.toast(this.words().bossLoadError);}
      finally{if(token===this.generation){this.loading=false;if(!this.active)this.renderMenu();}}
    }
    fightNow(){return Math.floor(Math.max(Date.now(),this.wallStart+performance.now()-this.monotonicStart));}
    attack(){
      if(!this.active||!this.isActive())return;
      const result=this.getGame().attackBoss(this.fightNow());if(!result.accepted){if(result.status==='lost')this.finish();return;}
      const now=performance.now(),scene=this.world.battle;
      // Maintain the current swing, queue at most one follow-up. Fast input never resets a windup.
      if(now-scene.attackAt>440&&now-scene.guardAt>500)this.swing(now);else this.queued=true;
      this.changed();
      if(result.status==='won'){this.result=result;this.ending=now+850;}
    }
    swing(now){const scene=this.world.battle;scene.attackAt=now;scene.variant=(scene.variant+1)%2;this.sound.play('weaponSwing',scene.weapon);this.contactAt=now+180;}
    tick(now){
      if(!this.active)return;
      const status=this.getGame().battleStatus(this.fightNow());this.world.battle.status=status.status;
      $('battle-name').textContent=this.words().bossNames[this.index];
      $('battle-clock').textContent=(status.remaining/1000).toFixed(1)+'s';
      $('battle-hp').textContent=`${status.hp} / ${status.maxHp} HP`;
      $('battle-bar').style.width=status.hp/status.maxHp*100+'%';
      $('battle-tip').textContent=this.words().bossTap;$('battle-exit').textContent=this.words().bossLeave;
      if(status.status!=='active'){this.result??=status;if(status.status==='won'){this.ending??=now+850;if(now<this.ending)return;}this.finish();return;}
      if(!this.isActive())return;
      if(this.contactAt&&now>=this.contactAt){this.contactAt=0;this.world.battle.hitAt=now;this.sound.play('weaponImpact',this.world.battle.weapon);}
      if(now>=this.nextBoss&&now-this.world.battle.attackAt>450){
        this.world.battle.bossAttackAt=now;this.world.battle.bossVariant=(this.world.battle.bossVariant+1)%2;this.world.battle.guardAt=now;this.sound.play('weaponSwing',0);this.blockAt=now+220;this.nextBoss=now+3500+Math.random()*2000;
      }
      if(this.blockAt&&now>=this.blockAt){this.blockAt=0;this.sound.play('weaponBlock',this.world.battle.weapon);}
      if(this.queued&&now-this.world.battle.attackAt>460&&now-this.world.battle.guardAt>550){this.queued=false;this.swing(now);}
    }
    finish(cancelled=false){
      if(!this.active)return;
      this.active=false;this.queued=false;this.contactAt=0;this.blockAt=0;
      if(cancelled)this.getGame().cancelBoss();
      const result=this.result||this.getGame().battleStatus(this.fightNow());this.result=cancelled?null:result;
      this.world.bossActive=false;this.world.battle=null;this.world.nextPose=performance.now()+6000;
      $('app').classList.remove('in-battle');$('battle-hud').hidden=true;$('boss-target').hidden=true;
      this.sound.setBattle(false);this.changed();
      if(!cancelled){this.sound.play(result.status==='won'?'buy':'battleLose');this.renderMenu();$('boss-dialog').showModal();}
      else this.open(this.index);
    }
    closeMenu(){this.generation++;this.loading=false;$('boss-dialog').close();this.renderMenu();}
    reset(){this.generation++;this.loading=false;if(this.active){this.getGame().cancelBoss();this.active=false;}this.world.bossActive=false;this.world.battle=null;$('app').classList.remove('in-battle');$('battle-hud').hidden=true;$('boss-target').hidden=true;$('boss-dialog').close();this.sound.setBattle(false);}
    maybeIntro(){if(this.active||this.loading)return;const o=this.getGame().bossOffer();if(o&&!o.won&&!o.introDone)this.open(o.index);}
  }
  window.PugBattleUI=BattleUI;
})();
