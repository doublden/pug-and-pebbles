const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createGame, TOOLS, UPGRADES} = require('../game.js');
test('starts with an empty balance, one pebble per paw dig', () => {
  const game = createGame();
  assert.deepEqual(game.getState(), {balance:0,total:0,clicks:0,tool:0,stage:0,yield:1});
  assert.equal(game.dig(),1);
  assert.equal(game.getState().balance,1);
});
test('tools unlock in sequence at their exact prices and pay 2, 3, 5', () => {
  const game = createGame();
  for(let i=0;i<29;i++) game.dig();
  assert.equal(game.buyTool(1),false);
  game.dig(); assert.equal(game.buyTool(1),true);
  assert.equal(game.getState().balance,0); assert.equal(game.dig(),2);
  assert.equal(game.buyTool(3),false);
  while(game.getState().balance<90) game.dig();
  assert.equal(game.buyTool(2),true); assert.equal(game.dig(),3);
  while(game.getState().balance<180) game.dig();
  assert.equal(game.buyTool(3),true); assert.equal(game.dig(),5);
  assert.equal(game.buyTool(3),false); assert.equal(game.buyTool(4),false);
});
test('pug stages spend balance, preserve lifetime count, end at palace', () => {
  const game = createGame();
  assert.equal(game.upgradePug(),false);
  for(let stage=0;stage<3;stage++) {
    while(game.getState().balance<UPGRADES[stage].cost) game.dig();
    const before=game.getState();
    assert.equal(game.upgradePug(),true);
    assert.equal(game.getState().stage,stage+1);
    assert.equal(game.getState().balance,before.balance-UPGRADES[stage].cost);
    assert.equal(game.getState().total,before.total);
    assert.equal(game.getState().yield,1);
  }
  assert.equal(game.upgradePug(),false); assert.equal(game.dig(),1);
});
test('purchases cannot double-spend and state snapshots cannot mutate the game', () => {
  const game = createGame();
  for(let i=0;i<60;i++) game.dig();
  assert.equal(game.upgradePug(),true); assert.equal(game.buyTool(1),false);
  game.getState().balance=9999; assert.equal(game.getState().balance,0);
  for(const bad of [-1,NaN,1.5,'1',undefined,99]) assert.equal(game.buyTool(bad),false);
});
test('full progression accounting and reset', () => {
  const game = createGame();
  for(let index=1;index<TOOLS.length;index++) {
    while(game.getState().balance<TOOLS[index].cost) game.dig();
    game.buyTool(index);
  }
  for(let stage=0;stage<UPGRADES.length;stage++) {
    while(game.getState().balance<UPGRADES[stage].cost) game.dig();
    game.upgradePug();
  }
  const s=game.getState();
  assert.equal(s.tool,3); assert.equal(s.stage,3); assert.equal(s.yield,5);
  assert.equal(s.balance,s.total-TOOLS.reduce((n,t)=>n+t.cost,0)-UPGRADES.reduce((n,u)=>n+u.cost,0));
  game.reset(); assert.deepEqual(game.getState(),createGame().getState());
});
