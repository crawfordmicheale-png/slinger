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
const SETTINGS = Object.assign({ motion: 'full', text: 'normal', autoVoice: true, haptics: true, roundLabels: false }, (() => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
})());
if (SETTINGS.fast !== undefined) { if (SETTINGS.fast) SETTINGS.motion = 'fast'; delete SETTINGS.fast; } // older saves
function applySettings() {
  document.body.classList.toggle('fast', SETTINGS.motion === 'fast');
  document.body.classList.toggle('still', reducedMotion());
  document.body.classList.toggle('round-labels', !!SETTINGS.roundLabels);
  document.documentElement.style.setProperty('--ts', TEXT_SIZES[SETTINGS.text] || 1);
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* storage unavailable */ }
  applySettings();
}
/** Animation time scale: fast mode plays everything in a bit under half the time. */
const SPD = () => (SETTINGS.motion === 'fast' ? 0.45 : 1);
/** No movement at all: the player chose Still, or the device asks for reduced motion. */
const reducedMotion = () => SETTINGS.motion === 'still' || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
/** A short buzz on phones that support it (off in Settings). */
const buzz = pattern => { try { if (SETTINGS.haptics && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ } };

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
  return `<div class="bar" role="img" aria-label="${hp} of ${max} health${block ? `, ${block} cover` : ''}"><div class="fill" style="width:${pct}%"></div>
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
      <span class="hud-infamy inf-${r.infamy >= 7 ? 3 : r.infamy >= 4 ? 2 : r.infamy >= 1 ? 1 : 0}" data-tip="${esc(INFAMY.desc(r.infamy))}" aria-label="Infamy ${r.infamy}: ${INFAMY.label(r.infamy)}"><span class="inf-label">${INFAMY.label(r.infamy)}</span><span class="inf-icon" aria-hidden="true">⚑</span> ${r.infamy}</span>
      <span class="hud-tonics" data-tip="${esc(r.tonics.length ? 'Tonics: ' + r.tonics.map(t => TONICS[t].name).join(', ') + '. Use them during a fight.' : 'No tonics in your satchel.')}">${tonicIcons(r.tonics, false)}</span>
    </div>
    <div class="hud-mid">${r.mode === 'showdown' && S.sd ? `Showdown · Fight ${Math.min(S.sd.idx + 1, SHOWDOWN_FIGHTS.length)} of ${SHOWDOWN_FIGHTS.length}` : r.chapter <= 3 ? CHAPTERS[r.chapter].title : ''}${r.mode === 'long' ? ` · Lap ${r.lap + 1} · Bounty ${r.bounty}` : ''}</div>
    <div class="hud-right">
      <span class="keepsakes">${r.keepsakes.map(keepsakeHTML).join('')}</span>
      <button class="btn small" data-act="journal">Journal (${r.journal.length})</button>
      ${S.screen !== 'combat' ? '<button class="btn small" data-act="belt">Gun Belt</button>' : ''}
      <button class="btn small" data-act="view-deck">Deck (${r.deck.length})</button>
      ${soundButtons()}
      <button class="btn small" data-act="settings" title="Settings" aria-label="Settings">⚙</button>
    </div>
    <button class="btn small hud-menu" data-act="hud-menu" aria-label="Menu: journal, gun belt, deck, keepsakes and settings">☰</button>`;
}

/** On a phone the header keeps only the vital signs; everything else lives in this menu. */
function showHudMenu() {
  const r = S.run;
  openModal(`
    <h3>${esc(heroDef().name)}</h3>
    <div class="hud-sheet">
      <div class="row center">
        <button class="btn" data-act="journal">Journal (${r.journal.length})</button>
        ${S.screen !== 'combat' ? '<button class="btn" data-act="belt">Gun Belt</button>' : ''}
        <button class="btn" data-act="view-deck">Deck (${r.deck.length})</button>
        <button class="btn" data-act="settings">Settings</button>
      </div>
      <div class="row center">${soundButtons()}</div>
      ${r.tonics.length ? `<h4>Tonics</h4><ul class="sheet-list">${r.tonics.map(t => `<li>${tonicIcons([t], false).split('<span class="tonic empty">')[0]} <b>${esc(TONICS[t].name)}</b> — ${esc(TONICS[t].desc)}</li>`).join('')}</ul>` : ''}
      <h4>Keepsakes</h4>
      <ul class="sheet-list">${r.keepsakes.map(k => `<li>${keepsakeHTML(k)} <b>${esc(KEEPSAKES[k].name)}</b> — ${esc(KEEPSAKES[k].desc)}</li>`).join('')}</ul>
      <p class="sub">${esc(INFAMY.label(r.infamy))} (Infamy ${r.infamy}). ${esc(INFAMY.desc(r.infamy))}</p>
    </div>
    <div class="row center"><button class="btn" data-act="close-modal">Close</button></div>`);
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

/**
 * One stranger as a row of the case ledger (towns and the Casebook): who they
 * are, one cell per question (the ask button sits where the answer will
 * appear), then what you can do about them. On a phone the row folds into a card.
 */
function ledgerRow(o) {
  const cells = o.cells.map(c => `<div class="cell ${c.answer ? 'answered' : ''}"><b>${c.label}</b>${c.answer ? `<span class="answer">${esc(c.answer)}</span>${c.note || ''}` : c.button || '<span class="unasked">—</span>'}</div>`).join('');
  return `<div class="folk ${o.cls || ''}">
    <div class="portrait">${o.art}</div>
    <div class="who">${o.lead || ''}<div class="folk-name">${esc(o.name)}</div><div class="folk-role">the ${esc(o.role)}</div>${o.tell ? `<p class="tell">${esc(o.tell)}</p>` : ''}${o.verdict || ''}</div>
    ${cells}
    <div class="folk-actions">${o.actions || ''}</div>
  </div>`;
}

// ---- loading ahead: fetch the art a screen is about to need before it is needed
const PRELOADED = new Set();
function preloadArt(files) {
  files.filter(f => f && !PRELOADED.has(f)).forEach(f => { PRELOADED.add(f); const im = new Image(); im.decoding = 'async'; im.src = `art/${f}.webp`; });
}
/** Whatever the stops on offer could put in front of you next. */
function preloadForMap(r) {
  const files = [];
  r.choices.forEach(c => {
    if (c.type === 'wanted') elitesOf(r.chapter).forEach(e => files.push(e.foes[0]));
    if (c.type === 'boss') files.push(ST().boss(r.chapter).foes[0]);
    if (c.type === 'town') ENCOUNTERS[r.chapter].normal.forEach(e => files.push(e.foes[0]));
  });
  preloadArt(files);
}
window.addEventListener('load', () => {
  const later = window.requestIdleCallback || (f => setTimeout(f, 800));
  later(() => { document.body.classList.add('art-ready'); preloadArt(['town_between', ...Object.values(HEROES).map(h => h.art)]); });
});

// A small replay button beside a voiced line.
const replay = id => `<button class="btn small replay" data-act="voice" data-id="${id}" title="Hear it again" aria-label="Hear it again">▶</button>`;

function setScreen(name) {
  const prev = S.screen;
  S.screen = name;
  if (S.run && (name === 'map' || name === 'chapterIntro')) saveRun();
  if (S.run && name === 'map') preloadForMap(S.run);
  if (S.run && (name === 'gameover' || name === 'victory')) clearSave(S.run.mode);
  AUDIO.music(musicFor(name));
  if (name !== prev && SETTINGS.autoVoice && S.run) AUDIO.voice(voiceFor(name));
  S.sel = null;
  document.body.classList.toggle('between', name === 'combat' || name === 'finale');
  render();
  window.scrollTo(0, 0);
}

function render() {
  const focus = focusKey(document.activeElement);
  renderHUD();
  const fn = SCREENS[S.screen];
  app.className = 'screen-' + S.screen;
  app.innerHTML = fn ? fn() : '';
  keyboardReady(document.body);
  if (focus) { const el = document.querySelector(focus); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  if (S.screen === 'combat') afterCombatRender();
  if (typeof coach === 'function') coach();
}

// ---- keyboard: everything clickable can be reached with Tab and pressed with Enter or Space
/** Give clickable non-buttons (cards in hand, demons to target, map stops) a place in the tab order. */
function keyboardReady(root) {
  root.querySelectorAll('[data-act]:not(button):not(input):not(a)').forEach(el => {
    if (!el.dataset.act) { el.removeAttribute('tabindex'); return; }
    el.tabIndex = 0;
    if (!el.getAttribute('role')) el.setAttribute('role', 'button');
  });
}
/** A selector that finds "the same control" again after a re-render, so keyboard focus survives it. */
function focusKey(el) {
  if (!el || !el.dataset || !el.dataset.act) return null;
  return ['act', 'i', 'q', 'id', 'uid', 'pile'].filter(k => el.dataset[k] !== undefined)
    .map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('');
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
      const cell = (q, label, answer, prompt) => ({ label, answer: f.asked[q] ? answer : null, button: f.gone ? null : ask(f, i, q, prompt) });
      return ledgerRow({
        cls: `${f.gone ? 'gone' : ''} ${reveal ? 'seen-' + reveal : ''}`,
        art: ART.folkArt(f, f.demon && f.seen ? t.enc.foes[0] : null, i + t.name.length),
        name: f.name, role: f.role, tell: f.tells[0],
        verdict: f.gone ? '<div class="verdict bad">You were wrong.</div>'
          : f.seen ? `<div class="verdict">${f.demon ? 'DEMON — ' + esc(ENEMIES[t.enc.foes[0]].name) : 'Human. Just a person.'}</div>` : '',
        cells: [cell('alibi', 'Last night', f.alibi, 'Where were you?'), cell('saw', 'Saw', f.saw, 'What did you see?'), cell('watch', 'Watching', f.tells[1], 'Watch them')],
        actions: f.gone ? '' : `${!f.seen ? `<button class="btn small" data-act="look" data-i="${i}" ${r.sight > 0 ? '' : 'disabled'}>${ART.eye(true)} Look (${r.sight})</button>` : ''}
          <button class="btn small danger" data-act="accuse" data-i="${i}">Draw on them</button>`,
      });
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
        <div class="folks ledger">${t.folk.map(person).join('')}</div>
        <div class="row center">
          <button class="btn small" data-act="leave-town" data-tip="The demon will follow you out and strike first.">Ride on without choosing</button>
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
      <section class="panel story boss-intro split">
        <div class="boss-art">${ART.demonArt(b.foes[0])}</div>
        <div class="split-text">
          <h2>${esc(b.guise)}</h2>
          <p>${esc(b.before)}</p>
          <p class="speech">${esc(b.taunt)} ${ST().voiced ? replay(`taunt_${S.run.chapter}`) : ''}</p>
          <button class="btn big danger" data-act="fight-boss">${esc(b.cry)}</button>
        </div>
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
      <section class="panel post wide">
        <h2>Trading Post</h2>
        <p class="sub">${S.flash ? esc(S.flash) : '"Evening. Cash only, and no demons," says the proprietor. You check. She\'s telling the truth.'}</p>
        <div class="post-grid">
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
      <section class="panel story finale split">
        <div class="boss-art">${ART.demonArt('grey_gentleman')}</div>
        <div class="split-text">
        ${ST().finaleText.map((p, i) => `<p class="${i ? 'speech' : ''}">${esc(p)}${i && ST().voiced ? ' ' + replay('finale') : ''}</p>`).join('')}
        <div class="options">
          ${FINALE.options.map(o => {
            const rest = o.id === 'rest' ? ST().rest : null;
            const ok = rest ? rest.req(r) : !o.req || o.req(r);
            return `<button class="btn option" data-act="ending" data-id="${o.id}" ${ok ? '' : 'disabled'}>${esc(o.label)}${ok ? '' : `<br><small>${esc(rest ? rest.locked : o.locked)}</small>`}</button>`;
          }).join('')}
        </div>
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
  t.setAttribute('role', 'status');
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
  // Slip into the Between (a full-screen flash, skipped when motion is turned down)
  if (!reducedMotion()) {
    const veil = document.createElement('div');
    veil.className = 'slip';
    veil.innerHTML = `<span>${opts.ambushed ? 'It strikes first.' : 'The world slips.'}</span>`;
    document.body.appendChild(veil);
    setTimeout(() => veil.remove(), 1600 * SPD());
  }
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
// Modals
// ---------------------------------------------------------------------------
function openModal(html) {
  S.modalReturn = focusKey(document.activeElement);
  modal.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
  modal.hidden = false;
  keyboardReady(modal);
  // Keyboard players land inside the dialog; a finger doesn't need a focus ring.
  const first = !TOUCH.active && modal.querySelector('button:not([disabled]), [tabindex="0"]');
  if (first) first.focus({ preventScroll: true });
}
function closeModal() {
  modal.hidden = true; modal.innerHTML = ''; S.modalPick = null;
  const back = S.modalReturn && document.querySelector(S.modalReturn);
  if (back) back.focus({ preventScroll: true });
}

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
      <p><b>On a phone.</b> Drag a card up out of your hand to play it, or tap it. Hold any card to read it up close, and hold an icon, status or intent to see what it means. The ☰ button holds your journal, gun belt, deck and keepsakes.</p>
      <p class="sub">Keys: Tab moves between everything, Enter or Space presses it. In a fight, 1–9 play a card, E ends your turn, Esc cancels. On the map, at a reward or in an event, 1–9 choose. Settings has motion (Full, Fast or Still), text size, vibration, and letters on rounds for players who can't rely on colour.</p>
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
  'hud-menu': showHudMenu,
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
      buzz(90);
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
  const el = ev.target;
  // Enter or Space presses a focused card, demon or map stop, just like a button.
  if ((ev.key === 'Enter' || ev.key === ' ') && el.getAttribute && el.getAttribute('role') === 'button' && el.dataset.act) {
    ev.preventDefault(); el.click(); return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey || (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
  if (!modal.hidden) {
    if (ev.key === 'Escape' && modal.querySelector('[data-act="close-modal"]')) closeModal();
    else if (/^[1-9]$/.test(ev.key)) { const b = modal.querySelectorAll('[data-act="modal-pick"]')[+ev.key - 1]; if (b) b.click(); }
    return;
  }
  const nth = (sel, k) => { const b = [...app.querySelectorAll(sel)].filter(x => !x.disabled)[k]; if (b) b.click(); return !!b; };
  if (/^[1-9]$/.test(ev.key)) {
    const k = +ev.key - 1;
    if (S.screen === 'combat') clickCard(k);
    else if (S.screen === 'map') nth('.nodes [data-act="pick-node"]', k);
    else if (S.screen === 'reward') nth('[data-act="take-card"]', k);
    else if (S.screen === 'event' || S.screen === 'finale') nth('[data-act="event-opt"], [data-act="ending"]', k);
    else if (S.screen === 'sdRest') nth('[data-act="sd-take"]', k);
    return;
  }
  if (S.screen !== 'combat') return;
  if (ev.key === 'Escape') { S.sel = null; render(); }
  else if (ev.key === 'e' || ev.key === 'E') endTurn();
});

// Tooltips: on hover with a mouse, on a long press with a finger.
function showTipFor(el) {
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 270, Math.max(8, r.left + r.width / 2 - 130));
  const y = r.bottom + 8 + 80 > window.innerHeight ? r.top - 8 - tip.offsetHeight : r.bottom + 8;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
document.addEventListener('mouseover', ev => {
  if (TOUCH.active) return;
  const el = ev.target.closest('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  showTipFor(el);
});

// ---------------------------------------------------------------------------
// Touch: drag a card up out of your hand to play it; hold any card to read it
// up close, or hold anything with a tooltip to see the tooltip.
// ---------------------------------------------------------------------------
const TOUCH = { active: false, drag: null, hold: null, swallow: false };
/** Show a card big enough to read. The copy is inert: nothing in it can be clicked. */
function zoomCard(cardEl) {
  const copy = cardEl.cloneNode(true);
  copy.removeAttribute('style');
  [copy, ...copy.querySelectorAll('[data-act]')].forEach(n => n.removeAttribute('data-act'));
  copy.classList.remove('pickable', 'too-pricey');
  openModal(`<div class="zoom" data-act="close-modal">${copy.outerHTML}<p class="sub center">Tap anywhere to close</p></div>`);
}
function endHold() { if (TOUCH.hold) { clearTimeout(TOUCH.hold.timer); TOUCH.hold = null; } }
function endDrag(play) {
  const d = TOUCH.drag;
  TOUCH.drag = null;
  if (!d) return;
  d.el.style.transform = '';
  d.el.classList.remove('dragging');
  if (play) { TOUCH.swallow = true; buzz(8); clickCard(d.i); }
}
document.addEventListener('pointerdown', ev => {
  TOUCH.active = ev.pointerType !== 'mouse';
  TOUCH.swallow = false; // a new gesture: only a click that belongs to a finished drag or hold is swallowed
  if (!TOUCH.active) return;
  if (!tip.hidden && !ev.target.closest('[data-tip]')) tip.hidden = true;
  const held = ev.target.closest('.card, [data-tip]');
  if (held && modal.hidden) {
    TOUCH.hold = { x: ev.clientX, y: ev.clientY, timer: setTimeout(() => {
      TOUCH.hold = null;
      endDrag(false);
      TOUCH.swallow = true;
      buzz(10);
      if (held.matches('.card')) zoomCard(held); else showTipFor(held);
    }, 450) };
  }
  const slot = ev.target.closest('.hand .slot');
  if (slot && S.screen === 'combat' && !S.busy) TOUCH.drag = { i: +slot.dataset.i, el: slot.querySelector('.card'), x: ev.clientX, y: ev.clientY, dy: 0 };
}, { passive: true });
document.addEventListener('pointermove', ev => {
  if (TOUCH.hold && Math.hypot(ev.clientX - TOUCH.hold.x, ev.clientY - TOUCH.hold.y) > 10) endHold();
  const d = TOUCH.drag;
  if (!d) return;
  const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
  if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) { endDrag(false); return; } // scrolling the hand sideways
  if (dy < -6) {
    d.dy = dy;
    d.el.classList.add('dragging');
    d.el.style.transform = `translateY(${Math.max(dy, -160)}px) scale(${dy < -70 ? 1.08 : 1.02})`;
  }
}, { passive: true });
document.addEventListener('pointerup', () => { endHold(); endDrag(TOUCH.drag && TOUCH.drag.dy < -70); }, { passive: true });
document.addEventListener('pointercancel', () => { endHold(); endDrag(false); }, { passive: true });
// A long press or a drag already did the job; swallow the one click that follows it.
document.addEventListener('click', ev => {
  if (TOUCH.swallow) { TOUCH.swallow = false; ev.stopPropagation(); ev.preventDefault(); }
}, true);
document.addEventListener('contextmenu', ev => { if (TOUCH.active && ev.target.closest('.card, [data-tip]')) ev.preventDefault(); });

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
