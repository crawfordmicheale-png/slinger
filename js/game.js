'use strict';
// ---------------------------------------------------------------------------
// SLINGER — game rules. No DOM in here, so it can be simulated from Node.
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined' && typeof CARDS === 'undefined') {
  // eslint-disable-next-line no-global-assign
  Object.assign(globalThis, require('./data.js'));
}

// ---- helpers ----------------------------------------------------------------
function makeRng(seed) {
  if (seed === undefined) return Math.random;
  let s = seed >>> 0;
  return () => { // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let _uid = 1;
const newCard = (id, upgraded = false) => ({ uid: _uid++, id, up: upgraded });

/** Effective stats for a card instance: merged values, cost, flags. */
function cardStats(card) {
  const def = CARDS[card.id];
  const v = Object.assign({}, def.v, card.up ? def.up : null);
  const cost = v.cost !== undefined ? v.cost : def.cost;
  delete v.cost;
  return {
    def, v, cost,
    rounds: def.rounds || 0,
    exhaust: !!def.exhaust,
    name: def.name + (card.up ? '+' : ''),
    text: def.text(v),
  };
}

// ---------------------------------------------------------------------------
// COMBAT
// ---------------------------------------------------------------------------
class Combat {
  /**
   * @param {Run} run
   * @param {string[]} foeIds
   * @param {{drop?: boolean, ambushed?: boolean}} opts
   *   drop     = you got the drop on them (foes start Exposed)
   *   ambushed = they got the drop on you (you start Shaken)
   */
  constructor(run, foeIds, opts = {}) {
    this.run = run;
    this.rng = run.rng;
    this.fx = [];       // visual events drained by the UI
    this.log = [];
    this.turn = 0;
    this.over = null;   // null | 'win' | 'lose'
    this.lockedOnce = false;

    const maxRounds = run.has('gun_oil') ? 8 : HERO.maxRounds;
    this.p = {
      uid: 'player', isPlayer: true, name: HERO.name,
      hp: run.hp, maxHp: run.maxHp, block: 0,
      grit: 0, maxGrit: HERO.maxGrit + (run.has('ruths_rosary') ? 1 : 0),
      rounds: maxRounds, maxRounds,
      st: {}, pw: {},
    };
    this.enemies = [];
    foeIds.forEach(id => this.spawn(id));

    this.draw_ = shuffle(this.rng, run.deck.map(c => ({ ...c })));
    this.hand = [];
    this.discard = [];
    this.exhausted = [];

    // Opening keepsakes / modifiers
    if (run.has('tin_star')) this.p.block += 6;
    if (run.has('war_paint')) this.p.st.wrath = 1;
    if (run.has('rattle')) this.applyAll('exposed', 1);
    if (opts.drop) { this.applyAll('exposed', 2); this.say('You got the drop on them.'); }
    if (opts.ambushed) { this.applySelf('shaken', 2); this.say('They got the drop on you.'); }

    this.startTurn();
  }

  // ---- bookkeeping ----------------------------------------------------------
  say(msg) { this.log.push(msg); if (this.log.length > 60) this.log.shift(); }
  emit(e) { this.fx.push(e); }
  alive() { return this.enemies.filter(e => e.hp > 0); }
  byUid(uid) { return uid === 'player' ? this.p : this.enemies.find(e => e.uid === uid); }

  spawn(id) {
    const def = ENEMIES[id];
    const hp = randInt(this.rng, def.hp[0], def.hp[1]);
    const e = {
      uid: 'e' + (_uid++), id, name: def.name, art: def.art,
      hp, maxHp: hp, block: 0, st: {},
      pattern: def.pattern.slice(),
      step: def.start === 'random' ? Math.floor(this.rng() * def.pattern.length) : 0,
      boss: !!def.boss, elite: !!def.elite, minion: !!def.minion,
      phase2Done: false, intent: null,
    };
    this.enemies.push(e);
    this.chooseIntent(e);
    return e;
  }

  chooseIntent(e) {
    const def = ENEMIES[e.id];
    let key = e.pattern[e.step % e.pattern.length];
    // Summoners skip summoning if the room is already crowded.
    if (def.moves[key].summon && this.alive().length >= 4) {
      e.step++;
      key = e.pattern[e.step % e.pattern.length];
    }
    e.intent = Object.assign({ key }, def.moves[key]);
  }

  // ---- damage math ------------------------------------------------------------
  calcDamage(src, tgt, base) {
    let d = base + (src.st.wrath || 0);
    if (src.st.shaken) d = Math.floor(d * 0.75);
    if (tgt && tgt.st.exposed) d = Math.floor(d * 1.5);
    return Math.max(0, d);
  }

  damage(src, tgt, base) {
    if (!tgt || tgt.hp <= 0) return;
    const d = this.calcDamage(src, tgt, base);
    const blocked = Math.min(tgt.block, d);
    tgt.block -= blocked;
    const through = d - blocked;
    this.emit({ type: 'hit', uid: tgt.uid, n: through, blocked });
    if (through > 0) this.loseHp(tgt, through);
  }

  loseHp(tgt, n) {
    if (n <= 0 || tgt.hp <= 0) return;
    tgt.hp -= n;
    if (tgt.isPlayer) {
      if (this.p.pw.vengeful_spirit) this.applySelf('wrath', this.p.pw.vengeful_spirit);
      if (this.run.has('claras_locket') && !this.lockedOnce && tgt.hp > 0 && tgt.hp * 2 < tgt.maxHp) {
        this.lockedOnce = true;
        this.applySelf('wrath', 3);
        this.p.block += 8;
        this.emit({ type: 'keepsake', id: 'claras_locket' });
        this.say("Clara's Locket burns against your chest. (+3 Wrath, +8 Cover)");
      }
      if (tgt.hp <= 0) { tgt.hp = 0; this.over = 'lose'; }
      return;
    }
    if (tgt.hp <= 0) {
      tgt.hp = 0;
      this.emit({ type: 'die', uid: tgt.uid });
      this.say(`${tgt.name} is sent back where it came from.`);
      if (tgt.boss) this.enemies.forEach(e => { if (e.hp > 0) { e.hp = 0; this.emit({ type: 'die', uid: e.uid }); } });
    } else {
      const ph = ENEMIES[tgt.id].phase2;
      if (ph && !tgt.phase2Done && tgt.hp <= tgt.maxHp * ph.at) {
        tgt.phase2Done = true;
        tgt.pattern = ph.pattern.slice();
        tgt.step = 0;
        tgt.st = {};
        tgt.st.wrath = ph.wrath;
        this.chooseIntent(tgt);
        this.emit({ type: 'phase', uid: tgt.uid, text: ph.text });
        this.say(ph.text);
      }
    }
    this.checkEnd();
  }

  checkEnd() {
    if (this.over) return;
    if (this.p.hp <= 0) this.over = 'lose';
    else if (this.alive().length === 0) this.over = 'win';
  }

  // ---- API used by card play() callbacks --------------------------------------
  hit(t, dmg, times = 1) { for (let i = 0; i < times; i++) this.damage(this.p, t, dmg); }
  hitAll(dmg, times = 1) { for (let i = 0; i < times; i++) this.alive().forEach(e => this.damage(this.p, e, dmg)); }
  hitRandom(dmg, times = 1) {
    for (let i = 0; i < times; i++) {
      const a = this.alive(); if (!a.length) return;
      this.damage(this.p, pick(this.rng, a), dmg);
    }
  }
  cover(n) { this.p.block += n; this.emit({ type: 'cover', uid: 'player', n }); }
  apply(t, key, n) { if (t && t.hp > 0 && n > 0) { t.st[key] = (t.st[key] || 0) + n; this.emit({ type: 'status', uid: t.uid, key, n }); } }
  applyAll(key, n) { this.alive().forEach(e => this.apply(e, key, n)); }
  applySelf(key, n) { this.apply(this.p, key, n); }
  heal(n) { const before = this.p.hp; this.p.hp = Math.min(this.p.maxHp, this.p.hp + n); this.emit({ type: 'heal', uid: 'player', n: this.p.hp - before }); }
  gainGrit(n) { this.p.grit += n; }
  reload(n) { this.p.rounds = Math.min(this.p.maxRounds, this.p.rounds + n); this.emit({ type: 'reload' }); }
  power(key, n) { this.p.pw[key] = (this.p.pw[key] || 0) + n; }

  draw(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) return;
      if (this.draw_.length === 0) {
        if (this.discard.length === 0) return;
        this.draw_ = shuffle(this.rng, this.discard);
        this.discard = [];
      }
      this.hand.push(this.draw_.pop());
    }
  }

  // ---- player actions ---------------------------------------------------------
  canPlay(card) {
    if (this.over) return { ok: false };
    const s = cardStats(card);
    if (s.def.unplayable) return { ok: false, why: 'Unplayable' };
    if (s.cost > this.p.grit) return { ok: false, why: 'Not enough Grit' };
    if (s.rounds === 'all' ? this.p.rounds < 1 : s.rounds > this.p.rounds) return { ok: false, why: 'Out of Rounds — Reload!' };
    return { ok: true };
  }

  needsTarget(card) { return CARDS[card.id].target === 'enemy'; }

  play(handIdx, targetUid) {
    const card = this.hand[handIdx];
    if (!card) return false;
    const chk = this.canPlay(card);
    if (!chk.ok) return false;
    const s = cardStats(card);
    let target = null;
    if (s.def.target === 'enemy') {
      target = this.byUid(targetUid);
      if (!target || target.hp <= 0 || target.isPlayer) {
        const a = this.alive();
        if (a.length === 1) target = a[0]; else return false;
      }
    }
    this.p.grit -= s.cost;
    this.spent = s.rounds === 'all' ? this.p.rounds : s.rounds;
    this.p.rounds -= this.spent;
    if (this.spent) this.emit({ type: 'shot', n: this.spent });
    this.hand.splice(handIdx, 1);
    this.say(`You play ${s.name}.`);

    s.def.play(this, s.v, target);

    if (this.spent && this.p.pw.consecrated) {
      if (target) this.apply(target, 'burn', this.p.pw.consecrated);
      else if (s.def.target === 'all') this.applyAll('burn', this.p.pw.consecrated);
    }

    if (s.def.type === 'power') { /* powers leave the deck for this fight */ }
    else if (s.exhaust) this.exhausted.push(card);
    else this.discard.push(card);

    this.checkEnd();
    return true;
  }

  startTurn() {
    this.turn++;
    const p = this.p;
    if (this.turn > 1) p.block = 0;
    this.tickBurn(p);
    if (this.over) return;
    p.grit = p.maxGrit;
    if (p.pw.quick_hands) this.reload(p.pw.quick_hands);
    if (p.pw.lawmans_instinct) p.block += p.pw.lawmans_instinct;
    let n = HERO.handSize;
    if (this.turn === 1 && this.run.has('snake_oil')) n += 2;
    this.draw(n);
  }

  endTurn() {
    if (this.over) return;
    // discard hand, ethereal cards fade
    for (const c of this.hand) (CARDS[c.id].ethereal ? this.exhausted : this.discard).push(c);
    this.hand = [];
    this.decay(this.p);

    // enemies act (snapshot, so fresh summons wait a turn)
    for (const e of this.alive()) {
      e.block = 0;
      this.tickBurn(e);
      if (e.hp <= 0 || this.over) continue;
      this.act(e);
      if (this.over) return;
      this.decay(e);
      e.step++;
      this.chooseIntent(e);
    }
    if (this.over) return;
    this.startTurn();
  }

  tickBurn(ent) {
    const b = ent.st.burn;
    if (!b) return;
    this.emit({ type: 'burn', uid: ent.uid, n: b });
    this.loseHp(ent, b);
    ent.st.burn = b - 1;
    if (!ent.st.burn) delete ent.st.burn;
  }

  decay(ent) {
    for (const k of ['shaken', 'exposed']) {
      if (ent.st[k]) { ent.st[k]--; if (!ent.st[k]) delete ent.st[k]; }
    }
  }

  act(e) {
    const m = e.intent;
    this.emit({ type: 'act', uid: e.uid, name: m.n });
    this.say(`${e.name}: ${m.n}.`);
    if (m.block) e.block += m.block;
    if (m.wrath) this.apply(e, 'wrath', m.wrath);
    if (m.heal) { e.hp = Math.min(e.maxHp, e.hp + m.heal); this.emit({ type: 'heal', uid: e.uid, n: m.heal }); }
    if (m.atk) for (let i = 0; i < (m.hits || 1) && !this.over; i++) this.damage(e, this.p, m.atk);
    if (this.over) return;
    if (m.shaken) this.applySelf('shaken', m.shaken);
    if (m.exposed) this.applySelf('exposed', m.exposed);
    if (m.burn) this.applySelf('burn', m.burn);
    if (m.curse) for (let i = 0; i < m.curse.n; i++) this.discard.push(newCard(m.curse.id));
    if (m.summon) for (let i = 0; i < m.summon.n; i++) if (this.alive().length < 5) this.spawn(m.summon.id);
  }

  /** Human-readable intent chips for the UI. */
  intentInfo(e) {
    const m = e.intent; const out = [];
    if (!m) return out;
    if (m.atk) {
      const d = this.calcDamage(e, this.p, m.atk);
      out.push({ kind: 'atk', label: m.hits > 1 ? `${d}×${m.hits}` : `${d}` });
    }
    if (m.block) out.push({ kind: 'def', label: `${m.block}` });
    if (m.wrath || m.heal) out.push({ kind: 'buff', label: m.heal ? `+${m.heal}` : '' });
    if (m.shaken || m.exposed || m.burn || m.curse) out.push({ kind: 'debuff', label: '' });
    if (m.summon) out.push({ kind: 'summon', label: '' });
    return out;
  }

  intentText(e) {
    const m = e.intent; if (!m) return '';
    const bits = [];
    if (m.atk) bits.push(`attack for ${this.calcDamage(e, this.p, m.atk)}${m.hits > 1 ? ' × ' + m.hits : ''}`);
    if (m.block) bits.push(`guard ${m.block}`);
    if (m.wrath) bits.push(`gain ${m.wrath} Wrath`);
    if (m.heal) bits.push(`heal ${m.heal}`);
    if (m.shaken) bits.push(`Shaken ${m.shaken}`);
    if (m.exposed) bits.push(`Exposed ${m.exposed}`);
    if (m.burn) bits.push(`Hellfire ${m.burn}`);
    if (m.curse) bits.push(`shuffle ${m.curse.n} ${CARDS[m.curse.id].name} into your discard`);
    if (m.summon) bits.push(`summon ${m.summon.n} ${ENEMIES[m.summon.id].name}${m.summon.n > 1 ? 's' : ''}`);
    return `${m.n}: ${bits.join(', ')}.`;
  }

  /** Card damage preview against a target (or no target) given current buffs. */
  previewValues(card, target) {
    const s = cardStats(card);
    const v = Object.assign({}, s.v);
    if (v.dmg !== undefined) v.dmg = this.calcDamage(this.p, target || null, v.dmg);
    return CARDS[card.id].text(v);
  }

  /** Copy combat results back onto the run. */
  finish() {
    this.run.hp = Math.max(0, this.p.hp);
  }
}

// ---------------------------------------------------------------------------
// RUN (the meta-game: path, towns, shops, deck, keepsakes)
// ---------------------------------------------------------------------------
const STEPS_PER_CHAPTER = 6; // 5 choices then the boss

class Run {
  constructor(seed) {
    this.rng = makeRng(seed);
    this.hp = HERO.maxHp;
    this.maxHp = HERO.maxHp;
    this.gold = HERO.gold;
    this.sight = HERO.maxSight;
    this.maxSight = HERO.maxSight;
    this.deck = STARTER_DECK.map(id => newCard(id));
    this.keepsakes = ['tin_star', 'claras_locket'];
    this.chapter = 1;
    this.step = 0;
    this.usedTowns = [];
    this.usedEvents = [];
    this.kills = 0;
    this.innocents = 0;
    this.choices = this.genChoices();
  }

  has(k) { return this.keepsakes.includes(k); }

  gainKeepsake(k) {
    if (!k || this.has(k)) return;
    this.keepsakes.push(k);
    if (k === 'bible') { this.maxHp += 12; this.hp += 12; }
    if (k === 'silver_spurs') { this.maxSight += 1; this.sight += 1; }
  }

  randomKeepsake() {
    const pool = KEEPSAKE_POOL.filter(k => !this.has(k));
    return pool.length ? pick(this.rng, pool) : null;
  }

  addCard(id, up = false) { this.deck.push(newCard(id, up)); }
  removeCard(uid) { this.deck = this.deck.filter(c => c.uid !== uid); }
  upgradeCard(uid) { const c = this.deck.find(c => c.uid === uid); if (c && CARDS[c.id].up) c.up = true; }
  upgradable() { return this.deck.filter(c => !c.up && CARDS[c.id].up); }

  // ---- path -------------------------------------------------------------------
  townName() {
    const pool = CHAPTERS[this.chapter].towns.filter(t => !this.usedTowns.includes(t));
    const t = pool.length ? pick(this.rng, pool) : pick(this.rng, CHAPTERS[this.chapter].towns);
    this.usedTowns.push(t);
    return t;
  }

  genChoices() {
    const s = this.step;
    if (s === STEPS_PER_CHAPTER - 1) return [{ type: 'boss' }];
    if (s === 0) return [{ type: 'town' }, { type: 'town' }];
    const weights = { town: 40, trail: 22, camp: 14, post: 14, wanted: s >= 2 ? 16 : 0 };
    const out = [];
    const want = 3;
    let guard = 0;
    while (out.length < want && guard++ < 50) {
      const t = weightedPick(this.rng, weights);
      if (t !== 'town' && out.some(o => o.type === t)) continue;
      if (out.filter(o => o.type === 'town').length >= 2 && t === 'town') continue;
      out.push({ type: t });
    }
    if (s === STEPS_PER_CHAPTER - 2 && !out.some(o => o.type === 'camp')) out[out.length - 1] = { type: 'camp' };
    return out;
  }

  advance() {
    this.step++;
    if (this.step >= STEPS_PER_CHAPTER) {
      this.chapter++;
      this.step = 0;
      this.usedTowns = [];
    }
    this.choices = this.chapter <= 3 ? this.genChoices() : [];
  }

  // ---- towns ------------------------------------------------------------------
  /** Build a town with three folk, exactly one of whom is a demon. */
  makeTown() {
    const enc = pick(this.rng, ENCOUNTERS[this.chapter].normal);
    const names = new Set();
    const folk = [];
    const demonIdx = Math.floor(this.rng() * 3);
    const usedTells = new Set();
    const tell = pool => {
      const opts = pool.filter(t => !usedTells.has(t));
      const t = pick(this.rng, opts.length ? opts : pool);
      usedTells.add(t);
      return t;
    };
    // Each stranger gets a portrait; the demon's disguise matches its guise.
    const pics = shuffle(this.rng, FOLK.portraits.slice());
    const demonG = enc.g || 'm';
    const dpi = pics.findIndex(pt => pt.g === demonG);
    const demonPic = pics.splice(dpi, 1)[0];
    for (let i = 0; i < 3; i++) {
      const demon = i === demonIdx;
      const pic = demon ? demonPic : pics.pop();
      let name;
      do { name = `${pick(this.rng, FOLK.first[pic.g])} ${pick(this.rng, FOLK.last)}`; } while (names.has(name));
      names.add(name);
      const tells = demon
        ? [this.rng() < 0.5 ? tell(enc.tells) : tell(FOLK.demonic), tell(FOLK.mundane)]
        : [tell(FOLK.mundane), this.rng() < 0.55 ? tell(FOLK.ambiguous) : tell(FOLK.mundane)];
      folk.push({
        name, role: demon ? enc.role : pick(this.rng, pic.roles), img: pic.img,
        tells: shuffle(this.rng, tells),
        demon, seen: false, gone: false,
      });
    }
    return { name: this.townName(), folk, enc };
  }

  // ---- rewards ----------------------------------------------------------------
  cardChoices(n = 3, rareBoost = 0) {
    const out = [];
    const ids = Object.keys(CARDS);
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const r = this.rng();
      const rarity = r < 0.08 + rareBoost ? 'rare' : r < 0.42 + rareBoost ? 'uncommon' : 'common';
      const pool = ids.filter(id => CARDS[id].rarity === rarity && !out.includes(id));
      if (pool.length) out.push(pick(this.rng, pool));
    }
    return out;
  }

  goldReward(kind) {
    let g = kind === 'boss' ? randInt(this.rng, 90, 110) : kind === 'elite' ? randInt(this.rng, 35, 50) : randInt(this.rng, 14, 24);
    if (this.has('horseshoe')) g += 15;
    return g;
  }

  /** Called after a won fight. */
  afterFight() {
    this.kills++;
    if (this.has('amos_harmonica')) this.hp = Math.min(this.maxHp, this.hp + 6);
    if (this.has('silver_spurs')) this.sight = Math.min(this.maxSight, this.sight + 1);
  }

  // ---- shop -------------------------------------------------------------------
  makeShop() {
    const cards = this.cardChoices(5, 0.06).map(id => ({ id, price: priceFor(CARDS[id].rarity, this.rng), sold: false }));
    const k = this.randomKeepsake();
    return {
      cards,
      keepsake: k ? { id: k, price: randInt(this.rng, 130, 160), sold: false } : null,
      removePrice: 60 + (this.removals || 0) * 20,
      healPrice: 30,
      sightPrice: 25,
    };
  }
}

function priceFor(rarity, rng) {
  const base = { common: 45, uncommon: 70, rare: 120 }[rarity] || 50;
  return base + randInt(rng, -6, 8);
}

function weightedPick(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

if (typeof module !== 'undefined') {
  module.exports = { Combat, Run, cardStats, newCard, makeRng, shuffle, pick, STEPS_PER_CHAPTER };
}
