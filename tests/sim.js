'use strict';
// Headless simulation: plays many full runs with a simple greedy bot to make
// sure the rules never crash and to eyeball balance.  `node tests/sim.js [runs]`
const assert = require('assert');
const D = require('../js/data.js');
Object.assign(globalThis, D);
const { Combat, Run, cardStats, STEPS_PER_CHAPTER } = require('../js/game.js');

function botTurn(c) {
  let guard = 0;
  while (!c.over && guard++ < 40) {
    const incoming = c.alive().reduce((a, e) => a + (e.intent.atk ? c.calcDamage(e, c.p, e.intent.atk) * (e.intent.hits || 1) : 0), 0);
    const needCover = incoming > c.p.block;
    let best = -1, bestScore = -1;
    c.hand.forEach((card, i) => {
      if (!c.canPlay(card).ok) return;
      const s = cardStats(card);
      let score = 1;
      if (s.def.type === 'power') score = 6;
      if (s.v.cov) score = needCover ? 5 + s.v.cov / 10 : 0.5;
      if (s.v.dmg) score = 3 + (s.v.dmg * (s.def.target === 'all' ? c.alive().length : 1)) / 10;
      if (card.id === 'reload' || card.id === 'speed_loader') score = c.p.rounds < 2 ? 7 : 0.3;
      if (s.cost === 0) score += 1;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best < 0 || bestScore < 0.4) break;
    const target = c.alive().sort((a, b) => a.hp - b.hp)[0];
    if (!c.play(best, target && target.uid)) break;
  }
  if (!c.over) c.endTurn();
}

const RANK = { rare: 3, uncommon: 2, common: 1 };
function pickReward(run, ids) {
  if (run.deck.length > 22) return;
  const best = ids.slice().sort((a, b) => RANK[CARDS[b].rarity] - RANK[CARDS[a].rarity])[0];
  run.addCard(best);
}

function fight(run, foes, opts) {
  const c = new Combat(run, foes, opts);
  let turns = 0;
  while (!c.over && turns++ < 200) botTurn(c);
  assert(c.over, 'fight never ended');
  c.finish();
  return c.over === 'win';
}

const bossHp = { 1: [], 2: [], 3: [] };
function playRun(seed) {
  const run = new Run(seed);
  const api = {
    rand: run.rng,
    gainCard: (id, up) => run.addCard(id, up),
    addCurse: id => run.addCard(id),
    gainKeepsake: () => { const k = run.randomKeepsake(); run.gainKeepsake(k); return k; },
    removeCardPrompt: () => run.removeCard(run.deck[0].uid),
    upgradeCardPrompt: () => { const u = run.upgradable(); if (u.length) run.upgradeCard(u[0].uid); },
  };
  while (run.chapter <= 3) {
    assert(run.choices.length > 0);
    const ch = run.choices[Math.floor(run.rng() * run.choices.length)];
    let won = true;
    if (ch.type === 'town') {
      const town = run.makeTown();
      assert.strictEqual(town.folk.filter(f => f.demon).length, 1);
      const drop = run.sight > 0; if (drop) run.sight--;
      won = fight(run, town.enc.foes, { drop });
      if (won) { run.afterFight(); run.gold += run.goldReward('normal'); pickReward(run, run.cardChoices(3)); }
    } else if (ch.type === 'wanted') {
      won = fight(run, ENCOUNTERS[run.chapter].elite.foes, {});
      if (won) { run.afterFight(); run.gainKeepsake(run.randomKeepsake()); pickReward(run, run.cardChoices(3, 0.1)); }
    } else if (ch.type === 'boss') {
      const b = ENCOUNTERS[run.chapter].boss;
      bossHp[run.chapter].push(run.hp / run.maxHp);
      won = fight(run, b.foes, {});
      if (won) { run.afterFight(); run.gainKeepsake(b.reward); run.hp = run.maxHp; }
    } else if (ch.type === 'camp') {
      if (run.hp < run.maxHp * 0.75) run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.3));
      else api.upgradeCardPrompt();
      run.sight = run.maxSight;
    } else if (ch.type === 'post') {
      const shop = run.makeShop();
      const c = shop.cards.find(x => x.price <= run.gold); if (c) { run.gold -= c.price; run.addCard(c.id); }
    } else if (ch.type === 'story') {
      const ev = STORY_EVENTS[run.chapter];
      const opts = ev.options.filter(o => !o.req || o.req(run));
      assert(typeof opts[Math.floor(run.rng() * opts.length)].run(run, api) === 'string');
      assert(run.journal.length > 0, 'story event should add a journal entry');
    } else if (ch.type === 'trail') {
      const ev = EVENTS[Math.floor(run.rng() * EVENTS.length)];
      const opts = ev.options.filter(o => !o.req || o.req(run));
      const txt = opts[0].run(run, api);
      assert(typeof txt === 'string');
    }
    assert(run.hp <= run.maxHp, 'hp above max');
    if (!won) return { win: false, chapter: run.chapter, step: run.step };
    run.advance();
  }
  return { win: true, chapter: 4 };
}

const N = +process.argv[2] || 300;
const results = [];
for (let i = 0; i < N; i++) results.push(playRun(i + 1));
const wins = results.filter(r => r.win).length;
const byCh = [1, 2, 3].map(ch => results.filter(r => !r.win && r.chapter === ch).length);
console.log(`runs=${N} wins=${wins} (${(100 * wins / N).toFixed(1)}%)  deaths by chapter: I=${byCh[0]} II=${byCh[1]} III=${byCh[2]}`);
const bossDeaths = results.filter(r => !r.win && r.step === STEPS_PER_CHAPTER - 1).length;
console.log(`deaths at a boss: ${bossDeaths}`);
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
console.log(`avg HP fraction entering boss: I=${avg(bossHp[1])} II=${avg(bossHp[2])} III=${avg(bossHp[3])}`);
