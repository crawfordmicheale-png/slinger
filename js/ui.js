'use strict';
// ---------------------------------------------------------------------------
// SLINGER — user interface. Renders screens as HTML strings and routes clicks
// through `data-act` attributes.
// ---------------------------------------------------------------------------

const $ = sel => document.querySelector(sel);
const app = $('#app');
const hud = $('#hud');
const modal = $('#modal');
const fxLayer = $('#fx');
const tip = $('#tip');

const S = {
  run: null,
  screen: 'title',
  combat: null,
  fightKind: null,   // 'normal' | 'elite' | 'boss'
  town: null,
  shop: null,
  event: null,
  eventResult: null,
  reward: null,
  sel: null,         // selected hand index while targeting
  busy: false,
  flash: '',         // one-line message on a screen
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kinName = k => FAMILY[k];

// ---------------------------------------------------------------------------
// Rendering primitives
// ---------------------------------------------------------------------------
function cardHTML(card, o = {}) {
  const s = cardStats(card);
  const def = s.def;
  const text = o.text || s.text;
  const pips = s.rounds === 'all' ? '<span class="pip all" title="Spends every loaded Round">ALL</span>'
    : Array.from({ length: s.rounds }, () => '<span class="pip"></span>').join('');
  const cls = ['card', `t-${def.type}`, `r-${def.rarity}`, card.up ? 'upgraded' : '', o.cls || ''].join(' ');
  return `<div class="${cls}" ${o.attrs || ''}>
    ${s.cost === null || s.cost === undefined ? '' : `<div class="cost">${s.cost}</div>`}
    ${s.rounds ? `<div class="rounds">${pips}</div>` : ''}
    <div class="c-name">${esc(s.name)}</div>
    <div class="c-art" style="background-image:url('art/cards/${card.id}.webp')"></div>
    <div class="c-type">${def.type}${def.rarity !== 'starter' && def.rarity !== 'curse' ? ' · ' + def.rarity : ''}</div>
    <div class="c-text">${esc(text)}</div>
    ${o.price !== undefined ? `<div class="price">${o.price} gold</div>` : ''}
  </div>`;
}

function statusHTML(st) {
  return Object.entries(st).filter(([, n]) => n).map(([k, n]) =>
    `<span class="st st-${k}" data-tip="${esc(STATUS[k].name + ': ' + STATUS[k].desc)}">${STATUS[k].name} ${n}</span>`).join('');
}

function barHTML(hp, max, block = 0) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return `<div class="bar"><div class="fill" style="width:${pct}%"></div>
    <span class="bar-label">${hp} / ${max}</span>${block ? `<span class="block-badge" data-tip="Cover: absorbs damage. Cleared at the start of your turn.">${block}</span>` : ''}</div>`;
}

function keepsakeHTML(id) {
  const k = KEEPSAKES[id];
  const initials = k.name.replace(/[^A-Z]/g, '').slice(0, 2) || k.name[0];
  return `<span class="keepsake ${k.family ? 'family' : ''}" data-tip="${esc(k.name + ' — ' + k.desc)}">${initials}</span>`;
}

function renderHUD() {
  const r = S.run;
  if (!r || S.screen === 'title' || S.screen === 'intro') { hud.hidden = true; return; }
  hud.hidden = false;
  const hp = S.combat && S.screen === 'combat' ? S.combat.p.hp : r.hp;
  const eyes = Array.from({ length: r.maxSight }, (_, i) => ART.eye(i < r.sight)).join('');
  hud.innerHTML = `
    <div class="hud-left">
      <span class="hud-name">${HERO.name}</span>
      <span class="hud-hp" data-tip="Health">♥ ${hp}/${r.maxHp}</span>
      <span class="hud-gold" data-tip="Gold">$ ${r.gold}</span>
      <span class="hud-sight" data-tip="Veil Sight: look through a stranger's skin to see what they really are. Restored at camp.">${eyes}</span>
    </div>
    <div class="hud-mid">${r.chapter <= 3 ? CHAPTERS[r.chapter].title : ''}</div>
    <div class="hud-right">
      <span class="keepsakes">${r.keepsakes.map(keepsakeHTML).join('')}</span>
      <button class="btn small" data-act="journal">Journal (${r.journal.length})</button>
      <button class="btn small" data-act="view-deck">Deck (${r.deck.length})</button>
      ${soundButtons()}
    </div>`;
}

function soundButtons() {
  return `<button class="btn small snd ${AUDIO.isOn('music') ? '' : 'off'}" data-act="toggle-music" aria-pressed="${AUDIO.isOn('music')}" title="Music">♫</button>` +
    `<button class="btn small snd ${AUDIO.isOn('sfx') ? '' : 'off'}" data-act="toggle-sfx" aria-pressed="${AUDIO.isOn('sfx')}" title="Sound effects">✹</button>`;
}

// Which music plays on which screen.
function musicFor(name) {
  if (name === 'combat') return S.fightKind === 'boss' ? 'boss' : 'between';
  if (name === 'boss' || name === 'finale') return 'between';
  if (name === 'gameover') return 'somber';
  return 'trail';
}

function setScreen(name) {
  S.screen = name;
  AUDIO.music(musicFor(name));
  S.sel = null;
  document.body.classList.toggle('between', name === 'combat' || name === 'finale');
  render();
  window.scrollTo(0, 0);
}

function render() {
  renderHUD();
  const fn = SCREENS[S.screen];
  app.className = 'screen-' + S.screen;
  app.innerHTML = fn ? fn() : '';
  if (S.screen === 'combat') afterCombatRender();
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
const SCREENS = {
  title: () => `
    <div class="title-hero">${ART.heroArt()}</div>
    <section class="title-screen">
      <h1 class="logo">Slinger</h1>
      <p class="tag">A frontier deckbuilder of demons and vengeance</p>
      <div class="menu">
        <button class="btn big" data-act="new-run">Ride Out</button>
        <button class="btn" data-act="how">How to Play</button>
        <div class="title-sound">${soundButtons()}</div>
      </div>
    </section>`,

  intro: () => `
    <section class="panel story">
      ${STORY.intro.map(p => `<p>${esc(p)}</p>`).join('')}
      <p class="between-note">${esc(STORY.between)}</p>
      <button class="btn big" data-act="to-chapter">Take up the hunt</button>
    </section>`,

  map: () => {
    const r = S.run;
    const ch = CHAPTERS[r.chapter];
    const boss = ENCOUNTERS[r.chapter].boss;
    const dots = Array.from({ length: STEPS_PER_CHAPTER }, (_, i) =>
      `<span class="trail-dot ${i < r.step ? 'done' : i === r.step ? 'here' : ''} ${i === STEPS_PER_CHAPTER - 1 ? 'boss' : ''}"></span>`).join('<span class="trail-line"></span>');
    const node = (c, i) => {
      const info = NODE_INFO[c.type];
      const story = STORY_EVENTS[r.chapter];
      const name = c.type === 'boss' ? esc(boss.guise) : c.type === 'story' ? esc(story.title) : info.name;
      const desc = c.type === 'boss' ? `The one who killed ${kinName(boss.kin)}.` : c.type === 'story' ? `Someone here knew ${kinName(story.kin)}.` : info.desc;
      return `<button class="node node-${c.type}" data-act="pick-node" data-i="${i}">
        <span class="node-ico">${info.icon}</span>
        <span class="node-name">${name}</span>
        <span class="node-desc">${desc}</span>
      </button>`;
    };
    return `
      <section class="map">
        <h2>${ch.title}</h2>
        <p class="sub">Hunting the one who killed ${kinName(ch.kin)}.</p>
        <div class="trail">${dots}</div>
        <p class="prompt">Which way, Marshal?</p>
        <div class="nodes">${r.choices.map(node).join('')}</div>
      </section>`;
  },

  town: () => {
    const t = S.town;
    const r = S.run;
    const person = (f, i) => {
      const reveal = f.seen ? (f.demon ? 'demon' : 'human') : null;
      return `<div class="folk ${f.gone ? 'gone' : ''} ${reveal ? 'seen-' + reveal : ''}">
        <div class="portrait">${ART.folkArt(f, f.demon && f.seen ? t.enc.foes[0] : null, i + t.name.length)}</div>
        <div class="folk-name">${esc(f.name)}</div>
        <div class="folk-role">the ${esc(f.role)}</div>
        <ul class="tells">${f.tells.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${f.seen ? `<div class="verdict">${f.demon ? 'DEMON — ' + esc(ENEMIES[t.enc.foes[0]].name) : 'Human. Just a person.'}</div>` : ''}
        ${f.gone ? '<div class="verdict bad">You were wrong.</div>' : `
        <div class="folk-actions">
          ${!f.seen ? `<button class="btn small" data-act="look" data-i="${i}" ${r.sight > 0 ? '' : 'disabled'}>${ART.eye(true)} Look (${r.sight})</button>` : ''}
          <button class="btn small danger" data-act="accuse" data-i="${i}">Draw on them</button>
        </div>`}
      </div>`;
    };
    return `
      <section class="town">
        <h2>${esc(t.name)}</h2>
        <p class="sub">Three strangers catch your eye. One of them is wearing somebody else's skin.</p>
        ${S.flash ? `<p class="flash">${esc(S.flash)}</p>` : ''}
        <div class="folks">${t.folk.map(person).join('')}</div>
        <div class="row center">
          <button class="btn" data-act="leave-town" data-tip="The demon will follow you out and strike first.">Ride on without choosing</button>
        </div>
      </section>`;
  },

  wanted: () => {
    const e = ENCOUNTERS[S.run.chapter].elite;
    return `
      <section class="poster">
        <div class="poster-head">WANTED</div>
        <div class="poster-sub">DEAD — NOT ALIVE</div>
        <div class="poster-art">${ART.demonArt(e.foes[0])}</div>
        <div class="poster-name">${esc(e.name)}</div>
        <p class="poster-text">${esc(e.bounty)}</p>
        <div class="poster-reward">REWARD: a keepsake &amp; bounty gold</div>
        <div class="row center">
          <button class="btn big danger" data-act="fight-elite">Hunt it down</button>
        </div>
      </section>`;
  },

  boss: () => {
    const b = ENCOUNTERS[S.run.chapter].boss;
    return `
      <section class="panel story boss-intro">
        <h2>${esc(b.guise)}</h2>
        <div class="boss-art">${ART.demonArt(b.foes[0])}</div>
        <p>${esc(b.before)}</p>
        <p class="speech">${esc(b.taunt)}</p>
        <button class="btn big danger" data-act="fight-boss">For ${kinName(b.kin)}.</button>
      </section>`;
  },

  combat: () => {
    const c = S.combat;
    const p = c.p;
    const selCard = S.sel !== null ? c.hand[S.sel] : null;
    const targeting = selCard && c.needsTarget(selCard);
    const enemies = c.enemies.map(e => {
      const chips = c.intentInfo(e).map(i => `<span class="intent i-${i.kind}">${INTENT_ICON[i.kind]}${i.label}</span>`).join('');
      return `<div class="foe ${e.hp <= 0 ? 'dead' : ''} ${targeting && e.hp > 0 ? 'targetable' : ''} ${e.boss ? 'is-boss' : ''} ${e.minion ? 'is-minion' : ''}" data-uid="${e.uid}" data-act="${targeting && e.hp > 0 ? 'target' : ''}">
        <div class="intents" data-tip="${esc(c.intentText(e))}">${e.hp > 0 ? chips : ''}</div>
        <div class="foe-art">${ART.demonArt(e.id)}</div>
        <div class="foe-name">${esc(e.name)}</div>
        ${barHTML(e.hp, e.maxHp, e.block)}
        <div class="statuses">${statusHTML(e.st)}</div>
      </div>`;
    }).join('');

    const chambers = Array.from({ length: p.maxRounds }, (_, i) => {
      const a = (i / p.maxRounds) * Math.PI * 2 - Math.PI / 2;
      const x = 50 + Math.cos(a) * 30, y = 50 + Math.sin(a) * 30;
      return `<circle class="chamber ${i < p.rounds ? 'loaded' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/>`;
    }).join('');

    const hand = c.hand.map((card, i) => {
      const ok = c.canPlay(card).ok;
      const target = S.sel === i ? null : undefined;
      const onlyFoe = c.alive().length === 1 ? c.alive()[0] : null;
      const text = c.previewValues(card, onlyFoe || target);
      const n = c.hand.length;
      const rot = (i - (n - 1) / 2) * Math.min(5, 30 / n);
      // The slot is a stable hit-box; only the card inside it lifts on hover.
      return `<div class="slot ${ok ? 'playable' : 'unplayable'} ${S.sel === i ? 'selected' : ''}" data-act="card" data-i="${i}" style="--rot:${rot}deg" title="${ok ? '' : esc(c.canPlay(card).why || '')}">${cardHTML(card, { text })}</div>`;
    }).join('');

    return `
      <section class="battle">
        <div class="battle-banner">The Between</div>
        <div class="arena">
          <div class="hero-side" data-uid="player">
            <div class="hero-art">${ART.heroArt()}</div>
            <div class="foe-name">${HERO.name}</div>
            ${barHTML(p.hp, p.maxHp, p.block)}
            <div class="statuses">${statusHTML(p.st)}${Object.entries(p.pw).map(([k, n]) => `<span class="st st-power" data-tip="${esc(CARDS[k].name)}">${esc(CARDS[k].name)}${n > 1 ? ' ' + n : ''}</span>`).join('')}</div>
          </div>
          <div class="foes">${enemies}</div>
        </div>
        <div class="log">${esc(c.log.slice(-1)[0] || '')}</div>
        <div class="tray">
          <div class="gauges">
            <div class="grit" data-tip="Grit: spend it to play cards. Refills every turn."><span>${p.grit}</span><small>/${p.maxGrit}</small><label>Grit</label></div>
            <div class="cylinder" data-tip="Rounds loaded in your revolver. Shot cards spend Rounds. Play Reload to fill every chamber.">
              <svg viewBox="0 0 100 100"><circle class="cyl" cx="50" cy="50" r="46"/>${chambers}<circle class="pin" cx="50" cy="50" r="6"/></svg>
              <label>${p.rounds}/${p.maxRounds} Rounds</label>
            </div>
          </div>
          <div class="hand">${hand}</div>
          <div class="piles">
            <button class="pile" data-act="view-pile" data-pile="draw_">Draw ${c.draw_.length}</button>
            <button class="pile" data-act="view-pile" data-pile="discard">Discard ${c.discard.length}</button>
            ${c.exhausted.length ? `<button class="pile" data-act="view-pile" data-pile="exhausted">Gone ${c.exhausted.length}</button>` : ''}
            <button class="btn end-turn" data-act="end-turn" ${S.busy ? 'disabled' : ''}>End Turn</button>
          </div>
        </div>
        ${targeting ? '<div class="target-hint">Choose a target — or click the card again to put it back.</div>' : ''}
      </section>`;
  },

  reward: () => {
    const rw = S.reward;
    return `
      <section class="panel reward">
        <h2>${rw.title}</h2>
        <p class="sub">${esc(rw.text || '')}</p>
        <div class="loot">
          <div class="loot-line">+${rw.gold} gold</div>
          ${rw.keepsake ? `<div class="loot-line keepsake-line">${keepsakeHTML(rw.keepsake)} <b>${esc(KEEPSAKES[rw.keepsake].name)}</b> — ${esc(KEEPSAKES[rw.keepsake].desc)}</div>` : ''}
        </div>
        ${rw.cards && !rw.cardTaken ? `
          <p class="prompt">Add a card to your deck:</p>
          <div class="card-row">${rw.cards.map((id, i) => cardHTML({ id, up: false }, { cls: 'pickable', attrs: `data-act="take-card" data-i="${i}"` })).join('')}</div>
        ` : rw.cardTaken ? `<p class="sub">Added ${esc(rw.cardTaken)}.</p>` : ''}
        <div class="row center"><button class="btn big" data-act="reward-done">${rw.cards && !rw.cardTaken ? 'Skip card and ride on' : 'Ride on'}</button></div>
      </section>`;
  },

  camp: () => {
    const r = S.run;
    const heal = Math.floor(r.maxHp * 0.3);
    return `
      <section class="panel camp">
        <h2>Campfire</h2>
        <div class="fire"><span></span><span></span><span></span></div>
        <p class="memory">${esc(S.memory || '')}</p>
        <p class="sub">${S.flash ? esc(S.flash) : 'Coyotes sing somewhere past the firelight. The Veil feels thin tonight. Your Sight is restored.'}</p>
        ${S.campDone ? '<div class="row center"><button class="btn big" data-act="leave">Break camp</button></div>' : `
        <div class="row center">
          <button class="btn big" data-act="rest">Rest<br><small>Heal ${heal} HP</small></button>
          <button class="btn big" data-act="clean-iron" ${r.upgradable().length ? '' : 'disabled'}>Clean your iron<br><small>Upgrade a card</small></button>
        </div>`}
      </section>`;
  },

  post: () => {
    const sh = S.shop;
    const r = S.run;
    return `
      <section class="panel post">
        <h2>Trading Post</h2>
        <p class="sub">${S.flash ? esc(S.flash) : '"Evening. Cash only, and no demons," says the proprietor. You check. She\'s telling the truth.'}</p>
        <div class="card-row shop-cards">
          ${sh.cards.map((c, i) => c.sold ? '<div class="card sold">SOLD</div>'
            : cardHTML({ id: c.id, up: false }, { price: c.price, cls: r.gold >= c.price ? 'pickable' : 'too-pricey', attrs: `data-act="buy-card" data-i="${i}"` })).join('')}
        </div>
        <div class="services">
          ${sh.keepsake && !sh.keepsake.sold ? `<button class="btn" data-act="buy-keepsake" ${r.gold >= sh.keepsake.price ? '' : 'disabled'}>${keepsakeHTML(sh.keepsake.id)} ${esc(KEEPSAKES[sh.keepsake.id].name)} — ${sh.keepsake.price}g<br><small>${esc(KEEPSAKES[sh.keepsake.id].desc)}</small></button>` : ''}
          <button class="btn" data-act="buy-remove" ${r.gold >= sh.removePrice && !sh.removed ? '' : 'disabled'}>Burn a card — ${sh.removePrice}g<br><small>Remove a card from your deck</small></button>
          <button class="btn" data-act="buy-heal" ${r.gold >= sh.healPrice && r.hp < r.maxHp ? '' : 'disabled'}>Hot meal &amp; a bath — ${sh.healPrice}g<br><small>Heal 20 HP</small></button>
          <button class="btn" data-act="buy-sight" ${r.gold >= sh.sightPrice && r.sight < r.maxSight ? '' : 'disabled'}>Peyote tea — ${sh.sightPrice}g<br><small>Restore 1 Sight</small></button>
        </div>
        <div class="row center"><button class="btn big" data-act="leave">Ride on</button></div>
      </section>`;
  },

  event: () => {
    const ev = S.event;
    const r = S.run;
    return `
      <section class="panel event ${ev.kin ? 'story-event' : ''}">
        ${ev.kin ? `<div class="kicker">${kinName(ev.kin)}</div>` : ''}
        <h2>${esc(ev.title)}</h2>
        <p>${esc(ev.text)}</p>
        ${S.eventResult ? `<p class="result">${esc(S.eventResult)}</p><div class="row center"><button class="btn big" data-act="leave">Ride on</button></div>` : `
        <div class="options">
          ${ev.options.map((o, i) => `<button class="btn option" data-act="event-opt" data-i="${i}" ${!o.req || o.req(r) ? '' : 'disabled'}>${esc(o.label)}</button>`).join('')}
        </div>`}
      </section>`;
  },

  chapterEnd: () => {
    const b = ENCOUNTERS[S.run.chapter].boss;
    return `
      <section class="panel story">
        <h2>${kinName(b.kin)} can rest now.</h2>
        ${b.last ? `<p class="speech">${esc(b.last)}</p>` : ''}
        <p>${esc(b.after)}</p>
        ${b.reward ? `<p class="loot-line keepsake-line">${keepsakeHTML(b.reward)} <b>${esc(KEEPSAKES[b.reward].name)}</b> — ${esc(KEEPSAKES[b.reward].desc)}</p>` : ''}
        <p class="sub">You rest for three days. Your wounds close. (Health fully restored.)</p>
        <button class="btn big" data-act="next-chapter">Ride for ${esc(CHAPTERS[S.run.chapter + 1].title.split('— ')[1])}</button>
      </section>`;
  },

  chapterIntro: () => {
    const r = S.run;
    const ci = CHAPTER_INTROS[r.chapter];
    return `
      <section class="panel story chapter-intro">
        <div class="kicker">${esc(CHAPTERS[r.chapter].title.split(' — ')[0])}</div>
        <h2>${esc(CHAPTERS[r.chapter].title.split(' — ')[1])}</h2>
        <figure class="letter">
          <blockquote>${esc(ci.letter.text)}</blockquote>
          <figcaption>${ci.letter.from === 'unsigned' ? 'An unsigned card' : 'A letter from ' + esc(ci.letter.from)}</figcaption>
        </figure>
        ${ci.paras.map(p => `<p>${esc(p)}</p>`).join('')}
        <button class="btn big" data-act="to-map">Ride on</button>
      </section>`;
  },

  finale: () => {
    const r = S.run;
    return `
      <section class="panel story finale">
        <div class="boss-art">${ART.demonArt('grey_gentleman')}</div>
        ${FINALE.text.map((p, i) => `<p class="${i ? 'speech' : ''}">${esc(p)}</p>`).join('')}
        <div class="options">
          ${FINALE.options.map(o => {
            const ok = !o.req || o.req(r);
            return `<button class="btn option" data-act="ending" data-id="${o.id}" ${ok ? '' : 'disabled'}>${esc(o.label)}${ok ? '' : `<br><small>${esc(o.locked)}</small>`}</button>`;
          }).join('')}
        </div>
      </section>`;
  },

  victory: () => {
    const e = ENDINGS[S.endingId || 'hunter'];
    return `
    <section class="panel story victory">
      <div class="kicker">Ending</div>
      <h2>${esc(e.title)}</h2>
      ${e.text.map(p => `<p>${esc(p)}</p>`).join('')}
      <p class="stats">Demons sent back: ${S.run.kills} · Innocents wronged: ${S.run.innocents} · Journal entries: ${S.run.journal.length}</p>
      <button class="btn big" data-act="title">The End</button>
    </section>`;
  },

  gameover: () => `
    <section class="panel story gameover">
      <h2>Here lies Jonah Crane</h2>
      <p>${esc(STORY.death)}</p>
      <p class="stats">${esc(CHAPTERS[Math.min(3, S.run.chapter)].title)} · Demons sent back: ${S.run.kills}</p>
      <button class="btn big" data-act="new-run">Ride again</button>
      <button class="btn" data-act="title">Title</button>
    </section>`,
};

const NODE_INFO = {
  town:   { name: 'Frontier Town', icon: '⌂', desc: 'A demon hides among the townsfolk. Find it.' },
  wanted: { name: 'Wanted Poster', icon: '✠', desc: 'A known demon. Dangerous. Carries a keepsake.' },
  camp:   { name: 'Campfire', icon: '♨', desc: 'Rest or clean your iron. Restores Sight.' },
  post:   { name: 'Trading Post', icon: '$', desc: 'Buy cards and supplies. Burn what you don\'t need.' },
  trail:  { name: 'The Trail', icon: '?', desc: 'Something waits by the road.' },
  story:  { name: 'A Lead', icon: '✎', desc: '' },
  boss:   { name: 'Reckoning', icon: '☠', desc: '' },
};
const INTENT_ICON = { atk: '⚔ ', def: '⛨ ', buff: '▲ ', debuff: '☠ ', summon: '✚ ' };

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------
function newRun() {
  S.run = new Run();
  S.combat = null;
  setScreen('intro');
}

function pickNode(i) {
  const r = S.run;
  const c = r.choices[i];
  S.flash = '';
  S.campDone = false;
  switch (c.type) {
    case 'town': S.town = r.makeTown(); S.guilt = null; setScreen('town'); break;
    case 'wanted': setScreen('wanted'); break;
    case 'camp':
      r.sight = r.maxSight;
      S.memory = pick(r.rng, MEMORIES);
      setScreen('camp');
      break;
    case 'story':
      S.event = STORY_EVENTS[r.chapter];
      S.eventResult = null;
      setScreen('event');
      break;
    case 'post': S.shop = r.makeShop(); setScreen('post'); break;
    case 'trail': {
      let pool = EVENTS.filter(e => !r.usedEvents.includes(e.id));
      if (!pool.length) { r.usedEvents = []; pool = EVENTS; }
      S.event = pick(r.rng, pool);
      r.usedEvents.push(S.event.id);
      S.eventResult = null;
      setScreen('event');
      break;
    }
    case 'boss': setScreen('boss'); break;
  }
  AUDIO.sfx('deal');
}

function showChapterIntro() {
  const r = S.run;
  const ci = CHAPTER_INTROS[r.chapter];
  r.addJournal(ci.letter.from === 'unsigned' ? 'A Card on Clara\'s Grave' : `Letter from ${ci.letter.from}`, ci.letter.text);
  setScreen('chapterIntro');
}

function showJournal() {
  const j = S.run.journal;
  openModal(`
    <h3>Journal</h3>
    <div class="journal">
      ${j.length ? j.map(e => `<article><div class="kicker">${esc(CHAPTERS[e.chapter].title.split(' — ')[0])}</div><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p></article>`).join('')
        : '<p class="sub">Nothing written yet.</p>'}
    </div>
    <div class="row center"><button class="btn" data-act="close-modal">Close</button></div>`);
}

function leaveNode() {
  S.flash = '';
  S.run.advance();
  setScreen('map');
}

function startFight(foes, kind, opts = {}) {
  S.fightKind = kind;
  S.combat = new Combat(S.run, foes, opts);
  S.ending = false;
  S.busy = false;
  S.deal = 'start';
  // Slip into the Between
  const veil = document.createElement('div');
  veil.className = 'slip';
  veil.innerHTML = `<span>${opts.ambushed ? 'It strikes first.' : 'The world slips.'}</span>`;
  document.body.appendChild(veil);
  setTimeout(() => veil.remove(), 1600);
  AUDIO.sfx('slip');
  setScreen('combat');
}

function winFight() {
  const r = S.run;
  const c = S.combat;
  c.finish();
  r.afterFight();
  const kind = S.fightKind;
  const gold = r.goldReward(kind);
  r.gold += gold;
  let keepsake = null;
  if (kind === 'elite') { keepsake = r.randomKeepsake(); r.gainKeepsake(keepsake); }
  if (kind === 'boss') {
    keepsake = ENCOUNTERS[r.chapter].boss.reward;
    if (keepsake) r.gainKeepsake(keepsake);
  }
  AUDIO.sfx('coin', 0.3);
  if (kind === 'boss') r.addJournal(`${kinName(ENCOUNTERS[r.chapter].boss.kin)}`, ENCOUNTERS[r.chapter].boss.after);
  if (kind === 'boss' && r.chapter === 3) { setScreen('finale'); return; }
  S.reward = {
    title: kind === 'boss' ? 'Vengeance' : kind === 'elite' ? 'Bounty Collected' : 'Back Through the Veil',
    text: kind === 'boss' ? '' : kind === 'normal' && S.guilt ? `The town buries ${S.guilt} in the morning. You do not stay for it.`
      : kind === 'normal' ? pick(r.rng, THANKS) : 'The Between lets go of you. The street is just a street again.',
    gold, keepsake,
    cards: r.cardChoices(3, kind === 'elite' ? 0.1 : kind === 'boss' ? 0.3 : 0),
    cardTaken: null,
  };
  setScreen('reward');
}

function loseFight() {
  S.combat.finish();
  AUDIO.sfx('toll');
  setScreen('gameover');
}

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
    }
    else if (e.type === 'die') { dissolve(el); AUDIO.sfx('death'); continue; }
    else if (e.type === 'burn') { text = `-${e.n} 🔥`; cls = 'dmg burn'; AUDIO.sfx('burn', delay / 1000); }
    else if (e.type === 'heal' && e.n) { text = `+${e.n}`; cls = 'heal'; }
    else if (e.type === 'cover') { text = `+${e.n} cover`; cls = 'cover'; }
    else if (e.type === 'status') { text = `${STATUS[e.key].name} ${e.n}`; cls = STATUS[e.key].good ? 'buff' : 'debuff'; }
    else if (e.type === 'phase') { showBanner(e.text); AUDIO.sfx('boom'); }
    if (text) {
      const k = stack[e.uid] = (stack[e.uid] || 0) + 1;
      floater(el, text, cls, delay, (k - 1) * 26);
    }
    delay += 140;
  }
  if (S.deal) { dealHand(S.deal === 'start' ? 900 : 0); S.deal = false; }
  // Several renders can happen after the last blow; only the first one ends the fight.
  if (c.over && !S.ending) {
    S.ending = true;
    S.busy = true;
    setTimeout(() => { S.busy = false; c.over === 'win' ? winFight() : loseFight(); }, c.over === 'win' ? 1100 : 1400);
  }
}

// ---------------------------------------------------------------------------
// Combat animation. The rules resolve instantly; these effects play on a
// fixed overlay (#fx) so a re-render never cuts them off.
// ---------------------------------------------------------------------------
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, reducedMotion() ? 0 : ms));
const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const animate = (el, frames, opts) => (el && el.animate && !reducedMotion() ? el.animate(frames, opts) : null);

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
  setTimeout(() => fxNode('burst ' + cls, p.x, p.y).style.setProperty('--r', Math.random()), delay);
}

function tracer(from, to, cls = '', delay = 0) {
  if (reducedMotion()) return;
  setTimeout(() => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const t = fxNode('tracer ' + cls, from.x, from.y, 500);
    t.style.width = Math.hypot(dx, dy) + 'px';
    t.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }, delay);
}

function slash(el, cls, delay = 0) {
  if (reducedMotion() || !el) return;
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const d = fxNode('slash ' + cls, r.left + r.width / 2, r.top + r.height * 0.45, 600);
    d.innerHTML = '<i></i><i></i><i></i>';
  }, delay);
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
    AUDIO.sfx('deal', (wait + k * 70) / 1000);
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
  if (card.id === 'reload' || card.id === 'speed_loader' || card.id === 'quick_hands') AUDIO.sfx('reload', 0.2);
  if (cardEl) cardEl.style.visibility = 'hidden';
  await sleep(260);

  if (def.type === 'attack') {
    animate(heroEl, [{ transform: 'none' }, { transform: 'translateX(28px) rotate(2deg)', offset: 0.3 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
    if (def.rounds) {
      const gun = gunPoint(heroEl);
      const shots = def.rounds === 'all' ? c.p.rounds : card.id === 'ricochet' ? cardStats(card).v.n : Math.max(1, targets.length);
      for (let k = 0; k < shots; k++) {
        const t = targets[k % targets.length] || targets[0];
        if (!t) break;
        const p = centerOf(t);
        const hitP = { x: p.x + (Math.random() * 40 - 20), y: p.y + (Math.random() * 60 - 40) };
        burst(gun, 'muzzle', k * 70);
        AUDIO.sfx('shot', k * 0.07);
        tracer(gun, hitP, card.id === 'hellfire_round' || c.p.pw.consecrated ? 'fire' : '', k * 70);
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
    if (!/reload|speed_loader/.test(card.id)) AUDIO.sfx(card.id === 'whiskey' ? 'heal' : 'cover');
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
        for (let h = 0; h < (m.hits || 1); h++) { slash(heroEl, 'claw', h * 120); AUDIO.sfx('claw', h * 0.12); }
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

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function openModal(html) {
  modal.innerHTML = `<div class="modal-box">${html}</div>`;
  modal.hidden = false;
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; S.modalPick = null; }

function showCards(title, cards, pickable, onPick, cancellable = true) {
  S.modalPick = onPick || null;
  const sorted = cards.slice().sort((a, b) => CARDS[a.id].name.localeCompare(CARDS[b.id].name));
  openModal(`
    <h3>${esc(title)}</h3>
    <div class="card-grid">${sorted.length ? sorted.map(c => cardHTML(c, {
      cls: pickable ? 'pickable' : '',
      attrs: pickable ? `data-act="modal-pick" data-uid="${c.uid}"` : '',
    })).join('') : '<p class="sub">Nothing here.</p>'}</div>
    ${cancellable ? '<div class="row center"><button class="btn" data-act="close-modal">Close</button></div>' : ''}`);
}

function showUpgradeCompare(card, onConfirm) {
  S.modalConfirm = onConfirm;
  openModal(`
    <h3>Upgrade ${esc(CARDS[card.id].name)}?</h3>
    <div class="card-row">${cardHTML(card)}<div class="arrow">→</div>${cardHTML({ ...card, up: true })}</div>
    <div class="row center"><button class="btn big" data-act="modal-confirm">Upgrade</button><button class="btn" data-act="close-modal">Back</button></div>`);
}

function howToPlay() {
  openModal(`
    <h3>How to Play</h3>
    <div class="how">
      <p><b>The hunt.</b> Ride from town to town across three chapters. At the end of each one waits the demon who killed one of your family.</p>
      <p><b>Towns.</b> Three strangers, one demon. Read their tells. Spend <b>Veil Sight</b> ${ART.eye(true)} to look through a stranger's skin and know for sure. Draw on the demon and you get the drop on it: it starts <b>Exposed</b>. Draw on an innocent and you carry that with you (a curse card), and the real demon strikes first.</p>
      <p><b>The Between.</b> Every fight happens in the Between: the same town, only wrong.</p>
      <p><b>Grit</b> pays for cards and refills every turn. <b>Rounds</b> are bullets in your revolver: shot cards (the ones with bullet pips) spend them and they do <i>not</i> refill on their own. Play <b>Reload</b>.</p>
      <p><b>Cover</b> absorbs damage and fades at the start of your turn. Watch the icons over each demon: they show what it will do next.</p>
      <p><b>Wrath</b> adds damage to every hit. <b>Exposed</b> takes 50% more damage. <b>Shaken</b> deals 25% less. <b>Hellfire</b> burns every turn.</p>
      <p class="sub">Keys: 1–9 play a card, E ends your turn, Esc cancels.</p>
    </div>
    <div class="row center"><button class="btn" data-act="close-modal">Got it</button></div>`);
}

// ---------------------------------------------------------------------------
// Event API passed into trail events
// ---------------------------------------------------------------------------
function eventApi() {
  const r = S.run;
  return {
    rand: r.rng,
    gainCard: (id, up) => r.addCard(id, up),
    addCurse: id => r.addCard(id),
    gainKeepsake: () => { const k = r.randomKeepsake(); r.gainKeepsake(k); return k; },
    removeCardPrompt: () => setTimeout(() => showCards('Choose a memory to give up', r.deck, true, uid => { r.removeCard(uid); closeModal(); render(); }, false), 0),
    upgradeCardPrompt: () => {
      if (!r.upgradable().length) return;
      setTimeout(() => showCards('Choose a card to upgrade', r.upgradable(), true, uid => { r.upgradeCard(uid); closeModal(); render(); }, false), 0);
    },
  };
}

// ---------------------------------------------------------------------------
// Click routing
// ---------------------------------------------------------------------------
const ACTIONS = {
  'new-run': newRun,
  'title': () => { S.run = null; setScreen('title'); },
  'how': howToPlay,
  'to-map': () => setScreen('map'),
  'to-chapter': showChapterIntro,
  'journal': showJournal,
  'toggle-music': () => { AUDIO.unlock(); AUDIO.toggle('music'); render(); },
  'toggle-sfx': () => { AUDIO.unlock(); AUDIO.toggle('sfx'); render(); },
  'ending': el => { S.endingId = el.dataset.id; S.run.addJournal(ENDINGS[S.endingId].title, ENDINGS[S.endingId].text[0]); setScreen('victory'); },
  'view-deck': () => showCards(`Your deck (${S.run.deck.length})`, S.run.deck, false),
  'view-pile': el => {
    const c = S.combat; const pile = el.dataset.pile;
    const names = { draw_: 'Draw pile (random order)', discard: 'Discard pile', exhausted: 'Gone for this fight' };
    showCards(names[pile], c[pile], false);
  },
  'close-modal': closeModal,
  'modal-pick': el => { if (S.modalPick) S.modalPick(+el.dataset.uid); },
  'modal-confirm': () => { const f = S.modalConfirm; S.modalConfirm = null; closeModal(); if (f) f(); },
  'pick-node': el => pickNode(+el.dataset.i),
  'leave': leaveNode,

  // town
  'look': el => {
    const r = S.run; const f = S.town.folk[+el.dataset.i];
    if (r.sight <= 0 || f.seen) return;
    r.sight--;
    f.seen = true;
    AUDIO.sfx('sight');
    S.flash = f.demon ? 'The skin slides aside like a curtain. Something grins back at you.' : 'Just a person. Tired, scared, alive.';
    render();
  },
  'accuse': el => {
    const r = S.run; const t = S.town; const f = t.folk[+el.dataset.i];
    if (f.demon) {
      S.flash = '';
      S.guilt = null;
      startFight(t.enc.foes, 'normal', { drop: true });
    } else {
      f.gone = true;
      r.innocents++;
      S.guilt = f.name;
      AUDIO.sfx('wrong');
      r.addCard('blood_on_hands');
      r.hp = Math.max(1, r.hp - 6);
      startFight(t.enc.foes, 'normal', { ambushed: true });
      S.combat.say(`${f.name} was only human. While you stood over the body, the real demon made its move.`);
      render();
    }
  },
  'leave-town': () => startFight(S.town.enc.foes, 'normal', { ambushed: true }),
  'fight-elite': () => startFight(ENCOUNTERS[S.run.chapter].elite.foes, 'elite'),
  'fight-boss': () => startFight(ENCOUNTERS[S.run.chapter].boss.foes, 'boss'),

  // combat
  'card': el => clickCard(+el.dataset.i),
  'target': el => clickTarget(el.dataset.uid),
  'end-turn': endTurn,

  // reward
  'take-card': el => {
    const rw = S.reward; const id = rw.cards[+el.dataset.i];
    S.run.addCard(id);
    AUDIO.sfx('deal');
    rw.cardTaken = CARDS[id].name;
    render();
  },
  'reward-done': () => {
    if (S.fightKind === 'boss') {
      S.run.hp = S.run.maxHp;
      setScreen('chapterEnd');
    } else leaveNode();
  },
  'next-chapter': () => { S.run.advance(); S.run.sight = S.run.maxSight; showChapterIntro(); },

  // camp
  'rest': () => {
    const r = S.run; const heal = Math.floor(r.maxHp * 0.3);
    r.hp = Math.min(r.maxHp, r.hp + heal);
    AUDIO.sfx('heal');
    S.flash = 'You sleep with your hat over your eyes and your hand on your iron. You dream of Clara laughing.';
    S.campDone = true; render();
  },
  'clean-iron': () => {
    const r = S.run;
    showCards('Choose a card to upgrade', r.upgradable(), true, uid => {
      const card = r.deck.find(c => c.uid === uid);
      showUpgradeCompare(card, () => {
        r.upgradeCard(uid);
        AUDIO.sfx('reload');
        S.flash = `You strip, oil, and reassemble by firelight. ${CARDS[card.id].name} is sharper now.`;
        S.campDone = true; render();
      });
    });
  },

  // shop
  'buy-card': el => {
    const r = S.run; const item = S.shop.cards[+el.dataset.i];
    if (item.sold || r.gold < item.price) return;
    r.gold -= item.price; item.sold = true; r.addCard(item.id);
    AUDIO.sfx('coin');
    S.flash = `"${CARDS[item.id].name}. Good choice." She counts your coins twice.`;
    render();
  },
  'buy-keepsake': () => {
    const r = S.run; const k = S.shop.keepsake;
    if (k.sold || r.gold < k.price) return;
    r.gold -= k.price; k.sold = true; r.gainKeepsake(k.id);
    S.flash = `You pocket the ${KEEPSAKES[k.id].name}.`;
    render();
  },
  'buy-remove': () => {
    const r = S.run; const sh = S.shop;
    if (r.gold < sh.removePrice || sh.removed) return;
    showCards('Choose a card to burn', r.deck, true, uid => {
      const card = r.deck.find(c => c.uid === uid);
      r.gold -= sh.removePrice; sh.removed = true; r.removals = (r.removals || 0) + 1;
      r.removeCard(uid);
      S.flash = `${CARDS[card.id].name} goes into the stove. You feel lighter.`;
      closeModal(); render();
    });
  },
  'buy-heal': () => {
    const r = S.run; const sh = S.shop;
    if (r.gold < sh.healPrice) return;
    r.gold -= sh.healPrice; r.hp = Math.min(r.maxHp, r.hp + 20);
    AUDIO.sfx('heal');
    S.flash = 'Beans, cornbread, and hot water. You almost feel human.';
    render();
  },
  'buy-sight': () => {
    const r = S.run; const sh = S.shop;
    if (r.gold < sh.sightPrice || r.sight >= r.maxSight) return;
    r.gold -= sh.sightPrice; r.sight++;
    S.flash = 'Bitter as sin. The edges of the world go soft and see-through.';
    render();
  },

  // event
  'event-opt': el => {
    const o = S.event.options[+el.dataset.i];
    if (o.req && !o.req(S.run)) return;
    S.eventResult = o.run(S.run, eventApi());
    S.run.hp = Math.min(S.run.hp, S.run.maxHp);
    render();
  },
};

// Browsers only allow sound after the player interacts with the page.
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => AUDIO.unlock(), { passive: true }));

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (el && el.tagName === 'BUTTON' && !el.disabled && !/toggle-/.test(el.dataset.act)) AUDIO.sfx('click');
  if (!el || !el.dataset.act || el.disabled) {
    // Clicking empty space cancels targeting.
    if (S.screen === 'combat' && S.sel !== null && !ev.target.closest('.slot, .foe')) { S.sel = null; render(); }
    if (ev.target === modal && S.modalPick === null) closeModal();
    return;
  }
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el);
});

document.addEventListener('keydown', ev => {
  if (!modal.hidden) { if (ev.key === 'Escape' && modal.querySelector('[data-act="close-modal"]')) closeModal(); return; }
  if (S.screen !== 'combat') return;
  if (ev.key === 'Escape') { S.sel = null; render(); }
  else if (ev.key === 'e' || ev.key === 'E') endTurn();
  else if (/^[1-9]$/.test(ev.key)) clickCard(+ev.key - 1);
});

// Tooltips
document.addEventListener('mouseover', ev => {
  const el = ev.target.closest('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 270, Math.max(8, r.left + r.width / 2 - 130));
  const y = r.bottom + 8 + 80 > window.innerHeight ? r.top - 8 - tip.offsetHeight : r.bottom + 8;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
});

// Drifting spores for the Between.
(function spores() {
  const box = $('#spores');
  let html = '';
  for (let i = 0; i < 46; i++) {
    const s = 2 + Math.random() * 4;
    html += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${10 + Math.random() * 18}s;animation-delay:${-Math.random() * 20}s"></i>`;
  }
  box.innerHTML = html;
})();

render();
