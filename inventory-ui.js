(function(){
  'use strict';
  class InventoryUI {
    constructor(options){Object.assign(this,options);this.fingerprint='';}
    render(rebuild){
      const game=this.getGame(),s=game.getState(),w=this.words(),r=PugInventoryRules;
      const fingerprint=JSON.stringify([w.inventory,s.weapons,s.weaponParts,s.weapon,s.showWeapon,s.cosmeticUnlocks,s.skins,s.ownedToolSkins,s.maxPugSkin,s.maxHomeSkin,s.junk,s.home]);
      const content=document.getElementById('shop-content');
      if(rebuild||fingerprint!==this.fingerprint||!document.getElementById('inventory-grid')){
        this.fingerprint=fingerprint;
        const tier=r.maxTier(s.home);
        content.innerHTML=`<nav class="inventory-shortcuts"><button class="setting-action" data-inventory-jump="inventory-weapons">${w.weapons}</button><button class="setting-action" data-inventory-jump="inventory-looks">${w.appearances}</button><button class="setting-action" data-inventory-jump="inventory-junk">${w.junkTitle}</button></nav><p id="inventory-weapons" class="collection-note">${w.weaponRule}</p>${!s.weaponsUnlocked?`<p class="collection-note">${w.weaponGate}</p>`:''}<label class="setting-row">${w.showWeapon}<input type="checkbox" data-show-weapon ${s.showWeapon?'checked':''}></label><div class="parts-card"><strong>${w.parts}: ${s.weaponParts}</strong><button class="setting-action" data-merge="-1" ${s.weaponParts<3||!s.weaponsUnlocked?'disabled':''}>3 → ${w.weaponNames[1]}</button></div><div id="inventory-grid" class="tool-grid">`+
          r.WEAPONS.map((weapon,i)=>`<article class="tool-card weapon-card"><img src="weapons/${weapon.id}.svg" width="64" height="160" loading="lazy" alt=""><h2>${w.weaponNames[i]}</h2><p>${w.damage}: ${weapon.damage} · ×${s.weapons[i]}</p><button class="setting-action" data-weapon="${i}" ${!s.weaponsUnlocked||i>tier||!s.weapons[i]?'disabled':''}>${s.weaponsUnlocked&&s.weaponEquipped===i?w.equipped:w.wear}</button>${i>0&&i<8?`<button class="setting-action" data-merge="${i}" ${s.weapons[i]<3||i+1>tier?'disabled':''}>3 → ${w.weaponNames[i+1]}</button>`:''}${i>tier?`<small>${w.hatGate}: ${w.homeNames[Math.min(13,i+5)]}</small>`:''}</article>`).join('')+'</div>'+`<h2 id="inventory-looks">${w.appearances}</h2><p class="collection-note">${w.cosmeticRule}</p>`+
          Object.entries(r.COSMETICS).map(([kind,cost])=>{
            const options=kind==='tool'?s.ownedToolSkins:Array.from({length:(kind==='pug'?s.maxPugSkin:s.maxHomeSkin)+1},(_,i)=>i);
            const names=w[kind==='tool'?'toolNames':kind==='pug'?'pugNames':'homeNames'];
            return `<section class="cosmetic-card"><h3>${w.cosmeticNames[kind]}</h3>${s.cosmeticUnlocks.includes(kind)?`<label>${w.cosmeticNames[kind]}<select data-skin="${kind}"><option value="" ${s.skins[kind]===null?'selected':''}>${w.currentLook}</option>${options.map(i=>`<option value="${i}" ${s.skins[kind]===i?'selected':''}>${names[i]}</option>`).join('')}</select></label>`:`<button class="setting-action" data-cosmetic="${kind}">${w.unlockLooks} · ${this.format(cost)}</button>`}</section>`;
          }).join('')+`<h2 id="inventory-junk">${w.junkTitle}</h2><p class="collection-note">${w.junkRule}</p><div class="junk-grid">`+
          r.JUNK.map((id,i)=>`<article><span aria-hidden="true">${['🧦','👑','🏷️','🔘','🌀'][i]}</span><strong>${s.junk[i]?w.junkNames[i]:'???'}</strong><small>×${s.junk[i]}</small></article>`).join('')+'</div>';
      }
      for(const button of content.querySelectorAll('[data-cosmetic]'))button.disabled=s.balance.compare(r.COSMETICS[button.dataset.cosmetic])<0;
    }
  }
  window.PugInventoryUI=InventoryUI;
})();
