(function (root) {
  'use strict';
  const Inventory =
    typeof module === 'object' && module.exports
      ? require('./inventory-rules.js')
      : root.PugInventoryRules;
  const Battle =
    typeof module === 'object' && module.exports
      ? require('./battle-rules.js')
      : root.PugBattleRules;
  const Secrets =
    typeof module === 'object' && module.exports ? require('./guests.js') : root.PugGuests;
  // Small immutable scientific-number type: currency continues well beyond 1e308.
  class Amount {
    constructor(m = 0, e = 0) {
      if (!Number.isFinite(m) || !Number.isFinite(e) || m < 0 || Math.abs(e) > 1e9)
        throw new RangeError('Invalid amount');
      if (m === 0) {
        this.m = 0;
        this.e = 0;
      } else {
        const shift = Math.floor(Math.log10(m));
        this.m = m / 10 ** shift;
        this.e = Math.trunc(e) + shift;
      }
      Object.freeze(this);
    }
    static from(v) {
      if (v instanceof Amount) return v;
      if (typeof v === 'number') return new Amount(v);
      if (v && typeof v === 'object' && typeof v.m === 'number' && typeof v.e === 'number')
        return new Amount(v.m, v.e);
      throw new TypeError('Invalid amount');
    }
    static log(v) {
      if (!Number.isFinite(v)) throw new RangeError('Invalid logarithm');
      const e = Math.floor(v);
      return new Amount(10 ** (v - e), e);
    }
    compare(value) {
      const b = Amount.from(value);
      if (!this.m) return b.m ? -1 : 0;
      if (!b.m) return 1;
      if (this.e !== b.e) return this.e > b.e ? 1 : -1;
      const d = this.m - b.m;
      return Math.abs(d) < 1e-12 ? 0 : d > 0 ? 1 : -1;
    }
    add(value) {
      const b = Amount.from(value);
      if (!this.m) return b;
      if (!b.m) return this;
      const hi = this.e >= b.e ? this : b,
        lo = hi === this ? b : this;
      if (hi.e - lo.e > 16) return hi;
      return new Amount(hi.m + lo.m * 10 ** (lo.e - hi.e), hi.e);
    }
    subtract(value) {
      const b = Amount.from(value);
      if (this.compare(b) < 0) throw new RangeError('Insufficient funds');
      if (this.compare(b) === 0) return new Amount();
      if (this.e - b.e > 16) return this;
      return new Amount(Math.max(0, this.m - b.m * 10 ** (b.e - this.e)), this.e);
    }
    multiply(factor) {
      if (!Number.isFinite(factor) || factor < 0) throw new RangeError('Invalid multiplier');
      return new Amount(this.m * factor, this.e);
    }
    ratio(value) {
      const b = Amount.from(value);
      if (!b.m) return 1;
      const d = this.e - b.e;
      if (d > 4) return 1;
      if (d < -16) return 0;
      return Math.min(1, Math.max(0, (this.m / b.m) * 10 ** d));
    }
    toNumber() {
      return this.m * 10 ** this.e;
    }
    toJSON() {
      return { m: this.m, e: this.e };
    }
  }
  const TOOLS = Object.freeze(
    [
      { key: 'paw', base: 0, power: 1, growth: 1 },
      { key: 'cap', base: 8, power: 1.3, growth: 1.28 },
      { key: 'teaspoon', base: 30, power: 2, growth: 1.24 },
      { key: 'tablespoon', base: 250, power: 3, growth: 1.23 },
      { key: 'woodspoon', base: 650, power: 4, growth: 1.225 },
      { key: 'sandspade', base: 1400, power: 5, growth: 1.22 },
      { key: 'ladle', base: 12000, power: 15, growth: 1.21 },
      { key: 'scoop', base: 85000, power: 45, growth: 1.2 },
      { key: 'shovel', base: 650000, power: 150, growth: 1.19 },
      { key: 'bucket', base: 5000000, power: 500, growth: 1.18 },
      { key: 'digger', base: 38000000, power: 2000, growth: 1.17 },
      { key: 'royalscoop', base: 320000000, power: 8000, growth: 1.16 },
    ].map(Object.freeze),
  );
  const PUG_COSTS = [
    110, 450, 1600, 7000, 27000, 57000, 130000, 310000, 1500000, 11000000, 180000000, 4500000000,
    180000000000, 20000000000000, 56000000000000,
  ];
  const HOME_COSTS = [
    170, 600, 2400, 10000, 16000, 40000, 150000, 1100000, 15000000, 270000000, 7200000000,
    340000000000, 49000000000000, 151900000000000,
  ];
  const PUG_BOOST = [
    1, 1.08, 1.17, 1.29, 1.42, 1.5, 1.61, 1.75, 1.94, 2.2, 2.65, 3.25, 4.05, 5.15, 6.75, 9.1125,
  ];
  const HOME_BOOST = [
    1, 1.07, 1.15, 1.25, 1.37, 1.47, 1.6, 1.76, 2.02, 2.36, 2.8, 3.38, 4.15, 5.35, 7.49,
  ];
  const HATS = Object.freeze(
    [
      { id: 'carrot', stage: 3, cost: 250, bonus: 'tap', factor: 1.12 },
      { id: 'frog', stage: 4, cost: 900, bonus: 'bonusTime', factor: 1.2 },
      { id: 'snowflake', stage: 5, cost: 3500, bonus: 'peckTime', factor: 1.35 },
      { id: 'bunny', stage: 6, cost: 12000, bonus: 'brush', factor: 1.25 },
      { id: 'ushanka', stage: 7, cost: 40000, bonus: 'birdLoss', factor: 0.75 },
      { id: 'cap', stage: 8, cost: 160000, bonus: 'helper', factor: 1.2 },
      { id: 'pirate', award: 'pirate', bonus: 'rareCoin', factor: 1 },
      { id: 'umbrella', award: 'bigSneeze', bonus: 'cooldown', factor: 0.9 },
      { id: 'pan', award: 'perfectCatch', bonus: 'catch', factor: 1.15 },
      { id: 'nightcap', award: 'dreamer', bonus: 'helperPrice', factor: 0.95 },
      { id: 'poop', award: 'bigFart', bonus: 'tapLuck', factor: 0.05 },
      { id: 'yogurt', award: 'yuppiCatch', bonus: 'expedition', factor: 1.1 },
      { id: 'butterfly', award: 'butterfly', bonus: 'insect', factor: 1.2 },
      { id: 'bee', award: 'beekeeper', bonus: 'expeditionTime', factor: 0.95 },
    ].map(Object.freeze),
  );
  const IDLE_KINDS = ['sleep', 'whistle', 'backlook', 'stretch', 'pee', 'hiccup', 'zoomies'];
  const MINI_COOLDOWN = 600000;
  const MINI_SECONDS = Object.freeze({ brush: 20, catch: 30, match: 45 });
  const newLifeBoost = (lives) => 1 + 0.2 * (1 - Math.exp(-Math.min(lives, 1000000) / 10));
  const MAX_LEVEL = 1000000; // A validation ceiling, unreachable in a human lifetime.
  function price(base, level, growth = 1.18) {
    const n = Amount.log(Math.log10(base) + level * Math.log10(growth));
    return n.e < 12 ? new Amount(Math.ceil(n.toNumber() - 1e-7)) : n;
  }
  function trackPrice(level, kind) {
    const costs = kind === 'pug' ? PUG_COSTS : HOME_COSTS,
      end = costs.length;
    if (level < end) return new Amount(costs[level]);
    const growth = kind === 'pug' ? 2.8 : 3.1;
    return price(costs[end - 1] * growth, level - end, growth);
  }
  function trackBoostLog(level, kind) {
    const boosts = kind === 'pug' ? PUG_BOOST : HOME_BOOST,
      last = boosts.length - 1;
    return (
      Math.log10(boosts[Math.min(last, level)]) +
      Math.max(0, level - last) * Math.log10(kind === 'pug' ? 1.05 : 1.04)
    );
  }
  function trackGain(level, kind) {
    return 10 ** (trackBoostLog(level + 1, kind) - trackBoostLog(level, kind)) - 1;
  }
  const ACHIEVEMENTS = Object.freeze(
    [
      { id: 'first', target: 1, progress: (s) => s.clicks },
      { id: 'hundred', target: 100, progress: (s) => s.clicks },
      { id: 'thousand', target: 1000, progress: (s) => s.clicks },
      { id: 'spoon', target: 1, progress: (s) => s.levels[2] },
      { id: 'ladle', target: 1, progress: (s) => s.levels[6] },
      { id: 'healthy', target: 8, progress: (s) => s.pug },
      { id: 'yard', target: 7, progress: (s) => s.home },
      { id: 'friend', target: 1, progress: (s) => s.bonusClicks },
      { id: 'jackpot', target: 1, progress: (s) => s.rareBonuses },
      { id: 'sneezer', target: 100, progress: (s) => s.sneezes },
      { id: 'pirate', target: 1, progress: (s) => s.piratesChased, secret: true },
      { id: 'bigSneeze', target: 1, progress: (s) => s.bigSneeze, secret: true },
      { id: 'perfectCatch', target: 1, progress: (s) => s.perfectCatch, secret: true },
      { id: 'dreamer', target: 5, progress: (s) => s.idleSeen.length, secret: true },
      { id: 'birdguard', target: 50, progress: (s) => s.birdsChased },
      { id: 'brushmaster', target: 10, progress: (s) => s.brushWins },
      { id: 'catchmaster', target: 10, progress: (s) => s.catchWins },
      { id: 'hatcollector', target: 6, progress: (s) => s.hats.length },
      { id: 'vasiliy', target: 1, progress: (s) => s.helper },
      { id: 'foreman', target: 25, progress: (s) => s.helper },
      { id: 'king', target: 14, progress: (s) => s.pug },
      { id: 'newlife', target: 1, progress: (s) => s.lives },
      { id: 'raccoon', target: 1, progress: (s) => s.bossCollection[0] },
      { id: 'crowboss', target: 1, progress: (s) => s.bossCollection[1] },
      { id: 'bigFart', target: 1, progress: (s) => s.bigFart, secret: true },
      { id: 'yuppiCatch', target: 1, progress: (s) => (s.yuppiCaught ? 1 : 0), secret: true },
      { id: 'butterfly', target: 50, progress: (s) => s.butterflies, secret: true },
      { id: 'beekeeper', target: 100, progress: (s) => s.bees, secret: true },
      { id: 'paladin', target: 1, progress: (s) => s.weapons[8], secret: true },
      { id: 'muscle', target: 15, progress: (s) => s.pug, secret: true },
      { id: 'dubai', target: 14, progress: (s) => s.home, secret: true },
      { id: 'catwhisperer', target: 100, progress: (s) => s.helperPets },
    ].map(Object.freeze),
  );
  function toolPrice(index, level) {
    return price(TOOLS[index].base, level, TOOLS[index].growth);
  }
  function toolPower(index, level) {
    if (index === 0) return new Amount(1);
    if (!level) return new Amount();
    return Amount.log(
      Math.log10(TOOLS[index].power) +
        (level - 1) * Math.log10(1.075) +
        Math.floor(level / 25) * Math.log10(2),
    );
  }
  function integer(v, fallback = 0) {
    return Number.isInteger(v) && v >= 0 && v <= MAX_LEVEL ? v : fallback;
  }
  function createGame(saved, random = Math.random, clock = Date.now) {
    let state = {
        balance: new Amount(),
        total: new Amount(),
        clicks: 0,
        levels: [1, ...Array(TOOLS.length - 1).fill(0)],
        pug: 0,
        home: 0,
        bonusClicks: 0,
        sneezes: 0,
        farts: 0,
        rareBonuses: 0,
        birdPecks: 0,
        birdsChased: 0,
        achievements: [],
        testMode: false,
        hats: [],
        hat: null,
        helper: 0,
        helperTotal: new Amount(),
        lives: 0,
        piratesChased: 0,
        bigSneeze: 0,
        perfectCatch: 0,
        idleSeen: [],
        brushWins: 0,
        catchWins: 0,
        miniNext: { brush: 0, catch: 0, match: 0 },
        matchWins: 0,
        expedition: null,
        ...Inventory.fresh(),
        ...Secrets.fresh(),
        bossWins: [false, false],
        bossOffers: [null, null],
        bossCollection: [0, 0],
        bossIntroDone: false,
      },
      restoreStatus = 'new';
    const safeCount = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : 0);
    if (saved) {
      restoreStatus = 'invalid';
      if ([2, 3, 4, 5, 6, 7, 8, 9].includes(saved.version))
        try {
          const balance = Amount.from(saved.balance),
            total = Amount.from(saved.total);
          if (balance.compare(total) > 0) throw new RangeError('Corrupt balance');
          const oldPug = integer(saved.pug),
            oldHome = integer(saved.home),
            legacy = saved.version < 4;
          const previousPug = saved.version === 2 ? oldPug + (oldPug >= 3 ? 3 : 0) : oldPug,
            previousHome =
              saved.version === 2 ? oldHome + (oldHome >= 3 ? 2 : oldHome >= 1 ? 1 : 0) : oldHome;
          const pug = legacy
              ? previousPug === 0
                ? 0
                : previousPug === 1
                  ? 2
                  : previousPug + 2
              : oldPug,
            home = legacy
              ? previousHome === 0
                ? 0
                : previousHome === 1
                  ? 2
                  : previousHome + 2
              : oldHome;
          let levels = TOOLS.map((_, i) => (i === 0 ? 1 : integer(saved.levels?.[i])));
          if (legacy) {
            levels = [1, ...Array(TOOLS.length - 1).fill(0)];
            const map = [0, 2, 3, 5, 6, 7, 8, 9, 10, 11];
            for (let i = 1; i < map.length; i++) levels[map[i]] = integer(saved.levels?.[i]);
            if (levels[2]) levels[1] = 1;
            if (levels[5]) levels[4] = 1;
          }
          state = {
            balance,
            total,
            clicks: safeCount(saved.clicks),
            levels,
            pug: Math.min(MAX_LEVEL, pug),
            home: Math.min(MAX_LEVEL, home),
            bonusClicks: safeCount(saved.bonusClicks),
            sneezes: safeCount(saved.sneezes),
            farts: safeCount(saved.farts),
            rareBonuses: safeCount(saved.rareBonuses),
            birdPecks: safeCount(saved.birdPecks),
            birdsChased: safeCount(saved.birdsChased),
            achievements: Array.isArray(saved.achievements)
              ? [
                  ...new Set(
                    saved.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id)),
                  ),
                ]
              : [],
            testMode: saved.testMode === true,
          };
          const array = (v, allowed) =>
            Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : [];
          const hats = array(
            saved.hats,
            HATS.map((h) => h.id),
          );
          Object.assign(state, {
            hats,
            hat: hats.includes(saved.hat) ? saved.hat : null,
            helper: integer(saved.helper),
            helperTotal: saved.helperTotal ? Amount.from(saved.helperTotal) : new Amount(),
            lives: integer(saved.lives),
            piratesChased: safeCount(saved.piratesChased),
            bigSneeze: safeCount(saved.bigSneeze),
            perfectCatch: safeCount(saved.perfectCatch),
            idleSeen: array(saved.idleSeen, IDLE_KINDS),
            brushWins: safeCount(saved.brushWins),
            catchWins: safeCount(saved.catchWins),
            matchWins: safeCount(saved.matchWins),
            expedition:
              saved.expedition &&
              [900, 3600, 10800].includes(saved.expedition.duration) &&
              Number.isSafeInteger(saved.expedition.ends) &&
              saved.expedition.ends >= 0
                ? {
                    duration: saved.expedition.duration,
                    ends: saved.expedition.ends,
                    reward: Amount.from(saved.expedition.reward),
                  }
                : null,
            miniNext: {
              brush: safeCount(saved.miniNext?.brush),
              catch: safeCount(saved.miniNext?.catch),
              match: safeCount(saved.miniNext?.match),
            },
          });
          const fresh = Inventory.fresh();
          Object.assign(state, fresh, {
            weapons: Inventory.WEAPONS.map((_, i) =>
              Math.max(i === 0 ? 1 : 0, integer(saved.weapons?.[i])),
            ),
            weaponParts: integer(saved.weaponParts),
            weapon: integer(saved.weapon) < 9 ? integer(saved.weapon) : 0,
            showWeapon: saved.showWeapon !== false,
            junk: Inventory.JUNK.map((_, i) => integer(saved.junk?.[i])),
            expeditionMisses: Math.min(2, integer(saved.expeditionMisses)),
            trainingDone: saved.trainingDone === true,
            lastLoot: Array.isArray(saved.lastLoot)
              ? saved.lastLoot
                  .slice(0, 11)
                  .filter((id) =>
                    ['part', ...Inventory.JUNK, ...Inventory.WEAPONS.map((w) => w.id)].includes(id),
                  )
              : [],
            cosmeticUnlocks: array(saved.cosmeticUnlocks, Object.keys(Inventory.COSMETICS)),
            ownedToolSkins: [
              ...new Set([
                0,
                ...array(
                  saved.ownedToolSkins,
                  TOOLS.map((_, i) => i),
                ),
                ...levels.flatMap((n, i) => (n ? [i] : [])),
              ]),
            ],
            maxPugSkin: Math.max(Math.min(15, pug), Math.min(15, integer(saved.maxPugSkin))),
            maxHomeSkin: Math.max(Math.min(14, home), Math.min(14, integer(saved.maxHomeSkin))),
            maxHelperSkin: Math.max(
              Math.min(10, Math.floor(state.helper / 10)),
              Math.min(10, integer(saved.maxHelperSkin)),
            ),
            helperSkin:
              Number.isInteger(saved.helperSkin) && saved.helperSkin >= 0 && saved.helperSkin <= 10
                ? saved.helperSkin
                : null,
            helperSticker: ['none', 'paw', 'fish', 'star'].includes(saved.helperSticker)
              ? saved.helperSticker
              : 'none',
            helperBurstUntil: safeCount(saved.helperBurstUntil),
            helperBurstNext: safeCount(saved.helperBurstNext),
          });
          for (const kind of Object.keys(Inventory.COSMETICS)) {
            const v = saved.skins?.[kind],
              max = kind === 'pug' ? state.maxPugSkin : state.maxHomeSkin;
            if (
              state.cosmeticUnlocks.includes(kind) &&
              Number.isInteger(v) &&
              v >= 0 &&
              (kind === 'tool' ? state.ownedToolSkins.includes(v) : v <= max)
            )
              state.skins[kind] = v;
          }
          if (!state.weapons[state.weapon]) state.weapon = 0;
          if (state.helperSkin > state.maxHelperSkin) state.helperSkin = null;
          if (state.expedition && saved.expedition) {
            const ex = state.expedition,
              raw = saved.expedition;
            ex.weaponLoot = Array.isArray(raw.weaponLoot)
              ? raw.weaponLoot.slice(0, 8).filter((i) => Number.isInteger(i) && i >= -1 && i < 9)
              : [];
            ex.junkLoot = Array.isArray(raw.junkLoot)
              ? raw.junkLoot.slice(0, 3).filter((i) => Number.isInteger(i) && i >= 0 && i < 5)
              : [];
            ex.weaponSuccess = raw.weaponSuccess === true;
            ex.training = raw.training === true;
            ex.weaponEligible = raw.weaponEligible === true;
            ex.notified = raw.notified === true;
            ex.duplicateReward = raw.duplicateReward
              ? Amount.from(raw.duplicateReward)
              : new Amount();
          }
          Object.assign(state, {
            bossWins: Battle.BOSSES.map((b, i) =>
              saved.version < 8 ? home > b.home : saved.bossWins?.[i] === true,
            ),
            bossOffers: Battle.BOSSES.map((_, i) =>
              saved.version >= 8 && saved.bossOffers?.[i] ? Amount.from(saved.bossOffers[i]) : null,
            ),
            bossCollection: Battle.BOSSES.map((_, i) => safeCount(saved.bossCollection?.[i])),
            bossIntroDone: saved.bossIntroDone === true || (saved.version < 8 && home > 6),
          });
          const secretFresh = Secrets.fresh();
          Object.assign(state, secretFresh, {
            netPrice: saved.netPrice ? Amount.from(saved.netPrice) : null,
            netPrize: saved.netPrize ? Amount.from(saved.netPrize) : null,
            netBought: saved.netBought === true,
            yuppiCaught: saved.yuppiCaught === true,
            bigFart: safeCount(saved.bigFart),
            butterflies: safeCount(saved.butterflies),
            bees: safeCount(saved.bees),
            helperPets: safeCount(saved.helperPets),
            beds: array(
              saved.beds,
              Secrets.BEDS.map((b) => b.id),
            ),
            hiddenRevealed: saved.hiddenRevealed === true,
            newLifeFloor:
              saved.newLifeFloor === 14 || (saved.version < 9 && (pug >= 14 || state.lives > 0))
                ? 14
                : 15,
            newLifeUnlocked:
              saved.newLifeUnlocked === true ||
              (saved.version < 9 && (pug >= 14 || state.lives > 0)) ||
              pug >= 15,
          });
          if (state.beds.includes(saved.bed)) state.bed = saved.bed;
          for (const kind of Object.keys(secretFresh.guestWait)) {
            const n = saved.guestWait?.[kind];
            if (Number.isFinite(n) && n >= 0)
              state.guestWait[kind] = Math.min(Secrets.TYPES[kind].max, n);
          }
          for (const id of Secrets.GUESTS) {
            const n = saved.guestStats?.[id];
            state.guestStats[id] = { seen: safeCount(n?.seen), caught: safeCount(n?.caught) };
          }
          restoreStatus = legacy ? 'migrated' : 'restored';
        } catch (_) {
          /* Try backup storage in the UI before starting a fresh session. */
        }
    }
    let pending = [],
      miniTicket = null,
      battle = null;
    let guestRunner = Secrets.create(state.guestWait, random),
      guestRewards = new Map();
    const bedEffect = (kind) => {
      const b = Secrets.BEDS.find((b) => b.id === state.bed);
      return b?.bonus === kind ? b.factor : 1;
    };
    const hatEffect = (kind) => {
      const h = HATS.find((h) => h.id === state.hat);
      return (h?.bonus === kind ? h.factor : 1) * bedEffect(kind);
    };
    const checkAchievements = () => {
      for (let pass = 0; pass < 2; pass++) {
        for (const a of ACHIEVEMENTS)
          if (a.progress(state) >= a.target && !state.achievements.includes(a.id)) {
            state.achievements.push(a.id);
            pending.push(a.id);
          }
        for (const b of Secrets.BEDS)
          if (b.award && state.achievements.includes(b.award) && !state.beds.includes(b.id))
            state.beds.push(b.id);
        if (state.pug >= 15) state.newLifeUnlocked = true;
        for (const h of HATS)
          if (h.award && state.achievements.includes(h.award) && !state.hats.includes(h.id))
            state.hats.push(h.id);
      }
    };
    checkAchievements();
    pending = [];
    const bestTool = () =>
      state.levels.reduce(
        (best, lv, i) =>
          toolPower(i, lv).compare(toolPower(best, state.levels[best])) > 0 ? i : best,
        0,
      );
    const power = (index = bestTool()) => {
      const n = toolPower(index, state.levels[index]);
      return Amount.log(
        Math.log10(n.m) +
          n.e +
          trackBoostLog(state.pug, 'pug') +
          trackBoostLog(state.home, 'home') +
          Math.log10(newLifeBoost(state.lives)) +
          Math.log10(hatEffect('tap')),
      );
    };
    const bossIndex = () => Battle.BOSSES.findIndex((b) => b.home === state.home);
    const bossGate = () => {
      const i = bossIndex();
      return i >= 0 && !state.bossWins[i] ? i : null;
    };
    const ensureBossOffer = () => {
      const i = bossIndex();
      if (i < 0 || state.bossWins[i] || state.bossOffers[i]) return;
      const tap = power().multiply(100),
        cap = trackPrice(state.home, 'home').multiply(0.05);
      state.bossOffers[i] = tap.compare(cap) < 0 ? tap : cap;
    };
    ensureBossOffer();
    const ensureNet = () => {
      if (state.home >= Secrets.HOME && (!state.netPrice || !state.netPrize)) {
        state.netPrice = power().multiply(30000);
        state.netPrize = power().multiply(45000);
      }
    };
    ensureNet();
    const observe = (kind, test = false, caught = false) => {
      if (test || !Secrets.GUESTS.includes(kind)) return;
      const stat = state.guestStats[kind];
      if (caught) stat.caught = Math.min(Number.MAX_SAFE_INTEGER, stat.caught + 1);
      else stat.seen = Math.min(Number.MAX_SAFE_INTEGER, stat.seen + 1);
    };
    const battleActive = () => battle?.status === 'active';
    const credit = (amount) => {
      state.balance = state.balance.add(amount);
      state.total = state.total.add(amount);
      return amount;
    };
    const helperBaseRate = (p = null) =>
      state.helper
        ? (p || power()).multiply(state.helper ** 0.35 * hatEffect('helper'))
        : new Amount();
    const helperRate = () =>
      state.expedition
        ? new Amount()
        : helperBaseRate().multiply(clock() < state.helperBurstUntil ? 2 : 1);
    const expeditionCopy = () =>
      state.expedition
        ? {
            ...state.expedition,
            weaponLoot: [...state.expedition.weaponLoot],
            junkLoot: [...state.expedition.junkLoot],
          }
        : null;
    const appearance = (tool = bestTool()) => ({
      toolAppearance: state.skins.tool ?? tool,
      pugAppearance: state.skins.pug ?? Math.min(15, state.pug),
      homeAppearance: state.skins.home ?? Math.min(14, state.home),
      foodAppearance: state.skins.food ?? Math.min(14, state.home),
      weaponEquipped:
        state.home >= 6 && state.weapon <= Inventory.maxTier(state.home) ? state.weapon : 0,
      weaponsUnlocked: state.home >= 6,
      helperTier: state.helperSkin ?? Math.min(10, Math.floor(state.helper / 10)),
      helperBurstActive: !!state.helper && !state.expedition && clock() < state.helperBurstUntil,
      helperBurstSeconds: Math.max(0, Math.ceil((state.helperBurstNext - clock()) / 1000)),
    });
    const helperPrice = () => price(500, state.helper, 1.35).multiply(hatEffect('helperPrice'));
    const spend = (cost) => {
      if (state.balance.compare(cost) < 0) return false;
      state.balance = state.balance.subtract(cost);
      return true;
    };
    const bulkCost = (kind, index, count) => {
      let level = kind === 'tool' ? state.levels[index] : state[kind],
        total = new Amount();
      const next = (lv) =>
        kind === 'tool'
          ? toolPrice(index, lv)
          : kind === 'helper'
            ? price(500, lv, 1.35).multiply(hatEffect('helperPrice'))
            : trackPrice(lv, kind);
      while (count && next(level).e < 12) {
        total = total.add(next(level++));
        count--;
      }
      // Finite visual track prices are not geometric; consume those first.
      const end = kind === 'pug' ? PUG_COSTS.length : kind === 'home' ? HOME_COSTS.length : 0;
      while (count && level < end) {
        total = total.add(next(level++));
        count--;
      }
      if (count) {
        const first = next(level),
          growth =
            kind === 'tool'
              ? TOOLS[index].growth
              : kind === 'helper'
                ? 1.35
                : kind === 'pug'
                  ? 2.8
                  : 3.1;
        const log = count * Math.log10(growth);
        const factorLog =
          log > 15
            ? log - Math.log10(growth - 1)
            : Math.log10(Math.expm1(count * Math.log(growth)) / (growth - 1));
        total = total.add(Amount.log(Math.log10(first.m) + first.e + factorLog));
      }
      return total;
    };
    const quoteCache = new Map();
    const quote = (kind, index = 0, mode = 1) => {
      if (
        !['tool', 'pug', 'home', 'helper'].includes(kind) ||
        (kind === 'tool' && (!Number.isInteger(index) || index < 1 || index >= TOOLS.length))
      )
        return { count: 0, cost: new Amount() };
      if (kind === 'pug' || kind === 'home') mode = 1;
      const lv = kind === 'tool' ? state.levels[index] : state[kind],
        locked =
          kind === 'tool'
            ? index > 1 && !state.levels[index - 1]
            : kind === 'helper'
              ? state.pug < 4
              : kind === 'home' && bossGate() !== null;
      if (lv >= MAX_LEVEL) return { count: 0, cost: new Amount() };
      if (locked) {
        const count = mode === 10 ? 10 : 1;
        return { count, cost: bulkCost(kind, index, count), locked: true };
      }
      const cacheKey = kind + '-' + index + '-' + mode,
        cached = quoteCache.get(cacheKey);
      if (
        cached &&
        cached.level === lv &&
        cached.hat === state.hat &&
        (mode !== 'max' ||
          (cached.q.cost.compare(state.balance) <= 0 && cached.next.compare(state.balance) > 0))
      )
        return cached.q;
      let count;
      if (mode === 'max') {
        let lo = 0,
          hi = MAX_LEVEL - lv;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (bulkCost(kind, index, mid).compare(state.balance) <= 0) lo = mid;
          else hi = mid - 1;
        }
        count = lo;
      } else count = Math.min(mode === 10 ? 10 : 1, MAX_LEVEL - lv);
      const q = Object.freeze({ count, cost: bulkCost(kind, index, count) });
      quoteCache.set(cacheKey, {
        level: lv,
        hat: state.hat,
        q,
        next:
          mode === 'max' && lv + count < MAX_LEVEL
            ? bulkCost(kind, index, count + 1)
            : Amount.log(1e8),
      });
      return q;
    };
    return Object.freeze({
      restoreStatus,
      getState() {
        const tool = bestTool(),
          p = power(tool),
          base = helperBaseRate(p);
        return {
          ...state,
          bossWins: [...state.bossWins],
          bossOffers: [...state.bossOffers],
          bossCollection: [...state.bossCollection],
          guestWait: { ...state.guestWait },
          guestStats: Object.fromEntries(
            Object.entries(state.guestStats).map(([id, n]) => [id, { ...n }]),
          ),
          beds: [...state.beds],
          hats: [...state.hats],
          idleSeen: [...state.idleSeen],
          miniNext: { ...state.miniNext },
          expedition: expeditionCopy(),
          weapons: [...state.weapons],
          junk: [...state.junk],
          skins: { ...state.skins },
          cosmeticUnlocks: [...state.cosmeticUnlocks],
          ownedToolSkins: [...state.ownedToolSkins],
          lastLoot: [...state.lastLoot],
          ...appearance(tool),
          helperRate: state.expedition
            ? new Amount()
            : base.multiply(clock() < state.helperBurstUntil ? 2 : 1),
          helperBaseRate: base,
          lifeBoost: newLifeBoost(state.lives),
          levels: [...state.levels],
          achievements: [...state.achievements],
          tool,
          power: p,
          pugStage: Math.min(15, state.pug),
          homeStage: Math.min(14, state.home),
        };
      },
      serialize() {
        return {
          ...state,
          version: 9,
          bossWins: [...state.bossWins],
          bossOffers: state.bossOffers.map((n) => n?.toJSON() ?? null),
          bossCollection: [...state.bossCollection],
          balance: state.balance.toJSON(),
          total: state.total.toJSON(),
          helperTotal: state.helperTotal.toJSON(),
          guestWait: { ...state.guestWait },
          guestStats: Object.fromEntries(
            Object.entries(state.guestStats).map(([id, n]) => [id, { ...n }]),
          ),
          beds: [...state.beds],
          hats: [...state.hats],
          idleSeen: [...state.idleSeen],
          miniNext: { ...state.miniNext },
          expedition: expeditionCopy(),
          weapons: [...state.weapons],
          junk: [...state.junk],
          skins: { ...state.skins },
          cosmeticUnlocks: [...state.cosmeticUnlocks],
          ownedToolSkins: [...state.ownedToolSkins],
          lastLoot: [...state.lastLoot],
          levels: [...state.levels],
          achievements: [...state.achievements],
        };
      },
      getToolPrice(i) {
        if (!Number.isInteger(i) || i < 1 || i >= TOOLS.length) return null;
        return toolPrice(i, state.levels[i]);
      },
      getTrackPrice(kind) {
        return ['pug', 'home'].includes(kind) ? trackPrice(state[kind], kind) : null;
      },
      getTrackGain(kind) {
        return trackGain(state[kind], kind);
      },
      getToolPower(i, level = state.levels[i]) {
        return toolPower(i, level);
      },
      toolGain(i, count = 1) {
        if (
          !Number.isInteger(i) ||
          i < 1 ||
          i >= TOOLS.length ||
          !Number.isSafeInteger(count) ||
          count < 0
        )
          return new Amount();
        const index = bestTool(),
          best = toolPower(index, state.levels[index]),
          after = toolPower(i, state.levels[i] + count);
        if (after.compare(best) <= 0) return new Amount();
        const delta = after.subtract(best);
        return Amount.log(
          Math.log10(delta.m) +
            delta.e +
            trackBoostLog(state.pug, 'pug') +
            trackBoostLog(state.home, 'home') +
            Math.log10(newLifeBoost(state.lives)) +
            Math.log10(hatEffect('tap')),
        );
      },
      shopAvailability() {
        const tools = TOOLS.some(
            (_, i) =>
              i > 0 &&
              (i === 1 || state.levels[i - 1]) &&
              state.levels[i] < MAX_LEVEL &&
              state.balance.compare(toolPrice(i, state.levels[i])) >= 0,
          ),
          newTool = TOOLS.some(
            (_, i) =>
              i > 0 &&
              !state.levels[i] &&
              (i === 1 || state.levels[i - 1]) &&
              state.balance.compare(toolPrice(i, 0)) >= 0,
          ),
          pug = state.pug < MAX_LEVEL && state.balance.compare(trackPrice(state.pug, 'pug')) >= 0,
          home =
            bossGate() === null &&
            state.home < MAX_LEVEL &&
            state.balance.compare(trackPrice(state.home, 'home')) >= 0,
          hats = HATS.some(
            (h) =>
              !h.award &&
              !state.hats.includes(h.id) &&
              state.pug >= h.stage &&
              state.balance.compare(h.cost) >= 0,
          ),
          helper =
            state.pug >= 4 && state.helper < MAX_LEVEL && state.balance.compare(helperPrice()) >= 0;
        const inventory =
          Object.entries(Inventory.COSMETICS).some(
            ([kind, cost]) =>
              !state.cosmeticUnlocks.includes(kind) && state.balance.compare(cost) >= 0,
          ) ||
          (state.home >= 6 &&
            (state.weaponParts >= 3 ||
              state.weapons.some((n, i) => i > 0 && i < Inventory.maxTier(state.home) && n >= 3)));
        const beds = Secrets.BEDS.some(
          (b) =>
            !b.award &&
            !state.beds.includes(b.id) &&
            state.home >= b.home &&
            state.balance.compare(b.cost) >= 0,
        );
        return { main: newTool || pug || home, tools, pug, home, hats, helper, inventory, beds };
      },
      bossGate,
      bossOffer(index = bossIndex()) {
        if (!Battle.BOSSES[index] || state.home < Battle.BOSSES[index].home) return null;
        ensureBossOffer();
        return {
          ...Battle.BOSSES[index],
          index,
          won: state.bossWins[index],
          reward: state.bossOffers[index] || new Amount(),
          damage: Inventory.WEAPONS[appearance().weaponEquipped].damage,
          introDone: state.bossIntroDone,
        };
      },
      ackBossIntro() {
        state.bossIntroDone = true;
      },
      startBoss(index = bossIndex(), now = clock()) {
        if (
          battleActive() ||
          miniTicket ||
          !Battle.BOSSES[index] ||
          state.home < Battle.BOSSES[index].home
        )
          return false;
        ensureBossOffer();
        battle = Battle.create(index, Inventory.WEAPONS[appearance().weaponEquipped].damage, now);
        return !!battle;
      },
      battleStatus(now = clock()) {
        return Battle.status(battle, now);
      },
      attackBoss(now = clock()) {
        const result = Battle.hit(battle, now);
        result.reward = new Amount();
        if (result.accepted && result.status === 'won' && !state.bossWins[result.index]) {
          state.bossWins[result.index] = true;
          result.reward = credit(state.bossOffers[result.index] || new Amount());
          state.bossCollection[result.index] = Math.min(
            Number.MAX_SAFE_INTEGER,
            state.bossCollection[result.index] + 1,
          );
          checkAchievements();
        }
        return result;
      },
      cancelBoss() {
        if (battle) battle.status = 'cancelled';
      },
      bedEffect,
      buyBed(id) {
        const b = Secrets.BEDS.find((b) => b.id === id);
        if (
          !b ||
          b.award ||
          state.beds.includes(id) ||
          state.home < b.home ||
          battleActive() ||
          !spend(new Amount(b.cost))
        )
          return false;
        state.beds.push(id);
        state.bed = id;
        return true;
      },
      equipBed(id) {
        if (id !== null && !state.beds.includes(id)) return false;
        state.bed = id;
        return true;
      },
      petHelper() {
        if (!state.helper || state.expedition || battleActive()) return false;
        state.helperPets = Math.min(Number.MAX_SAFE_INTEGER, state.helperPets + 1);
        checkAchievements();
        return true;
      },
      markFartCoverage(covered, total) {
        if (
          Number.isInteger(covered) &&
          Number.isInteger(total) &&
          total > 0 &&
          !state.bigFart &&
          covered / total >= 0.995
        ) {
          state.bigFart = 1;
          checkAchievements();
          return true;
        }
        return false;
      },
      netOffer() {
        ensureNet();
        return {
          visible: state.home >= Secrets.HOME || state.hiddenRevealed,
          unlocked: state.home >= Secrets.HOME,
          bought: state.netBought,
          price: state.netPrice || power().multiply(30000),
          prize: state.netPrize || power().multiply(45000),
        };
      },
      buyNet() {
        ensureNet();
        if (
          battleActive() ||
          state.home < Secrets.HOME ||
          state.netBought ||
          !state.netPrice ||
          !spend(state.netPrice)
        )
          return false;
        state.netBought = true;
        return true;
      },
      tickGuests(delta, playing, ready = true) {
        const result = guestRunner.tick(delta, playing && !battleActive(), state.home, ready);
        for (const a of result.spawned) {
          observe(a.kind, a.test);
          guestRewards.set(
            a.id,
            power().multiply(
              a.kind === 'yuppi' ? 100 : Secrets.TYPES[a.kind].reward * hatEffect('insect'),
            ),
          );
        }
        const live = new Set(result.actors.map((a) => a.id));
        for (const id of guestRewards.keys()) if (!live.has(id)) guestRewards.delete(id);
        return result;
      },
      claimGuest(id) {
        const a = guestRunner.get(id);
        if (!a || battleActive() || a.elapsed >= a.life) return null;
        let caught = false,
          amount = new Amount();
        if (a.kind === 'yuppi') {
          if (!a.test && state.home < Secrets.HOME) return null;
          if (state.netBought && !state.yuppiCaught) {
            caught = true;
            if (!a.test) {
              state.yuppiCaught = true;
              amount = state.netPrize;
            }
          } else {
            if (a.paid >= 3) return null;
            a.paid++;
            if (!a.test) amount = guestRewards.get(id) || new Amount();
          }
          if (caught) guestRunner.remove(id);
        } else {
          guestRunner.remove(id);
          if (!a.test) {
            amount = guestRewards.get(id) || new Amount();
            if (a.kind === 'butterfly')
              state.butterflies = Math.min(Number.MAX_SAFE_INTEGER, state.butterflies + 1);
            else state.bees = Math.min(Number.MAX_SAFE_INTEGER, state.bees + 1);
          }
        }
        if (!a.test) {
          credit(amount);
          if (a.kind !== 'yuppi' || caught) observe(a.kind, false, true);
          checkAchievements();
        }
        return { kind: a.kind, caught, test: a.test, amount };
      },
      devGuest(kind) {
        state.testMode = true;
        const actor = guestRunner.force(kind);
        if (actor) guestRewards.set(actor.id, new Amount());
        return actor;
      },
      devRevealHidden() {
        state.testMode = true;
        state.hiddenRevealed = true;
        return true;
      },
      miniRewardLimit(kind) {
        return Object.hasOwn(MINI_SECONDS, kind)
          ? power().multiply(8 * MINI_SECONDS[kind])
          : new Amount();
      },
      getAchievements() {
        return ACHIEVEMENTS.map((a) => ({
          id: a.id,
          secret: !!a.secret,
          target: a.target,
          progress: Math.min(a.target, a.progress(state)),
          unlocked: state.achievements.includes(a.id),
        }));
      },
      takeAchievements() {
        const ids = pending;
        pending = [];
        return ids;
      },
      dig(multiplier = 1, combo = 1) {
        if (battleActive()) return new Amount();
        if (
          !Number.isFinite(multiplier) ||
          multiplier < 1 ||
          multiplier > (state.testMode ? 800 : 8) ||
          !Number.isFinite(combo) ||
          combo < 1 ||
          combo > 1.2
        )
          return new Amount();
        const amount = power().multiply(
          multiplier * combo * (state.hat === 'poop' && random() < 0.05 ? 2 : 1),
        );
        credit(amount);
        state.clicks = Math.min(Number.MAX_SAFE_INTEGER, state.clicks + 1);
        checkAchievements();
        return amount;
      },
      buyTool(i) {
        if (!Number.isInteger(i) || i < 1 || i >= TOOLS.length || state.levels[i] >= MAX_LEVEL)
          return false;
        if (i > 1 && state.levels[i - 1] === 0) return false;
        if (!spend(toolPrice(i, state.levels[i]))) return false;
        state.levels[i]++;
        if (!state.ownedToolSkins.includes(i)) state.ownedToolSkins.push(i);
        checkAchievements();
        return true;
      },
      upgrade(kind) {
        if (
          battleActive() ||
          (kind === 'home' && bossGate() !== null) ||
          !['pug', 'home'].includes(kind) ||
          state[kind] >= MAX_LEVEL
        )
          return false;
        if (!spend(trackPrice(state[kind], kind))) return false;
        state[kind]++;
        state.skins[kind] = null;
        if (kind === 'pug') state.maxPugSkin = Math.max(state.maxPugSkin, Math.min(15, state.pug));
        else state.maxHomeSkin = Math.max(state.maxHomeSkin, Math.min(14, state.home));
        ensureBossOffer();
        ensureNet();
        checkAchievements();
        return true;
      },
      claimBonus(multiplier) {
        if (![2, 3, 4, 5, 8].includes(multiplier)) return false;
        state.bonusClicks = Math.min(Number.MAX_SAFE_INTEGER, state.bonusClicks + 1);
        if (multiplier === 8)
          state.rareBonuses = Math.min(Number.MAX_SAFE_INTEGER, state.rareBonuses + 1);
        checkAchievements();
        return true;
      },
      sneeze() {
        state.sneezes = Math.min(Number.MAX_SAFE_INTEGER, state.sneezes + 1);
        checkAchievements();
      },
      enableTest() {
        state.testMode = true;
      },
      devGrant(value) {
        const amount = Amount.from(value);
        state.testMode = true;
        state.balance = state.balance.add(amount);
        state.total = state.total.add(amount);
      },
      devStages(pug, home) {
        state.testMode = true;
        state.pug = Math.min(15, integer(pug));
        state.maxPugSkin = Math.max(state.maxPugSkin, state.pug);
        state.home = Math.min(14, integer(home));
        state.maxHomeSkin = Math.max(state.maxHomeSkin, state.home);
        checkAchievements();
      },
      devMiniReady() {
        state.testMode = true;
        state.miniNext = { brush: 0, catch: 0, match: 0 };
        miniTicket = null;
      },
      devInventory() {
        state.testMode = true;
        state.weaponParts = 9;
        state.weapons = state.weapons.map((n) => Math.max(3, n));
      },
      devExpeditionReady(now = clock()) {
        if (!state.expedition || !Number.isSafeInteger(now) || now < 0) return false;
        state.testMode = true;
        state.expedition.ends = now;
        return true;
      },
      devHelperReady() {
        state.testMode = true;
        state.helperBurstNext = 0;
        state.helperBurstUntil = 0;
      },
      devTool(index, level) {
        if (!Number.isInteger(index) || index < 1 || index >= TOOLS.length) return false;
        state.testMode = true;
        for (let i = 1; i < index; i++) state.levels[i] = Math.max(1, state.levels[i]);
        state.levels[index] = Math.max(1, Math.min(500, integer(level, 1)));
        state.ownedToolSkins = [
          ...new Set([...state.ownedToolSkins, ...state.levels.flatMap((n, i) => (n ? [i] : []))]),
        ];
        checkAchievements();
        return true;
      },
      birdPeck() {
        const tap = power().multiply(hatEffect('birdLoss')),
          amount = state.balance.compare(tap) >= 0 ? tap : state.balance;
        state.balance = state.balance.subtract(amount);
        state.birdPecks = Math.min(Number.MAX_SAFE_INTEGER, state.birdPecks + 1);
        return amount;
      },
      observeBird(type, test = false) {
        observe(type, test);
      },
      chaseBird(type, test = false) {
        if (test) return;
        observe(type, false, true);
        if (state.home >= 6 && random() < 0.002)
          state.weaponParts = Math.min(MAX_LEVEL, state.weaponParts + 1);
        state.birdsChased = Math.min(Number.MAX_SAFE_INTEGER, state.birdsChased + 1);
        if (type === 'pirate') state.piratesChased++;
        checkAchievements();
      },
      hatEffect,
      buyHat(id) {
        const h = HATS.find((h) => h.id === id);
        if (
          !h ||
          h.award ||
          state.hats.includes(id) ||
          state.pug < h.stage ||
          !spend(new Amount(h.cost))
        )
          return false;
        state.hats.push(id);
        state.hat = id;
        checkAchievements();
        return true;
      },
      equipHat(id) {
        if (id !== null && !state.hats.includes(id)) return false;
        state.hat = id;
        return true;
      },
      quote,
      buyBulk(kind, index = 0, mode = 1) {
        if (battleActive()) return false;
        const q = quote(kind, index, mode);
        if (q.locked || !q.count || !spend(q.cost)) return 0;
        if (kind === 'tool') state.levels[index] += q.count;
        else state[kind] += q.count;
        if (kind === 'tool' && !state.ownedToolSkins.includes(index))
          state.ownedToolSkins.push(index);
        if (kind === 'helper')
          state.maxHelperSkin = Math.max(
            state.maxHelperSkin,
            Math.min(10, Math.floor(state.helper / 10)),
          );
        if (kind === 'pug' || kind === 'home') state.skins[kind] = null;
        if (kind === 'pug') state.maxPugSkin = Math.max(state.maxPugSkin, Math.min(15, state.pug));
        if (kind === 'home')
          state.maxHomeSkin = Math.max(state.maxHomeSkin, Math.min(14, state.home));
        ensureBossOffer();
        ensureNet();
        checkAchievements();
        return q.count;
      },
      expeditionOffer(duration) {
        if (!Inventory.DURATIONS.includes(duration)) return null;
        return helperBaseRate().multiply(
          duration * { 900: 1.15, 3600: 1.2, 10800: 1.25 }[duration] * hatEffect('expedition'),
        );
      },
      expeditionLootOffer(duration) {
        return Inventory.offer(duration, state.home, state.expeditionMisses, state.trainingDone);
      },
      sendExpedition(duration, now = clock()) {
        if (battleActive()) return false;
        if (!state.helper || state.expedition || !Number.isSafeInteger(now) || now < 0)
          return false;
        const reward = this.expeditionOffer(duration),
          offer = this.expeditionLootOffer(duration);
        if (!reward || !offer) return false;
        state.expedition = {
          duration,
          ends: now + Math.round(duration * 1000 * hatEffect('expeditionTime')),
          reward,
          ...Inventory.roll(offer, random),
          weaponEligible: state.home >= 6,
          notified: false,
          duplicateReward: power().multiply(2),
        };
        state.helperBurstUntil = 0;
        return true;
      },
      claimExpedition(now = clock()) {
        if (!state.expedition || !Number.isSafeInteger(now) || now < state.expedition.ends)
          return new Amount();
        const ex = state.expedition;
        state.expedition = null;
        state.lastLoot = [];
        for (const i of ex.weaponLoot) {
          if (i < 0) state.weaponParts = Math.min(MAX_LEVEL, state.weaponParts + 1);
          else state.weapons[i] = Math.min(MAX_LEVEL, state.weapons[i] + 1);
          state.lastLoot.push(i < 0 ? 'part' : Inventory.WEAPONS[i].id);
        }
        let compensation = new Amount();
        for (const i of ex.junkLoot) {
          if (state.junk[i]) compensation = compensation.add(ex.duplicateReward);
          state.junk[i] = Math.min(MAX_LEVEL, state.junk[i] + 1);
          state.lastLoot.push(Inventory.JUNK[i]);
        }
        if (ex.training) state.trainingDone = true;
        if (ex.weaponEligible)
          state.expeditionMisses = ex.weaponSuccess ? 0 : Math.min(2, state.expeditionMisses + 1);
        return credit(ex.reward.add(compensation));
      },
      cancelExpedition(expectedEnds, now = clock()) {
        if (
          !state.expedition ||
          state.expedition.ends !== expectedEnds ||
          now >= state.expedition.ends
        )
          return false;
        state.expedition = null;
        return true;
      },
      expeditionNotice(now = clock(), blocked = false) {
        if (
          blocked ||
          !Number.isSafeInteger(now) ||
          now < 0 ||
          !state.expedition ||
          now < state.expedition.ends ||
          state.expedition.notified
        )
          return false;
        state.expedition.notified = true;
        return true;
      },
      activateHelper(now = clock()) {
        if (
          !state.helper ||
          state.expedition ||
          !Number.isSafeInteger(now) ||
          now < state.helperBurstNext
        )
          return false;
        state.helperBurstUntil = now + 10000;
        state.helperBurstNext = now + 300000;
        return true;
      },
      equipWeapon(index) {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= 9 ||
          !state.weapons[index] ||
          state.home < 6 ||
          index > Inventory.maxTier(state.home)
        )
          return false;
        state.weapon = index;
        return true;
      },
      showWeapon(value) {
        state.showWeapon = !!value;
        return true;
      },
      mergeWeapon(index) {
        if (
          !Number.isInteger(index) ||
          index < -1 ||
          index >= 8 ||
          state.home < 6 ||
          index + 1 > Inventory.maxTier(state.home)
        )
          return false;
        if (state.weapons[index === -1 ? 1 : index + 1] >= MAX_LEVEL) return false;
        if (index === -1) {
          if (state.weaponParts < 3) return false;
          state.weaponParts -= 3;
          state.weapons[1]++;
        } else {
          if (index === 0 || state.weapons[index] < 3) return false;
          state.weapons[index] -= 3;
          state.weapons[index + 1]++;
          if (state.weapon === index) state.weapon = index + 1;
        }
        checkAchievements();
        return true;
      },
      buyCosmetic(kind) {
        if (
          !Object.hasOwn(Inventory.COSMETICS, kind) ||
          state.cosmeticUnlocks.includes(kind) ||
          !spend(Inventory.COSMETICS[kind])
        )
          return false;
        state.cosmeticUnlocks.push(kind);
        return true;
      },
      chooseSkin(kind, index) {
        if (!state.cosmeticUnlocks.includes(kind)) return false;
        if (
          index !== null &&
          (!Number.isInteger(index) ||
            index < 0 ||
            (kind === 'tool'
              ? !state.ownedToolSkins.includes(index)
              : index > (kind === 'pug' ? state.maxPugSkin : state.maxHomeSkin)))
        )
          return false;
        state.skins[kind] = index;
        return true;
      },
      chooseHelperSkin(index) {
        if (
          index !== null &&
          (!Number.isInteger(index) || index < 0 || index > state.maxHelperSkin)
        )
          return false;
        state.helperSkin = index;
        return true;
      },
      chooseHelperSticker(id) {
        if (!['none', 'paw', 'fish', 'star'].includes(id)) return false;
        state.helperSticker = id;
        return true;
      },
      getHelperPrice: helperPrice,
      buyHelper() {
        if (state.pug < 4 || state.helper >= MAX_LEVEL || !spend(helperPrice())) return false;
        state.helper++;
        state.maxHelperSkin = Math.max(
          state.maxHelperSkin,
          Math.min(10, Math.floor(state.helper / 10)),
        );
        checkAchievements();
        return true;
      },
      work(seconds) {
        if (battleActive()) return new Amount();
        if (state.expedition || !Number.isFinite(seconds) || seconds <= 0) return new Amount();
        const amount = helperRate().multiply(Math.min(seconds, 1));
        credit(amount);
        state.helperTotal = state.helperTotal.add(amount);
        return amount;
      },
      canNewLife() {
        return state.pug >= (state.newLifeFloor || 15);
      },
      newLife() {
        if (state.pug < (state.newLifeFloor || 15) || battleActive()) return false;
        const keep = {
          hats: [...state.hats],
          hat: state.hat,
          achievements: [...state.achievements],
          lives: state.lives + 1,
          testMode: state.testMode,
          clicks: state.clicks,
          sneezes: state.sneezes,
          farts: state.farts,
          bonusClicks: state.bonusClicks,
          rareBonuses: state.rareBonuses,
          birdPecks: state.birdPecks,
          birdsChased: state.birdsChased,
          piratesChased: state.piratesChased,
          bigSneeze: state.bigSneeze,
          perfectCatch: state.perfectCatch,
          idleSeen: [...state.idleSeen],
          brushWins: state.brushWins,
          catchWins: state.catchWins,
          matchWins: state.matchWins,
          miniNext: { ...state.miniNext },
          expedition: state.expedition ? { ...state.expedition } : null,
          total: state.total,
          helperTotal: state.helperTotal,
        };
        state = {
          ...state,
          ...keep,
          balance: new Amount(),
          levels: [1, ...Array(TOOLS.length - 1).fill(0)],
          pug: 0,
          home: 0,
          helper: 0,
          helperBurstUntil: 0,
          helperBurstNext: 0,
          bossWins: [false, false],
          bossOffers: [null, null],
          bossIntroDone: false,
          expedition: null,
        };
        miniTicket = null;
        battle = null;
        guestRunner.clear();
        guestRewards.clear();
        checkAchievements();
        return true;
      },
      markCoverage(covered, total) {
        if (
          Number.isInteger(covered) &&
          Number.isInteger(total) &&
          total > 0 &&
          !state.bigSneeze &&
          covered / total >= 0.995
        ) {
          state.bigSneeze = 1;
          checkAchievements();
          return true;
        }
        return false;
      },
      seeIdle(kind) {
        if (IDLE_KINDS.includes(kind) && !state.idleSeen.includes(kind)) {
          state.idleSeen.push(kind);
          checkAchievements();
        }
      },
      miniStatus(kind, now = Date.now()) {
        if (!['brush', 'catch', 'match'].includes(kind)) return null;
        return {
          unlocked: state.pug >= 2,
          seconds: Math.max(0, Math.ceil((state.miniNext[kind] - now) / 1000)),
        };
      },
      beginMini(kind, now = Date.now()) {
        if (battleActive()) return false;
        const status = this.miniStatus(kind, now);
        if (!status || !status.unlocked || status.seconds || !Number.isSafeInteger(now) || now < 0)
          return false;
        state.miniNext[kind] = now + Math.round(MINI_COOLDOWN * hatEffect('cooldown'));
        miniTicket = { kind, power: power() };
        return true;
      },
      finishMini(kind, score, perfect = false) {
        if (!miniTicket || miniTicket.kind !== kind || !Number.isFinite(score) || score < 0)
          return new Amount();
        const ticket = miniTicket;
        miniTicket = null;
        const fraction = Math.min(1, score),
          amount = ticket.power.multiply(8 * MINI_SECONDS[kind] * fraction);
        credit(amount);
        if (fraction >= 0.6) state[kind + 'Wins']++;
        if (kind === 'catch' && fraction === 1 && perfect) state.perfectCatch = 1;
        checkAchievements();
        return amount;
      },
      cancelMini() {
        miniTicket = null;
      },
      fart() {
        state.farts = Math.min(Number.MAX_SAFE_INTEGER, state.farts + 1);
      },
    });
  }
  const api = Object.freeze({
    Amount,
    TOOLS,
    PUG_COSTS,
    HOME_COSTS,
    PUG_BOOST,
    HOME_BOOST,
    HATS,
    IDLE_KINDS,
    MINI_COOLDOWN,
    MINI_SECONDS,
    newLifeBoost,
    ACHIEVEMENTS,
    price,
    toolPrice,
    trackPrice,
    trackGain,
    toolPower,
    createGame,
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
