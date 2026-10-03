'use strict';
// Headless simulation: plays many full runs with a simple greedy bot to make
// sure the rules never crash and to eyeball balance.  `node tests/sim.js [runs]`
const assert = require('assert');
const D = require('../js/data.js');
Object.assign(globalThis, D);
const { Combat, Run, cardStats, STEPS_PER_CHAPTER, makeCase, caseSolutions, makeRng, pick } = require('../js/game.js');

function botTurn(c) {
  let guard = 0;
  // Drink when it's getting ugly, or open a boss fight with one.
  if (c.run.tonics.length && (c.p.hp < c.p.maxHp * 0.4 || (c.turn === 1 && c.enemies.some(e => e.boss)))) c.useTonic(0);
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

const bossHp = { 1: [], 2: [], 3: [], 4: [] };
function playRun(seed, opts = { styles: ['brawl', 'seer'] }) {
  const run = new Run(seed, opts);
  const api = {
    rand: run.rng,
    gainCard: (id, up) => run.addCard(id, up),
    addCurse: id => run.addCard(id),
    gainKeepsake: () => { const k = run.randomKeepsake(); run.gainKeepsake(k); return k; },
    removeCardPrompt: () => run.removeCard(run.deck[0].uid),
    upgradeCardPrompt: () => { const u = run.upgradable(); if (u.length) run.upgradeCard(u[0].uid); },
  };
  while (run.chapter <= run.lastChapter() && run.lap < (opts.maxLaps || 1)) {
    assert(run.choices.length > 0);
    const ch = run.choices[Math.floor(run.rng() * run.choices.length)];
    let won = true;
    if (ch.type === 'town') {
      const town = run.makeTown();
      assert.strictEqual(town.folk.filter(f => f.demon).length, 1);
      const drop = run.sight > 0; if (drop) run.sight--;
      won = fight(run, town.enc.foes, { drop });
      if (won) { run.afterFight(); const g = run.goldReward('normal'); run.gold += g; run.bounty += g; run.gainTonic(run.tonicReward('normal')); pickReward(run, run.cardChoices(3)); }
    } else if (ch.type === 'wanted') {
      won = fight(run, elitesOf(run.chapter)[Math.floor(run.rng() * elitesOf(run.chapter).length)].foes, {});
      if (won) { run.afterFight(); run.gainKeepsake(run.randomKeepsake()); run.gainTonic(run.tonicReward('elite')); pickReward(run, run.cardChoices(3, 0.1)); }
    } else if (ch.type === 'boss') {
      const b = storyFor(run.hero).boss(run.chapter);
      bossHp[run.chapter].push(run.hp / run.maxHp);
      won = fight(run, b.foes, {});
      if (won) { run.afterFight(); run.gainKeepsake(b.reward === null && run.chapter < 3 ? run.randomKeepsake() : b.reward); run.hp = run.maxHp; }
      // Following the ledger through the Veil, as the Chapter III finale offers.
      if (won && run.chapter === 3 && opts.farSide) { run.flags.farSide = true; run.sight = run.maxSight; }
    } else if (ch.type === 'camp') {
      if (run.hp < run.maxHp * 0.75) run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.3));
      else api.upgradeCardPrompt();
      run.sight = run.maxSight;
    } else if (ch.type === 'post') {
      const shop = run.makeShop();
      const c = shop.cards.find(x => x.price <= run.gold); if (c) { run.gold -= c.price; run.addCard(c.id); }
    } else if (ch.type === 'story') {
      const ev = storyFor(run.hero).story(run.chapter);
      const opts = ev.options.filter(o => !o.req || o.req(run));
      assert(typeof opts[Math.floor(run.rng() * opts.length)].run(run, api) === 'string');
      assert(run.journal.length > 0, 'story event should add a journal entry');
    } else if (ch.type === 'trail') {
      const evs = EVENTS.filter(e => !e.jonahOnly || run.hero === 'jonah');
      const ev = evs[Math.floor(run.rng() * evs.length)];
      const opts = ev.options.filter(o => !o.req || o.req(run));
      const txt = opts[0].run(run, api);
      assert(typeof txt === 'string');
    }
    assert(run.hp <= run.maxHp, 'hp above max');
    if (!won) return { win: false, chapter: run.chapter, step: run.step, lap: run.lap, bounty: run.bounty };
    run.advance(ch.idx);
  }
  return { win: true, chapter: run.lastChapter() + 1, lap: run.lap, bounty: run.bounty };
}

// Every town must be solvable from the clues alone: assuming humans tell the
// truth and exactly one stranger lies, only the demon can be that liar.
function suspects(town) {
  return town.folk.filter(liar => {
    const where = {};
    const fact = (name, place) => {
      if (where[name] && where[name] !== place) return false;
      where[name] = place; return true;
    };
    return town.folk.filter(f => f !== liar).every(f => fact(f.name, f.claim.at) && fact(f.claim.saw[0], f.claim.saw[1]));
  });
}
{
  const r = new Run(99);
  for (let i = 0; i < 500; i++) {
    const t = r.makeTown();
    const s = suspects(t);
    assert.strictEqual(s.length, 1, 'town should have exactly one consistent liar');
    assert(s[0].demon, 'the only consistent liar should be the demon');
    assert.strictEqual(new Set(t.folk.map(f => f.name.split(' ')[0])).size, 3, 'first names must be unique');
  }
  console.log('detective: 500 towns, every one solvable, the demon always the only consistent liar');
}

// Casebook cases: exactly one pair of strangers can be the demons, and it's the right pair.
{
  const rng = makeRng(7);
  for (const spec of [{ n: 4 }, { n: 5 }, { n: 5, fibber: true }]) {
    let parSum = 0;
    for (let i = 0; i < 150; i++) {
      const c = makeCase(rng, spec);
      assert.strictEqual(c.folk.length, spec.n);
      const sols = caseSolutions(c);
      assert.strictEqual(sols.length, 1, 'case should have exactly one explanation');
      assert(sols[0].every(k => c.folk[k].demon), 'the one explanation must name both demons');
      assert.strictEqual(c.folk.filter(f => f.demon).length, 2);
      assert.strictEqual(new Set(c.folk.map(f => f.name.split(' ')[0])).size, spec.n, 'first names must be unique');
      assert(c.par >= 1 && c.par <= spec.n * 2);
      // Hearing every statement always cracks it.
      assert.strictEqual(caseSolutions(c, () => true).length, 1);
      if (spec.fibber) {
        const fib = c.folk.find(f => f.fibber);
        assert(fib && !fib.demon && fib.claim.at !== fib.truthAt, 'the fibber lies about where they were');
        assert(c.folk.some(f => !f.demon && f !== fib && f.claim.saw[0] === fib.name), 'someone catches the fibber out');
      }
      parSum += c.par;
    }
    console.log(`casebook: 150 cases of ${spec.n}${spec.fibber ? ' with a lying witness' : ''}, all fair, average par ${(parSum / 150).toFixed(1)}`);
  }
}

// Daily twists: every twist plays through without breaking the rules.
{
  const line = [];
  for (const tw of Object.keys(DAILY_TWISTS)) {
    let w = 0;
    for (let i = 0; i < 30; i++) {
      const res = playRun(1000 + i, { hero: Object.keys(HEROES)[i % 3], styles: ['brawl', 'seer'], mode: 'daily', daily: i, twist: tw });
      if (res.win) w++;
    }
    line.push(`${tw} ${Math.round(100 * w / 30)}%`);
  }
  console.log('daily twists (bot win rate): ' + line.join(', '));
}

// The Long Ride: laps loop back to chapter one and keep getting harder.
{
  const res = [];
  for (let i = 0; i < 40; i++) res.push(playRun(2000 + i, { hero: Object.keys(HEROES)[i % 3], styles: ['brawl', 'seer'], mode: 'long', maxLaps: 4 }));
  assert(res.every(r => r.lap >= 0 && r.bounty >= 0));
  const laps = res.map(r => r.lap + 1);
  console.log(`long ride: 40 rides, laps reached avg ${(laps.reduce((a, b) => a + b) / 40).toFixed(2)}, max ${Math.max(...laps)}, avg bounty ${Math.round(res.reduce((a, r) => a + r.bounty, 0) / 40)}`);
}

// Showdown: six fights back to back with each ready-made deck.
{
  const line = [];
  for (const preset of Object.keys(SHOWDOWN_DECKS)) {
    let wins = 0, turns = 0;
    for (let i = 0; i < 30; i++) {
      const run = new Run(3000 + i, { hero: Object.keys(HEROES)[i % 3], preset, mode: 'showdown', styles: ['brawl', 'seer'] });
      let ok = true, t = 0;
      for (const [ch, kind] of SHOWDOWN_FIGHTS) {
        run.chapter = ch;
        const foes = kind === 'boss' ? storyFor(run.hero).boss(ch).foes : pick(run.rng, elitesOf(ch)).foes;
        const c = new Combat(run, foes, {});
        let guard = 0;
        while (!c.over && guard++ < 200) botTurn(c);
        c.finish();
        t += c.turn;
        if (c.over !== 'win') { ok = false; break; }
        pickReward(run, run.showdownRest(kind, ch).cards);
      }
      if (ok) { wins++; turns += t; }
    }
    line.push(`${preset} ${Math.round(100 * wins / 30)}%${wins ? ` (${Math.round(turns / wins)} turns)` : ''}`);
  }
  console.log('showdown (bot win rate): ' + line.join(', '));
}

// Wanted challenges: each rule applies and the run plays through.
{
  const line = [];
  for (const id of Object.keys(CHALLENGES)) {
    const probe = new Run(1, { challenge: id });
    const c = CHALLENGES[id];
    if (c.onlyStyle) assert(probe.cardChoices(3).every(k => CARDS[k].style === c.onlyStyle), id + ': rewards must match the style');
    if (c.belt) assert.deepStrictEqual(probe.belt, c.belt);
    if (c.maxHp) assert.strictEqual(probe.maxHp, c.maxHp);
    if (c.infamy) assert.strictEqual(probe.infamy, c.infamy);
    assert(probe.makeTown().questions >= 2);
    let w = 0;
    for (let i = 0; i < 20; i++) if (playRun(4000 + i, { hero: Object.keys(HEROES)[i % 3], challenge: id, mode: 'challenge' }).win) w++;
    line.push(`${id} ${Math.round(100 * w / 20)}%`);
  }
  console.log('challenges (bot win rate): ' + line.join(', '));
}

// Chapter IV: hunters who follow the ledger through face the Far Side.
{
  for (const id of Object.keys(ENEMIES)) assert(ENEMIES[id].moves && ENEMIES[id].pattern.every(k => ENEMIES[id].moves[k]), id + ': every move in the pattern exists');
  for (const hero of Object.keys(HEROES)) {
    const st = storyFor(hero);
    assert(st.chapter(4) && st.chapter(4).letter, hero + ': a Chapter IV letter');
    assert(st.boss(4).taunt && st.story(4).options.length, hero + ': Chapter IV boss words and story stop');
    assert(st.finale4Text && st.endings.lastpage && st.endings.keeper, hero + ': the Chapter IV finale and its endings');
  }
  const res = [];
  for (let i = 0; i < 120; i++) res.push(playRun(5000 + i, { hero: Object.keys(HEROES)[i % 4], styles: ['brawl', 'seer'], farSide: true }));
  const reached = res.filter(r => r.chapter >= 4).length, won = res.filter(r => r.win).length;
  assert(res.every(r => r.chapter <= 5));
  console.log(`chapter IV: 120 runs that follow the ledger, ${reached} reach the Far Side, ${won} win it (${reached ? Math.round(100 * won / reached) : 0}% of those who get there)`);
}

// Toby Lark: Ranger bites after every turn, traps go off before a blow lands.
{
  const run = new Run(9, { hero: 'toby' });
  assert(run.styles.includes('track') && !new Run(9, { hero: 'jonah' }).styles.includes('track'), 'tracker cards are Toby\'s');
  const c = new Combat(run, ['hollow_deputy'], {});
  assert.strictEqual(c.p.dog.bite, HEROES.toby.dog + 1, "Ranger's Collar adds 1");
  const hp0 = c.enemies[0].hp;
  c.setTrap(10, 1);
  c.endTurn();
  assert(c.enemies[0].hp <= hp0 - c.p.dog.bite, 'Ranger bit at the end of the turn');
  assert(c.log.some(l => /trap/.test(l)) || c.enemies[0].intent.atk === undefined, 'the trap went off on an attack');
  console.log('toby: Ranger bites, traps spring');
}

const N = +process.argv[2] || 300;
const results = [];
const HUNTERS = Object.keys(HEROES);
for (let i = 0; i < N; i++) results.push(playRun(i + 1, { hero: HUNTERS[i % HUNTERS.length], styles: ['brawl', 'seer'] }));
const wins = results.filter(r => r.win).length;
const byCh = [1, 2, 3].map(ch => results.filter(r => !r.win && r.chapter === ch).length);
console.log(`runs=${N} wins=${wins} (${(100 * wins / N).toFixed(1)}%)  deaths by chapter: I=${byCh[0]} II=${byCh[1]} III=${byCh[2]}`);
const bossDeaths = results.filter(r => !r.win && r.step === STEPS_PER_CHAPTER - 1).length;
console.log(`deaths at a boss: ${bossDeaths}`);
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
console.log(`avg HP fraction entering boss: I=${avg(bossHp[1])} II=${avg(bossHp[2])} III=${avg(bossHp[3])}`);
