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
      <div class="set-row"><span>Motion</span><div class="segs">${opt('motion', 'full', 'Full')}${opt('motion', 'fast', 'Fast')}${opt('motion', 'still', 'Still')}</div></div>
      <div class="set-row"><span>Text size</span><div class="segs">${Object.keys(TEXT_SIZES).map(k => opt('text', k, k[0].toUpperCase() + k.slice(1))).join('')}</div></div>
      <div class="set-row"><span>Read letters and taunts aloud when they appear</span><div class="segs">${opt('autoVoice', true, 'On')}${opt('autoVoice', false, 'Off')}</div></div>
      <div class="set-row"><span>Vibrate on hits (phones)</span><div class="segs">${opt('haptics', true, 'On')}${opt('haptics', false, 'Off')}</div></div>
      <div class="set-row"><span>Label rounds with letters (easier to tell apart than colours)</span><div class="segs">${opt('roundLabels', true, 'On')}${opt('roundLabels', false, 'Off')}</div></div>
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
  p.long = Object.assign({ best: 0, lap: 0, hero: null, rides: 0 }, p.long);
  p.showdown = p.showdown || {};     // preset -> { turns, hero } for the fewest turns to win
  p.challenges = p.challenges || {}; // challenge id -> { won: true, hero }
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
      if (run.mode === 'story') s.bestLedger = Math.max(s.bestLedger, run.ledger);
      if (run.mode === 'challenge') p.challenges[run.challenge] = { won: true, hero: run.hero };
    } else s.deaths++;
    if (run.mode === 'daily' && !(p.daily[run.daily] && p.daily[run.daily].line)) {
      const line = dailyLine(run, o);
      p.daily[run.daily] = Object.assign(p.daily[run.daily] || {}, { win: o.win, line });
      lbSubmit({ daily: { num: run.daily, score: dailyScore(run, o), line, hero: run.hero } });
    }
    if (run.mode === 'long') {
      p.long.rides++;
      if (run.bounty > p.long.best) Object.assign(p.long, { best: run.bounty, lap: run.lap + 1, hero: run.hero });
      lbSubmit({ long: { score: run.bounty, lap: run.lap + 1, hero: run.hero } });
    }
  });
}
/** A Daily Hunt as one number, for the leaderboard: finishing beats going far beats solving clean. */
function dailyScore(run, o) {
  return (o.win ? 10000 : 0) + Math.min(3, run.chapter) * 1000 + run.step * 100 + (run.cleanSolves || 0) * 10 + run.kills;
}

/** What the game-over and victory screens offer, by mode. */
function modeEndHTML() {
  const r = S.run;
  if (r.mode === 'daily') return dailyShareHTML() + '<button class="btn" data-act="boards">Leaderboards</button>';
  if (r.mode === 'long') return `<p class="big-score">Bounty: ${r.bounty}</p><p class="sub">Lap ${r.lap + 1}, ${CHAPTERS[r.chapter].title}. Best ever: ${profileFull().long.best}.</p>
    <button class="btn big" data-act="longride">Ride again</button><button class="btn" data-act="boards">Leaderboards</button>`;
  if (r.mode === 'showdown') return `<p class="sub">Fell at fight ${S.sd.idx + 1} of ${SHOWDOWN_FIGHTS.length}.</p><button class="btn big" data-act="showdown">Try again</button>`;
  if (r.mode === 'challenge') return `<p class="sub">Wanted challenge: ${esc(CHALLENGES[r.challenge].name)}.</p><button class="btn big" data-act="challenges">Back to the posters</button>`;
  return '<button class="btn big" data-act="new-run">Ride again</button>';
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
  const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  return `
    <section class="panel records wide">
      <h2>Records</h2>
      <div class="rec-cols">
        <div>
          <h3 class="setup-h">The hunt</h3>
          <div class="stat-grid compact">
            ${stat(s.runs, 'hunts ridden')}${stat(wins, 'hunts won')}${stat(s.kills, 'demons sent back')}
            ${stat(s.bestLedger < 0 ? '—' : esc(LEDGER[s.bestLedger].name), 'hardest page won')}
            ${stat(s.clean, 'clean solves')}${stat(`${s.streak} <small>(best ${s.bestStreak})</small>`, 'clean streak')}
          </div>
          <table class="rec-table"><thead><tr><th></th><th>Rode</th><th>Won</th></tr></thead><tbody>${heroRows}</tbody></table>
          <h3 class="setup-h">Endings seen</h3>
          <ul class="rec-list">${endingRows}</ul>
        </div>
        <div>
          <h3 class="setup-h">The Long Ride</h3>
          ${kv([['Best bounty', p.long.best], ['Lap reached', p.long.lap || '—'], ['Rides', p.long.rides]])}
          <h3 class="setup-h">The Casebook</h3>
          ${kv([['Best file', `${p.casebook.best} / 300`], ['Cases closed', p.casebook.solved], ['Perfect cases', p.casebook.perfect]])}
          <h3 class="setup-h">Showdown</h3>
          ${kv(Object.entries(SHOWDOWN_DECKS).map(([k, d]) => [esc(d.name), p.showdown[k] ? `${p.showdown[k].turns} turns <small>(${esc(HEROES[p.showdown[k].hero].name)})</small>` : '—']))}
        </div>
        <div>
          <h3 class="setup-h">Wanted challenges</h3>
          <ul class="rec-list">${Object.entries(CHALLENGES).map(([k, c]) => `<li class="${p.challenges[k] ? 'won' : ''}">${p.challenges[k] ? '✔' : '·'} <b>${esc(c.name)}</b>${p.challenges[k] ? ` (${esc(HEROES[p.challenges[k].hero].name)})` : ''}</li>`).join('')}</ul>
          <h3 class="setup-h">Daily Hunts</h3>
          ${days.length ? `<ul class="rec-list daily-list">${days.slice(0, 7).map(([, d]) => `<li class="${d.win ? 'won' : ''}">${esc(d.line)}</li>`).join('')}</ul>` : '<p class="sub">None ridden yet.</p>'}
        </div>
      </div>
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
    const mark = cb.marks[i] || 0;
    const live = !(cb.done || f.caught || f.cleared);
    const ask = (q, label) => live ? `<button class="btn small ask" data-act="cb-ask" data-i="${i}" data-q="${q}">${label}</button>` : null;
    const cell = (q, label, answer, prompt) => ({ label, answer: f.asked[q] ? answer : null, button: ask(q, prompt),
      note: q === 'alibi' && cb.done && f.fibber ? `<span class="fib-note">A lie: really at ${esc(f.truthAt)}. ${esc(f.name.split(' ')[0])} had ${f.g === 'f' ? 'her' : 'his'} own reasons for hiding it.</span>` : '' });
    return ledgerRow({
      cls: `${reveal ? 'seen-' + reveal : ''} ${f.cleared ? 'gone' : ''} mark-${MARKS[mark]} ${cb.done && f.fibber ? 'fibber' : ''}`,
      art: ART.folkArt(f, reveal === 'demon' ? f.demon : null, i + c.town.length),
      lead: `<button class="cb-mark" data-act="cb-mark" data-i="${i}" title="Your notes: tap to mark" aria-label="Mark ${esc(f.name)}">${['?', '✔', '✖'][mark]}</button>`,
      name: f.name, role: f.role,
      verdict: reveal ? `<div class="verdict ${f.cleared ? 'bad' : ''}">${f.demon ? 'DEMON: ' + esc(ENEMIES[f.demon].name) : f.cleared ? 'Human. You were wrong.' : 'Human.'}</div>` : '',
      cells: [cell('alibi', 'Last night', f.alibi, 'Where were you?'), cell('saw', 'Saw', f.saw, 'What did you see?')],
      actions: live ? `${f.seen ? '' : `<button class="btn small" data-act="cb-look" data-i="${i}" ${cb.veil ? '' : 'disabled'}>${ART.eye(true)} Look (${cb.veil})</button>`}
        <button class="btn small danger" data-act="cb-accuse" data-i="${i}">Draw on them</button>` : '',
    });
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
        <span class="hint" data-tip="Every question past par costs 10 points; the Veil costs 40; a wrong draw costs 50.">Humans tell the truth about what they saw. Demons lie. Past par −10 · Veil −40 · wrong draw −50</span>
      </div>
      ${cb.done ? `<div class="case-result slim">
          <h3>${cb.wrong || cb.usedVeil || cb.asked > c.par ? 'Case closed' : 'A perfect case'}</h3>
          <p>${cb.asked} questions (par ${c.par})${cb.usedVeil ? ' · used the Veil' : ''}${cb.wrong ? ` · ${cb.wrong} wrong draw${cb.wrong > 1 ? 's' : ''}` : ''}</p>
          <p class="big-score">${score} / 100</p>
          <button class="btn big" data-act="cb-next">${cb.idx + 1 < CASE_FILE.length ? 'Next case' : 'Close the file'}</button>
        </div>` : ''}
      <div class="folks ledger cb-ledger">${c.folk.map(person).join('')}</div>
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

// ---- choosing a hunter, shared by the modes below ------------------------------------------
function unlockedHeroes() {
  const prof = profileFull();
  return Object.keys(HEROES).filter(k => !HEROES[k].unlock || prof.unlocks[HEROES[k].unlock.key]);
}
function modeHero() {
  const ok = unlockedHeroes();
  return ok.includes(S.modeHero) ? S.modeHero : ok[0];
}
function hunterPicker() {
  const chosen = modeHero();
  return `<div class="hunters small">${unlockedHeroes().map(k => `<button class="hunter ${k === chosen ? 'sel' : ''}" data-act="mode-hero" data-id="${k}">
    <span class="hunter-art">${ART.heroArt(k)}</span><b>${esc(HEROES[k].name)}</b>
    <small>♥ ${HEROES[k].hp} · ${ART.eye(true)} ${HEROES[k].sight}${HEROES[k].questions ? ` · +${HEROES[k].questions} questions` : ''}</small></button>`).join('')}</div>`;
}
const unlockedStyles = () => Object.keys(STYLE_UNLOCKS).filter(k => profileFull().unlocks[k]);

// ---- the Long Ride: endless laps, scored on bounty -------------------------------------------
SCREENS.longride = () => {
  const p = profileFull();
  const sv = loadSave('long');
  return `
    <section class="panel longride wide">
      <div class="kicker">Endless</div>
      <h2>The Long Ride</h2>
      <p>The Gentleman goes down, and the ledger writes him back in. Ride the three chapters again and again, with no story stops and no letters. Every lap the demons have a quarter more health and hit harder. Your score is the bounty you collect.</p>
      ${p.long.best ? `<p class="stats">Best bounty: ${p.long.best} (lap ${p.long.lap}, ${esc(HEROES[p.long.hero].name)})</p>` : ''}
      ${sv ? `<div class="row center"><button class="btn big" data-act="long-continue">Continue<br><small>Lap ${sv.lap + 1} · ${esc(CHAPTERS[sv.chapter].title)} · Bounty ${sv.bounty}</small></button></div>` : ''}
      <h3 class="setup-h">Who rides?</h3>
      ${hunterPicker()}
      <div class="row center"><button class="btn ${sv ? '' : 'big'}" data-act="long-start">${sv ? 'Start over' : 'Ride out'}</button><button class="btn" data-act="boards">Leaderboards</button><button class="btn" data-act="title">Back</button></div>
    </section>`;
};
function startLong() {
  clearSave('long');
  S.run = new Run(undefined, { hero: modeHero(), mode: 'long', styles: unlockedStyles() });
  recordRunStart(S.run);
  S.combat = null;
  toast('Lap 1. Ride as far as you can.');
  setScreen('map');
}

// ---- Showdown: three wanted demons and three bosses, back to back ----------------------------
SCREENS.showdown = () => {
  const p = profileFull();
  const pick_ = S.sdPreset && SHOWDOWN_DECKS[S.sdPreset] ? S.sdPreset : 'gun';
  return `
    <section class="panel showdown wide">
      <div class="kicker">Boss rush</div>
      <h2>Showdown</h2>
      <p>Six fights in a row: each chapter's wanted demon, then its boss. You ride in with 10 extra health. Between fights you heal a third, take a card, and collect what the demon was carrying: a tonic from a wanted demon, a keepsake from a boss. Win in as few turns as you can.</p>
      <h3 class="setup-h">Who rides?</h3>
      ${hunterPicker()}
      <h3 class="setup-h">Which deck?</h3>
      <div class="presets">${Object.entries(SHOWDOWN_DECKS).map(([k, d]) => `<button class="preset ${k === pick_ ? 'sel' : ''}" data-act="sd-preset" data-id="${k}">
        <b>${esc(d.name)}</b><small>${esc(d.desc)}</small>
        <span class="preset-best">${p.showdown[k] ? `Best: ${p.showdown[k].turns} turns` : 'Not won yet'}</span></button>`).join('')}</div>
      <div class="row center"><button class="btn big" data-act="sd-start">Draw</button><button class="btn" data-act="title">Back</button></div>
    </section>`;
};
function startShowdown() {
  const preset = S.sdPreset && SHOWDOWN_DECKS[S.sdPreset] ? S.sdPreset : 'gun';
  S.run = new Run(undefined, { hero: modeHero(), mode: 'showdown', preset, styles: Object.keys(STYLE_UNLOCKS) });
  recordRunStart(S.run);
  S.sd = { idx: 0, turns: 0, preset, foes: SHOWDOWN_FIGHTS.map(([ch, kind]) => kind === 'boss' ? storyFor(S.run.hero).boss(ch) : pick(S.run.rng, elitesOf(ch))) };
  S.combat = null;
  setScreen('sdNext');
}
SCREENS.sdNext = () => {
  const sd = S.sd, [ch, kind] = SHOWDOWN_FIGHTS[sd.idx], f = sd.foes[sd.idx];
  return `
    <section class="panel story boss-intro split">
      <div class="boss-art">${ART.demonArt(f.foes[0])}</div>
      <div class="split-text">
      <div class="kicker">Fight ${sd.idx + 1} of ${SHOWDOWN_FIGHTS.length} · ${esc(CHAPTERS[ch].title.split(' — ')[0])}</div>
      <h2>${esc(kind === 'boss' ? f.guise : f.name)}</h2>
      <p class="${kind === 'boss' ? 'speech' : ''}">${esc(T(kind === 'boss' ? f.taunt : f.bounty))}</p>
      <p class="stats">♥ ${S.run.hp}/${S.run.maxHp} · Turns so far: ${sd.turns}</p>
      <button class="btn big danger" data-act="sd-fight">${kind === 'boss' ? esc(f.cry) : 'Hunt it down'}</button>
      </div>
    </section>`;
};
function showdownWon(c) {
  const sd = S.sd, r = S.run;
  sd.turns += c.turn;
  sd.idx++;
  AUDIO.sfx('coin', 0.3);
  if (sd.idx >= SHOWDOWN_FIGHTS.length) {
    let best = false;
    editProfile(p => {
      const cur = p.showdown[sd.preset];
      if (!cur || sd.turns < cur.turns) { p.showdown[sd.preset] = { turns: sd.turns, hero: r.hero }; best = true; }
    });
    sd.best = best;
    r.recorded = true;
    setScreen('sdDone');
    return;
  }
  const [ch, kind] = SHOWDOWN_FIGHTS[sd.idx - 1];
  sd.rest = r.showdownRest(kind, ch);
  sd.cards = sd.rest.cards;
  sd.taken = null;
  setScreen('sdRest');
}
SCREENS.sdRest = () => {
  const sd = S.sd;
  return `
    <section class="panel reward">
      <h2>Between Fights</h2>
      <p class="sub">You catch your breath and reload. (Healed a third: ♥ ${S.run.hp}/${S.run.maxHp}.) Turns so far: ${sd.turns}.</p>
      ${sd.rest.tonic ? `<div class="loot-line keepsake-line">${tonicIcons([sd.rest.tonic], false).split('<span class="tonic empty">')[0]} <b>${esc(TONICS[sd.rest.tonic].name)}</b> — ${esc(TONICS[sd.rest.tonic].desc)}</div>` : ''}
      ${sd.rest.keepsake ? `<div class="loot-line keepsake-line">${keepsakeHTML(sd.rest.keepsake)} <b>${esc(KEEPSAKES[sd.rest.keepsake].name)}</b> — ${esc(KEEPSAKES[sd.rest.keepsake].desc)}</div>` : ''}
      ${sd.taken ? `<p class="sub">Added ${esc(sd.taken)}.</p>` : `<p class="prompt">Add a card to your deck:</p>
      <div class="card-row">${sd.cards.map((id, i) => cardHTML({ id, up: false }, { cls: 'pickable', attrs: `data-act="sd-take" data-i="${i}"` })).join('')}</div>`}
      <div class="row center"><button class="btn big" data-act="sd-onward">${sd.taken ? 'Next fight' : 'Skip and fight on'}</button></div>
    </section>`;
};
SCREENS.sdDone = () => {
  const sd = S.sd;
  return `
    <section class="panel story victory">
      <div class="kicker">Showdown</div>
      <h2>Six for Six</h2>
      <p>The last of them comes apart in the red dust. You holster your iron and count: ${sd.turns} turns, start to finish.</p>
      <p class="big-score">${sd.turns} turns</p>
      ${sd.best ? '<p class="loot-note">Your best with this deck.</p>' : `<p class="sub">Your best with this deck: ${profileFull().showdown[sd.preset].turns} turns.</p>`}
      <p class="stats">${esc(heroDef().name)} · ${esc(SHOWDOWN_DECKS[sd.preset].name)} deck</p>
      <div class="row center"><button class="btn big" data-act="showdown">Again</button><button class="btn" data-act="title">Title</button></div>
    </section>`;
};

// ---- Wanted challenges: the story with one rule changed ---------------------------------------
function featuredChallenge() {
  const ids = Object.keys(CHALLENGES);
  return ids[Math.floor((dailyInfo().num - 1) / 7) % ids.length];
}
SCREENS.challenges = () => {
  const p = profileFull();
  const feat = featuredChallenge();
  const ids = [feat, ...Object.keys(CHALLENGES).filter(k => k !== feat)];
  const sv = loadSave('challenge');
  return `
    <section class="panel challenges wide">
      <div class="kicker">Wanted</div>
      <h2>Wanted Challenges</h2>
      <p>The whole story, with one rule changed. A new poster goes up every week; the old ones stay on the wall. Nothing unlocks, but every one you finish is marked in your Records.</p>
      ${sv ? `<div class="row center"><button class="btn big" data-act="ch-continue">Continue: ${esc(CHALLENGES[sv.challenge].name)}<br><small>${esc(CHAPTERS[Math.min(3, sv.chapter)].title)} · ♥ ${sv.hp}/${sv.maxHp}</small></button></div>` : ''}
      <h3 class="setup-h">Who rides?</h3>
      ${hunterPicker()}
      <div class="posters">${ids.map(k => `<div class="wanted-card ${k === feat ? 'featured' : ''} ${p.challenges[k] ? 'done' : ''}">
        ${k === feat ? '<span class="ribbon">This week</span>' : ''}
        <b>${esc(CHALLENGES[k].name)}</b><p>${esc(CHALLENGES[k].desc)}</p>
        ${p.challenges[k] ? `<span class="done-mark">✔ Finished with ${esc(HEROES[p.challenges[k].hero].name)}</span>` : ''}
        <button class="btn danger" data-act="ch-start" data-id="${k}">Take the poster</button></div>`).join('')}</div>
      <div class="row center"><button class="btn" data-act="title">Back</button></div>
    </section>`;
};
function startChallenge(id) {
  clearSave('challenge');
  S.run = new Run(undefined, { hero: modeHero(), mode: 'challenge', challenge: id, styles: unlockedStyles() });
  recordRunStart(S.run);
  S.combat = null;
  setScreen('intro');
}

// ---- leaderboards (shared through the published page's database) ------------------------------
// Each rider keeps one document, lb/<their id>, holding their best results. Everyone can read
// every rider's document; only the rider can write their own.
const LB = { ready: null, q: Promise.resolve(), data: null, loading: false, error: '' };
function lbInit() {
  if (LB.ready) return LB.ready;
  LB.ready = (async () => {
    try {
      if (!window.claude || !window.claude.use) return null;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return null;
      const uid = await user.id();
      return uid ? { db, user, uid } : { db, user, uid: null };
    } catch (e) { return null; }
  })();
  return LB.ready;
}
/** Merge a result into this rider's document. Writes go one at a time. */
function lbSubmit(patch) {
  LB.q = LB.q.then(async () => {
    const lb = await lbInit();
    if (!lb || !lb.uid) return;
    try {
      const ref = lb.db.doc('lb/' + lb.uid);
      const snap = await ref.get();
      const cur = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : {};
      const next = { ...cur };
      if (patch.daily) {
        const d = { ...(cur.daily || {}) };
        if (!d[patch.daily.num]) d[patch.daily.num] = { score: patch.daily.score, line: patch.daily.line, hero: patch.daily.hero };
        // Keep the last month of dailies.
        Object.keys(d).filter(k => +k < patch.daily.num - 30).forEach(k => delete d[k]);
        next.daily = d;
      }
      if (patch.long && (!cur.long || patch.long.score > cur.long.score)) next.long = patch.long;
      if (patch.casebook && (!cur.casebook || patch.casebook.score > cur.casebook.score)) next.casebook = patch.casebook;
      if (JSON.stringify(next) !== JSON.stringify(cur)) await ref.set(next);
      LB.data = null;
    } catch (e) { /* a leaderboard write is never worth breaking the game over */ }
  });
  return LB.q;
}
async function lbLoad() {
  if (LB.loading) return;
  LB.loading = true; LB.error = '';
  const lb = await lbInit();
  if (!lb) { LB.error = 'offline'; LB.loading = false; if (S.screen === 'boards') render(); return; }
  try {
    const snap = await lb.db.collection('lb').limit(1000).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const names = await lb.user.profiles(rows.map(r => r.id));
    const nameOf = id => (names[id] && names[id].name) || 'A rider';
    const today = String(dailyInfo().num);
    const top = (list, n = 10) => list.sort((a, b) => b.score - a.score).slice(0, n);
    LB.data = {
      me: lb.uid,
      daily: top(rows.filter(r => r.daily && r.daily[today]).map(r => ({ id: r.id, name: nameOf(r.id), ...r.daily[today] }))),
      long: top(rows.filter(r => r.long).map(r => ({ id: r.id, name: nameOf(r.id), ...r.long }))),
      casebook: top(rows.filter(r => r.casebook).map(r => ({ id: r.id, name: nameOf(r.id), ...r.casebook }))),
    };
  } catch (e) { LB.error = 'failed'; }
  LB.loading = false;
  if (S.screen === 'boards') render();
}
SCREENS.boards = () => {
  const tab = S.lbTab || 'daily';
  const d = LB.data;
  if (!d && !LB.loading && !LB.error) setTimeout(lbLoad, 0);
  const tabs = [['daily', `Today's Daily (#${dailyInfo().num})`], ['long', 'The Long Ride'], ['casebook', 'The Casebook']];
  const row = (e, i) => `<tr class="${d && e.id === d.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(e.name)}${d && e.id === d.me ? ' (you)' : ''}</td>
    <td>${tab === 'daily' ? `<span class="lb-line">${esc(e.line)}</span>` : tab === 'long' ? `${e.score} bounty <small>· lap ${e.lap} · ${esc(HEROES[e.hero] ? HEROES[e.hero].name : '')}</small>` : `${e.score} / 300`}</td></tr>`;
  let body;
  if (LB.error === 'offline') body = '<p class="sub">Leaderboards live on the published page. Open the game from its claude.ai link, signed in, to see them.</p>';
  else if (LB.error) body = '<p class="sub">The telegraph is down. Try again in a moment.</p>';
  else if (!d) body = '<p class="sub">Asking around town…</p>';
  else if (!d[tab].length) body = '<p class="sub">Nobody on this board yet. Be the first.</p>';
  else body = `<table class="rec-table lb-table"><tbody>${d[tab].map(row).join('')}</tbody></table>`;
  return `
    <section class="panel boards">
      <h2>Leaderboards</h2>
      <div class="segs center-segs">${tabs.map(([k, l]) => `<button class="seg ${k === tab ? 'sel' : ''}" data-act="lb-tab" data-id="${k}">${l}</button>`).join('')}</div>
      ${body}
      <p class="sub">Shared by everyone who plays this page. Your results post automatically when a Daily Hunt, a Long Ride or a case file ends.</p>
      <div class="row center"><button class="btn" data-act="lb-refresh">Refresh</button><button class="btn" data-act="title">Back</button></div>
    </section>`;
};

Object.assign(ACTIONS, {
  'mode-hero': el => { S.modeHero = el.dataset.id; render(); },
  'longride': () => { S.run = null; setScreen('longride'); },
  'long-start': startLong,
  'long-continue': () => continueRun('long'),
  'showdown': () => { S.run = null; setScreen('showdown'); },
  'sd-preset': el => { S.sdPreset = el.dataset.id; render(); },
  'sd-start': startShowdown,
  'sd-fight': () => {
    const [ch, kind] = SHOWDOWN_FIGHTS[S.sd.idx];
    S.run.chapter = ch;
    startFight(S.sd.foes[S.sd.idx].foes, kind);
  },
  'sd-take': el => { const id = S.sd.cards[+el.dataset.i]; S.run.addCard(id); S.sd.taken = CARDS[id].name; AUDIO.sfx('deal'); render(); },
  'sd-onward': () => setScreen('sdNext'),
  'challenges': () => { S.run = null; setScreen('challenges'); },
  'ch-start': el => startChallenge(el.dataset.id),
  'ch-continue': () => continueRun('challenge'),
  'boards': () => { S.run = null; LB.data = null; LB.error = ''; setScreen('boards'); },
  'lb-tab': el => { S.lbTab = el.dataset.id; render(); },
  'lb-refresh': () => { LB.data = null; LB.error = ''; render(); },
});

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
    lbSubmit({ casebook: { score: cb.final } });
    setScreen('casebook');
  },
});

// A modal closing can uncover a coach mark that was waiting behind it.
new MutationObserver(() => coach()).observe(modal, { attributes: true, attributeFilter: ['hidden'] });

applySettings();
render();
