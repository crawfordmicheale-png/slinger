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

// ---- settings: stored per browser -------------------------------------------------
const SETTINGS_KEY = 'slinger.settings.v1';
const TEXT_SIZES = { small: 0.9, normal: 1, large: 1.15, huge: 1.3 };
const SETTINGS = Object.assign({ fast: false, text: 'normal', autoVoice: true }, (() => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
})());
function applySettings() {
  document.body.classList.toggle('fast', !!SETTINGS.fast);
  document.documentElement.style.setProperty('--ts', TEXT_SIZES[SETTINGS.text] || 1);
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* storage unavailable */ }
  applySettings();
}
/** Animation time scale: fast mode plays everything in a bit under half the time. */
const SPD = () => (SETTINGS.fast ? 0.45 : 1);

// The story as the current hunter lives it, and a title swap for generic text.
const ST = () => storyFor(S.run ? S.run.hero : 'jonah');
const heroDef = () => HEROES[S.run ? S.run.hero : 'jonah'];
const T = text => (!S.run || S.run.hero === 'jonah') ? text : String(text).replace(/\bMarshal\b/g, HEROES[S.run.hero].title);
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
      <span class="hud-name">${esc(heroDef().name)}${r.ledger ? ` <small class="hud-ledger" data-tip="${esc(LEDGER.slice(1, r.ledger + 1).map(l => l.desc).join(' '))}">${esc(LEDGER[r.ledger].name)}</small>` : ''}</span>
      <span class="hud-hp" data-tip="Health">♥ ${hp}/${r.maxHp}</span>
      <span class="hud-gold" data-tip="Gold">$ ${r.gold}</span>
      <span class="hud-sight" data-tip="Veil Sight: look through a stranger's skin to see what they really are, or see a veiled demon's next move. Restored at camp.">${eyes}</span>
      <span class="hud-infamy inf-${r.infamy >= 7 ? 3 : r.infamy >= 4 ? 2 : r.infamy >= 1 ? 1 : 0}" data-tip="${esc(INFAMY.desc(r.infamy))}">${INFAMY.label(r.infamy)} ${r.infamy}</span>
      <span class="hud-tonics" data-tip="${esc(r.tonics.length ? 'Tonics: ' + r.tonics.map(t => TONICS[t].name).join(', ') + '. Use them during a fight.' : 'No tonics in your satchel.')}">${tonicIcons(r.tonics, false)}</span>
    </div>
    <div class="hud-mid">${r.mode === 'showdown' && S.sd ? `Showdown · Fight ${Math.min(S.sd.idx + 1, SHOWDOWN_FIGHTS.length)} of ${SHOWDOWN_FIGHTS.length}` : r.chapter <= 3 ? CHAPTERS[r.chapter].title : ''}${r.mode === 'long' ? ` · Lap ${r.lap + 1} · Bounty ${r.bounty}` : ''}</div>
    <div class="hud-right">
      <span class="keepsakes">${r.keepsakes.map(keepsakeHTML).join('')}</span>
      <button class="btn small" data-act="journal">Journal (${r.journal.length})</button>
      ${S.screen !== 'combat' ? '<button class="btn small" data-act="belt">Gun Belt</button>' : ''}
      <button class="btn small" data-act="view-deck">Deck (${r.deck.length})</button>
      ${soundButtons()}
    </div>`;
}

function tonicIcons(list, usable) {
  return Array.from({ length: TONIC_SLOTS }, (_, i) => {
    const id = list[i];
    if (!id) return `<span class="tonic empty"></span>`;
    const inner = `<img src="art/tonics/${id}.webp" alt="${esc(TONICS[id].name)}" onerror="this.replaceWith(document.createTextNode('⚱'))">`;
    return usable
      ? `<button class="tonic" data-act="tonic" data-i="${i}" data-tip="${esc(TONICS[id].name + ': ' + TONICS[id].desc)}" aria-label="${esc(TONICS[id].name)}">${inner}</button>`
      : `<span class="tonic">${inner}</span>`;
  }).join('');
}

/** The chapter drawn as columns of stops joined by trails. Reachable stops are clickable. */
function mapSVG(r, nameOf) {
  const L = r.map.length, W = 660, H = 250;
  const x = i => 44 + i * ((W - 88) / (L - 1));
  const y = (i, j) => H / 2 + (j - (r.map[i].length - 1) / 2) * 78;
  const reach = new Map(r.choices.map((c, k) => [c.idx, k]));
  let lines = '', dots = '';
  r.map.forEach((col, i) => col.forEach((n, j) => {
    n.next.forEach(k => {
      const walked = r.path[i] === j && r.path[i + 1] === k;
      const open = i === r.step - 1 && r.path[i] === j;
      lines += `<line class="m-trail ${walked ? 'walked' : ''} ${open ? 'open' : ''}" x1="${x(i)}" y1="${y(i, j)}" x2="${x(i + 1)}" y2="${y(i + 1, k)}"/>`;
    });
  }));
  r.map.forEach((col, i) => col.forEach((n, j) => {
    const here = i === r.step && reach.has(j);
    const visited = i < r.step && r.path[i] === j;
    const past = i < r.step && !visited;
    const rad = n.type === 'boss' ? 24 : 18;
    const attrs = here ? `data-act="pick-node" data-i="${reach.get(j)}" tabindex="0" role="button"` : '';
    dots += `<g class="m-node m-${n.type} ${here ? 'reach' : ''} ${visited ? 'visited' : ''} ${past ? 'past' : ''}" ${attrs} data-tip="${esc(nameOf(n.type))}">
      <circle cx="${x(i)}" cy="${y(i, j)}" r="${rad}"/>
      <text x="${x(i)}" y="${y(i, j) + 6}" text-anchor="middle">${NODE_INFO[n.type].icon}</text>
    </g>`;
  }));
  return `<div class="chapter-map"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chapter map">${lines}${dots}</svg></div>`;
}

function soundButtons() {
  return `<button class="btn small snd ${AUDIO.isOn('music') ? '' : 'off'}" data-act="toggle-music" aria-pressed="${AUDIO.isOn('music')}" title="Music">♫</button>` +
    `<button class="btn small snd ${AUDIO.isOn('sfx') ? '' : 'off'}" data-act="toggle-sfx" aria-pressed="${AUDIO.isOn('sfx')}" title="Sound effects">✹</button>` +
    `<button class="btn small snd ${AUDIO.isOn('voice') ? '' : 'off'}" data-act="toggle-voice" aria-pressed="${AUDIO.isOn('voice')}" title="Voices">❝</button>`;
}

// Which music plays on which screen.
function musicFor(name) {
  if (name === 'combat') return S.fightKind === 'boss' ? 'boss' : 'between';
  if (name === 'boss' || name === 'finale') return 'between';
  if (name === 'gameover') return 'somber';
  return 'trail';
}

// Which recorded line (art/voice/<id>.mp3) plays when a screen opens.
function voiceFor(name) {
  const ch = S.run && S.run.chapter;
  if (name === 'chapterIntro') return `letter_${ch}`;
  if (name === 'boss') return `taunt_${ch}`;
  if (!ST().voiced) return null;
  if (name === 'chapterEnd' && ENCOUNTERS[ch].boss.last) return `last_${ch}`;
  if (name === 'finale') return 'finale';
  return null;
}

// A small replay button beside a voiced line.
const replay = id => `<button class="btn small replay" data-act="voice" data-id="${id}" title="Hear it again" aria-label="Hear it again">▶</button>`;

function setScreen(name) {
  const prev = S.screen;
  S.screen = name;
  if (S.run && (name === 'map' || name === 'chapterIntro')) saveRun();
  if (S.run && (name === 'gameover' || name === 'victory')) clearSave(S.run.mode);
  AUDIO.music(musicFor(name));
  if (name !== prev && SETTINGS.autoVoice && S.run) AUDIO.voice(voiceFor(name));
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
  if (typeof coach === 'function') coach();
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
        ${(() => {
          const sv = loadSave();
          return sv ? `<button class="btn big" data-act="continue">Continue<br><small>${esc(CHAPTERS[Math.min(3, sv.chapter)].title)} · ♥ ${sv.hp}/${sv.maxHp}</small></button>` : '';
        })()}
        <button class="btn ${loadSave() ? '' : 'big'}" data-act="setup">${loadSave() ? 'New Hunt' : 'Ride Out'}</button>
        <div class="menu-row">
          <button class="btn" data-act="daily">Daily Hunt<br><small>#${dailyInfo().num} · ${esc(DAILY_TWISTS[dailyInfo().twist].name)}</small></button>
          <button class="btn" data-act="longride">The Long Ride<br><small>Endless. Ride for bounty.</small></button>
        </div>
        <div class="menu-row">
          <button class="btn" data-act="casebook">The Casebook<br><small>Pure detective work</small></button>
          <button class="btn" data-act="showdown">Showdown<br><small>Six bosses, back to back</small></button>
          <button class="btn" data-act="challenges">Wanted<br><small>This week: ${esc(CHALLENGES[featuredChallenge()].name)}</small></button>
        </div>
        <div class="menu-row">
          <button class="btn" data-act="boards">Leaderboards</button>
          <button class="btn" data-act="records">Records</button>
          <button class="btn" data-act="how">How to Play</button>
          <button class="btn" data-act="settings">Settings</button>
        </div>
        <div class="title-sound">${soundButtons()}</div>
      </div>
    </section>`,

  setup: () => {
    const prof = loadProfile();
    const chosen = S.setupHero || 'jonah';
    const lvl = Math.min(S.setupLedger || 0, prof.ledger);
    const hunter = key => {
      const h = HEROES[key];
      const locked = h.unlock && !prof.unlocks[h.unlock.key];
      return `<button class="hunter ${chosen === key ? 'sel' : ''} ${locked ? 'locked' : ''}" data-act="pick-hero" data-id="${key}" ${locked ? 'disabled' : ''}>
        <span class="hunter-art">${locked ? '<span class="lock">?</span>' : ART.heroArt(key)}</span>
        <b>${esc(h.name)}</b>
        <small>${locked ? 'Locked. ' + esc(h.unlock.text) : `♥ ${h.hp} · ${ART.eye(true)} ${h.sight}${h.questions ? ` · +${h.questions} questions` : ''}`}</small>
        ${locked ? '' : `<span class="hunter-blurb">${esc(h.blurb)}</span>`}
      </button>`;
    };
    const styles = Object.entries(STYLE_UNLOCKS).map(([k, u]) => `<li class="${prof.unlocks[k] ? 'got' : ''}">${prof.unlocks[k] ? '✔' : '✖'} ${esc(u.name)}${prof.unlocks[k] ? '' : ' — ' + esc(u.text)}</li>`).join('');
    return `
      <section class="panel setup">
        <h2>Who rides out?</h2>
        <div class="hunters">${Object.keys(HEROES).map(hunter).join('')}</div>
        <h3 class="setup-h">The Ledger</h3>
        <div class="ledger-pages">
          ${LEDGER.map((l, i) => `<button class="ledger-page ${i === lvl ? 'sel' : ''}" data-act="pick-ledger" data-i="${i}" ${i > prof.ledger ? 'disabled' : ''} data-tip="${esc(i > prof.ledger ? 'Win on the page before this one to open it.' : LEDGER.slice(0, i + 1).map(x => x.desc).join(' '))}">${i > prof.ledger ? '🔒 ' : ''}${esc(l.name)}</button>`).join('')}
        </div>
        <p class="sub">${esc(LEDGER.slice(1, lvl + 1).map(l => l.desc).join(' ') || LEDGER[0].desc)}</p>
        <ul class="unlocks">${styles}</ul>
        <label class="tutor-toggle"><input type="checkbox" data-act="toggle-tutor" ${tutorWanted() ? 'checked' : ''}> Show me the ropes (a guided first town and first fight)</label>
        <div class="row center"><button class="btn big" data-act="new-run">Ride out</button><button class="btn" data-act="title">Back</button></div>
      </section>`;
  },

  intro: () => `
    <section class="panel story">
      ${ST().intro.map(p => `<p>${esc(p)}</p>`).join('')}
      <p class="between-note">${esc(STORY.between)}</p>
      <button class="btn big" data-act="to-chapter">Take up the hunt</button>
    </section>`,

  map: () => {
    const r = S.run;
    const ch = CHAPTERS[r.chapter];
    const st = ST();
    const boss = st.boss(r.chapter);
    const story = st.story(r.chapter);
    const nameOf = type => type === 'boss' ? boss.guise : type === 'story' ? story.title : NODE_INFO[type].name;
    const descOf = type => type === 'boss' ? st.hunt(r.chapter) : type === 'story' ? `Someone here knew ${story.kicker}.` : NODE_INFO[type].desc;
    const node = (c, i) => `<button class="node node-${c.type}" data-act="pick-node" data-i="${i}">
        <span class="node-ico">${NODE_INFO[c.type].icon}</span>
        <span class="node-name">${esc(nameOf(c.type))}</span>
        <span class="node-desc">${esc(descOf(c.type))}</span>
      </button>`;
    return `
      <section class="map">
        <h2>${ch.title}</h2>
        <p class="sub">${esc(st.hunt(r.chapter))}</p>
        ${mapSVG(r, nameOf)}
        <p class="prompt">${esc(T('Which way, Marshal?'))}</p>
        <div class="nodes">${r.choices.map(node).join('')}</div>
      </section>`;
  },

  town: () => {
    const t = S.town;
    const r = S.run;
    const qLeft = t.questions;
    const dots = Array.from({ length: t.questionsMax }, (_, i) => `<span class="qdot ${i < qLeft ? 'on' : ''}"></span>`).join('');
    const ask = (f, i, q, label) => `<button class="btn small ask" data-act="ask" data-i="${i}" data-q="${q}" ${f.asked[q] || qLeft <= 0 ? 'disabled' : ''}>${label}</button>`;
    const person = (f, i) => {
      const reveal = f.seen ? (f.demon ? 'demon' : 'human') : null;
      const clues = [`<li>${esc(f.tells[0])}</li>`];
      if (f.asked.alibi) clues.push(`<li class="clue"><b>Last night:</b> ${esc(f.alibi)}</li>`);
      if (f.asked.saw) clues.push(`<li class="clue"><b>Saw:</b> ${esc(f.saw)}</li>`);
      if (f.asked.watch) clues.push(`<li class="clue"><b>Watching:</b> ${esc(f.tells[1])}</li>`);
      return `<div class="folk ${f.gone ? 'gone' : ''} ${reveal ? 'seen-' + reveal : ''}">
        <div class="portrait">${ART.folkArt(f, f.demon && f.seen ? t.enc.foes[0] : null, i + t.name.length)}</div>
        <div class="folk-name">${esc(f.name)}</div>
        <div class="folk-role">the ${esc(f.role)}</div>
        <ul class="tells">${clues.join('')}</ul>
        ${f.seen ? `<div class="verdict">${f.demon ? 'DEMON — ' + esc(ENEMIES[t.enc.foes[0]].name) : 'Human. Just a person.'}</div>` : ''}
        ${f.gone ? '<div class="verdict bad">You were wrong.</div>' : `
        <div class="folk-questions">
          ${ask(f, i, 'alibi', 'Where were you?')}
          ${ask(f, i, 'saw', 'What did you see?')}
          ${ask(f, i, 'watch', 'Watch them')}
        </div>
        <div class="folk-actions">
          ${!f.seen ? `<button class="btn small" data-act="look" data-i="${i}" ${r.sight > 0 ? '' : 'disabled'}>${ART.eye(true)} Look (${r.sight})</button>` : ''}
          <button class="btn small danger" data-act="accuse" data-i="${i}">Draw on them</button>
        </div>`}
      </div>`;
    };
    return `
      <section class="town">
        <h2>${esc(t.name)}</h2>
        <p class="sub">Last night ${esc(t.victim)} vanished near ${esc(t.scene)}. One of these three is wearing somebody else's skin.</p>
        <div class="casebar">
          <span class="qleft" data-tip="Each question costs one. Humans tell the truth. The demon lies, and it will try to frame someone.">Questions ${dots}</span>
          <span class="hint">Humans tell the truth. The demon lies. Crack it without the Veil for a bigger bounty.</span>
        </div>
        ${S.flash ? `<p class="flash">${esc(S.flash)}</p>` : ''}
        <div class="folks">${t.folk.map(person).join('')}</div>
        <div class="row center">
          <button class="btn" data-act="leave-town" data-tip="The demon will follow you out and strike first.">Ride on without choosing</button>
        </div>
      </section>`;
  },

  wanted: () => {
    const e = S.elite || ENCOUNTERS[S.run.chapter].elite;
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
    const b = ST().boss(S.run.chapter);
    return `
      <section class="panel story boss-intro">
        <h2>${esc(b.guise)}</h2>
        <div class="boss-art">${ART.demonArt(b.foes[0])}</div>
        <p>${esc(b.before)}</p>
        <p class="speech">${esc(b.taunt)} ${ST().voiced ? replay(`taunt_${S.run.chapter}`) : ''}</p>
        <button class="btn big danger" data-act="fight-boss">${esc(b.cry)}</button>
      </section>`;
  },

  combat: () => {
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
      return `<div class="foe ${e.hp <= 0 ? 'dead' : ''} ${targeting && e.hp > 0 ? 'targetable' : ''} ${e.boss ? 'is-boss' : ''} ${e.minion ? 'is-minion' : ''}" data-uid="${e.uid}" data-act="${targeting && e.hp > 0 ? 'target' : ''}">
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
      return `<circle class="chamber ${r ? 'loaded r-' + r : ''} ${i === nextI ? 'next' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.maxRounds > 6 ? 9 : 11}" ${r ? `style="fill:${ROUNDS[r].color}"` : ''}/>`;
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
      return `<div class="slot ${ok ? 'playable' : 'unplayable'} ${S.sel === i ? 'selected' : ''}" data-act="card" data-i="${i}" style="--rot:${rot}deg" title="${ok ? '' : esc(c.canPlay(card).why || '')}">${cardHTML(card, { text })}</div>`;
    }).join('');

    return `
      <section class="battle">
        <div class="battle-banner">The Between</div>
        <div class="arena">
          <div class="hero-side" data-uid="player">
            <div class="hero-art">${ART.heroArt(S.run.hero)}</div>
            <div class="foe-name">${esc(heroDef().name)}</div>
            ${barHTML(p.hp, p.maxHp, p.block)}
            <div class="statuses">${statusHTML(p.st)}${Object.entries(p.pw).map(([k, n]) => `<span class="st st-power" data-tip="${esc(CARDS[k].name)}">${esc(CARDS[k].name)}${n > 1 ? ' ' + n : ''}</span>`).join('')}</div>
          </div>
          <div class="foes">${enemies}</div>
        </div>
        <div class="log">${esc(c.log.slice(-1)[0] || '')}</div>
        <div class="tray">
          <div class="gauges">
            <div class="grit" data-tip="Grit: spend it to play cards. Refills every turn."><span>${p.grit}</span><small>/${p.maxGrit}</small><label>Grit</label></div>
            <div class="cylinder" data-tip="${esc(cylTip)}">
              <svg viewBox="0 0 100 100"><circle class="cyl" cx="50" cy="50" r="46"/>${chambers}<circle class="pin" cx="50" cy="50" r="6"/></svg>
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
  },

  reward: () => {
    const rw = S.reward;
    return `
      <section class="panel reward">
        <h2>${rw.title}</h2>
        <p class="sub">${esc(rw.text || '')}</p>
        <div class="loot">
          <div class="loot-line">+${rw.gold} gold</div>
          ${rw.clean ? '<div class="loot-note">Clean work, Marshal. You cracked it without the Veil. (+25 bounty)</div>' : ''}
          ${rw.freed ? `<div class="loot-note">The hostage you freed presses a few coins on you and runs for home. (+${15 * rw.freed} gold, less Infamy)</div>` : ''}
          ${rw.tonic ? `<div class="loot-line keepsake-line">${tonicIcons([rw.tonic], false).split('<span class="tonic empty">')[0]} <b>${esc(TONICS[rw.tonic].name)}</b> — ${esc(TONICS[rw.tonic].desc)}</div>` : ''}
          ${rw.tonicLost ? `<div class="loot-note">You find ${esc(TONICS[rw.tonicLost].name)}, but your satchel is full.</div>` : ''}
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
    const heal = campHeal(r);
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
          ${sh.tonics.map((tn, i) => tn.sold ? '' : `<button class="btn" data-act="buy-tonic" data-i="${i}" ${r.gold >= tn.price && r.tonics.length < TONIC_SLOTS ? '' : 'disabled'}>${esc(TONICS[tn.id].name)} — ${tn.price}g<br><small>${esc(TONICS[tn.id].desc)}${r.tonics.length >= TONIC_SLOTS ? ' (Satchel full.)' : ''}</small></button>`).join('')}
          ${sh.rounds.map((rd, i) => rd.sold ? '' : `<button class="btn" data-act="buy-round" data-i="${i}" ${r.gold >= rd.price ? '' : 'disabled'}><span class="round-chip" style="background:${ROUNDS[rd.id].color}"></span> Box of ${ROUNDS[rd.id].name} rounds — ${rd.price}g<br><small>${esc(ROUNDS[rd.id].desc)} Goes in your gun belt.</small></button>`).join('')}
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
        ${ev.kicker || ev.kin ? `<div class="kicker">${esc(ev.kicker || kinName(ev.kin))}</div>` : ''}
        <h2>${esc(ev.title)}</h2>
        <p>${esc(T(ev.text))}</p>
        ${S.eventResult ? `<p class="result">${esc(T(S.eventResult))}</p><div class="row center"><button class="btn big" data-act="leave">Ride on</button></div>` : `
        <div class="options">
          ${ev.options.map((o, i) => `<button class="btn option" data-act="event-opt" data-i="${i}" ${!o.req || o.req(r) ? '' : 'disabled'}>${esc(T(typeof o.label === 'function' ? o.label(r) : o.label))}</button>`).join('')}
        </div>`}
      </section>`;
  },

  chapterEnd: () => {
    const b = ST().boss(S.run.chapter);
    const got = S.bossKeepsake;
    return `
      <section class="panel story">
        <h2>${esc(b.rest)}</h2>
        ${b.last ? `<p class="speech">${esc(b.last)} ${ST().voiced ? replay(`last_${S.run.chapter}`) : ''}</p>` : ''}
        <p>${esc(b.after)}</p>
        ${got ? `<p class="loot-line keepsake-line">${keepsakeHTML(got)} <b>${esc(KEEPSAKES[got].name)}</b> — ${esc(KEEPSAKES[got].desc)}</p>` : ''}
        <p class="sub">You rest for three days. Your wounds close. (Health fully restored.)</p>
        ${S.run.mode === 'long' && S.run.chapter === 3 ? `<p class="loot-note">The ledger rewrites itself, and the Gentleman's name is back on the first page. Lap ${S.run.lap + 2} begins, and every demon on it is tougher. Bounty so far: ${S.run.bounty}.</p>` : ''}
        <button class="btn big" data-act="next-chapter">${S.run.chapter < 3 ? 'Ride for ' + esc(CHAPTERS[S.run.chapter + 1].title.split('— ')[1]) : 'Ride the next lap'}</button>
      </section>`;
  },

  chapterIntro: () => {
    const r = S.run;
    const ci = ST().chapter(r.chapter);
    return `
      <section class="panel story chapter-intro">
        <div class="kicker">${esc(CHAPTERS[r.chapter].title.split(' — ')[0])}</div>
        <h2>${esc(CHAPTERS[r.chapter].title.split(' — ')[1])}</h2>
        <figure class="letter">
          <blockquote>${esc(ci.letter.text)}</blockquote>
          <figcaption>${ST().voiced ? replay(`letter_${r.chapter}`) : ''} ${ci.letter.from === 'unsigned' ? 'An unsigned card' : 'A letter from ' + esc(ci.letter.from)}</figcaption>
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
        ${ST().finaleText.map((p, i) => `<p class="${i ? 'speech' : ''}">${esc(p)}${i && ST().voiced ? ' ' + replay('finale') : ''}</p>`).join('')}
        <div class="options">
          ${FINALE.options.map(o => {
            const rest = o.id === 'rest' ? ST().rest : null;
            const ok = rest ? rest.req(r) : !o.req || o.req(r);
            return `<button class="btn option" data-act="ending" data-id="${o.id}" ${ok ? '' : 'disabled'}>${esc(o.label)}${ok ? '' : `<br><small>${esc(rest ? rest.locked : o.locked)}</small>`}</button>`;
          }).join('')}
        </div>
      </section>`;
  },

  victory: () => {
    const e = ST().endings[S.endingId || 'hunter'];
    return `
    <section class="panel story victory">
      <div class="kicker">Ending</div>
      <h2>${esc(e.title)}</h2>
      ${e.text.map(p => `<p>${esc(p)}</p>`).join('')}
      ${S.unlockNote ? `<p class="loot-note">${esc(S.unlockNote)}</p>` : ''}
      ${S.run.mode === 'daily' ? dailyShareHTML() : ''}
      <p class="stats">${esc(heroDef().name)} · ${esc(LEDGER[S.run.ledger].name)} · Demons sent back: ${S.run.kills} · Innocents wronged: ${S.run.innocents} · Infamy: ${S.run.infamy} · Journal entries: ${S.run.journal.length}</p>
      <button class="btn big" data-act="title">The End</button>
    </section>`;
  },

  gameover: () => `
    <section class="panel story gameover">
      <h2>Here lies ${esc(heroDef().name)}</h2>
      <p>${esc(STORY.death)}</p>
      <p class="stats">${esc(CHAPTERS[Math.min(3, S.run.chapter)].title)} · Demons sent back: ${S.run.kills}</p>
      ${modeEndHTML()}
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
  clearSave('story');
  const prof = loadProfile();
  const hero = S.setupHero || 'jonah';
  const h = HEROES[hero];
  S.run = new Run(undefined, {
    hero: h.unlock && !prof.unlocks[h.unlock.key] ? 'jonah' : hero,
    ledger: Math.min(S.setupLedger || 0, prof.ledger),
    styles: Object.keys(STYLE_UNLOCKS).filter(k => prof.unlocks[k]),
    tutorial: tutorWanted(),
  });
  recordRunStart(S.run);
  S.combat = null;
  setScreen('intro');
}

function pickNode(i) {
  const r = S.run;
  const c = r.choices[i];
  S.nodeIdx = c.idx;
  S.flash = '';
  S.campDone = false;
  switch (c.type) {
    case 'town':
      S.town = r.makeTown();
      S.town.questionsMax = S.town.questions;
      S.guilt = null;
      S.cleanSolve = false;
      setScreen('town');
      break;
    case 'wanted': S.elite = pick(r.rng, elitesOf(r.chapter)); setScreen('wanted'); break;
    case 'camp':
      r.sight = r.maxSight;
      S.memory = pick(r.rng, ST().memories);
      setScreen('camp');
      break;
    case 'story':
      S.event = ST().story(r.chapter);
      S.eventResult = null;
      setScreen('event');
      break;
    case 'post': S.shop = r.makeShop(); setScreen('post'); break;
    case 'trail': {
      // A bad reputation rides out to meet you.
      if (r.infamy >= 3 && r.rng() < r.infamy * 0.08) {
        S.event = POSSE_EVENT; S.eventResult = null; setScreen('event'); break;
      }
      let pool = EVENTS.filter(e => !r.usedEvents.includes(e.id) && (!e.jonahOnly || r.hero === 'jonah'));
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

// ---- gun belt ------------------------------------------------------------------
// Swap two chambers by clicking them in turn, or (when buying) pick one to replace.
function showBelt(title, onPick) {
  S.beltPick = onPick || null;
  S.beltSel = null;
  S.beltTitle = title || 'Gun Belt';
  renderBelt();
}
function renderBelt() {
  const belt = S.run.belt;
  openModal(`
    <h3>${esc(S.beltTitle)}</h3>
    <p class="sub center">${S.beltPick ? 'Pick the chamber to replace.' : 'This is how your iron is loaded at the start of every fight, and what Reload puts back. Rounds fire in this order. Click two chambers to swap them.'}</p>
    <div class="belt">
      ${belt.map((rd, i) => `<button class="belt-slot ${S.beltSel === i ? 'sel' : ''}" data-act="belt-slot" data-i="${i}">
        <span class="belt-n">${i + 1}</span>
        <b style="--chip:${ROUNDS[rd].color}">${esc(ROUNDS[rd].name)}</b><small>${esc(ROUNDS[rd].desc)}</small>
      </button>`).join('')}
    </div>
    <div class="row center"><button class="btn" data-act="close-modal">${S.beltPick ? 'Never mind' : 'Done'}</button></div>`);
}
function beltClick(i) {
  if (S.beltPick) { const f = S.beltPick; S.beltPick = null; f(i); return; }
  const belt = S.run.belt;
  if (S.beltSel === null) { S.beltSel = i; }
  else { [belt[S.beltSel], belt[i]] = [belt[i], belt[S.beltSel]]; S.beltSel = null; AUDIO.sfx('deal'); saveRun(); }
  renderBelt();
}

// ---- save & continue --------------------------------------------------------------
// The run is saved in this browser at every stop on the trail map.
const SAVE_KEY = 'slinger.save.v2';

// ---- profile: what you've unlocked across runs ------------------------------------
const PROFILE_KEY = 'slinger.profile.v1';
function loadProfile() {
  const base = { unlocks: {}, ledger: 0, wins: 0 };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')); } catch (e) { return base; }
}
function saveProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ } }
const UNLOCK_NAMES = { brawl: 'Brawler cards', seer: 'Veil-seer cards', martha: 'Martha Wheeler', agnes: 'Sister Agnes' };
/** Unlock something for future runs; returns its name if it's new. */
function unlock(key) {
  const p = loadProfile();
  if (p.unlocks[key]) return null;
  p.unlocks[key] = true;
  saveProfile(p);
  toast(`Unlocked: ${UNLOCK_NAMES[key]}${key === 'brawl' || key === 'seer' ? ' (in future card rewards)' : ' (a new hunter)'}`);
  return UNLOCK_NAMES[key];
}
function unlockAfterBoss(ch) {
  if (S.run && (S.run.mode === 'daily' || S.run.mode === 'showdown')) return;
  if (ch === 1) unlock('brawl'); if (ch === 2) unlock('seer');
}
function unlockAfterWin(run) {
  if (run.mode !== 'story') return '';
  const got = [];
  const m = unlock('martha'); if (m) got.push(m);
  const p = loadProfile();
  p.wins++;
  if (run.ledger === p.ledger && p.ledger < LEDGER.length - 1) { p.ledger++; got.push(`the Ledger: ${LEDGER[p.ledger].name}`); }
  saveProfile(p);
  return got.length ? 'Unlocked: ' + got.join(', ') + '.' : '';
}
function campHeal(r) { return Math.floor(r.maxHp * (r.ledger >= 3 ? 0.2 : 0.3) * (r.twist === 'glass_jaw' ? 2 : 1)); }
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
// The Daily Hunt keeps its own save slot, so it never overwrites a story run.
const DAILY_SAVE_KEY = 'slinger.daily.v1';
const saveKey = mode => ({ daily: DAILY_SAVE_KEY, long: 'slinger.long.v1', challenge: 'slinger.challenge.v1' }[mode] || SAVE_KEY);
function saveRun() { try { if (S.run) localStorage.setItem(saveKey(S.run.mode), JSON.stringify(S.run)); } catch (e) { /* storage unavailable */ } }
function clearSave(mode = 'story') { try { localStorage.removeItem(saveKey(mode)); } catch (e) { /* storage unavailable */ } }
function loadSave(mode = 'story') {
  try { const raw = localStorage.getItem(saveKey(mode)); return raw ? Run.fromJSON(JSON.parse(raw)) : null; } catch (e) { return null; }
}
function continueRun(mode = 'story') {
  const r = loadSave(mode);
  if (!r) { setScreen('title'); return; }
  S.run = r;
  S.combat = null;
  setScreen('map');
}

function showChapterIntro() {
  const r = S.run;
  const ci = ST().chapter(r.chapter);
  r.addJournal(ci.letter.from === 'unsigned' ? `An Unsigned Card (${CHAPTERS[r.chapter].title.split(' — ')[0]})` : `Letter from ${ci.letter.from}`, ci.letter.text);
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
  S.run.advance(S.nodeIdx);
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
  setTimeout(() => veil.remove(), 1600 * SPD());
  AUDIO.sfx('slip');
  setScreen('combat');
}

function winFight() {
  const r = S.run;
  const c = S.combat;
  c.finish();
  r.afterFight();
  if (r.mode === 'showdown') { showdownWon(c); return; }
  const kind = S.fightKind;
  let gold = r.goldReward(kind);
  const clean = kind === 'normal' && S.cleanSolve;
  if (clean) { gold += 25; r.addInfamy(-1); }
  S.cleanSolve = false;
  const freed = c.freed; // hostages pay you back
  if (freed) { gold += 15 * freed; r.addInfamy(-freed); }
  r.gold += gold;
  r.bounty = (r.bounty || 0) + gold;
  let keepsake = null;
  if (kind === 'elite') { keepsake = r.randomKeepsake(); r.gainKeepsake(keepsake); }
  const found = r.tonicReward(kind);
  const tonic = found && r.gainTonic(found) ? found : null;
  const tonicLost = found && !tonic ? found : null;
  if (kind === 'boss') {
    const b = ST().boss(r.chapter);
    keepsake = b.reward === undefined ? null : b.reward === null && r.chapter < 3 ? r.randomKeepsake() : b.reward;
    if (keepsake) r.gainKeepsake(keepsake);
    S.bossKeepsake = keepsake;
    unlockAfterBoss(r.chapter);
  }
  AUDIO.sfx('coin', 0.3);
  if (kind === 'boss') r.addJournal(ST().boss(r.chapter).rest || ST().boss(r.chapter).guise, ST().boss(r.chapter).after);
  if (kind === 'boss' && r.chapter === 3 && r.mode !== 'long') { setScreen('finale'); return; }
  S.reward = {
    title: kind === 'boss' ? 'Vengeance' : kind === 'elite' ? 'Bounty Collected' : 'Back Through the Veil',
    clean,
    text: kind === 'boss' ? '' : kind === 'normal' && S.guilt ? `The town buries ${S.guilt} in the morning. You do not stay for it.`
      : kind === 'normal' ? T(pick(r.rng, THANKS)) : 'The Between lets go of you. The street is just a street again.',
    gold, keepsake, tonic, tonicLost, freed,
    cards: r.cardChoices(3, kind === 'elite' ? 0.1 : kind === 'boss' ? 0.3 : 0),
    cardTaken: null,
  };
  setScreen('reward');
}

function loseFight() {
  const foes = S.combat.enemies;
  const killer = foes.find(e => e.hp > 0 && e.boss) || foes.find(e => e.hp > 0) || foes[0];
  recordRunEnd(S.run, { win: false, killer: killer ? killer.name : 'the Between' });
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
    else if (e.type === 'dud') { text = 'Click. Dud.'; cls = 'blocked'; }
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
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <p><b>The hunt.</b> Three chapters, each with its own map. Pick your route stop by stop: towns, wanted posters, campfires, trading posts, trail events and one story stop per chapter. At the end of each map waits one of the three demons behind it all.</p>
      <p><b>Hunters and the Ledger.</b> Jonah Crane rides first. Finish the hunt to unlock Martha Wheeler; tell Sister Agnes the truth to unlock her. Beat the Hollow Steer and the Silk Widow to add Brawler and Veil-seer cards to future rewards. Win on the hardest Ledger page you have and the next page opens, each one harder than the last.</p>
      <p><b>Towns.</b> Somebody vanished last night, and one of the three strangers is a demon. You get a few questions: ask where they were, what they saw, or just watch them. Humans tell the truth. The demon lies, and it will try to frame someone. Or spend <b>Veil Sight</b> ${ART.eye(true)} to look through a stranger's skin and know for sure. Solve it without the Veil and the bounty is bigger. Draw on the demon and it starts <b>Exposed</b>. Draw on an innocent and you carry a curse card, and the real demon strikes first.</p>
      <p><b>Your iron.</b> Each of the six chambers holds a round: Lead, Silver, Hellfire, Blessed or Buckshot. Shot cards fire the next loaded round, and its effect rides on that shot. Your <b>Gun Belt</b> is how the gun is loaded at the start of every fight and what Reload puts back. Buy special rounds at trading posts and arrange them in the order you want them.</p>
      <p><b>The Between.</b> Every fight happens in the Between: the same town, only wrong.</p>
      <p><b>Tricky demons.</b> Some hide their next move behind the Veil: click the ? to spend Sight and see it. Some hold a hostage: one big hit kills the hostage too, but Exposing the demon frees them. Warded demons shrug off half of every hit that isn't a Silver or Blessed round. And the Gentleman takes cards from your deck as payment.</p>
      <p><b>Tonics and Infamy.</b> Carry up to three tonics and drink them in a fight. Accuse the wrong person or run from a town and your <b>Infamy</b> climbs: prices go up, folks answer fewer questions, and posses ride out after you. Clean detective work brings it back down.</p>
      <p><b>Grit</b> pays for cards and refills every turn. Shot cards (the ones with bullet pips) spend rounds, and rounds do <i>not</i> refill on their own. Play <b>Reload</b>.</p>
      <p><b>Cover</b> absorbs damage and fades at the start of your turn. Watch the icons over each demon: they show what it will do next.</p>
      <p><b>Wrath</b> adds damage to every hit. <b>Exposed</b> takes 50% more damage. <b>Shaken</b> deals 25% less. <b>Hellfire</b> burns every turn.</p>
      <p><b>Other ways to ride.</b> The <b>Daily Hunt</b> is one run a day, the same for everyone, with a fixed hunter and one twist; share your result line when it's done. <b>The Long Ride</b> never ends: the chapters loop, the demons get tougher each lap, and you ride for bounty. <b>Showdown</b> is six bosses and wanted demons back to back with a ready-made deck, scored on turns. <b>Wanted</b> posters change one rule of the story, with a new one featured every week. <b>The Casebook</b> is detective work only: three cases, two demons in each, scored against par. <b>Leaderboards</b> are shared by everyone who plays the published page. <b>Settings</b> has fast animations, bigger text and voice autoplay.</p>
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
  'setup': () => { S.setupHero = S.setupHero || 'jonah'; setScreen('setup'); },
  'pick-hero': el => { S.setupHero = el.dataset.id; render(); },
  'pick-ledger': el => { S.setupLedger = +el.dataset.i; render(); },
  'title': () => { S.run = null; setScreen('title'); },
  'how': howToPlay,
  'to-map': () => setScreen('map'),
  'to-chapter': showChapterIntro,
  'journal': showJournal,
  'toggle-music': () => { AUDIO.unlock(); AUDIO.toggle('music'); render(); },
  'toggle-sfx': () => { AUDIO.unlock(); AUDIO.toggle('sfx'); render(); },
  'toggle-voice': () => { AUDIO.toggle('voice'); render(); },
  'voice': el => AUDIO.voice(el.dataset.id, 0),
  'ending': el => {
    S.endingId = el.dataset.id;
    const e = ST().endings[S.endingId];
    S.run.addJournal(e.title, e.text[0]);
    S.unlockNote = unlockAfterWin(S.run);
    recordRunEnd(S.run, { win: true, ending: S.endingId });
    setScreen('victory');
  },
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
  'ask': el => {
    const t = S.town; const f = t.folk[+el.dataset.i]; const q = el.dataset.q;
    if (t.questions <= 0 || f.asked[q] || f.gone) return;
    f.asked[q] = true;
    t.questions--;
    AUDIO.sfx('deal');
    S.flash = '';
    render();
  },
  'look': el => {
    const r = S.run; const f = S.town.folk[+el.dataset.i];
    if (r.sight <= 0 || f.seen) return;
    r.sight--;
    f.seen = true;
    S.town.usedSight = true;
    AUDIO.sfx('sight');
    S.flash = f.demon ? 'The skin slides aside like a curtain. Something grins back at you.' : 'Just a person. Tired, scared, alive.';
    render();
  },
  'accuse': el => {
    const r = S.run; const t = S.town; const f = t.folk[+el.dataset.i];
    if (f.demon) {
      S.flash = '';
      S.guilt = null;
      S.cleanSolve = !t.usedSight;
      recordTown(S.cleanSolve);
      startFight(t.enc.foes, 'normal', { drop: true });
    } else {
      f.gone = true;
      S.cleanSolve = false;
      r.innocents++;
      S.guilt = f.name;
      recordTown(false);
      r.addInfamy(3);
      AUDIO.sfx('wrong');
      r.addCard('blood_on_hands');
      r.hp = Math.max(1, r.hp - 6);
      startFight(t.enc.foes, 'normal', { ambushed: true });
      S.combat.say(`${f.name} was only human. While you stood over the body, the real demon made its move.`);
      render();
    }
  },
  'leave-town': () => { S.cleanSolve = false; recordTown(false); S.run.addInfamy(1); startFight(S.town.enc.foes, 'normal', { ambushed: true }); },
  'fight-elite': () => startFight((S.elite || ENCOUNTERS[S.run.chapter].elite).foes, 'elite'),
  'fight-boss': () => startFight(ST().boss(S.run.chapter).foes, 'boss'),

  // combat
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
  'next-chapter': () => {
    S.run.advance(S.nodeIdx); S.run.sight = S.run.maxSight;
    // The Long Ride skips the letters: the story was told the first time round.
    if (S.run.mode === 'long') { if (S.run.chapter === 1) toast(`Lap ${S.run.lap + 1}. The demons remember you.`); setScreen('map'); }
    else showChapterIntro();
  },

  // camp
  'rest': () => {
    const r = S.run; const heal = campHeal(r);
    r.hp = Math.min(r.maxHp, r.hp + heal);
    AUDIO.sfx('heal');
    S.flash = ST().restFlash;
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
  'buy-tonic': el => {
    const r = S.run; const tn = S.shop.tonics[+el.dataset.i];
    if (tn.sold || r.gold < tn.price || !r.gainTonic(tn.id)) return;
    r.gold -= tn.price; tn.sold = true;
    AUDIO.sfx('coin');
    S.flash = `The ${TONICS[tn.id].name} goes in your satchel.`;
    render();
  },
  'buy-round': el => {
    const r = S.run; const rd = S.shop.rounds[+el.dataset.i];
    if (rd.sold || r.gold < rd.price) return;
    showBelt(`Which chamber gets the ${ROUNDS[rd.id].name}?`, i => {
      r.gold -= rd.price; rd.sold = true; r.belt[i] = rd.id;
      AUDIO.sfx('reload');
      S.flash = `You thumb the ${ROUNDS[rd.id].name} round into your belt.`;
      closeModal(); render();
    });
  },
  'belt-slot': el => beltClick(+el.dataset.i),
  'belt': () => showBelt(),
  'continue': () => continueRun('story'),
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
    if (S.run.flags.confessed && S.run.mode === 'story') unlock('agnes');
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
