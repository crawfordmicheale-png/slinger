'use strict';
// ---------------------------------------------------------------------------
// SLINGER — game data: cards, keepsakes, demons, encounters, trail events.
// Everything in here is plain data plus small `play` callbacks that call into
// the Combat API defined in game.js (hit, hitAll, cover, apply, draw, ...).
// ---------------------------------------------------------------------------

const HERO = {
  name: 'Jonah Crane',
  maxHp: 70,
  gold: 60,
  maxSight: 3,
  maxGrit: 3,
  maxRounds: 6,
  handSize: 5,
};

const FAMILY = {
  amos: 'Amos',   // brother
  ruth: 'Ruth',   // sister
  clara: 'Clara', // wife
};

// Status glossary (used for tooltips)
const STATUS = {
  wrath:   { name: 'Wrath',   good: true,  desc: 'Deals this much extra damage with every hit.' },
  exposed: { name: 'Exposed', good: false, desc: 'Takes 50% more damage. Wears off by 1 each turn.' },
  shaken:  { name: 'Shaken',  good: false, desc: 'Deals 25% less damage. Wears off by 1 each turn.' },
  burn:    { name: 'Hellfire',good: false, desc: 'Loses this much HP at the start of its turn, then Hellfire drops by 1.' },
};

// ---------------------------------------------------------------------------
// CARDS
// v   = base values, up = upgraded values (may also override cost/exhaust).
// rounds = how many Rounds (bullets) the card spends. 'all' = every loaded one.
// target: 'enemy' needs a target, 'all' hits every foe, undefined = self.
// ---------------------------------------------------------------------------
const CARDS = {
  // ---- Starter -----------------------------------------------------------
  quick_draw: {
    name: 'Quick Draw', type: 'attack', rarity: 'starter', cost: 1, rounds: 1, target: 'enemy',
    v: { dmg: 6 }, up: { dmg: 9 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  take_cover: {
    name: 'Take Cover', type: 'skill', rarity: 'starter', cost: 1,
    v: { cov: 5 }, up: { cov: 8 },
    text: v => `Gain ${v.cov} Cover.`,
    play: (c, v) => c.cover(v.cov),
  },
  reload: {
    name: 'Reload', type: 'skill', rarity: 'starter', cost: 0,
    v: { draw: 1 }, up: { draw: 2 },
    text: v => `Load every chamber. Draw ${v.draw}.`,
    play: (c, v) => { c.reload(99); c.draw(v.draw); },
  },
  pistol_whip: {
    name: 'Pistol Whip', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    v: { dmg: 5, sh: 1 }, up: { dmg: 7, sh: 2 },
    text: v => `Deal ${v.dmg} damage. Apply ${v.sh} Shaken.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.apply(t, 'shaken', v.sh); },
  },

  // ---- Common ------------------------------------------------------------
  fan_hammer: {
    name: 'Fan the Hammer', type: 'attack', rarity: 'common', cost: 1, rounds: 'all', target: 'enemy',
    v: { dmg: 3 }, up: { dmg: 4 },
    text: v => `Spend every Round. Deal ${v.dmg} damage per Round.`,
    play: (c, v, t) => c.hit(t, v.dmg, c.spent),
  },
  buckshot: {
    name: 'Buckshot', type: 'attack', rarity: 'common', cost: 1, rounds: 1, target: 'all',
    v: { dmg: 6 }, up: { dmg: 9 },
    text: v => `Deal ${v.dmg} damage to ALL foes.`,
    play: (c, v) => c.hitAll(v.dmg),
  },
  warning_shot: {
    name: 'Warning Shot', type: 'attack', rarity: 'common', cost: 0, rounds: 1, target: 'enemy',
    v: { dmg: 3, sh: 1 }, up: { dmg: 5, sh: 2 },
    text: v => `Deal ${v.dmg} damage. Apply ${v.sh} Shaken.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.apply(t, 'shaken', v.sh); },
  },
  bowie_knife: {
    name: 'Bowie Knife', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    v: { dmg: 4 }, up: { dmg: 7 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  brawl: {
    name: 'Bar Brawl', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 9 }, up: { dmg: 13 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  duck_roll: {
    name: 'Duck and Roll', type: 'skill', rarity: 'common', cost: 1,
    v: { cov: 8 }, up: { cov: 11 },
    text: v => `Gain ${v.cov} Cover.`,
    play: (c, v) => c.cover(v.cov),
  },
  speed_loader: {
    name: 'Speed Loader', type: 'skill', rarity: 'common', cost: 0,
    v: { r: 3, draw: 1 }, up: { r: 6, draw: 1 },
    text: v => `Load ${v.r} Rounds. Draw ${v.draw}.`,
    play: (c, v) => { c.reload(v.r); c.draw(v.draw); },
  },
  steady_hand: {
    name: 'Steady Hand', type: 'skill', rarity: 'common', cost: 1,
    v: { draw: 2 }, up: { draw: 3 },
    text: v => `Draw ${v.draw} cards.`,
    play: (c, v) => c.draw(v.draw),
  },
  grim_resolve: {
    name: 'Grim Resolve', type: 'skill', rarity: 'common', cost: 1,
    v: { cov: 5, w: 1 }, up: { cov: 8, w: 1 },
    text: v => `Gain ${v.cov} Cover and ${v.w} Wrath.`,
    play: (c, v) => { c.cover(v.cov); c.applySelf('wrath', v.w); },
  },
  holy_water: {
    name: 'Holy Water', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    v: { burn: 5 }, up: { burn: 8 },
    text: v => `Apply ${v.burn} Hellfire.`,
    play: (c, v, t) => c.apply(t, 'burn', v.burn),
  },
  ricochet: {
    name: 'Ricochet', type: 'attack', rarity: 'common', cost: 1, rounds: 1, target: 'all',
    v: { dmg: 4, n: 3 }, up: { dmg: 5, n: 4 },
    text: v => `Deal ${v.dmg} damage to a random foe ${v.n} times.`,
    play: (c, v) => c.hitRandom(v.dmg, v.n),
  },

  // ---- Uncommon ----------------------------------------------------------
  dead_eye: {
    name: 'Dead Eye', type: 'attack', rarity: 'uncommon', cost: 2, rounds: 1, target: 'enemy',
    v: { dmg: 16 }, up: { dmg: 22 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  silver_bullet: {
    name: 'Silver Bullet', type: 'attack', rarity: 'uncommon', cost: 1, rounds: 1, target: 'enemy',
    v: { dmg: 8, ex: 2 }, up: { dmg: 10, ex: 3 },
    text: v => `Deal ${v.dmg} damage. Apply ${v.ex} Exposed.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.apply(t, 'exposed', v.ex); },
  },
  hellfire_round: {
    name: 'Hellfire Round', type: 'attack', rarity: 'uncommon', cost: 1, rounds: 1, target: 'enemy',
    v: { dmg: 5, burn: 4 }, up: { dmg: 7, burn: 6 },
    text: v => `Deal ${v.dmg} damage. Apply ${v.burn} Hellfire.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.apply(t, 'burn', v.burn); },
  },
  pierce_veil: {
    name: 'Pierce the Veil', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all', exhaust: true,
    v: { ex: 2 }, up: { ex: 2, cost: 0 },
    text: v => `Apply ${v.ex} Exposed to ALL foes. Exhaust.`,
    play: (c, v) => c.applyAll('exposed', v.ex),
  },
  stand_ground: {
    name: 'Stand Your Ground', type: 'skill', rarity: 'uncommon', cost: 2,
    v: { cov: 14 }, up: { cov: 19 },
    text: v => `Gain ${v.cov} Cover.`,
    play: (c, v) => c.cover(v.cov),
  },
  dust_up: {
    name: 'Kick Up Dust', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all',
    v: { cov: 6, sh: 1 }, up: { cov: 8, sh: 2 },
    text: v => `Gain ${v.cov} Cover. Apply ${v.sh} Shaken to ALL foes.`,
    play: (c, v) => { c.cover(v.cov); c.applyAll('shaken', v.sh); },
  },
  whiskey: {
    name: 'Rotgut Whiskey', type: 'skill', rarity: 'uncommon', cost: 1, exhaust: true,
    v: { heal: 6 }, up: { heal: 9 },
    text: v => `Heal ${v.heal} HP. Exhaust.`,
    play: (c, v) => c.heal(v.heal),
  },
  blood_oath: {
    name: 'Blood Oath', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: { self: 3, dmg: 15 }, up: { self: 3, dmg: 20 },
    text: v => `Lose ${v.self} HP. Deal ${v.dmg} damage.`,
    play: (c, v, t) => { c.loseHp(c.p, v.self); c.hit(t, v.dmg); },
  },
  deadmans_hand: {
    name: "Dead Man's Hand", type: 'skill', rarity: 'uncommon', cost: 0, exhaust: true,
    v: { draw: 2, grit: 1 }, up: { draw: 3, grit: 1 },
    text: v => `Draw ${v.draw}. Gain ${v.grit} Grit. Exhaust.`,
    play: (c, v) => { c.draw(v.draw); c.gainGrit(v.grit); },
  },
  quick_hands: {
    name: 'Quick Hands', type: 'power', rarity: 'uncommon', cost: 1,
    v: { r: 1 }, up: { r: 2 },
    text: v => `At the start of each turn, load ${v.r} Round${v.r > 1 ? 's' : ''}.`,
    play: (c, v) => c.power('quick_hands', v.r),
  },
  lawmans_instinct: {
    name: "Lawman's Instinct", type: 'power', rarity: 'uncommon', cost: 1,
    v: { cov: 3 }, up: { cov: 5 },
    text: v => `At the start of each turn, gain ${v.cov} Cover.`,
    play: (c, v) => c.power('lawmans_instinct', v.cov),
  },

  // ---- Rare --------------------------------------------------------------
  last_rites: {
    name: 'Last Rites', type: 'attack', rarity: 'rare', cost: 3, rounds: 2, target: 'enemy',
    v: { dmg: 32 }, up: { dmg: 44 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  say_her_name: {
    name: 'Say Her Name', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', exhaust: true,
    v: { dmg: 12, w: 2 }, up: { dmg: 16, w: 3 },
    text: v => `Deal ${v.dmg} damage. Gain ${v.w} Wrath. Exhaust.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.applySelf('wrath', v.w); },
  },
  iron_will: {
    name: 'Iron Will', type: 'power', rarity: 'rare', cost: 2,
    v: { w: 2 }, up: { w: 3 },
    text: v => `Gain ${v.w} Wrath.`,
    play: (c, v) => c.applySelf('wrath', v.w),
  },
  consecrated: {
    name: 'Consecrated Rounds', type: 'power', rarity: 'rare', cost: 1,
    v: { burn: 2 }, up: { burn: 3 },
    text: v => `Your cards that spend Rounds also apply ${v.burn} Hellfire.`,
    play: (c, v) => c.power('consecrated', v.burn),
  },
  vengeful_spirit: {
    name: 'Vengeful Spirit', type: 'power', rarity: 'rare', cost: 1,
    v: { w: 1 }, up: { w: 1, cost: 0 },
    text: v => `Whenever you lose HP, gain ${v.w} Wrath.`,
    play: (c, v) => c.power('vengeful_spirit', v.w),
  },
  judgment: {
    name: 'Judgment', type: 'attack', rarity: 'rare', cost: 2, rounds: 1, target: 'enemy',
    v: { dmg: 12 }, up: { dmg: 16 },
    text: v => `Deal ${v.dmg} damage. Double it if the foe is below half HP.`,
    play: (c, v, t) => c.hit(t, t && t.hp * 2 < t.maxHp ? v.dmg * 2 : v.dmg),
  },

  // ---- Curses ------------------------------------------------------------
  blood_on_hands: {
    name: 'Blood on Your Hands', type: 'curse', rarity: 'curse', cost: null, unplayable: true,
    v: {}, text: () => 'Unplayable. An innocent died because you were wrong.',
  },
  bad_hand: {
    name: 'Bad Hand', type: 'curse', rarity: 'curse', cost: null, unplayable: true, ethereal: true,
    v: {}, text: () => 'Unplayable. Fades at end of turn.',
  },
  grief: {
    name: 'Grief', type: 'curse', rarity: 'curse', cost: null, unplayable: true, ethereal: true,
    v: {}, text: () => 'Unplayable. Fades at end of turn. You remember the funeral.',
  },
};

const STARTER_DECK = [
  'quick_draw', 'quick_draw', 'quick_draw', 'quick_draw', 'quick_draw',
  'take_cover', 'take_cover', 'take_cover', 'take_cover',
  'reload', 'pistol_whip',
];

// ---------------------------------------------------------------------------
// KEEPSAKES (relics)
// ---------------------------------------------------------------------------
const KEEPSAKES = {
  tin_star: {
    name: 'Tin Star', desc: 'Your old badge. Start each fight with 6 Cover.',
  },
  claras_locket: {
    name: "Clara's Locket", desc: 'Once per fight, when you fall below half HP, gain 3 Wrath and 8 Cover.',
  },
  amos_harmonica: {
    name: "Amos's Harmonica", desc: 'After each fight, play his old tune and heal 6 HP.', family: true,
  },
  ruths_rosary: {
    name: "Ruth's Rosary", desc: 'Gain 1 extra Grit every turn.', family: true,
  },
  // elite / shop pool
  snake_oil: { name: 'Snake Oil Flask', desc: 'Draw 2 extra cards on your first turn of each fight.' },
  silver_spurs: { name: 'Silver Spurs', desc: '+1 Veil Sight. Your sight recovers 1 charge after every fight.' },
  gun_oil: { name: 'Gunsmith\'s Oil', desc: 'Your iron holds 8 Rounds instead of 6.' },
  rattle: { name: 'Rattlesnake Rattle', desc: 'Start each fight by applying 1 Exposed to ALL foes.' },
  bible: { name: "Grandpa's Bible", desc: 'Raise max HP by 12 when found. A bullet hole through Revelation.' },
  horseshoe: { name: 'Lucky Horseshoe', desc: 'Collect 15 extra gold after every fight.' },
  war_paint: { name: 'Cinder War Paint', desc: 'Start each fight with 1 Wrath.' },
};
const KEEPSAKE_POOL = ['snake_oil', 'silver_spurs', 'gun_oil', 'rattle', 'bible', 'horseshoe', 'war_paint'];

// ---------------------------------------------------------------------------
// DEMONS
// Move fields: atk, hits, block, wrath, shaken, exposed, burn (on player),
//              heal, curse:{id,n}, summon:{id,n}
// ---------------------------------------------------------------------------
const ENEMIES = {
  // Chapter 1 ---------------------------------------------------------------
  razorjaw: {
    name: 'Razorjaw', hp: [38, 42], art: 'jaw',
    moves: {
      slash: { n: 'Straight Razor', atk: 8 },
      snip:  { n: 'Snip Snip', atk: 4, hits: 2 },
      hone:  { n: 'Hone the Blade', wrath: 2, block: 5 },
    },
    pattern: ['slash', 'snip', 'hone'],
  },
  mourner: {
    name: 'The Crawling Mourner', hp: [34, 38], art: 'veil',
    moves: {
      wail:   { n: 'Wail', atk: 4, shaken: 2 },
      clutch: { n: 'Clutch', atk: 10 },
      weep:   { n: 'Weep', block: 9 },
    },
    pattern: ['wail', 'clutch', 'weep', 'clutch'],
  },
  hollow_deputy: {
    name: 'Hollow Deputy', hp: [44, 48], art: 'hat',
    moves: {
      hold:  { n: 'Hold It Right There', atk: 6, block: 7 },
      shoot: { n: 'Shoot to Kill', atk: 12 },
    },
    pattern: ['hold', 'shoot'],
  },
  cinder_hound: {
    name: 'Cinder Hound', hp: [18, 21], art: 'hound',
    moves: {
      bite: { n: 'Smoldering Bite', atk: 4, burn: 2 },
      snap: { n: 'Snap', atk: 7 },
    },
    pattern: ['bite', 'snap'], start: 'random',
  },
  skinless_rider: {
    name: 'The Skinless Rider', hp: [72, 76], art: 'rider', elite: true,
    moves: {
      lasso: { n: 'Lasso', atk: 6, shaken: 2 },
      trample: { n: 'Ride Down', atk: 16 },
      howl: { n: 'Howl at the Moon', wrath: 3, block: 6 },
      spur: { n: 'Spurs', atk: 5, hits: 2 },
    },
    pattern: ['lasso', 'trample', 'howl', 'spur', 'trample'],
  },
  hollow_steer: {
    name: 'The Hollow Steer', hp: [90, 90], art: 'steer', boss: true,
    moves: {
      gore:     { n: 'Gore', atk: 14 },
      stampede: { n: 'Stampede', atk: 5, hits: 3 },
      bellow:   { n: 'Bellow', wrath: 2, block: 10 },
      brand:    { n: 'Hot Iron Brand', atk: 8, burn: 4 },
    },
    pattern: ['brand', 'gore', 'stampede', 'bellow'],
    phase2: {
      at: 0.5, pattern: ['stampede', 'gore', 'brand', 'gore', 'bellow'],
      text: 'The Steer tears off the rest of Silas Pike like a coat. Something underneath is still hungry.',
      wrath: 1,
    },
  },

  // Chapter 2 ---------------------------------------------------------------
  measurer: {
    name: 'The Measurer', hp: [58, 62], art: 'coffin',
    moves: {
      measure: { n: 'Take Your Measure', exposed: 2, block: 6 },
      bury:    { n: 'Six Feet Under', atk: 14 },
      nail:    { n: 'Nail the Lid', atk: 6, hits: 2 },
    },
    pattern: ['measure', 'bury', 'nail'],
  },
  card_devil: {
    name: 'Jack of Pyres', hp: [52, 56], art: 'card',
    moves: {
      deal:  { n: 'Deal You In', atk: 7, curse: { id: 'bad_hand', n: 2 } },
      flush: { n: 'Royal Flush', atk: 4, hits: 3 },
      ante:  { n: 'Raise the Ante', block: 10, wrath: 2 },
    },
    pattern: ['deal', 'flush', 'ante'],
  },
  chalk_wraith: {
    name: 'The Chalk Wraith', hp: [50, 54], art: 'veil',
    moves: {
      lesson: { n: 'A Lesson', atk: 6, shaken: 2 },
      ruler:  { n: 'The Ruler', atk: 13 },
      recite: { n: 'Recite', heal: 8, block: 8 },
    },
    pattern: ['lesson', 'ruler', 'recite', 'ruler'],
  },
  jackal: {
    name: 'Grinning Jackal', hp: [30, 33], art: 'hound',
    moves: {
      laugh: { n: 'Laugh', wrath: 1, block: 5 },
      maul:  { n: 'Maul', atk: 9 },
      nip:   { n: 'Nip', atk: 4, hits: 2 },
    },
    pattern: ['maul', 'nip', 'laugh'], start: 'random',
  },
  mother_tallow: {
    name: 'Mother Tallow', hp: [108, 112], art: 'candle', elite: true,
    moves: {
      wick: { n: 'Light the Wick', burn: 6, block: 8 },
      melt: { n: 'Melt', atk: 18 },
      drip: { n: 'Drip', atk: 6, hits: 2, exposed: 1 },
    },
    pattern: ['wick', 'melt', 'drip'],
  },
  spiderling: {
    name: 'Spiderling', hp: [12, 14], art: 'spider', minion: true,
    moves: { bite: { n: 'Bite', atk: 5 }, skitter: { n: 'Skitter', block: 4, atk: 3 } },
    pattern: ['bite', 'skitter'], start: 'random',
  },
  silk_widow: {
    name: 'The Silk Widow', hp: [125, 125], art: 'widow', boss: true,
    moves: {
      web:   { n: 'Silken Embrace', atk: 6, shaken: 2, exposed: 1 },
      kiss:  { n: 'Poisoned Kiss', atk: 12, heal: 6 },
      brood: { n: 'Brood', summon: { id: 'spiderling', n: 1 }, block: 8 },
      lash:  { n: 'Eight-Legged Waltz', atk: 3, hits: 4 },
    },
    pattern: ['brood', 'web', 'kiss', 'lash', 'kiss'],
    phase2: {
      at: 0.5, pattern: ['lash', 'brood', 'kiss', 'web', 'kiss'],
      text: "Madame Odile's gown splits down the back. There were never any legs under it. Only more legs.",
      wrath: 2,
    },
  },

  // Chapter 3 ---------------------------------------------------------------
  hanging_judge: {
    name: 'The Hanging Judge', hp: [82, 86], art: 'noose',
    moves: {
      sentence: { n: 'Sentence', atk: 19 },
      gavel:    { n: 'Gavel', atk: 6, hits: 3 },
      recess:   { n: 'Recess', block: 15, wrath: 2 },
    },
    pattern: ['gavel', 'sentence', 'recess'],
  },
  false_shepherd: {
    name: 'The False Shepherd', hp: [70, 74], art: 'crook',
    moves: {
      flock:  { n: 'Gather the Flock', summon: { id: 'lamb', n: 1 }, block: 8 },
      sermon: { n: 'Hellfire Sermon', shaken: 2, exposed: 1, burn: 3 },
      crook:  { n: 'Crook', atk: 15 },
    },
    pattern: ['flock', 'sermon', 'crook', 'crook'],
  },
  lamb: {
    name: 'Black Lamb', hp: [16, 18], art: 'lamb', minion: true,
    moves: { butt: { n: 'Butt', atk: 6 }, bleat: { n: 'Bleat', block: 6, wrath: 1 } },
    pattern: ['butt', 'bleat'], start: 'random',
  },
  iron_horror: {
    name: 'The Iron Horror', hp: [96, 100], art: 'train',
    moves: {
      stoke: { n: 'Stoke the Boiler', wrath: 3, burn: 3 },
      rails: { n: 'Off the Rails', atk: 22 },
      steam: { n: 'Blow Steam', atk: 8, block: 12 },
    },
    pattern: ['steam', 'stoke', 'rails'],
  },
  crow: {
    name: 'Crow Brother', hp: [40, 44], art: 'crow',
    moves: {
      peck: { n: 'Peck', atk: 5, hits: 2 },
      eye:  { n: 'Take an Eye', atk: 4, exposed: 1 },
      dive: { n: 'Dive', atk: 11 },
    },
    pattern: ['peck', 'eye', 'dive'], start: 'random',
  },
  brimstone_marshal: {
    name: 'The Brimstone Marshal', hp: [140, 146], art: 'hat', elite: true,
    moves: {
      warrant: { n: 'Serve the Warrant', atk: 8, exposed: 2 },
      six:     { n: 'Six-Gun Salvo', atk: 4, hits: 6 },
      deputize:{ n: 'Deputize', wrath: 3, block: 14 },
    },
    pattern: ['warrant', 'six', 'deputize'],
  },
  grey_gentleman: {
    name: 'The Gentleman in Grey', hp: [180, 180], art: 'grey', boss: true,
    moves: {
      tip:     { n: 'Tips His Hat', block: 16, wrath: 1 },
      debts:   { n: 'Collect on Debts', atk: 18 },
      whisper: { n: 'Whispers Her Name', curse: { id: 'grief', n: 2 }, shaken: 2 },
      due:     { n: "Gunslinger's Due", atk: 6, hits: 3 },
      coach:   { n: 'Hellfire Coach', atk: 8, burn: 4 },
    },
    pattern: ['tip', 'due', 'whisper', 'debts', 'coach'],
    phase2: {
      at: 0.5, pattern: ['debts', 'coach', 'due', 'whisper', 'debts', 'tip'],
      text: 'He removes his hat. There is no face under the brim, only the night you came home too late.',
      wrath: 2,
    },
  },
};

// ---------------------------------------------------------------------------
// ENCOUNTERS — what a demon looks like in town (guise) and who you fight.
// ---------------------------------------------------------------------------
const ENCOUNTERS = {
  1: {
    normal: [
      { foes: ['razorjaw'], role: 'barber', tells: ['Keeps stropping a razor that is already sharp.', 'Hair on the floor of his shop is still moving.'] },
      { foes: ['mourner'], role: 'widow in black', g: 'f', tells: ['Mourns a husband nobody in town remembers.', 'Her veil breathes when she does not.'] },
      { foes: ['hollow_deputy'], role: 'deputy', tells: ['Wears a star with no name on it.', 'Stands too still. Like a scarecrow with a gun.'] },
      { foes: ['cinder_hound', 'cinder_hound'], role: 'stable hand', tells: ['The horses have kicked their stalls to splinters.', 'Two dogs follow him. Their eyes glow like cigar ends.'] },
    ],
    elite: { foes: ['skinless_rider'], name: 'The Skinless Rider', bounty: 'Rode through Dry Hollow at midnight. Left eleven dead, and every one of them smiling.' },
    boss: {
      foes: ['hollow_steer'], guise: 'Silas Pike, Cattle Baron', kin: 'amos', reward: 'amos_harmonica',
      before: 'Silas Pike owns every cow and most of the men in Dry Hollow. Two years back, your brother Amos found out what Pike fed his herd. They found Amos in the stockyard. What was left of him.',
      taunt: '"Your brother came poking round my herd," says Silas Pike, and his jaw swings open like a gate. "Herd was hungry."',
      last: '"He keeps a ledger, Crane," the Steer gurgles as it burns. "Your name is on every page."',
      after: 'The Steer comes apart into smoke and flies. In the ash you find a battered harmonica. Amos played it badly, and all the time. You wipe the mouthpiece clean.',
    },
  },
  2: {
    normal: [
      { foes: ['measurer'], role: 'undertaker', tells: ['Had a coffin built for you before you rode in.', 'His measuring tape is made of hair.'] },
      { foes: ['card_devil'], role: 'faro dealer', tells: ['Has never lost a hand. Not once.', 'The cards in his deck are all the same card.'] },
      { foes: ['chalk_wraith'], role: 'schoolmarm', g: 'f', tells: ['The children recite lessons in a language that makes your teeth hurt.', 'Her chalk writes by itself.'] },
      { foes: ['jackal', 'jackal'], role: 'pair of drifters', tells: ['Two brothers who laugh at the same moment, every time.', 'They have been "just passing through" for six years.'] },
    ],
    elite: { foes: ['mother_tallow'], name: 'Mother Tallow', bounty: 'Candle-maker. Sells tapers that burn with no smoke and no light. Folks who buy them stop waking up.' },
    boss: {
      foes: ['silk_widow'], guise: 'Madame Odile of the Gilded Lily', kin: 'ruth', reward: 'ruths_rosary',
      before: 'Your sister Ruth sang at the Gilded Lily in Coldwater. She wrote home every Sunday. Then the letters stopped. When you came looking, Madame Odile smiled and said Ruth had simply gone away.',
      taunt: '"She sang so sweetly for me," says Madame Odile. "Your Ruth. Stay a while, Marshal. I will teach you the words."',
      last: '"Ask him about the Butcher," the Widow hisses. "Ask him why the killing stopped." Then she comes apart.',
      after: 'The Widow shrieks and unravels, thread by thread. Tangled in the silk you find Ruth\'s rosary, every bead still warm. You say one prayer. You are out of practice.',
    },
  },
  3: {
    normal: [
      { foes: ['hanging_judge'], role: 'circuit judge', tells: ['Has hanged thirty men this year. Never held a trial.', 'His gavel is wet.'] },
      { foes: ['false_shepherd'], role: 'traveling missionary', tells: ['His congregation never blinks during the sermon.', 'The cross on his chapel hangs upside down when nobody looks.'] },
      { foes: ['iron_horror'], role: 'railroad surveyor', tells: ['Lays track that leads nowhere.', 'Smells of coal smoke and cooked meat.'] },
      { foes: ['crow', 'crow', 'crow'], role: 'three sisters', g: 'f', tells: ['Three old women who finish each other\'s sentences.', 'Birds fall silent when they pass.'] },
    ],
    elite: { foes: ['brimstone_marshal'], name: 'The Brimstone Marshal', bounty: 'Wears a star just like the one you used to. Serves warrants for the other side.' },
    boss: {
      foes: ['grey_gentleman'], guise: 'The Gentleman in Grey', kin: 'clara', reward: null,
      before: 'You were out chasing a horse thief the night he came to your door. Clara let him in because he was polite. He always is. He is waiting for you at the end of the line, in Babel Mesa, in a grey suit that never gets dusty.',
      taunt: '"Marshal. You look tired." He does not get up. "Six years ago you needed a killer, and I gave you one. Eli Wheeler swung, the killings stopped, and you slept like a baby. Did you never wonder why they stopped?" He smiles. "Three souls for one. I call that a bargain."',
      last: '',
      after: 'The Gentleman folds into himself like a letter and burns. The Between shudders, and for a moment you see Clara on the porch of your old house, shading her eyes against the sun. Then the world is just the world again.',
    },
  },
};

const CHAPTERS = {
  1: { title: 'Chapter I — Dry Hollow', towns: ['Dry Hollow', 'Gallows Creek', 'Tumbleweed Flats', 'Rattler\'s Rest', 'Saint Ember'], kin: 'amos' },
  2: { title: 'Chapter II — Coldwater', towns: ['Coldwater', 'Perdition Wells', 'Widow\'s Gulch', 'Lantern Ridge', 'Bitter Spring'], kin: 'ruth' },
  3: { title: 'Chapter III — Babel Mesa', towns: ['Babel Mesa', 'Last Chance', 'Brimstone Junction', 'Hollow Pine', 'Judgment Flats'], kin: 'clara' },
};

// ---------------------------------------------------------------------------
// TOWNSFOLK
// ---------------------------------------------------------------------------
const FOLK = {
  first: {
    m: ['Ezra', 'Obadiah', 'Clem', 'Virgil', 'Rufus', 'Cyrus', 'Luther', 'Jasper', 'Boone', 'Silas', 'Gideon', 'Wendell'],
    f: ['Hattie', 'Josephine', 'Mabel', 'Opal', 'Delia', 'Willa', 'Etta', 'Pearl', 'Nell', 'Ida', 'Martha', 'Lottie'],
  },
  last: ['Tate', 'McCready', 'Lowell', 'Pruitt', 'Hatch', 'Crowley', 'Doyle', 'Beckett', 'Sayer', 'Whitlock', 'Garrity', 'Fenn', 'Mercer', 'Colby', 'Vance', 'Holloway', 'Pike', 'Ashby'],
  // Painted portraits (art/<img>.webp) and the jobs each one plausibly holds.
  portraits: [
    { img: 'folk_0', g: 'm', roles: ['blacksmith', 'farrier', 'gunsmith'] },
    { img: 'folk_1', g: 'f', roles: ['saloon singer', 'barkeep', 'cook'] },
    { img: 'folk_2', g: 'm', roles: ['prospector', 'stagecoach driver', 'mule skinner'] },
    { img: 'folk_3', g: 'f', roles: ['laundress', 'sheriff\'s widow', 'seamstress'] },
    { img: 'folk_4', g: 'm', roles: ['shopkeeper', 'telegraph operator', 'bank clerk'] },
    { img: 'folk_5', g: 'f', roles: ['rancher', 'horse breaker', 'homesteader'] },
  ],
  mundane: [
    'Counts his coins twice. Then a third time.',
    'Hums a hymn, badly.',
    'Stares at the place on your coat where the star used to hang.',
    'Smells of whiskey and horse.',
    'Hands shake. Too much rye, or too little.',
    'Has a fresh cut on one palm. Says it was the wash-line.',
    'Wears Sunday best on a Tuesday.',
    'Asks if you have eaten. Means it.',
    'Keeps a child\'s drawing folded in a vest pocket.',
    'Chews tobacco and spits with real precision.',
    'Coughs something wet into a handkerchief.',
    'Complains about the price of flour for a full minute.',
    'Has a dog that loves everybody, including you.',
    'Sunburned something awful.',
    'Offers you a cigarette, then a second one for later.',
  ],
  ambiguous: [
    'Won\'t meet your eye.',
    'Flinches when the church bell rings.',
    'Laughs too loud at nothing.',
    'Asks too many questions about where you\'re headed.',
    'Keeps one hand under the table.',
    'Arrived in town the same week as the first disappearance.',
  ],
  demonic: [
    'The flies won\'t land on them.',
    'Their shadow lags a half-second behind.',
    'Doesn\'t blink. You counted.',
    'The dog on the porch won\'t stop growling.',
    'Smiles with too many teeth. Then fewer.',
    'Doesn\'t sweat. Not one drop, at high noon.',
    'Knows your name. You never gave it.',
    'Their reflection in the window is a half-beat late.',
    'Smells faintly of struck matches.',
    'The milk soured when they walked past the general store.',
  ],
};

// ---------------------------------------------------------------------------
// TRAIL EVENTS
// Each option: { label, req?(run), run(run, api) -> string (result text) }
// api exposes: gainCard, addCurse, removeCardPrompt, gainKeepsake, rand
// ---------------------------------------------------------------------------
const EVENTS = [
  {
    id: 'hanged_man',
    title: 'The Hanging Tree',
    text: 'A cottonwood by the creek. A man hangs from it, boots twitching. Still alive. Somebody wrote LIAR on a board and nailed it to the trunk.',
    options: [
      {
        label: 'Look through the Veil first. (1 Sight)', req: r => r.sight > 0,
        run: (r, api) => { r.sight--; api.gainCard('steady_hand'); r.gold += 25; return 'Human. Just a man who told the wrong truth to the wrong people. You cut him down. He presses 25 gold and his lucky playing card into your hand. (Gain 25 gold and Steady Hand.)'; },
      },
      {
        label: 'Cut him down.',
        run: (r, api) => {
          if (api.rand() < 0.5) { r.gold += 25; return 'He gasps, weeps, thanks you. Presses 25 gold into your hand and runs.'; }
          r.hp = Math.max(1, r.hp - 10); return 'The moment his feet touch dirt he is on you, teeth first. You put him down, but not before he takes a piece of your arm. (Lose 10 HP.)';
        },
      },
      { label: 'Ride on. Not your business anymore.', run: () => 'His boots stop twitching before you reach the ridge.' },
    ],
  },
  {
    id: 'chapel',
    title: 'Abandoned Chapel',
    text: 'Adobe walls, no roof. Somebody still lights candles at the altar. There is a silver collection plate, and it is full.',
    options: [
      { label: 'Kneel and pray. (Heal 18 HP)', run: r => { r.hp = Math.min(r.maxHp, r.hp + 18); return 'You don\'t remember the words, so you just talk to Clara instead. You feel lighter.'; } },
      { label: 'Melt down the silver. (Gain Silver Bullet, lose 5 max HP)', run: (r, api) => { r.maxHp -= 5; r.hp = Math.min(r.hp, r.maxHp); api.gainCard('silver_bullet'); return 'You cast six bullets over the candles. The flames lean away from you the whole time.'; } },
      { label: 'Leave it be.', run: () => 'You tip your hat to the altar and go.' },
    ],
  },
  {
    id: 'clara_dream',
    title: 'Campfire Dream',
    text: 'You doze by the fire and Clara is sitting across from you, mending your shirt like she used to. "Jonah," she says. "You could stop. You could just stop."',
    options: [
      { label: '"Not till it\'s done." (Gain Say Her Name)', run: (r, api) => { api.gainCard('say_her_name'); return 'She sighs the way she always did when you were being stubborn. When you wake, the fire has burned down to her initials.'; } },
      { label: 'Sit with her a while. (Heal 20 HP, restore Sight)', run: r => { r.hp = Math.min(r.maxHp, r.hp + 20); r.sight = r.maxSight; return 'You talk till dawn about nothing at all. It is the best night\'s sleep you have had in two years.'; } },
    ],
  },
  {
    id: 'snake_oil',
    title: 'Doctor Pettibone\'s Miracle Tonic',
    text: 'A painted wagon. A man in a stovepipe hat. "Cures grief, gout, and gunshot! Just 30 dollars, friend."',
    options: [
      {
        label: 'Buy a bottle and drink it. (30 gold)', req: r => r.gold >= 30,
        run: (r, api) => {
          r.gold -= 30;
          if (api.rand() < 0.6) { r.maxHp += 8; r.hp += 8; return 'Tastes like turpentine and licorice. Your scars stop aching. (+8 max HP)'; }
          r.hp = Math.max(1, r.hp - 8); return 'You spend the afternoon behind a rock. (Lose 8 HP)';
        },
      },
      {
        label: 'Look through the Veil at him. (1 Sight)', req: r => r.sight > 0,
        run: (r, api) => { r.sight--; api.gainCard('whiskey'); r.gold += 20; return 'Just a con man. Human as they come. You tell him what you saw, and he turns pale and pays you 20 dollars and a bottle of the real stuff to keep quiet. (Gain 20 gold and Rotgut Whiskey.)'; },
      },
      { label: 'Keep riding.', run: () => '"Your loss, friend!"' },
    ],
  },
  {
    id: 'crossroads',
    title: 'The Crossroads',
    text: 'Four roads meet in the dark. A man in a black coat sits on a fence rail, whittling. "Evening, Marshal. I could make your road a lot shorter. Everything costs, of course."',
    options: [
      { label: 'Offer blood. (Lose 10 max HP, gain a keepsake)', req: r => r.maxHp > 30, run: (r, api) => { r.maxHp -= 10; r.hp = Math.min(r.hp, r.maxHp); const k = api.gainKeepsake(); return `He nicks your thumb with the whittling knife and hands you something wrapped in cloth: ${k ? KEEPSAKES[k].name : 'nothing, and he laughs'}.`; } },
      { label: 'Offer a memory. (Remove a card from your deck)', run: (r, api) => { api.removeCardPrompt(); return 'He takes it. You can\'t quite recall what it was. That\'s the point.'; } },
      { label: 'Draw on him.', run: (r, api) => { api.addCurse('grief'); r.gold += 50; return 'He is gone before you clear leather. Only a sack of 50 gold on the fence rail and a sound like a woman crying. (Gain 50 gold and a Grief.)'; } },
      { label: 'Tip your hat and take the long way.', run: () => '"Suit yourself, Marshal. I\'ll see you at the end."' },
    ],
  },
  {
    id: 'homestead',
    title: 'Burned Homestead',
    text: 'A cabin burned to the stone chimney. A little girl is hiding in the root cellar. She says the man who did it had "a face like a candle."',
    options: [
      { label: 'Take her to the next town. (Gain Pierce the Veil)', run: (r, api) => { api.gainCard('pierce_veil'); return 'She rides in front of you the whole way. At the church she gives you a charm made from a bird skull. "So you can see them," she says. She can see them too.'; } },
      { label: 'Give her your rations and gold. (Lose 30 gold, +1 max Sight)', req: r => r.gold >= 30, run: r => { r.gold -= 30; r.maxSight += 1; r.sight += 1; return 'You tell her where the church is. Later that night, the veil feels thinner, as if someone is praying for you.'; } },
    ],
  },
  {
    id: 'gunsmith',
    title: 'A Traveling Gunsmith',
    text: 'An old Chinese gunsmith named Wen has a workbench set up on the back of his cart. "That iron of yours has seen things," he says. "Let me look."',
    options: [
      { label: 'Let him work on it. (Upgrade a card)', run: (r, api) => { api.upgradeCardPrompt(); return 'He hands it back without a word. It sits in your hand like it grew there.'; } },
      { label: 'Buy a box of special rounds. (40 gold, gain Hellfire Round)', req: r => r.gold >= 40, run: (r, api) => { r.gold -= 40; api.gainCard('hellfire_round'); return 'The cartridges are warm to the touch and smell like Sunday.'; } },
      { label: 'Nod and move along.', run: () => 'Wen nods back.' },
    ],
  },
];

const STORY = {
  intro: [
    'They called you Marshal once. Marshal Jonah Crane, of Cinder County.',
    'Then came the week of three funerals. Your brother Amos, trampled in a stockyard. Your sister Ruth, gone from a saloon in Coldwater. And Clara, your wife, in your own house, while you were out chasing a horse thief.',
    'At the last graveside something in you tore open, and you saw them: the demons that walk the frontier in borrowed skins. Barbers. Bankers. Preachers. You can see through the Veil now. Nobody else can.',
    'You left your star on Clara\'s headstone. Now you hunt.',
    'You do not think about the hanging. You have gotten very good at not thinking about the hanging.',
  ],
  between: 'When you draw iron on a demon, the world slips into the Between: the same street, the same sky, only wrong. Out there they cannot hide their faces. Neither can you.',
  death: 'Another nameless grave on the prairie. The demons of the frontier sleep a little easier tonight.',
};

// ---------------------------------------------------------------------------
// THE LONGER STORY
// Six years ago the Cinder County Butcher was killing children and Marshal
// Crane could not catch him. A polite stranger in grey gave him a name, Eli
// Wheeler, and Jonah hanged Eli without a trial. The killings stopped, because
// the stranger was the Butcher. "Consider it a favor. I'll collect someday."
// Amos, Ruth and Clara were the collection. Jonah learns this a piece at a time.
// ---------------------------------------------------------------------------
const CHAPTER_INTROS = {
  1: {
    letter: {
      from: 'Amos Crane',
      text: "Jonah. Pike's herd don't graze and they don't drink. Last night I seen one of them steers eat a dog, bones and all, and then look at me like it knew my name. Pike gets a visitor on Sundays, a gent in a grey suit who never takes off his hat. Don't laugh. I know you'll laugh. A.",
    },
    paras: [
      'Amos wrote that a week before they found him. You laughed when you read it. You have not laughed since.',
      'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike.',
    ],
  },
  2: {
    letter: {
      from: 'Ruth Crane',
      text: 'Dear Jonah, Coldwater is cold, like the name. Madame Odile says I have the finest voice she has heard in forty years, which is strange, because she does not look forty. A gentleman in grey comes to hear me sing every Saturday. He asked after you. He says you and he have business. Write back. Your loving sister, Ruth.',
    },
    paras: [
      'That was her last letter. It came three days after you buried Amos.',
      'Coldwater sits at the bottom of a canyon where the sun comes up late and leaves early.',
    ],
  },
  3: {
    letter: {
      from: 'unsigned',
      text: 'Marshal Crane. You have been busy, and I do admire industry. Come to Babel Mesa and we shall settle our accounts like gentlemen. You will remember the terms, I trust. Cordially, G.',
    },
    paras: [
      "You found this card on Clara's headstone, weighed down with your own tin star.",
      'He talks about terms as if you shook on something. You would remember that. Wouldn\'t you?',
    ],
  },
};

// One story encounter per chapter, offered on the trail at step 2.
const STORY_EVENTS = {
  1: {
    id: 'stockyard_boy',
    title: 'The Stockyard Boy',
    kin: 'amos',
    text: "A boy of maybe twelve sits whittling on the stockyard fence where Amos died. \"You're his brother,\" he says without looking up. \"He talked about you. Said you was the best lawman in the territory. Before.\" \"Before what?\" \"Before the hanging. That's what he always said. Before the hanging.\"",
    options: [
      {
        label: 'Ask him about the man in grey.',
        run: (r, api) => {
          r.addJournal('The Grey Visitor', 'The stockyard boy says the man in grey came the night before Amos died. He shook Pike\'s hand, and Pike\'s hand came away black. Then he asked the boy whether he knew a Marshal Jonah Crane. "Tell him I\'m keeping the ledger," he said.');
          api.gainCard('dead_eye');
          return '"Said to tell you he\'s keeping the ledger," the boy says. "Whatever that means." He hands you a rifle cartridge Amos gave him. It is heavier than it should be. (Gain Dead Eye.)';
        },
      },
      {
        label: 'Ask him what hanging he means.',
        run: (r, api) => {
          r.flags.remembered = true;
          r.addJournal('Before the Hanging', '"Some drifter," the boy said. "Eli something. Amos said you hanged him and it weren\'t right, and you ain\'t been right since." You told him he didn\'t know what he was talking about. Your hands were shaking.');
          api.gainCard('grim_resolve');
          return '"Some drifter. Eli something," the boy says. "Amos said it weren\'t right." You tell him he doesn\'t know what he\'s talking about. Your hands are shaking. (Gain Grim Resolve.)';
        },
      },
      {
        label: 'Give him the money Amos would have. (25 gold)',
        req: r => r.gold >= 25,
        run: (r, api) => {
          r.gold -= 25;
          r.addJournal("Amos's Boy", 'You gave the stockyard boy twenty-five dollars. He gave you Amos\'s pocketknife, the one with the elk-horn handle that you gave Amos for his sixteenth birthday.');
          api.gainCard('bowie_knife', true);
          return 'He pockets the money and hands you a knife with an elk-horn handle. You gave it to Amos for his sixteenth birthday. (Gain an upgraded Bowie Knife.)';
        },
      },
    ],
  },
  2: {
    id: 'sister_agnes',
    title: 'Sister Agnes',
    kin: 'ruth',
    text: "Coldwater's chapel is small and cold. When you give your name, Sister Agnes lights a candle for Ruth. \"She came to me a week before,\" the nun says. \"Frightened. She said the man in grey told her that her brother owed him a debt, and that debts pass down to family. She asked me what you could possibly owe a man like that.\" She waits. \"What do you owe him, Marshal?\"",
    options: [
      {
        label: 'Tell her the truth about Eli Wheeler.',
        run: (r, api) => {
          r.flags.confessed = true;
          r.addJournal('Confession', 'Six years ago the Cinder County Butcher was killing children, and you could not catch him. A polite man in a grey suit bought you a drink and gave you a name: Eli Wheeler, a drifter. You hanged Eli Wheeler on that man\'s word, without a trial. The killings stopped. "Consider it a favor," the man said. "I\'ll collect someday."');
          r.hp = Math.min(r.maxHp, r.hp + 15);
          api.gainCard('last_rites');
          return 'You tell her everything: the Butcher, the man in grey, Eli Wheeler, the rope. You have never said it out loud before. When you finish, the candle has burned halfway down. Sister Agnes presses a blessed cartridge into your hand. "Finish it," she says. (Heal 15. Gain Last Rites.)';
        },
      },
      {
        label: '"I don\'t owe him a thing."',
        run: (r, api) => {
          r.addJournal('Denial', 'You left the chapel before the candle burned down. Sister Agnes called after you: "The ones who will not remember their debts are the ones who pay the most."');
          api.gainCard('blood_oath');
          return 'You leave before the candle burns down. "The ones who will not remember their debts," she calls after you, "are the ones who pay the most." (Gain Blood Oath.)';
        },
      },
    ],
  },
  3: {
    id: 'widow_wheeler',
    title: 'The Widow Wheeler',
    kin: 'clara',
    text: "At the foot of Babel Mesa stands the oldest cottonwood in the territory. A woman in black sits beneath it. You know the tree. You know the woman. You threw the rope over that branch yourself. \"Marshal Crane,\" says Martha Wheeler. \"He told me you'd come. The man in grey. He visits sometimes, to tell me how sorry he is about Eli. He laughs when he says it.\" She studies you. \"Eli never hurt a soul. You know that now, don't you?\"",
    options: [
      {
        label: 'Get down on your knees and ask her forgiveness.',
        run: r => {
          r.flags.forgiven = true;
          r.addJournal('Martha Wheeler', '"I can\'t forgive you," Martha Wheeler said. "Not yet. But I can pray you finish it." She tied a strip of black cloth around your arm. For Eli.');
          r.hp = r.maxHp;
          return '"I can\'t forgive you," she says at last. "Not yet. But I can pray you finish it." She ties a strip of black cloth around your arm. For Eli. (Health fully restored.)';
        },
      },
      {
        label: '"I\'ll make him pay for Eli too."',
        run: (r, api) => {
          r.flags.vow = true;
          r.addJournal('A Fourth Name', 'You added a fourth name to the three you carry: Eli Wheeler. Martha said nothing. When you rode up the mesa she was still watching you.');
          api.gainCard('judgment', true);
          return 'You add a fourth name to the three you carry. Martha says nothing. When you ride away she is still watching. (Gain an upgraded Judgment.)';
        },
      },
      {
        label: 'Say nothing. Ride on.',
        run: r => {
          r.addJournal('Silence', 'You rode past Martha Wheeler without a word. You felt her eyes on your back all the way up the mesa.');
          r.gold += 40;
          return 'You ride on. You feel her eyes on your back all the way up the mesa. Later you find forty dollars in your saddlebag that you do not remember putting there. (Gain 40 gold.)';
        },
      },
    ],
  },
};

const FINALE = {
  text: [
    'The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is no face, only a ledger bound in black leather where a heart should be, its pages full of names. He is still smiling.',
    '"Well played, Marshal. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes for the rest of your life. Or pick up the hat, and the ledger, and you will never lose anyone again."',
  ],
  options: [
    { id: 'hunter', label: 'Put him down. Keep hunting.' },
    { id: 'rest', label: 'Burn the ledger.', req: r => r.flags.confessed || r.flags.forgiven, locked: 'You would have to face what you did first.' },
    { id: 'collector', label: 'Pick up the hat.' },
  ],
};

const ENDINGS = {
  hunter: {
    title: 'The Hunter',
    text: [
      'You put two rounds through the ledger. The Gentleman sighs like a man settling into a warm bath, and is gone.',
      "You ride back to Cinder County. The star is still on Clara's headstone, dull with two years of dust. You leave it there.",
      'The Veil stays open. You can still see them, the ones hiding in borrowed skins. You always will.',
      'You check your iron. Six rounds. You ride on.',
    ],
  },
  rest: {
    title: 'Rest',
    text: [
      "You tear the ledger out of him and feed it to the black sun, one page at a time. Amos. Ruth. Clara. Then a fourth name: Eli Wheeler. Then a fifth. Your own.",
      'The Between comes apart like wet paper.',
      "You wake at dawn on Clara's grave. The Sight is gone. The world is only the world, and it is very quiet.",
      'You ride to Babel Mesa and dig Eli Wheeler a proper grave beneath the cottonwood. Martha Wheeler brings wildflowers. Neither of you says anything. It is enough.',
    ],
  },
  collector: {
    title: 'The Gentleman in Grey',
    text: [
      'You pick up the grey hat. It fits. Of course it fits.',
      'The ledger is warm in your hands. Your own name is on the first page, in your own handwriting.',
      'The suit never gets dusty. You never get tired.',
      'Somewhere in the territory a desperate lawman is hunting a killer he cannot catch. You straighten your tie and go to buy him a drink.',
    ],
  },
};

// Remembered at the campfire, one per night.
const MEMORIES = [
  'Amos teaching you to throw a lasso when you were seven. You caught him instead of the fence post. He laughed until he fell over.',
  'Ruth singing "Shall We Gather at the River" at your wedding, and every dog in town howling along.',
  'Clara pressing her cold feet against you in January and pretending she had not.',
  'The smell of Clara\'s bread, and the burn on her wrist from the oven door that never quite healed.',
  "Amos's harmonica at the Fourth of July picnic. He knew two songs and played them both wrong.",
  'Ruth, twelve years old, beating you at checkers and refusing to let you forget it for a decade.',
  'The night you made marshal, and Clara pinning the star on crooked and saying it suited you better that way.',
  'Eli Wheeler\'s boots turning slowly in the wind. You try to think about something else. You cannot.',
  "Clara's last words to you: \"Mind that horse thief. He's faster than he looks.\" You laughed. You were out chasing him when it happened.",
];

// Said by townsfolk after you send their demon back.
const THANKS = [
  '"Obliged, mister," says the barkeep, and pours you one on the house.',
  "A little girl hands you a wildflower. Her mother pulls her away, but she's smiling.",
  'Nobody thanks you. Nobody saw what you saw. That is all right.',
  'The preacher rings the church bell. First time in a month, somebody says.',
  'An old man shakes your hand and will not let go. "I knew something was wrong with that one," he says. "I knew it."',
  '"You\'re the one hunting them," a woman whispers. "God keep you, Marshal."',
];

// Make available to Node (tests) as well as the browser.
if (typeof module !== 'undefined') {
  module.exports = { HERO, FAMILY, STATUS, CARDS, STARTER_DECK, KEEPSAKES, KEEPSAKE_POOL, ENEMIES, ENCOUNTERS, CHAPTERS, FOLK, EVENTS, STORY, CHAPTER_INTROS, STORY_EVENTS, FINALE, ENDINGS, MEMORIES, THANKS };
}
