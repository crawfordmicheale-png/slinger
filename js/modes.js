'use strict';
// ---------------------------------------------------------------------------
// SLINGER — everything around the story mode: settings, records, the guided
// first run, the Daily Hunt and the Casebook. Loaded after ui.js.
// ---------------------------------------------------------------------------

// ---- settings --------------------------------------------------------------------
function showSettings() {
  const opt = (key, val, label) => `<button class="seg ${SETTINGS[key] === val ? 'sel' : ''}" data-act="set" data-k="${key}" data-v="${val}">${label}</button>`;
  openModal(`
    <h3>Settings</h3>
    <div class="settings">
      <div class="set-row"><span>Animation speed</span><div class="segs">${opt('fast', false, 'Normal')}${opt('fast', true, 'Fast')}</div></div>
      <div class="set-row"><span>Text size</span><div class="segs">${Object.keys(TEXT_SIZES).map(k => opt('text', k, k[0].toUpperCase() + k.slice(1))).join('')}</div></div>
      <div class="set-row"><span>Read letters and taunts aloud when they appear</span><div class="segs">${opt('autoVoice', true, 'On')}${opt('autoVoice', false, 'Off')}</div></div>
      <div class="set-row"><span>Sound</span><div class="segs">${soundButtons()}</div></div>
      <div class="set-row"><span>Guided first run</span><div class="segs"><button class="seg" data-act="reset-tutor">${profileFull().tutorial.done ? 'Show it again next hunt' : 'Not finished yet'}</button></div></div>
    </div>
    <div class="row center"><button class="btn" data-act="close-modal">Done</button></div>`);
}

// ---- profile helpers: records -----------------------------------------------------
const STAT_DEFAULTS = () => ({
  runs: 0, deaths: 0, kills: 0, heroRuns: {}, heroWins: {}, bestLedger: -1, endings: {},
  clean: 0, streak: 0, bestStreak: 0, bestChapter: 0,
});
function profileFull() {
  const p = loadProfile();
  p.stats = Object.assign(STAT_DEFAULTS(), p.stats);
  // Players from before the guided run existed have already learned the ropes.
  const veteran = p.wins > 0 || Object.keys(p.unlocks).length > 0;
  p.tutorial = Object.assign({ done: veteran, seen: [] }, p.tutorial);
  p.daily = p.daily || {};
  p.casebook = Object.assign({ best: 0, files: 0, solved: 0, perfect: 0 }, p.casebook);
  return p;
}
function editProfile(fn) { const p = profileFull(); fn(p); saveProfile(p); return p; }

function recordRunStart(run) {
  editProfile(p => {
    p.stats.runs++;
    p.stats.heroRuns[run.hero] = (p.stats.heroRuns[run.hero] || 0) + 1;
    if (run.mode === 'daily') p.daily[run.daily] = Object.assign(p.daily[run.daily] || {}, { started: true, hero: run.hero, twist: run.twist });
  });
}
function recordTown(clean) {
  if (clean && S.run) S.run.cleanSolves = (S.run.cleanSolves || 0) + 1;
  editProfile(p => {
    const s = p.stats;
    if (clean) { s.clean++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); } else s.streak = 0;
  });
}
function recordRunEnd(run, o) {
  if (run.recorded) return;
  run.recorded = true;
  if (run.tutorial) editProfile(p => { p.tutorial.done = true; });
  editProfile(p => {
    const s = p.stats;
    s.kills += run.kills;
    s.bestChapter = Math.max(s.bestChapter, o.win ? 4 : run.chapter);
    if (o.win) {
      s.heroWins[run.hero] = (s.heroWins[run.hero] || 0) + 1;
      s.endings[run.hero + ':' + o.ending] = true;
      if (run.mode !== 'daily') s.bestLedger = Math.max(s.bestLedger, run.ledger);
    } else s.deaths++;
    if (run.mode === 'daily' && !(p.daily[run.daily] && p.daily[run.daily].line)) {
      p.daily[run.daily] = Object.assign(p.daily[run.daily] || {}, { win: o.win, line: dailyLine(run, o) });
    }
  });
}

const ROMAN = ['', 'I', 'II', 'III'];
function dailyLine(run, o) {
  const first = HEROES[run.hero].name.split(' ')[run.hero === 'agnes' ? 1 : 0];
  const ch = o.win ? 'Ch III' : 'Ch ' + ROMAN[Math.min(3, run.chapter)];
  const n = run.cleanSolves || 0;
  const end = o.win ? `✔ ${storyFor(run.hero).endings[o.ending].title}` : `☠ ${o.killer}`;
  return `Slinger Daily #${run.daily} · ${DAILY_TWISTS[run.twist].name} · ${first} · ${ch} · ${n} clean solve${n === 1 ? '' : 's'} · ${end}`;
}

SCREENS.records = () => {
  const p = profileFull();
  const s = p.stats;
  const heroRows = Object.keys(HEROES).map(k => `<tr><td>${esc(HEROES[k].name)}</td><td>${s.heroRuns[k] || 0}</td><td>${s.heroWins[k] || 0}</td></tr>`).join('');
  const endingRows = Object.keys(HEROES).map(k => {
    const all = storyFor(k).endings;
    const ids = Object.keys(all);
    const seen = ids.filter(id => s.endings[k + ':' + id]);
    return `<li><b>${esc(HEROES[k].name)}</b> · ${seen.length}/${ids.length}${seen.length ? ': ' + seen.map(id => esc(all[id].title)).join(', ') : ''}</li>`;
  }).join('');
  const days = Object.entries(p.daily).filter(([, d]) => d.line).sort((a, b) => b[0] - a[0]);
  const wins = Object.values(s.heroWins).reduce((a, b) => a + b, 0);
  const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  return `
    <section class="panel records">
      <h2>Records</h2>
      <div class="stat-grid">
        ${stat(s.runs, 'hunts ridden')}${stat(wins, 'hunts won')}${stat(s.kills, 'demons sent back')}
        ${stat(s.bestLedger < 0 ? '—' : esc(LEDGER[s.bestLedger].name), 'hardest Ledger page won')}
        ${stat(s.clean, 'clean solves')}${stat(`${s.streak} <small>(best ${s.bestStreak})</small>`, 'clean-solve streak')}
      </div>
      <h3 class="setup-h">Hunters</h3>
      <table class="rec-table"><thead><tr><th></th><th>Rode</th><th>Won</th></tr></thead><tbody>${heroRows}</tbody></table>
      <h3 class="setup-h">Endings seen</h3>
      <ul class="rec-list">${endingRows}</ul>
      <h3 class="setup-h">Daily Hunts</h3>
      ${days.length ? `<ul class="rec-list daily-list">${days.slice(0, 7).map(([, d]) => `<li class="${d.win ? 'won' : ''}">${esc(d.line)}</li>`).join('')}</ul>` : '<p class="sub">None ridden yet.</p>'}
      <h3 class="setup-h">The Casebook</h3>
      <div class="stat-grid">${stat(p.casebook.best, 'best case file (of 300)')}${stat(p.casebook.solved, 'cases closed')}${stat(p.casebook.perfect, 'perfect cases')}</div>
      <div class="row center"><button class="btn big" data-act="title">Back</button></div>
    </section>`;
};

// ---- the guided first run ------------------------------------------------------------
// Coach marks appear one at a time on a player's first hunt, each pointing at the
// thing it explains. They never block play; "Skip the lessons" ends them for good.
function tutorWanted() {
  if (S.setupTutor !== undefined) return S.setupTutor;
  return !profileFull().tutorial.done;
}
const asked = () => (S.town ? S.town.folk.reduce((n, f) => n + Object.values(f.asked).filter(Boolean).length, 0) : 0);
const TIPS = [
  { id: 'map', screen: 'map', when: r => r.step === 0, at: '.chapter-map',
    text: () => T('This is the chapter map. Every stop is a choice, and the skull at the far end is the demon behind this chapter. Every road starts in a town. Pick one, Marshal.') },
  { id: 'town1', screen: 'town', at: '.casebar',
    text: () => 'Somebody vanished last night, and one of these three strangers is a demon wearing a human skin. Humans always tell the truth. The demon lies, and it will try to frame someone. Each question costs one dot.' },
  { id: 'town2', screen: 'town', when: () => asked() >= 1, at: '.folks',
    text: () => 'Ask the others too. You are looking for two stories that cannot both be true. If one says Ezra was at the church and Ezra says he was at the saloon, one of them is lying.' },
  { id: 'town3', screen: 'town', when: () => asked() >= 3, at: '.folk-actions',
    text: () => 'Found a contradiction? One of those two is the demon, so check who the third stranger backs up. Stuck? Spend Veil Sight (the eye) to look through a skin and know for sure. A clean solve without it pays more. When you are sure, draw on them.' },
  { id: 'fight1', screen: 'combat', at: '.grit',
    text: () => 'The world slipped. This is the Between: the same street, only wrong. Grit pays for cards and refills every turn. Tap a card to play it.' },
  { id: 'fight2', screen: 'combat', when: () => S.combat.peekRounds(1).length, at: '.cylinder',
    text: () => { const r = ROUNDS[S.combat.peekRounds(1)[0]]; return `Your cylinder. Cards with bullet pips fire the round at the top: ${r.name} fires next. ${r.desc}`; } },
  { id: 'fight3', screen: 'combat', at: '.foe .intents',
    text: () => 'The icons over a demon show what it will do on its turn. ⚔ means an attack is coming, so Take Cover to soak it up. When you have spent your Grit, press End Turn.' },
  { id: 'fight4', screen: 'combat', when: () => S.combat.turn >= 2, at: '.cylinder',
    text: () => 'Rounds do not come back on their own. When the cylinder runs low, play Reload to refill it from your Gun Belt.' },
  { id: 'reward', screen: 'reward', at: '.card-row',
    text: () => 'Take a card for your deck, or skip it. A lean deck draws its best cards more often.' },
  { id: 'map2', screen: 'map', when: r => r.step >= 1, at: '.nodes', last: true,
    text: () => T('Campfires heal and restore your Sight. Trading posts sell cards, rounds and tonics. Wanted posters are hard fights that pay a keepsake. That is everything you need. Good hunting, Marshal.') },
];
function coach() {
  let box = document.getElementById('coach');
  document.querySelectorAll('.coach-glow').forEach(el => el.classList.remove('coach-glow'));
  const r = S.run;
  const tut = r && r.tutorial ? profileFull().tutorial : null;
  const tip = tut && !tut.done && TIPS.find(t => t.screen === S.screen && !tut.seen.includes(t.id) && (!t.when || t.when(r)));
  if (!tip || !modal.hidden) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'coach'; document.body.appendChild(box); }
  box.innerHTML = `<p>${esc(tip.text())}</p><div class="row"><button class="btn small" data-act="coach-ok" data-id="${tip.id}">${tip.last ? 'Ride on' : 'Got it'}</button><button class="btn small ghost" data-act="coach-skip">Skip the lessons</button></div>`;
  const at = app.querySelector(tip.at);
  if (at) at.classList.add('coach-glow');
}

// ---- the Daily Hunt ------------------------------------------------------------------
/** Today's hunt: the same number, hunter, twist and seed for everyone. */
function dailyInfo(date = new Date()) {
  const num = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1;
  const r = makeRng(num * 7919 + 17);
  r();
  const heroes = Object.keys(HEROES);
  return { num, hero: heroes[num % heroes.length], twist: pick(r, Object.keys(DAILY_TWISTS)), seed: Math.imul(num, 2654435761) >>> 0 };
}
SCREENS.daily = () => {
  const d = dailyInfo();
  const rec = profileFull().daily[d.num] || {};
  const sv = loadSave('daily');
  const saved = sv && sv.daily === d.num ? sv : null;
  const h = HEROES[d.hero];
  const tw = DAILY_TWISTS[d.twist];
  return `
    <section class="panel daily">
      <div class="kicker">The Daily Hunt</div>
      <h2>No. ${d.num}</h2>
      <p class="sub">Everyone rides the same trail today: the same towns, the same fights, the same cards on offer.</p>
      <div class="daily-card">
        <div class="hunter-art">${ART.heroArt(d.hero)}</div>
        <div>
          <p><b>${esc(h.name)}</b> rides today.</p>
          <p class="twist"><b>${esc(tw.name)}.</b> ${esc(tw.desc)}</p>
          <p class="sub">First page of the Ledger. Every card style is in the rewards. Nothing unlocks, and the first finish is the one that counts.</p>
        </div>
      </div>
      ${rec.line ? dailyShareHTML(rec.line) : ''}
      <div class="row center">
        ${saved ? '<button class="btn big" data-act="daily-continue">Continue today\'s hunt</button>'
          : rec.line ? '' : '<button class="btn big" data-act="daily-start">Ride out</button>'}
        <button class="btn" data-act="title">Back</button>
      </div>
    </section>`;
};
function startDaily() {
  const d = dailyInfo();
  clearSave('daily');
  S.run = new Run(d.seed, { hero: d.hero, ledger: 0, styles: Object.keys(STYLE_UNLOCKS), mode: 'daily', daily: d.num, twist: d.twist });
  recordRunStart(S.run);
  S.combat = null;
  setScreen('intro');
}
function dailyShareHTML(line) {
  if (!line) {
    const rec = S.run && profileFull().daily[S.run.daily];
    line = rec && rec.line;
  }
  if (!line) return '';
  return `<div class="share">
    <p class="share-line" aria-label="Your result">${esc(line)}</p>
    <button class="btn small" data-act="share" data-line="${esc(line)}">Copy result</button>
  </div>`;
}
async function shareLine(el) {
  const line = el.dataset.line;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ text: line }); return; }
  } catch (e) { /* share cancelled or blocked: fall back to copying */ }
  try { await navigator.clipboard.writeText(line); toast('Copied. Paste it anywhere.'); return; } catch (e) { /* clipboard blocked */ }
  const box = app.querySelector('.share-line');
  if (box) { const range = document.createRange(); range.selectNodeContents(box); getSelection().removeAllRanges(); getSelection().addRange(range); }
  toast('Select the line and copy it.');
}

// ---- the Casebook ----------------------------------------------------------------------
// Three cases in a row, each harder than the last. Scored on questions against par,
// on whether you needed the Veil, and on whether you drew on anyone innocent.
const CASE_FILE = [
  { n: 4, fibber: false, title: 'Two in Four' },
  { n: 5, fibber: false, title: 'Two in Five' },
  { n: 5, fibber: true, title: 'The Lying Witness' },
];
function startCaseFile() {
  S.run = null;
  S.cb = { rng: makeRng((Math.random() * 2 ** 32) >>> 0), idx: 0, scores: [] };
  openCase();
}
function openCase() {
  const cb = S.cb;
  const spec = CASE_FILE[cb.idx];
  cb.c = makeCase(cb.rng, spec);
  cb.c.town = pick(cb.rng, Object.values(CHAPTERS).flatMap(ch => ch.towns));
  cb.asked = 0; cb.veil = 1; cb.usedVeil = false; cb.wrong = 0; cb.done = false; cb.marks = {};
  AUDIO.sfx('deal');
  setScreen('case');
}
function caseScore(cb) {
  const over = Math.max(0, cb.asked - cb.c.par);
  return Math.max(0, 100 - 10 * over - (cb.usedVeil ? 40 : 0) - 50 * cb.wrong);
}
const MARKS = ['', 'human', 'demon'];
SCREENS.case = () => {
  const cb = S.cb, c = cb.c, spec = CASE_FILE[cb.idx];
  const caught = c.folk.filter(f => f.caught).length;
  const person = (f, i) => {
    const out = f.caught || f.cleared || f.seen || cb.done;
    const reveal = out ? (f.demon ? 'demon' : 'human') : null;
    const clues = [];
    if (f.asked.alibi) clues.push(`<li class="clue"><b>Last night</b> ${esc(f.alibi)}</li>`);
    if (f.asked.saw) clues.push(`<li class="clue"><b>Saw</b> ${esc(f.saw)}</li>`);
    if (cb.done && f.fibber) clues.push(`<li class="clue fib"><b>The lie</b> Really at ${esc(f.truthAt)}. ${esc(f.name.split(' ')[0])} had ${f.g === 'f' ? 'her' : 'his'} own reasons for hiding it.</li>`);
    const mark = cb.marks[i] || 0;
    const ask = (q, label) => `<button class="btn small ask" data-act="cb-ask" data-i="${i}" data-q="${q}" ${f.asked[q] || cb.done || f.caught ? 'disabled' : ''}>${label}</button>`;
    return `<div class="folk ${reveal ? 'seen-' + reveal : ''} ${f.cleared ? 'gone' : ''} mark-${MARKS[mark]}">
      <button class="cb-mark" data-act="cb-mark" data-i="${i}" title="Your notes: tap to mark" aria-label="Mark ${esc(f.name)}">${['?', '✔', '✖'][mark]}</button>
      <div class="portrait">${ART.folkArt(f, reveal === 'demon' ? f.demon : null, i + c.town.length)}</div>
      <div class="folk-name">${esc(f.name)}</div>
      <div class="folk-role">the ${esc(f.role)}</div>
      <ul class="tells">${clues.join('') || '<li>Waits to be asked.</li>'}</ul>
      ${reveal ? `<div class="verdict ${f.cleared ? 'bad' : ''}">${f.demon ? 'DEMON: ' + esc(ENEMIES[f.demon].name) : f.cleared ? 'Human. You were wrong.' : 'Human.'}</div>` : ''}
      ${cb.done || f.caught || f.cleared ? '' : `
      <div class="folk-questions">${ask('alibi', 'Where were you?')}${ask('saw', 'What did you see?')}</div>
      <div class="folk-actions">
        ${f.seen ? '' : `<button class="btn small" data-act="cb-look" data-i="${i}" ${cb.veil ? '' : 'disabled'}>${ART.eye(true)} Look (${cb.veil})</button>`}
        <button class="btn small danger" data-act="cb-accuse" data-i="${i}">Draw on them</button>
      </div>`}
    </div>`;
  };
  const score = caseScore(cb);
  return `
    <section class="town casebook">
      <div class="kicker case-kicker">The Casebook · Case ${cb.idx + 1} of ${CASE_FILE.length} · ${esc(spec.title)}</div>
      <h2>${esc(c.town)}</h2>
      <p class="sub">Last night ${esc(c.victim)} vanished near ${esc(c.scene)}. <b>Two</b> of these ${c.folk.length} strangers are demons.${c.fibber ? ' And one of the humans is lying about where they were last night, though what they saw is true.' : ''}</p>
      <div class="casebar">
        <span class="qleft" data-tip="The fewest questions that can crack this case.">Asked ${cb.asked} · Par ${c.par}</span>
        <span class="qleft">Demons caught ${caught}/2</span>
        <span class="hint">Humans tell the truth about what they saw. Demons lie. Every question past par costs 10 points; the Veil costs 40; a wrong draw costs 50.</span>
      </div>
      ${cb.done ? `<div class="case-result">
          <h3>${cb.wrong || cb.usedVeil || cb.asked > c.par ? 'Case closed' : 'A perfect case'}</h3>
          <p>${cb.asked} questions (par ${c.par})${cb.usedVeil ? ' · used the Veil' : ''}${cb.wrong ? ` · ${cb.wrong} wrong draw${cb.wrong > 1 ? 's' : ''}` : ''}</p>
          <p class="big-score">${score} / 100</p>
          <button class="btn big" data-act="cb-next">${cb.idx + 1 < CASE_FILE.length ? 'Next case' : 'Close the file'}</button>
        </div>` : ''}
      <div class="folks">${c.folk.map(person).join('')}</div>
      <div class="row center"><button class="btn" data-act="casebook">Leave the case</button></div>
    </section>`;
};
SCREENS.casebook = () => {
  const p = profileFull();
  const cb = S.cb && S.cb.final !== undefined ? S.cb : null;
  return `
    <section class="panel casebook-hub">
      <div class="kicker">No guns. No cards. Just the truth.</div>
      <h2>The Casebook</h2>
      ${cb ? `<div class="case-result">
        <h3>File closed: ${cb.final} / 300</h3>
        <p>${cb.scores.map((s, i) => `${CASE_FILE[i].title}: ${s}`).join(' · ')}</p>
        ${cb.final >= p.casebook.best ? '<p class="loot-note">Your best file yet.</p>' : ''}
      </div>` : ''}
      <p>Three cases, one after another. Each town hides <b>two</b> demons.</p>
      <ol class="case-list">${CASE_FILE.map(s => `<li><b>${esc(s.title)}.</b> ${s.n} strangers${s.fibber ? ', and one human lies about where they were' : ''}.</li>`).join('')}</ol>
      <p class="sub">Humans tell the truth. Demons lie. Each case has a par: the fewest questions that can crack it. Every question past par costs 10 points, a look through the Veil costs 40, and drawing on an innocent costs 50. Tap the ? on a stranger to keep notes.</p>
      <p class="stats">Best file: ${p.casebook.best} / 300 · Cases closed: ${p.casebook.solved} · Perfect: ${p.casebook.perfect}</p>
      <div class="row center"><button class="btn big" data-act="cb-start">Open a case file</button><button class="btn" data-act="title">Back</button></div>
    </section>`;
};
function caseCheckDone() {
  const cb = S.cb;
  if (cb.c.folk.filter(f => f.caught).length < 2) return;
  cb.done = true;
  const score = caseScore(cb);
  cb.scores.push(score);
  editProfile(p => { p.casebook.solved++; if (score === 100) p.casebook.perfect++; });
  AUDIO.sfx('coin');
}

// ---- actions -------------------------------------------------------------------------
Object.assign(ACTIONS, {
  'settings': showSettings,
  'set': el => {
    const k = el.dataset.k, v = el.dataset.v;
    SETTINGS[k] = v === 'true' ? true : v === 'false' ? false : v;
    saveSettings();
    showSettings();
  },
  'reset-tutor': () => { editProfile(p => { p.tutorial = { done: false, seen: [] }; }); S.setupTutor = undefined; showSettings(); },
  'toggle-tutor': el => { S.setupTutor = el.checked; },
  'coach-ok': el => { const id = el.dataset.id; editProfile(p => { p.tutorial.seen.push(id); if (TIPS.find(t => t.id === id).last) p.tutorial.done = true; }); coach(); },
  'coach-skip': () => { editProfile(p => { p.tutorial.done = true; }); coach(); },
  'records': () => { S.run = null; setScreen('records'); },
  'daily': () => { S.run = null; setScreen('daily'); },
  'daily-start': startDaily,
  'daily-continue': () => continueRun('daily'),
  'share': shareLine,
  'casebook': () => { S.run = null; S.cb = null; setScreen('casebook'); },
  'cb-start': startCaseFile,
  'cb-ask': el => {
    const cb = S.cb; const f = cb.c.folk[+el.dataset.i]; const q = el.dataset.q;
    if (cb.done || f.asked[q]) return;
    f.asked[q] = true; cb.asked++;
    AUDIO.sfx('deal');
    render();
  },
  'cb-look': el => {
    const cb = S.cb; const f = cb.c.folk[+el.dataset.i];
    if (cb.done || !cb.veil || f.seen) return;
    cb.veil--; cb.usedVeil = true; f.seen = true;
    AUDIO.sfx('sight');
    render();
  },
  'cb-accuse': el => {
    const cb = S.cb; const f = cb.c.folk[+el.dataset.i];
    if (cb.done || f.caught || f.cleared) return;
    if (f.demon) { f.caught = true; AUDIO.sfx('shot'); AUDIO.sfx('death', 0.2); caseCheckDone(); }
    else { f.cleared = true; cb.wrong++; AUDIO.sfx('wrong'); }
    render();
  },
  'cb-mark': el => { const cb = S.cb; const i = +el.dataset.i; cb.marks[i] = ((cb.marks[i] || 0) + 1) % 3; render(); },
  'cb-next': () => {
    const cb = S.cb;
    if (cb.idx + 1 < CASE_FILE.length) { cb.idx++; openCase(); return; }
    cb.final = cb.scores.reduce((a, b) => a + b, 0);
    editProfile(p => { p.casebook.files++; p.casebook.best = Math.max(p.casebook.best, cb.final); });
    setScreen('casebook');
  },
});

// A modal closing can uncover a coach mark that was waiting behind it.
new MutationObserver(() => coach()).observe(modal, { attributes: true, attributeFilter: ['hidden'] });

applySettings();
render();
