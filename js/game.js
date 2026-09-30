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
  const rng = () => { // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // A seeded run saves its place in the sequence, so a resumed Daily Hunt plays out the same.
  rng.save = () => s;
  rng.load = v => { s = v >>> 0; };
  return rng;
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

    const maxRounds = run.belt.length;
    this.p = {
      uid: 'player', isPlayer: true, name: HERO.name,
      hp: run.hp, maxHp: run.maxHp, block: 0,
      grit: 0, maxGrit: HERO.maxGrit + (run.has('ruths_rosary') ? 1 : 0),
      maxRounds,
      // The cylinder: chambers[i] is a round id or null; `pos` is the next chamber to fire.
      chambers: run.belt.slice(), pos: 0,
      get rounds() { return this.chambers.filter(Boolean).length; },
      st: {}, pw: {},
    };
    this.nextShotBonus = 0;   // Hammer Back
    this.shotsThisTurn = 0;   // Steady Aim
    this.fired = [];          // rounds fired by the card being played, consumed hit by hit
    this.firedThisCard = [];
    this.curRound = null;     // the round riding on the hit being resolved
    this.unveiled = false;    // Peyote Tea: every hidden intent is visible
    this.lastAttack = null;   // the Chalk Wraith recites it back at you
    this.freed = 0;           // hostages freed this fight
    this.collected = [];      // cards the Gentleman took as payment
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
    if (run.twist === 'blood_moon') { this.p.st.wrath = (this.p.st.wrath || 0) + 1; this.enemies.forEach(e => { e.st.wrath = (e.st.wrath || 0) + 1; }); }
    if (run.twist === 'quick_draw') this.p.chambers = this.p.chambers.map((r, i) => (i < 3 ? r : null));
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
    let hp = randInt(this.rng, def.hp[0], def.hp[1]);
    if (this.run.ledger >= 1) hp = Math.round(hp * 1.1);
    if (this.run.lap) hp = Math.round(hp * (1 + 0.25 * this.run.lap)); // the Long Ride gets meaner every lap
    const e = {
      uid: 'e' + (_uid++), id, name: def.name, art: def.art,
      hp, maxHp: hp, block: 0, st: {},
      pattern: def.pattern.slice(),
      step: def.start === 'random' ? Math.floor(this.rng() * def.pattern.length) : 0,
      boss: !!def.boss, elite: !!def.elite, minion: !!def.minion,
      phase2Done: false, intent: null,
      veiled: !!def.veiled, peeked: false,
      hostage: def.hostage ? { ...def.hostage } : null,
    };
    if (def.ward) e.st.ward = def.ward;
    if (this.run.ledger >= 4 && (e.elite || e.boss)) e.st.wrath = 2;
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
    if (e.intent.atk && this.run.ledger >= 2) e.intent.atk = Math.floor(e.intent.atk * 1.1);
    if (e.intent.atk && this.run.lap) e.intent.atk = Math.floor(e.intent.atk * (1 + 0.15 * this.run.lap));
    if (e.intent.mimic) e.intent.atk = this.lastAttack ? this.lastAttack.dmg : 6;
  }

  /** Is this demon's next move hidden from the player? */
  hidden(e) { return e.veiled && !e.peeked && !this.unveiled; }

  /** Spend a Veil Sight charge to see a veiled demon's next move for the rest of the fight. */
  peek(uid) {
    const e = this.byUid(uid);
    if (!e || !this.hidden(e) || this.run.sight <= 0) return false;
    this.run.sight--;
    e.peeked = true;
    this.emit({ type: 'peek', uid: e.uid });
    this.say(`You look through the Veil. The ${e.name} means to: ${e.intent.n}.`);
    return true;
  }

  /** Drink a tonic from the satchel. */
  useTonic(i) {
    const id = this.run.tonics[i];
    if (!id || this.over) return false;
    this.run.tonics.splice(i, 1);
    this.say(`You use the ${TONICS[id].name}.`);
    TONICS[id].use(this);
    this.checkEnd();
    return id;
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
    let d = this.calcDamage(src, tgt, base);
    const holy = this.curRound === 'silver' || this.curRound === 'blessed';
    if (src.isPlayer && tgt.st.ward) {
      if (holy) { tgt.st.ward--; if (!tgt.st.ward) delete tgt.st.ward; this.emit({ type: 'ward', uid: tgt.uid }); }
      else d = Math.floor(d / 2);
    }
    if (src.isPlayer && tgt.hostage && d >= tgt.hostage.threshold) {
      this.emit({ type: 'hostage_dead', uid: tgt.uid });
      this.say(`That shot went clean through. ${cap(tgt.hostage.name)} did not survive it.`);
      tgt.hostage = null;
      this.run.addCard('blood_on_hands');
      this.run.innocents++;
      this.run.addInfamy(2);
    }
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
      if (this.p.pw.scar_tissue) this.p.block += this.p.pw.scar_tissue;
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

  // ---- the cylinder -------------------------------------------------------------
  /** Index of the next loaded chamber at or after `pos`, or -1 if the gun is empty. */
  nextLoaded() {
    const ch = this.p.chambers, n = ch.length;
    for (let k = 0; k < n; k++) { const i = (this.p.pos + k) % n; if (ch[i]) return i; }
    return -1;
  }
  /** The next `n` rounds that would fire, in order (for previews and the UI). */
  peekRounds(n) {
    const ch = this.p.chambers, len = ch.length, out = [];
    for (let k = 0; k < len && out.length < n; k++) { const r = ch[(this.p.pos + k) % len]; if (r) out.push(r); }
    return out;
  }
  fireOne() {
    const i = this.nextLoaded();
    if (i < 0) return null;
    const r = this.p.chambers[i];
    this.p.chambers[i] = null;
    this.p.pos = (i + 1) % this.p.chambers.length;
    return r;
  }
  /** Skip the next loaded round without firing it. */
  spin() {
    const i = this.nextLoaded();
    if (i >= 0) this.p.pos = (i + 1) % this.p.chambers.length;
    this.emit({ type: 'reload' });
  }
  /** Refill up to `n` empty chambers, in firing order, with the rounds from your gun belt. */
  reload(n) {
    const ch = this.p.chambers, len = ch.length;
    for (let k = 0; k < len && n > 0; k++) {
      const i = (this.p.pos + k) % len;
      if (!ch[i]) { ch[i] = this.run.belt[i] || 'lead'; n--; }
    }
    this.emit({ type: 'reload' });
  }
  /** Put `type` into the next `n` chambers in firing order, replacing whatever was there. */
  loadRound(type, n) {
    const ch = this.p.chambers, len = ch.length;
    for (let k = 0; k < Math.min(n, len); k++) ch[(this.p.pos + k) % len] = type;
    this.emit({ type: 'reload' });
  }

  /** One hit from the player. If the card fired rounds, the next one rides on this hit. */
  shoot(t, dmg) {
    if (!t || t.hp <= 0) return;
    const r = this.fired.length ? this.fired.shift() : null;
    const R = r ? ROUNDS[r] : null;
    if (R && R.dud) { this.emit({ type: 'dud', uid: t.uid }); this.say('Click. A dud.'); return; }
    if (!r && this.melee && this.p.pw.bare_knuckle) dmg += this.p.pw.bare_knuckle;
    if (r) {
      if (this.shotsThisTurn === 0 && this.p.pw.steady_aim) dmg += this.p.pw.steady_aim;
      this.shotsThisTurn++;
      dmg += this.nextShotBonus; this.nextShotBonus = 0;
      dmg += R.bonus || 0;
      if (R.pierce && t.block) { this.emit({ type: 'pierce', uid: t.uid, n: t.block }); t.block = 0; }
    }
    this.curRound = r;
    this.damage(this.p, t, dmg);
    this.curRound = null;
    if (R && t.hp > 0 && R.onHit) R.onHit(this, t);
    if (r === 'lead' && t.hp > 0 && this.run.twist === 'hot_lead') this.apply(t, 'burn', 1);
    if (R && R.splash) {
      const splash = R.splash + (this.run.has('eli_ring') ? 2 : 0);
      this.alive().filter(e => e !== t).forEach(e => this.damage(this.p, e, splash));
    }
  }

  // ---- API used by card play() callbacks --------------------------------------
  hit(t, dmg, times = 1) { for (let i = 0; i < times; i++) this.shoot(t, dmg); }
  hitAll(dmg, times = 1) {
    for (let i = 0; i < times; i++) {
      // One round per volley: its effects land on every foe.
      const r = this.fired.length ? this.fired.shift() : null;
      this.alive().forEach(e => { if (r) this.fired.unshift(r); this.shoot(e, dmg); });
    }
  }
  hitRandom(dmg, times = 1) {
    for (let i = 0; i < times; i++) {
      const a = this.alive(); if (!a.length) return;
      this.shoot(pick(this.rng, a), dmg);
    }
  }
  cover(n) { this.p.block += n; this.emit({ type: 'cover', uid: 'player', n }); }
  apply(t, key, n) {
    if (!(t && t.hp > 0 && n > 0)) return;
    if (key === 'burn' && !t.isPlayer && this.run.has('psalter')) n += 1;
    t.st[key] = (t.st[key] || 0) + n;
    this.emit({ type: 'status', uid: t.uid, key, n });
    if (key === 'exposed' && t.hostage) {
      this.say(`The Veil tears and ${t.hostage.name} stumbles free.`);
      this.emit({ type: 'hostage_freed', uid: t.uid });
      t.hostage = null;
      this.freed++;
    }
  }
  applyAll(key, n) { this.alive().forEach(e => this.apply(e, key, n)); }
  applySelf(key, n) { this.apply(this.p, key, n); }
  heal(n) { const before = this.p.hp; this.p.hp = Math.min(this.p.maxHp, this.p.hp + n); this.emit({ type: 'heal', uid: 'player', n: this.p.hp - before }); }
  gainGrit(n) { this.p.grit += n; }
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
    if (s.def.req && !s.def.req(this)) return { ok: false, why: s.def.reqWhy };
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
    this.fired = [];
    for (let i = 0; i < this.spent; i++) this.fired.push(this.fireOne());
    this.firedThisCard = this.fired.slice();
    this.melee = s.def.type === 'attack' && !s.rounds;
    if (this.spent) this.emit({ type: 'shot', n: this.spent, rounds: this.firedThisCard });
    this.hand.splice(handIdx, 1);
    this.say(`You play ${s.name}.`);

    s.def.play(this, s.v, target);
    if (s.def.type === 'attack' && s.v.dmg) {
      this.lastAttack = { name: s.name, dmg: s.v.dmg };
      this.enemies.forEach(e => { if (e.intent && e.intent.mimic) e.intent.atk = s.v.dmg; });
    }

    // Rounds a card fired but never "rode" a hit (e.g. two rounds behind one big shot)
    // still deliver their effects to the target.
    for (const r of this.fired) {
      const R = ROUNDS[r];
      const tgts = target ? [target] : s.def.target === 'all' ? this.alive() : [];
      if (R && R.onHit) tgts.forEach(t => t.hp > 0 && R.onHit(this, t));
    }
    this.fired = [];
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
    this.nextShotBonus = 0;
    this.shotsThisTurn = 0;
    if (p.pw.quick_hands) this.reload(p.pw.quick_hands);
    if (p.pw.consecrate_ground) this.applyAll('burn', p.pw.consecrate_ground);
    if (p.pw.clairvoyance && this.alive().length) this.apply(pick(this.rng, this.alive()), 'exposed', p.pw.clairvoyance);
    if (p.pw.lawmans_instinct) p.block += p.pw.lawmans_instinct;
    let n = HERO.handSize;
    if (this.turn === 1 && this.run.has('snake_oil')) n += 2;
    if (this.run.twist === 'quick_draw') n += 1;
    this.draw(n);
  }

  endTurn() {
    for (const e of this.beginEnemyPhase()) this.enemyStep(e);
    this.endEnemyPhase();
  }

  // The enemy turn in three steps, so the UI can animate one demon at a time.
  /** Discard the hand and return the demons that will act (a snapshot, so fresh summons wait a turn). */
  beginEnemyPhase() {
    if (this.over) return [];
    for (const c of this.hand) (CARDS[c.id].ethereal ? this.exhausted : this.discard).push(c);
    this.hand = [];
    this.decay(this.p);
    return this.alive();
  }

  enemyStep(e) {
    if (this.over || e.hp <= 0) return;
    e.block = 0;
    this.tickBurn(e);
    if (e.hp <= 0 || this.over) return;
    this.act(e);
    if (this.over) return;
    this.decay(e);
    e.step++;
    this.chooseIntent(e);
  }

  endEnemyPhase() {
    if (this.over) return;
    this.startTurn();
  }

  tickBurn(ent) {
    const b = ent.st.burn;
    if (!b) return;
    this.emit({ type: 'burn', uid: ent.uid, n: b });
    if (ent.st.ward) { ent.st.ward--; if (!ent.st.ward) delete ent.st.ward; this.emit({ type: 'ward', uid: ent.uid }); }
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
    if (m.collect) {
      for (let i = 0; i < m.collect; i++) {
        const pile = this.draw_.length ? this.draw_ : this.discard;
        if (!pile.length) break;
        const card = pile.splice(Math.floor(this.rng() * pile.length), 1)[0];
        this.collected.push(card);
        this.emit({ type: 'collect', uid: 'player', name: CARDS[card.id].name });
        this.say(`${e.name} takes ${CARDS[card.id].name} as payment. It's gone for this fight.`);
      }
    }
    if (m.tamper) { this.loadRound('dud', m.tamper); this.say(`${e.name} slips ${m.tamper} duds into your iron.`); }
    if (m.summon) for (let i = 0; i < m.summon.n; i++) if (this.alive().length < 5) this.spawn(m.summon.id);
  }

  /** Human-readable intent chips for the UI. */
  intentInfo(e) {
    const m = e.intent; const out = [];
    if (!m) return out;
    if (this.hidden(e)) return [{ kind: 'veil', label: '?' }];
    if (m.atk) {
      const d = this.calcDamage(e, this.p, m.atk);
      out.push({ kind: 'atk', label: m.hits > 1 ? `${d}×${m.hits}` : `${d}` });
    }
    if (m.block) out.push({ kind: 'def', label: `${m.block}` });
    if (m.wrath || m.heal) out.push({ kind: 'buff', label: m.heal ? `+${m.heal}` : '' });
    if (m.shaken || m.exposed || m.burn || m.curse || m.tamper || m.collect) out.push({ kind: 'debuff', label: '' });
    if (m.summon) out.push({ kind: 'summon', label: '' });
    return out;
  }

  intentText(e) {
    const m = e.intent; if (!m) return '';
    if (this.hidden(e)) return 'Its intent is hidden behind the Veil. Click to spend 1 Veil Sight and see it for the rest of the fight.';
    const bits = [];
    if (m.atk) bits.push(`attack for ${this.calcDamage(e, this.p, m.atk)}${m.hits > 1 ? ' × ' + m.hits : ''}`);
    if (m.block) bits.push(`guard ${m.block}`);
    if (m.wrath) bits.push(`gain ${m.wrath} Wrath`);
    if (m.heal) bits.push(`heal ${m.heal}`);
    if (m.shaken) bits.push(`Shaken ${m.shaken}`);
    if (m.exposed) bits.push(`Exposed ${m.exposed}`);
    if (m.burn) bits.push(`Hellfire ${m.burn}`);
    if (m.curse) bits.push(`shuffle ${m.curse.n} ${CARDS[m.curse.id].name} into your discard`);
    if (m.tamper) bits.push(`slip ${m.tamper} duds into your next chambers`);
    if (m.collect) bits.push(`take ${m.collect} card from your deck for this fight`);
    if (m.mimic) bits.push(this.lastAttack ? `recite your ${this.lastAttack.name} back at you` : 'recite your last attack back at you');
    if (m.summon) bits.push(`summon ${m.summon.n} ${ENEMIES[m.summon.id].name}${m.summon.n > 1 ? 's' : ''}`);
    return `${m.n}: ${bits.join(', ')}.`;
  }

  /** Card damage preview against a target (or no target) given current buffs. */
  previewValues(card, target) {
    const s = cardStats(card);
    const v = Object.assign({}, s.v);
    if (v.dmg !== undefined) {
      let base = v.dmg;
      if (s.rounds) {
        const r = ROUNDS[this.peekRounds(1)[0]];
        base += this.nextShotBonus + ((r && r.bonus) || 0);
        if (this.shotsThisTurn === 0 && this.p.pw.steady_aim) base += this.p.pw.steady_aim;
        if (r && r.dud) base = 0;
      }
      v.dmg = this.calcDamage(this.p, target || null, base);
    }
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
  /**
   * @param {number} [seed]
   * @param {{hero?: string, ledger?: number, styles?: string[]}} [opts]
   *   hero   = which hunter (see HEROES)
   *   ledger = difficulty page, 0 to LEDGER.length - 1
   *   styles = unlocked card styles beyond the defaults (e.g. ['brawl', 'seer'])
   *   mode   = 'story' | 'daily' | 'long' | 'showdown' | 'challenge'
   *   daily = the Daily Hunt number; twist = a DAILY_TWISTS id
   *   challenge = a CHALLENGES id; preset = a SHOWDOWN_DECKS id
   */
  constructor(seed, opts = {}) {
    this.rng = makeRng(seed);
    this.hero = HEROES[opts.hero] ? opts.hero : 'jonah';
    this.ledger = Math.max(0, Math.min(LEDGER.length - 1, opts.ledger || 0));
    this.styles = ['gun', 'holy'].concat(opts.styles || []);
    const h = HEROES[this.hero];
    this.hp = this.maxHp = h.hp;
    this.gold = HERO.gold;
    this.maxSight = h.sight - (this.ledger >= 5 ? 1 : 0);
    this.sight = this.maxSight;
    this.deck = h.deck.map(id => newCard(id));
    if (this.ledger >= 5) this.deck.push(newCard('grief'));
    this.keepsakes = h.keepsakes.slice();
    this.chapter = 1;
    this.step = 0;
    this.usedTowns = [];
    this.usedEvents = [];
    this.kills = 0;
    this.innocents = 0;
    this.flags = {};    // story choices: remembered, confessed, forgiven, vow
    this.journal = [];  // { chapter, title, text }
    this.belt = h.belt.slice();       // the load you start every fight with, chamber by chamber
    this.tonics = h.tonics.slice();   // the satchel, up to TONIC_SLOTS
    this.infamy = 0;
    this.removals = 0;
    this.mode = opts.mode || 'story';
    this.daily = opts.daily || 0;
    this.twist = DAILY_TWISTS[opts.twist] ? opts.twist : null;
    this.cleanSolves = 0;
    this.tutorial = !!opts.tutorial;
    this.lap = 0;          // the Long Ride: how many times round the loop
    this.bounty = 0;       // the Long Ride's score: gold earned from fights
    this.onlyStyle = null; // a challenge can restrict rewards to one card style
    this.questionBonus = 0;
    this.challenge = CHALLENGES[opts.challenge] ? opts.challenge : null;
    this.preset = SHOWDOWN_DECKS[opts.preset] ? opts.preset : null;
    this.applyTwist();
    this.applyChallenge();
    if (this.preset) {
      this.deck = SHOWDOWN_DECKS[this.preset].deck.map(id => newCard(id));
      this.belt = SHOWDOWN_DECKS[this.preset].belt.slice();
      this.hp = this.maxHp += 10; // Showdown riders come in rested
    }
    this.newMap();
  }

  /**
   * Showdown: between fights you heal a third of your health, a wanted demon pays a
   * tonic, a boss pays its keepsake, and you are offered three cards.
   */
  showdownRest(kind, ch) {
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp * 0.35));
    const out = { cards: this.cardChoices(3, 0.35) };
    if (kind === 'elite') { const t = this.randomTonic(); if (this.gainTonic(t)) out.tonic = t; }
    else {
      const k = storyFor(this.hero).boss(ch).reward || this.randomKeepsake();
      if (k && !this.has(k)) { this.gainKeepsake(k); out.keepsake = k; }
    }
    return out;
  }

  /** A Wanted challenge's changed rule, applied at the start of the run. */
  applyChallenge() {
    const c = CHALLENGES[this.challenge];
    if (!c) return;
    if (c.deck) this.deck = c.deck.map(id => newCard(id));
    if (c.belt) this.belt = c.belt.slice();
    if (c.infamy) this.infamy = c.infamy;
    if (c.sight !== undefined) this.maxSight = this.sight = c.sight;
    if (c.maxHp) this.hp = this.maxHp = c.maxHp;
    (c.keepsakes || []).forEach(k => this.gainKeepsake(k));
    (c.cards || []).forEach(([id, up]) => this.addCard(id, up));
    if (c.onlyStyle) this.onlyStyle = c.onlyStyle;
    if (c.questions) this.questionBonus = c.questions;
  }

  /** The Daily Hunt's one change to the rules, applied at the start of the run. */
  applyTwist() {
    switch (this.twist) {
      case 'blind': this.maxSight = this.sight = 0; break;
      case 'tight_lips': this.maxSight++; this.sight++; break;
      case 'glass_jaw': this.hp = Math.floor(this.maxHp * 0.6); break;
      case 'heavy_heart': {
        this.deck.push(newCard('grief'));
        const k = this.randomKeepsake(); if (k) this.gainKeepsake(k);
        break;
      }
    }
  }

  // ---- saving ---------------------------------------------------------------------
  static SAVE_FIELDS = ['hero', 'ledger', 'styles', 'map', 'path', 'hp', 'maxHp', 'gold', 'sight', 'maxSight', 'deck', 'keepsakes', 'chapter', 'step',
    'usedTowns', 'usedEvents', 'kills', 'innocents', 'flags', 'journal', 'belt', 'removals', 'choices',
    'tonics', 'infamy', 'mode', 'daily', 'twist', 'cleanSolves', 'tutorial', 'lap', 'bounty', 'onlyStyle', 'questionBonus', 'challenge', 'preset'];

  toJSON() {
    const o = { v: 1 };
    for (const k of Run.SAVE_FIELDS) o[k] = this[k];
    if (this.rng.save) o.rngState = this.rng.save();
    return o;
  }

  static fromJSON(o) {
    if (!o || o.v !== 1) return null;
    const r = new Run(o.rngState === undefined ? undefined : 1);
    for (const k of Run.SAVE_FIELDS) if (o[k] !== undefined) r[k] = o[k];
    if (o.rngState !== undefined) r.rng.load(o.rngState);
    // Card uids must stay unique after loading.
    _uid = Math.max(_uid, ...r.deck.map(c => c.uid + 1));
    return r;
  }

  has(k) { return this.keepsakes.includes(k); }

  addInfamy(n) { this.infamy = Math.max(0, Math.min(INFAMY.max, this.infamy + n)); }

  /** Put a tonic in the satchel if there's room. */
  gainTonic(id) {
    if (!id || this.tonics.length >= TONIC_SLOTS) return false;
    this.tonics.push(id);
    return true;
  }
  randomTonic() { return pick(this.rng, Object.keys(TONICS)); }
  /** A tonic found after a fight, or null: 35% after a town fight, always after elites and bosses. */
  tonicReward(kind) { return kind !== 'normal' || this.rng() < 0.35 ? this.randomTonic() : null; }

  addJournal(title, text) {
    if (!this.journal.some(j => j.title === title)) this.journal.push({ chapter: this.chapter, title, text });
  }

  gainKeepsake(k) {
    if (!k || this.has(k)) return;
    this.keepsakes.push(k);
    if (k === 'bible') { this.maxHp += 12; this.hp += 12; }
    if (k === 'silver_spurs') { this.maxSight += 1; this.sight += 1; }
    if (k === 'gun_oil') this.belt.push('lead', 'lead');
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

  // ---- the chapter map ---------------------------------------------------------------
  /**
   * Lay out the whole chapter as columns of stops joined by trails. Column 2
   * holds the chapter's story stop, column 4 a campfire, and every route ends
   * at the boss.
   */
  newMap() {
    const L = STEPS_PER_CHAPTER;
    const layers = [];
    for (let i = 0; i < L; i++) {
      if (i === L - 1) { layers.push([{ type: 'boss', next: [] }]); continue; }
      if (i === 0) { layers.push([{ type: 'town' }, { type: 'town' }].map(n => ({ ...n, next: [] }))); continue; }
      const n = i === 2 || i === L - 2 ? 2 : 3;
      const weights = { town: 40, trail: 22, camp: i === L - 2 ? 0 : 14, post: 14, wanted: i >= 2 ? 16 : 0 };
      const col = [];
      let guard = 0;
      while (col.length < n && guard++ < 60) {
        const t = weightedPick(this.rng, weights);
        if (t !== 'town' && col.some(o => o.type === t)) continue;
        if (t === 'town' && col.filter(o => o.type === 'town').length >= 2) continue;
        col.push({ type: t, next: [] });
      }
      // The Long Ride has no story stops: the story was told on the first lap.
      if (i === 2) col.splice(Math.floor(this.rng() * (col.length + 1)), 0, { type: this.mode === 'long' ? 'trail' : 'story', next: [] });
      if (i === L - 2) col.splice(Math.floor(this.rng() * (col.length + 1)), 0, { type: 'camp', next: [] });
      layers.push(col);
    }
    // Trails: each stop leads to its nearest neighbours in the next column, and
    // every stop in the next column is reachable from somewhere.
    for (let i = 0; i < L - 1; i++) {
      const a = layers[i], b = layers[i + 1];
      a.forEach((node, j) => {
        const k = a.length === 1 ? Math.floor(b.length / 2) : Math.round(j * (b.length - 1) / (a.length - 1));
        node.next = [k];
        const side = k + (this.rng() < 0.5 ? -1 : 1);
        if (b[side] && this.rng() < 0.55) node.next.push(side);
        if (b.length === 1) node.next = [0];
      });
      b.forEach((_, k) => {
        if (!a.some(n => n.next.includes(k))) {
          const j = Math.round(k * (a.length - 1) / Math.max(1, b.length - 1));
          a[Math.min(j, a.length - 1)].next.push(k);
        }
      });
      a.forEach(n => n.next.sort((x, y) => x - y));
    }
    this.map = layers;
    this.path = [];       // column index chosen at each step
    this.choices = this.reachable();
  }

  /** Stops you can ride to next: {type, idx} */
  reachable() {
    if (this.chapter > 3) return [];
    const col = this.map[this.step];
    const from = this.step === 0 ? col.map((_, i) => i) : this.map[this.step - 1][this.path[this.step - 1]].next;
    return from.map(idx => ({ type: col[idx].type, idx }));
  }

  /** Move on from the stop at column index `idx` of the current step. */
  advance(idx) {
    // Fall back to a real stop if we lost track of which one was taken.
    const ok = Number.isInteger(idx) && this.choices.some(c => c.idx === idx);
    const fallback = this.choices.find(c => Number.isInteger(c.idx));
    this.path[this.step] = ok ? idx : fallback ? fallback.idx : 0;
    this.step++;
    if (this.step >= STEPS_PER_CHAPTER) {
      this.chapter++;
      this.step = 0;
      this.usedTowns = [];
      if (this.chapter > 3 && this.mode === 'long') { this.chapter = 1; this.lap++; }
      if (this.chapter <= 3) this.newMap(); else this.choices = [];
      return;
    }
    this.choices = this.reachable();
  }

  // ---- towns ------------------------------------------------------------------
  /**
   * Build a town with three strangers, exactly one of whom is a demon, and a
   * small case to crack. Last night someone vanished near a scene. Humans tell
   * the truth; the demon lies. The clues are laid out so that, with every
   * question asked, only one stranger can be the liar:
   *   A (human): alibi = placeA, saw the demon at the scene.
   *   B (human): alibi = placeB, saw A at placeA (backs up A).
   *   D (demon): alibi = a lie,  saw B at the scene (a frame job).
   */
  makeTown() {
    const enc = pick(this.rng, ENCOUNTERS[this.chapter].normal);
    const names = new Set();
    const usedTells = new Set();
    const tell = pool => {
      const opts = pool.filter(t => !usedTells.has(t));
      const t = pick(this.rng, opts.length ? opts : pool);
      usedTells.add(t);
      return t;
    };
    // Each stranger gets a portrait; the demon's disguise matches its guise.
    const pics = shuffle(this.rng, FOLK.portraits.slice());
    const dpi = pics.findIndex(pt => pt.g === (enc.g || 'm'));
    const demonPic = pics.splice(dpi, 1)[0];
    // Innocent folk can hold the same jobs demons like to hide in, so a job alone proves nothing.
    const guiseRoles = g => Object.values(ENCOUNTERS).flatMap(ch => ch.normal)
      .filter(e => (e.g || 'm') === g && !e.plural && e.role !== enc.role).map(e => e.role);
    const humanRoles = pic => pic.roles.concat(guiseRoles(pic.g));
    const person = (pic, demon) => {
      let name;
      // First names must differ: witnesses refer to each other by first name.
      do { name = `${pick(this.rng, FOLK.first[pic.g])} ${pick(this.rng, FOLK.last)}`; } while (names.has(name.split(' ')[0]));
      names.add(name.split(' ')[0]);
      const tells = demon
        ? [tell(FOLK.mundane), this.rng() < 0.5 ? tell(enc.tells) : tell(FOLK.demonic)]
        : [tell(FOLK.mundane), this.rng() < 0.55 ? tell(FOLK.ambiguous) : tell(FOLK.mundane)];
      return {
        name, role: demon ? enc.role : pick(this.rng, humanRoles(pic)), img: pic.img,
        tells, demon, seen: false, gone: false,
        asked: { alibi: false, saw: false, watch: false },
      };
    };
    const A = person(pics.pop(), false), B = person(pics.pop(), false), D = person(demonPic, true);
    const places = shuffle(this.rng, CASE.places.slice());
    const scene = pick(this.rng, CASE.scenes);
    const first = f => f.name.split(' ')[0];
    const say = (arr, ...a) => pick(this.rng, arr)(...a);
    // Structured facts behind the dialogue (used by the fairness test).
    A.claim = { at: places[0], saw: [D.name, scene] };
    B.claim = { at: places[1], saw: [A.name, places[0]] };
    D.claim = { at: places[2], saw: [B.name, scene] };
    A.alibi = say(CASE.alibi, places[0]);
    B.alibi = say(CASE.alibi, places[1]);
    D.alibi = say(CASE.alibi, places[2]);
    A.saw = say(CASE.saw, first(D), scene);
    B.saw = say(CASE.saw, first(A), places[0]);
    D.saw = say(CASE.saw, first(B), scene);
    const folk = shuffle(this.rng, [A, B, D]);
    return {
      name: this.townName(), folk, enc, scene,
      victim: pick(this.rng, CASE.victims),
      questions: Math.max(2, 5 + HEROES[this.hero].questions + (this.has('lawmans_notebook') ? 2 : 0) - (this.infamy >= 4 ? 1 : 0) - (this.infamy >= 7 ? 1 : 0) - (this.ledger >= 3 ? 1 : 0)
        + (this.twist === 'blind' ? 1 : 0) - (this.twist === 'tight_lips' ? 2 : 0) + (this.questionBonus || 0)),
      usedSight: false,
    };
  }

  // ---- rewards ----------------------------------------------------------------
  cardChoices(n = 3, rareBoost = 0) {
    const out = [];
    const ids = Object.keys(CARDS);
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const r = this.rng();
      const rarity = r < 0.08 + rareBoost ? 'rare' : r < 0.42 + rareBoost ? 'uncommon' : 'common';
      const pool = ids.filter(id => CARDS[id].rarity === rarity && !out.includes(id)
        && (this.onlyStyle ? CARDS[id].style === this.onlyStyle : !CARDS[id].style || this.styles.includes(CARDS[id].style)));
      if (pool.length) out.push(pick(this.rng, pool));
    }
    return out;
  }

  goldReward(kind) {
    let g = kind === 'boss' ? randInt(this.rng, 90, 110) : kind === 'elite' ? randInt(this.rng, 35, 50) : randInt(this.rng, 14, 24);
    if (this.has('horseshoe')) g += 15;
    if (this.twist === 'gold_rush') g *= 2;
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
    const markup = p => Math.round(p * (1 + 0.06 * this.infamy) * (this.twist === 'gold_rush' ? 1.5 : 1));
    cards.forEach(c => { c.price = markup(c.price); });
    const rounds = shuffle(this.rng, SPECIAL_ROUNDS.slice()).slice(0, 2)
      .map(id => ({ id, price: markup(ROUNDS[id].price + randInt(this.rng, -3, 5)), sold: false }));
    const tonics = shuffle(this.rng, Object.keys(TONICS)).slice(0, 2)
      .map(id => ({ id, price: markup(TONICS[id].price + randInt(this.rng, -3, 4)), sold: false }));
    return {
      cards, rounds, tonics,
      keepsake: k ? { id: k, price: markup(randInt(this.rng, 130, 160)), sold: false } : null,
      removePrice: markup(60 + (this.removals || 0) * 20),
      healPrice: markup(30),
      sightPrice: markup(25),
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

// ---------------------------------------------------------------------------
// THE CASEBOOK — detective work with no gunplay. Two demons hide among four or
// five strangers. Humans tell the truth about what they saw; in the hardest
// cases one of them lies about where they were (for their own reasons).
// ---------------------------------------------------------------------------
const CASE_QS = ['alibi', 'saw'];

/**
 * Every pair of strangers who could be the two demons, given what has been heard.
 * @param {object} c          a case from makeCase
 * @param {(i: number, q: string) => boolean} [known]  which statements count (default: all)
 * @returns {number[][]} pairs [i, j] consistent with humans telling the truth
 */
function caseSolutions(c, known = () => true) {
  const out = [];
  const n = c.folk.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const humans = c.folk.map((f, k) => k).filter(k => k !== i && k !== j);
    const fibs = c.fibber ? humans : [-1];
    const ok = fibs.some(fib => {
      const where = {};
      const fact = (name, place) => {
        if (where[name] && where[name] !== place) return false;
        where[name] = place; return true;
      };
      return humans.every(k => {
        const f = c.folk[k];
        if (known(k, 'alibi') && k !== fib && !fact(f.name, f.claim.at)) return false;
        if (known(k, 'saw') && !fact(f.claim.saw[0], f.claim.saw[1])) return false;
        return true;
      });
    });
    if (ok) out.push([i, j]);
  }
  return out;
}

/** The fewest questions that pin down both demons (the case's par). */
function casePar(c) {
  const stmts = [];
  c.folk.forEach((f, i) => CASE_QS.forEach(q => stmts.push([i, q])));
  let best = stmts.length;
  for (let mask = 0; mask < 1 << stmts.length; mask++) {
    let bits = 0; for (let m = mask; m; m &= m - 1) bits++;
    if (bits >= best) continue;
    const on = new Set(stmts.filter((s, k) => mask & (1 << k)).map(s => s.join()));
    if (caseSolutions(c, (i, q) => on.has(i + ',' + q)).length === 1) best = bits;
  }
  return best;
}

/**
 * Build a case that only one pair of demons can explain.
 * @param {() => number} rng
 * @param {{n?: number, fibber?: boolean}} [opts]  n = strangers (4 or 5)
 */
function makeCase(rng, opts = {}) {
  const n = opts.n || 4;
  const encs = Object.values(ENCOUNTERS).flatMap(ch => ch.normal).filter(e => !e.plural);
  for (let attempt = 0; attempt < 400; attempt++) {
    const [e1, e2] = shuffle(rng, encs.slice()).filter((e, k, a) => a.findIndex(x => x.foes[0] === e.foes[0]) === k);
    const pics = shuffle(rng, FOLK.portraits.slice());
    const takePic = g => pics.splice(pics.findIndex(pt => pt.g === g), 1)[0];
    const dp = [takePic(e1.g || 'm'), takePic(e2.g || 'm')];
    const names = new Set();
    const person = (pic, enc) => {
      let name;
      do { name = `${pick(rng, FOLK.first[pic.g])} ${pick(rng, FOLK.last)}`; } while (names.has(name.split(' ')[0]));
      names.add(name.split(' ')[0]);
      return {
        name, img: pic.img, g: pic.g, demon: enc ? enc.foes[0] : null, fibber: false,
        role: enc ? enc.role : pick(rng, pic.roles),
        asked: { alibi: false, saw: false }, seen: false, caught: false, cleared: false,
      };
    };
    const folk = [person(dp[0], e1), person(dp[1], e2)];
    while (folk.length < n) folk.push(person(pics.pop(), null));
    const scene = pick(rng, CASE.scenes);
    const places = shuffle(rng, CASE.places.slice());
    const humans = folk.filter(f => !f.demon);
    const truth = {};
    folk.forEach(f => { f.truthAt = truth[f.name] = f.demon ? scene : places.pop(); });
    const fib = opts.fibber ? pick(rng, humans) : null;
    if (fib) fib.fibber = true;
    const first = name => name.split(' ')[0];
    folk.forEach(f => {
      const others = folk.filter(o => o !== f);
      let at, saw;
      if (!f.demon) {
        at = f.fibber ? places.pop() : truth[f.name];
        const who = pick(rng, others);
        saw = [who.name, truth[who.name]];
      } else {
        at = pick(rng, CASE.places.filter(p => !Object.values(truth).includes(p) || rng() < 0.3));
        const who = pick(rng, others.filter(o => !o.demon));
        saw = [who.name, rng() < 0.6 ? scene : pick(rng, CASE.places.filter(p => p !== truth[who.name]))];
      }
      f.claim = { at, saw };
    });
    // Someone has to catch the fibber out, or the lie is invisible.
    if (fib && !humans.some(h => h !== fib && h.claim.saw[0] === fib.name)) {
      const w = pick(rng, humans.filter(h => h !== fib));
      w.claim.saw = [fib.name, truth[fib.name]];
    }
    const c = { folk: shuffle(rng, folk), scene, fibber: !!fib, victim: pick(rng, CASE.victims) };
    const sols = caseSolutions(c);
    if (sols.length !== 1) continue;
    c.folk.forEach(f => {
      f.alibi = pick(rng, CASE.alibi)(f.claim.at);
      f.saw = pick(rng, CASE.saw)(first(f.claim.saw[0]), f.claim.saw[1]);
    });
    c.par = casePar(c);
    return c;
  }
  throw new Error('could not build a fair case');
}

if (typeof module !== 'undefined') {
  module.exports = { Combat, Run, cardStats, newCard, makeRng, shuffle, pick, STEPS_PER_CHAPTER, makeCase, caseSolutions, casePar };
}
