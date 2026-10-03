'use strict';
// ---------------------------------------------------------------------------
// SLINGER — the fight: the combat screen, its animation, and its controls.
// Loaded after ui.js, whose helpers and SCREENS/ACTIONS tables it extends.
// ---------------------------------------------------------------------------

SCREENS.combat = () => {
  const c = S.combat;
  const p = c.p;
  const selCard = S.sel !== null ? c.hand[S.sel] : null;
  const targeting = selCard && c.needsTarget(selCard);
  const enemies = c.enemies.map(e => {
    const chips = c.intentInfo(e).map(i => i.kind === 'veil'
      ? `<button class="intent i-veil" data-act="peek" data-uid="${e.uid}" ${S.run.sight > 0 ? '' : 'disabled'}>${ART.eye(true)} ?</button>`
      : `<span class="intent i-${i.kind}">${INTENT_ICON[i.kind]}${i.label}</span>`).join('');
    const hostage = e.hostage && e.hp > 0
      ? `<span class="st st-hostage" data-tip="${esc(`Holding ${e.hostage.name}. Any single hit of ${e.hostage.threshold} or more damage kills them. Exposing the demon frees them.`)}">Hostage · ${e.hostage.threshold}+ kills</span>` : '';
    const said = `${e.name}, ${e.hp} of ${e.maxHp} health${e.block ? `, ${e.block} cover` : ''}. ${e.hp > 0 ? c.intentText(e) : 'Gone.'}${targeting && e.hp > 0 ? ' Press to target.' : ''}`;
    return `<div class="foe ${e.hp <= 0 ? 'dead' : ''} ${targeting && e.hp > 0 ? 'targetable' : ''} ${e.boss ? 'is-boss' : ''} ${e.minion ? 'is-minion' : ''}" data-uid="${e.uid}" data-act="${targeting && e.hp > 0 ? 'target' : ''}" aria-label="${esc(said)}">
      <div class="intents" data-tip="${esc(c.intentText(e))}">${e.hp > 0 ? chips : ''}</div>
      <div class="foe-art">${ART.demonArt(e.id)}</div>
      <div class="foe-name">${esc(e.name)}</div>
      ${barHTML(e.hp, e.maxHp, e.block)}
      <div class="statuses">${hostage}${statusHTML(e.st)}</div>
    </div>`;
  }).join('');

  const nextI = c.nextLoaded();
  const chambers = Array.from({ length: p.maxRounds }, (_, i) => {
    // The chamber that fires next sits at the top; the rest follow clockwise.
    const k = (i - (nextI < 0 ? p.pos : nextI) + p.maxRounds) % p.maxRounds;
    const a = (k / p.maxRounds) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + Math.cos(a) * 30, y = 50 + Math.sin(a) * 30;
    const r = p.chambers[i];
    return `<circle class="chamber ${r ? 'loaded r-' + r : ''} ${i === nextI ? 'next' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.maxRounds > 6 ? 9 : 11}" ${r ? `style="fill:${ROUNDS[r].color}"` : ''}/>` +
      (r ? `<text class="rmark" x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle">${ROUNDS[r].mark}</text>` : '');
  }).join('');
  const order = c.peekRounds(p.maxRounds);
  const cylTip = order.length ? 'Fires in this order: ' + order.map(r => ROUNDS[r].name).join(' → ') + '. Reload refills empty chambers from your gun belt.' : 'Empty. Play Reload.';

  const hand = c.hand.map((card, i) => {
    const ok = c.canPlay(card).ok;
    const target = S.sel === i ? null : undefined;
    const onlyFoe = c.alive().length === 1 ? c.alive()[0] : null;
    const text = c.previewValues(card, onlyFoe || target);
    const n = c.hand.length;
    const rot = (i - (n - 1) / 2) * Math.min(5, 30 / n);
    // The slot is a stable hit-box; only the card inside it lifts on hover.
    const st = cardStats(card);
    const said = `${i + 1}: ${st.name}, ${st.cost === null ? 'unplayable' : `costs ${st.cost} grit`}${st.rounds ? `, fires ${st.rounds === 'all' ? 'every' : st.rounds} round${st.rounds === 1 ? '' : 's'}` : ''}. ${text}${ok ? '' : ` Can't play: ${c.canPlay(card).why || ''}.`}`;
    return `<div class="slot ${ok ? 'playable' : 'unplayable'} ${S.sel === i ? 'selected' : ''}" data-act="card" data-i="${i}" style="--rot:${rot}deg" title="${ok ? '' : esc(c.canPlay(card).why || '')}" aria-label="${esc(said)}">${cardHTML(card, { text })}</div>`;
  }).join('');

  return `
    <section class="battle">
      <div class="battle-banner">The Between</div>
      <div class="arena">
        <div class="hero-side" data-uid="player" aria-label="${esc(`${heroDef().name}, ${p.hp} of ${p.maxHp} health${p.block ? `, ${p.block} cover` : ''}`)}">
          <div class="hero-art">${ART.heroArt(S.run.hero)}${p.dog ? `<div class="dog-art" data-uid="dog" data-tip="${esc(`Ranger bites the weakest demon for ${p.dog.bite} after each of your turns.`)}">${ART.dogArt()}</div>` : ''}</div>
          <div class="foe-name">${esc(heroDef().name)}</div>
          ${barHTML(p.hp, p.maxHp, p.block)}
          <div class="statuses">${p.dog ? `<span class="st st-dog" data-tip="Ranger bites the weakest demon after each of your turns.">Ranger ${p.dog.bite}</span>` : ''}${p.traps.length ? `<span class="st st-trap" data-tip="${esc('Armed traps go off on the next demons to attack, before their blows land: ' + p.traps.map(t => t.dmg + (t.sh ? ` + ${t.sh} Shaken` : '')).join(', ') + '.')}">Traps ${p.traps.length}</span>` : ''}${statusHTML(p.st)}${Object.entries(p.pw).map(([k, n]) => `<span class="st st-power" data-tip="${esc(CARDS[k].name)}">${esc(CARDS[k].name)}${n > 1 ? ' ' + n : ''}</span>`).join('')}</div>
        </div>
        <div class="foes">${enemies}</div>
      </div>
      <div class="log" aria-live="polite">${esc(c.log.slice(-1)[0] || '')}</div>
      <div class="tray">
        <div class="gauges">
          <div class="grit" data-tip="Grit: spend it to play cards. Refills every turn." role="img" aria-label="${p.grit} of ${p.maxGrit} grit"><span>${p.grit}</span><small>/${p.maxGrit}</small><label>Grit</label></div>
          <div class="cylinder" data-tip="${esc(cylTip)}" role="img" aria-label="${esc(`Cylinder, ${p.rounds} of ${p.maxRounds} loaded. ${cylTip}`)}">
            <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="cyl" cx="50" cy="50" r="46"/>${chambers}<circle class="pin" cx="50" cy="50" r="6"/></svg>
            <label>${order.length ? 'Next: ' + ROUNDS[order[0]].name : 'Empty'} · ${p.rounds}/${p.maxRounds}</label>
          </div>
        </div>
        <div class="hand">${hand}</div>
        <div class="piles">
          <div class="satchel" aria-label="Tonics">${tonicIcons(S.run.tonics, !S.busy)}</div>
          <button class="pile" data-act="view-pile" data-pile="draw_">Draw ${c.draw_.length}</button>
          <button class="pile" data-act="view-pile" data-pile="discard">Discard ${c.discard.length}</button>
          ${c.exhausted.length ? `<button class="pile" data-act="view-pile" data-pile="exhausted">Gone ${c.exhausted.length}</button>` : ''}
          <button class="btn end-turn" data-act="end-turn" ${S.busy ? 'disabled' : ''}>End Turn</button>
        </div>
      </div>
      ${targeting ? '<div class="target-hint">Choose a target — or click the card again to put it back.</div>' : ''}
    </section>`;
};

// ---------------------------------------------------------------------------
// Combat interaction
// ---------------------------------------------------------------------------
function afterCombatRender() {
  const c = S.combat;
  // Drain visual effects into floaters.
  const fx = c.fx.splice(0);
  let delay = 0;
  const stack = {}; // stagger floaters on the same target vertically
  for (const e of fx) {
    if (!e.uid) continue;
    const el = app.querySelector(`[data-uid="${e.uid}"]`);
    if (!el) continue;
    let text = null, cls = '';
    if (e.type === 'hit') {
      text = e.n ? `-${e.n}` : (e.blocked ? 'blocked' : '0'); cls = e.n ? 'dmg' : 'blocked'; shake(el, delay);
      AUDIO.sfx(e.uid === 'player' && e.n ? 'hurt' : e.n ? 'hit' : 'cover', delay / 1000);
      if (e.n) hurt(el.querySelector('.foe-art, .hero-art'), delay);
      if (e.uid === 'player' && e.n >= 12) quake();
      if (e.uid === 'player' && e.n) setTimeout(() => buzz(e.n >= 12 ? [40, 30, 60] : 25), delay);
    }
    else if (e.type === 'die') { dissolve(el); AUDIO.sfx('death'); buzz([15, 40, 15]); continue; }
    else if (e.type === 'dud') { text = 'Click. Dud.'; cls = 'blocked'; }
    else if (e.type === 'bite') {
      text = 'Ranger!'; cls = 'buff'; AUDIO.sfx('bark', delay / 1000);
      slash(el.querySelector('.foe-art'), 'claw', delay);
      const dogEl = app.querySelector('.dog-art');
      if (dogEl) setTimeout(() => animate(dogEl, [{ transform: 'none' }, { transform: 'translateX(60px) scale(1.15)', offset: 0.4 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }), delay);
    }
    else if (e.type === 'trap') { text = 'Trap!'; cls = 'dmg'; AUDIO.sfx('snap', delay / 1000); burst(centerOf(el.querySelector('.foe-art') || el), 'spark', delay); }
    else if (e.type === 'trapset') { text = 'Trap set'; cls = 'cover'; AUDIO.sfx('snap', delay / 1000); }
    else if (e.type === 'ward') { text = 'Ward broken'; cls = 'buff'; }
    else if (e.type === 'hostage_dead') { text = 'The hostage is dead'; cls = 'dmg'; AUDIO.sfx('wrong', delay / 1000); }
    else if (e.type === 'hostage_freed') { text = 'Hostage freed!'; cls = 'heal'; AUDIO.sfx('heal', delay / 1000); }
    else if (e.type === 'collect') { text = `Collected: ${e.name}`; cls = 'debuff'; }
    else if (e.type === 'peek') { text = 'Seen'; cls = 'debuff'; }
    else if (e.type === 'pierce') { text = 'Cover burned away'; cls = 'buff'; }
    else if (e.type === 'burn') { text = `-${e.n} 🔥`; cls = 'dmg burn'; AUDIO.sfx('burn', delay / 1000); }
    else if (e.type === 'heal' && e.n) { text = `+${e.n}`; cls = 'heal'; }
    else if (e.type === 'cover') { text = `+${e.n} cover`; cls = 'cover'; }
    else if (e.type === 'status') { text = `${STATUS[e.key].name} ${e.n}`; cls = STATUS[e.key].good ? 'buff' : 'debuff'; }
    else if (e.type === 'phase') { showBanner(e.text); AUDIO.sfx('boom'); }
    if (text) {
      const k = stack[e.uid] = (stack[e.uid] || 0) + 1;
      floater(el, text, cls, delay, (k - 1) * 26);
    }
    delay += 140 * SPD();
  }
  if (S.deal) { dealHand(S.deal === 'start' ? 900 : 0); S.deal = false; }
  // Several renders can happen after the last blow; only the first one ends the fight.
  if (c.over && !S.ending) {
    S.ending = true;
    S.busy = true;
    setTimeout(() => { S.busy = false; c.over === 'win' ? winFight() : loseFight(); }, (c.over === 'win' ? 1100 : 1400) * SPD());
  }
}

// ---------------------------------------------------------------------------
// Combat animation. The rules resolve instantly; these effects play on a
// fixed overlay (#fx) so a re-render never cuts them off.
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, reducedMotion() ? 0 : ms * SPD()));
const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const animate = (el, frames, opts) => (el && el.animate && !reducedMotion()
  ? el.animate(frames, { ...opts, duration: (opts.duration || 0) * SPD(), delay: (opts.delay || 0) * SPD() }) : null);

function fxNode(cls, x, y, ttl = 700) {
  const d = document.createElement('div');
  d.className = 'fx ' + cls;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  fxLayer.appendChild(d);
  setTimeout(() => d.remove(), ttl);
  return d;
}

function burst(p, cls, delay = 0) {
  if (reducedMotion() || !p) return;
  setTimeout(() => fxNode('burst ' + cls, p.x, p.y).style.setProperty('--r', Math.random()), delay * SPD());
}

function tracer(from, to, cls = '', delay = 0) {
  if (reducedMotion()) return;
  setTimeout(() => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const t = fxNode('tracer ' + cls, from.x, from.y, 500);
    t.style.width = Math.hypot(dx, dy) + 'px';
    t.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }, delay * SPD());
}

function slash(el, cls, delay = 0) {
  if (reducedMotion() || !el) return;
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const d = fxNode('slash ' + cls, r.left + r.width / 2, r.top + r.height * 0.45, 600);
    d.innerHTML = '<i></i><i></i><i></i>';
  }, delay * SPD());
}

function hurt(el, delay = 0) {
  if (!el) return;
  setTimeout(() => { el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt'); }, delay);
}

function quake() {
  if (reducedMotion()) return;
  app.classList.remove('quake'); void app.offsetWidth; app.classList.add('quake');
}

/** A slain demon burns away: a copy of its art flares, rises and fades, shedding embers. */
function dissolve(foeEl) {
  const img = foeEl.querySelector('.foe-art .paint, .foe-art svg');
  if (!img || reducedMotion()) return;
  const r = img.getBoundingClientRect();
  const ghost = img.cloneNode(true);
  ghost.className = 'fx dying';
  Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  fxLayer.appendChild(ghost);
  animate(ghost, [
    { filter: 'brightness(1)', transform: 'none', opacity: 1 },
    { filter: 'brightness(3) sepia(1) saturate(4) hue-rotate(-20deg)', transform: 'translateY(-4px) scale(1.03)', opacity: 1, offset: 0.25 },
    { filter: 'brightness(4) blur(6px)', transform: 'translateY(-40px) scale(1.12)', opacity: 0 },
  ], { duration: 1100, easing: 'ease-in' });
  setTimeout(() => ghost.remove(), 1150);
  for (let k = 0; k < 10; k++) {
    burst({ x: r.left + r.width * (0.2 + Math.random() * 0.6), y: r.top + r.height * (0.2 + Math.random() * 0.7) }, 'ember', k * 60);
  }
}

/** Fly a copy of a card from the hand toward a point, then let it burn out. */
function flyCard(cardEl, to, spin = 0) {
  if (!cardEl || reducedMotion()) return;
  const r = cardEl.getBoundingClientRect();
  const ghost = cardEl.cloneNode(true);
  ghost.classList.add('fx', 'ghost');
  Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  fxLayer.appendChild(ghost);
  const dx = to.x - (r.left + r.width / 2), dy = to.y - (r.top + r.height / 2);
  animate(ghost, [
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
    { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 70}px) scale(1.12) rotate(${-spin / 2}deg)`, opacity: 1, filter: 'brightness(1.25)', offset: 0.4 },
    { transform: `translate(${dx}px, ${dy}px) scale(.3) rotate(${spin}deg)`, opacity: 0, filter: 'brightness(2.5)' },
  ], { duration: 460, easing: 'cubic-bezier(.45,0,.75,1)' });
  setTimeout(() => ghost.remove(), 480);
}

/** New hand: cards slide in one by one from the draw pile. */
function dealHand(wait = 0) {
  const pile = app.querySelector('[data-pile="draw_"]');
  if (!pile) return;
  const from = centerOf(pile);
  app.querySelectorAll('.hand .slot .card').forEach((el, k) => {
    const to = centerOf(el);
    animate(el, [
      { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(.35) rotate(25deg)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 380, delay: wait + k * 70, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    AUDIO.sfx('deal', (wait + k * 70) * SPD() / 1000);
  });
}

const gunPoint = heroEl => { const r = heroEl.getBoundingClientRect(); return { x: r.left + r.width * 0.78, y: r.top + r.height * 0.42 }; };

/** Play card `i` at `uid` with the hero's action, then resolve it. */
async function playCard(i, uid) {
  const c = S.combat;
  const card = c.hand[i];
  const def = CARDS[card.id];
  S.busy = true;
  S.sel = null;
  const cardEl = app.querySelector(`.slot[data-i="${i}"] .card`);
  const heroEl = app.querySelector('.hero-art');
  const foeArt = u => app.querySelector(`.foe[data-uid="${u}"] .foe-art`);
  const targets = def.target === 'enemy' ? [foeArt(uid) || foeArt(c.alive()[0].uid)]
    : def.target === 'all' ? [...app.querySelectorAll('.foe:not(.dead) .foe-art')] : [];
  const dest = targets.length === 1 ? centerOf(targets[0])
    : targets.length ? centerOf(app.querySelector('.foes')) : centerOf(heroEl);

  flyCard(cardEl, dest, def.type === 'attack' ? 14 : 0);
  AUDIO.sfx('whoosh');
  if (/reload|speed_loader|quick_hands|load_|hellfire_load|spin_cylinder/.test(card.id)) AUDIO.sfx('reload', 0.2);
  if (cardEl) cardEl.style.visibility = 'hidden';
  await sleep(260);

  if (def.type === 'attack') {
    animate(heroEl, [{ transform: 'none' }, { transform: 'translateX(28px) rotate(2deg)', offset: 0.3 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
    if (def.rounds) {
      const gun = gunPoint(heroEl);
      const shots = def.rounds === 'all' ? c.p.rounds : card.id === 'ricochet' ? cardStats(card).v.n : Math.max(1, targets.length, def.rounds);
      const loaded = c.peekRounds(def.rounds === 'all' ? c.p.rounds : def.rounds);
      for (let k = 0; k < shots; k++) {
        const rd = loaded[k] || null;
        if (rd === 'dud') { AUDIO.sfx('click', k * 0.07); continue; }
        const t = targets[k % targets.length] || targets[0];
        if (!t) break;
        const p = centerOf(t);
        const hitP = { x: p.x + (Math.random() * 40 - 20), y: p.y + (Math.random() * 60 - 40) };
        burst(gun, 'muzzle', k * 70);
        AUDIO.sfx('shot', k * 0.07 * SPD());
        const tcls = rd === 'silver' ? 'silver' : rd === 'blessed' ? 'holy' : rd === 'hellfire' || card.id === 'hellfire_round' || c.p.pw.consecrated ? 'fire' : '';
        tracer(gun, hitP, tcls, k * 70);
        burst(hitP, 'spark', k * 70 + 90);
      }
      quake();
    } else {
      targets.forEach((t, k) => { slash(t, 'blade', k * 60); AUDIO.sfx('blade', k * 0.06); });
    }
  } else if (def.type === 'power') {
    burst(centerOf(heroEl), 'aura power');
    AUDIO.sfx('buff');
  } else if (targets.length) {
    targets.forEach(t => { tracer(gunPoint(heroEl), centerOf(t), 'hex'); burst(centerOf(t), 'hexhit', 160); });
    AUDIO.sfx('hex');
  } else {
    burst(centerOf(heroEl), 'shield');
    if (!/reload|speed_loader|load_|hellfire_load|spin_cylinder/.test(card.id)) AUDIO.sfx(card.id === 'whiskey' ? 'heal' : 'cover');
  }
  await sleep(170);
  c.play(i, uid);
  S.busy = false;
  render();
}

/** End the turn: the hand is swept away, then each demon acts in turn. */
async function runEnemyTurn() {
  const c = S.combat;
  S.busy = true;
  S.sel = null;
  const pile = app.querySelector('[data-pile="discard"]');
  if (pile) {
    const to = centerOf(pile);
    app.querySelectorAll('.hand .slot .card').forEach(el => flyCard(el, to, 20));
    AUDIO.sfx('whoosh');
  }
  await sleep(300);
  const queue = c.beginEnemyPhase();
  render();
  await sleep(250);
  for (const e of queue) {
    if (c.over) break;
    if (e.hp <= 0) continue;
    const art = app.querySelector(`.foe[data-uid="${e.uid}"] .foe-art`);
    const heroEl = app.querySelector('.hero-art');
    const m = e.intent;
    if (art && m) {
      if (m.atk) {
        animate(art, [{ transform: 'none' }, { transform: 'translateX(-80px) scale(1.08)', offset: 0.35 }, { transform: 'none' }], { duration: 560, easing: 'ease-in-out' });
        await sleep(200);
        for (let h = 0; h < (m.hits || 1); h++) { slash(heroEl, 'claw', h * 120); AUDIO.sfx('claw', h * 0.12 * SPD()); }
      } else {
        animate(art, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.9) drop-shadow(0 0 18px #ff6a2b)' }, { filter: 'brightness(1)' }], { duration: 560 });
        await sleep(200);
      }
      if (m.block) { burst(centerOf(art), 'shield'); AUDIO.sfx('cover'); }
      if (m.wrath || m.heal) { burst(centerOf(art), 'aura'); AUDIO.sfx('buff'); }
      if (m.summon) { burst(centerOf(art), 'aura summon'); AUDIO.sfx('boom'); }
      if (m.shaken || m.exposed || m.burn || m.curse) { tracer(centerOf(art), centerOf(heroEl), 'hex'); burst(centerOf(heroEl), 'hexhit', 160); AUDIO.sfx('hex'); }
    }
    c.enemyStep(e);
    await sleep(340);
    render();
    await sleep(420);
  }
  c.endEnemyPhase();
  S.busy = false;
  S.deal = true;
  render();
}

function floater(el, text, cls, delay, dy = 0) {
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'floater ' + cls;
  f.textContent = text;
  f.style.left = (r.left + r.width / 2 + (Math.random() * 40 - 20)) + 'px';
  f.style.top = (r.top + r.height * 0.35 - dy) + 'px';
  f.style.animationDelay = delay + 'ms';
  fxLayer.appendChild(f);
  setTimeout(() => f.remove(), 1400 + delay);
}

function shake(el, delay) {
  setTimeout(() => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }, delay);
}

function showBanner(text) {
  const b = document.createElement('div');
  b.className = 'phase-banner';
  b.textContent = text;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 4200);
}

function clickCard(i) {
  const c = S.combat;
  if (S.busy || c.over) return;
  const card = c.hand[i];
  if (!card) return;
  const chk = c.canPlay(card);
  if (!chk.ok) { flashLog(chk.why); return; }
  if (S.sel === i) { S.sel = null; render(); return; }
  if (c.needsTarget(card) && c.alive().length > 1) { S.sel = i; render(); return; }
  S.sel = null;
  playCard(i, c.alive()[0] && c.alive()[0].uid);
}

function clickTarget(uid) {
  const c = S.combat;
  if (S.sel === null) return;
  if (S.busy || c.over) return;
  const i = S.sel;
  S.sel = null;
  playCard(i, uid);
}

function endTurn() {
  const c = S.combat;
  if (S.busy || c.over) return;
  runEnemyTurn();
}

function flashLog(msg) {
  const l = app.querySelector('.log');
  if (!l) return;
  l.textContent = msg;
  l.classList.remove('warn'); void l.offsetWidth; l.classList.add('warn');
}

Object.assign(ACTIONS, {
  'card': el => clickCard(+el.dataset.i),
  'target': el => clickTarget(el.dataset.uid),
  'end-turn': endTurn,
  'tonic': el => {
    const c = S.combat;
    if (S.busy || !c || c.over) return;
    const id = c.useTonic(+el.dataset.i);
    if (!id) return;
    AUDIO.sfx(TONICS[id].sfx || 'heal');
    const hero = app.querySelector('.hero-art');
    if (hero) burst(centerOf(hero), id === 'dynamite' ? 'muzzle' : 'aura');
    if (id === 'dynamite') { quake(); app.querySelectorAll('.foe:not(.dead) .foe-art').forEach(f => burst(centerOf(f), 'spark')); }
    render();
  },
  'peek': el => {
    const c = S.combat;
    if (S.busy || !c || !c.peek(el.dataset.uid)) return;
    AUDIO.sfx('sight');
    render();
  },
});
