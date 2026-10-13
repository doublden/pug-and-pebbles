(function (root) {
  'use strict';
  const TOOLS = Object.freeze([
    Object.freeze({name: 'Собственная лапа', yield: 1, cost: 0, description: 'С чего-то надо начинать.'}),
    Object.freeze({name: 'Маленькая ложка', yield: 2, cost: 30, description: 'Маленькая, зато своя.'}),
    Object.freeze({name: 'Столовая ложка', yield: 3, cost: 90, description: 'Серьёзный столовый прибор.'}),
    Object.freeze({name: 'Детская лопатка', yield: 5, cost: 180, description: 'Пластиковая. Потенциал — огромный.'})
  ]);
  const STAGES = Object.freeze([
    Object.freeze({location: 'Свалка', title: 'Маленький голодный философ', description: 'Жизнь потрепала. Но аппетит ещё есть.', tag: 'Худой и чумазый'}),
    Object.freeze({location: 'Уютный двор', title: 'Уже совсем другой мопс', description: 'Чистые лапы. Сытый живот. Жизнь налаживается.', tag: 'Чистый и сытый'}),
    Object.freeze({location: 'Цветущий сад', title: 'Профессиональный ценитель камушков', description: 'Щёчки растут. Амбиции тоже.', tag: 'Пухлый и довольный'}),
    Object.freeze({location: 'Золотой дворец', title: 'Его Мопсейшество', description: 'Величие измеряется не ростом. А животом.', tag: 'Королевские щёчки'})
  ]);
  const UPGRADES = Object.freeze([
    Object.freeze({name: 'Отмыть и накормить', cost: 60, description: 'Чистая шерсть, полный живот и свой уголок во дворе.', symbol: '♡', message: 'Чистый мопс, сытый мопс. И уже свой двор!'}),
    Object.freeze({name: 'Отрастить щёчки', cost: 200, description: 'Побольше вкусного, помягче лежанку. И сад для прогулок.', symbol: '❀', message: 'Щёчки выросли. Сад расцвёл. Мопс одобряет.'}),
    Object.freeze({name: 'Жить по-мопсски', cost: 600, description: 'Роскошный живот, личный дворец и гора золотых камушков.', symbol: '♛', message: 'Добро пожаловать во дворец, Ваше Мопсейшество!'})
  ]);
  function createGame() {
    let state = {balance: 0, total: 0, clicks: 0, tool: 0, stage: 0};
    return Object.freeze({
      getState: () => ({...state, yield: TOOLS[state.tool].yield}),
      dig() {
        const amount = TOOLS[state.tool].yield;
        state.balance += amount;
        state.total += amount;
        state.clicks += 1;
        return amount;
      },
      buyTool(index) {
        if (!Number.isInteger(index) || index !== state.tool + 1 || !TOOLS[index] || state.balance < TOOLS[index].cost) return false;
        state.balance -= TOOLS[index].cost;
        state.tool = index;
        return true;
      },
      upgradePug() {
        const upgrade = UPGRADES[state.stage];
        if (!upgrade || state.balance < upgrade.cost) return false;
        state.balance -= upgrade.cost;
        state.stage += 1;
        return true;
      },
      reset() {state = {balance: 0, total: 0, clicks: 0, tool: 0, stage: 0};}
    });
  }
  const api = Object.freeze({TOOLS, STAGES, UPGRADES, createGame});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
