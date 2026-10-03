'use strict';
// ---------------------------------------------------------------------------
// SLINGER — game data: hunters, keepsakes, demons, encounters, townsfolk,
// and the rules for each mode. Cards are in cards.js, the story in story.js.
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
  ward:    { name: 'Warded',  good: true,  desc: 'Hits that are not Silver or Blessed rounds deal half damage. Each Silver or Blessed hit, and each Hellfire tick, strips 1 Ward.' },
};

// Cards and rounds live in cards.js; the story in story.js.
if (typeof module !== 'undefined') Object.assign(globalThis, require('./cards.js'));

// ---------------------------------------------------------------------------
// TONICS — one-use items carried in a satchel and used in a fight.
// ---------------------------------------------------------------------------
const TONIC_SLOTS = 3;
const TONICS = {
  miracle:    { name: "Pettibone's Miracle Tonic", desc: 'Heal 12 HP.', price: 25, use: c => c.heal(12) },
  laudanum:   { name: 'Laudanum', desc: 'Gain 10 Cover and shake off Shaken.', price: 25, use: c => { c.cover(10); delete c.p.st.shaken; } },
  dynamite:   { name: 'Dynamite', desc: 'Deal 12 damage to ALL foes.', price: 35, sfx: 'boom', use: c => c.alive().forEach(e => c.damage(c.p, e, 12)) },
  peyote:     { name: 'Peyote Tea', desc: 'See every hidden intent this fight. Draw 2.', price: 20, sfx: 'sight', use: c => { c.unveiled = true; c.draw(2); } },
  holy_vial:  { name: 'Vial of Holy Water', desc: 'Apply 5 Hellfire to ALL foes.', price: 30, sfx: 'hex', use: c => c.applyAll('burn', 5) },
  coffee:     { name: 'Trail Coffee', desc: 'Gain 2 Grit.', price: 20, sfx: 'buff', use: c => c.gainGrit(2) },
  venom:      { name: 'Rattlesnake Venom', desc: 'Apply 2 Exposed to ALL foes. (Exposing a demon frees its hostage.)', price: 25, sfx: 'hex', use: c => c.applyAll('exposed', 2) },
  silver_box: { name: 'Box of Silver', desc: 'Load Silver into every chamber.', price: 35, sfx: 'reload', use: c => c.loadRound('silver', c.p.maxRounds) },
};

// ---------------------------------------------------------------------------
// INFAMY — what the territory thinks of you. Wrong accusations and running
// from towns raise it; clean work and honesty lower it.
// ---------------------------------------------------------------------------
const INFAMY = {
  max: 10,
  label: n => n >= 7 ? 'Hunted' : n >= 4 ? 'Wanted' : n >= 1 ? 'Talked About' : 'Unknown',
  desc: n => [
    'How the territory sees you.',
    n >= 1 ? `Trading post prices are up ${Math.round(n * 6)}%.` : '',
    n >= 4 ? 'Townsfolk clam up: one fewer question in every town.' : '',
    n >= 7 ? 'Two fewer questions. Posses ride out after you.' : n >= 3 ? 'Posses may ride out after you.' : '',
    'Wrong accusations add 3, riding out of a town without choosing adds 1. Clean detective work takes 1 away.',
  ].filter(Boolean).join(' '),
};

const POSSE_EVENT = {
  id: 'posse',
  title: 'The Posse',
  text: 'Eight riders block the road, rifles across their saddles. The sheriff has a poster with your face on it, badly drawn. "That\'s him. The one who goes around shooting decent folk and calling them devils."',
  options: [
    { label: r => `Pay the fine. (${20 + 10 * r.infamy} gold, less Infamy)`, req: r => r.gold >= 20 + 10 * r.infamy,
      run: r => { r.gold -= 20 + 10 * r.infamy; r.addInfamy(-2); return 'The sheriff counts it twice and waves you through. "Don\'t come back."'; } },
    { label: 'Look through the Veil at the sheriff. (1 Sight)', req: r => r.sight > 0,
      run: r => { r.sight--; r.addInfamy(-1); return 'There is something small and black sitting on the sheriff\'s shoulder, whispering in his ear. You shoot it off him. The posse stares at the hole in the air, then at you, and rides home very quietly.'; } },
    { label: 'Hand over your special rounds.', req: r => r.belt.some(x => x !== 'lead'),
      run: r => { r.belt = r.belt.map(() => 'lead'); r.addInfamy(-1); return 'They take every round that isn\'t plain lead, "as evidence." (Your gun belt is all Lead now.)'; } },
    { label: 'Draw on them.', run: r => { r.hp = Math.max(1, r.hp - 12); r.addInfamy(1); return 'You shoot the hats off three of them and ride through the gap. One of them clips you on the way out. (Lose 12 HP. More Infamy.)'; } },
  ],
};

// ---------------------------------------------------------------------------
// DETECTIVE WORK — every town lost someone last night.
// ---------------------------------------------------------------------------
const CASE = {
  places: ['the saloon', 'the church', 'the livery stable', 'the general store', 'the telegraph office', 'the barbershop', 'the boarding house', 'the assay office'],
  scenes: ['the dry wash', 'the old well', 'the graveyard', 'the stockyards', 'the rail yard', 'the cottonwood grove'],
  victims: ['the Pruitt boy', 'old Mrs. Hatch', 'the new schoolteacher', 'a cattle buyer from Abilene', 'the Doyle twins', 'the night watchman', 'a Mormon peddler', 'the blacksmith\'s daughter'],
  alibi: [
    p => `"I was at ${p} all night. Ask anybody."`,
    p => `"Where was I? ${cap(p)}, till past midnight."`,
    p => `"${cap(p)}. Same as every night, Marshal."`,
  ],
  saw: [
    (who, p) => `"I saw ${who} at ${p}, late. Real late."`,
    (who, p) => `"${who}? At ${p}, around midnight. I'd swear to it."`,
    (who, p) => `"Only one I saw was ${who}, over by ${p}."`,
  ],
};
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

const STARTER_DECK = [
  'quick_draw', 'quick_draw', 'quick_draw', 'quick_draw', 'quick_draw',
  'take_cover', 'take_cover', 'take_cover', 'take_cover',
  'reload', 'pistol_whip',
];

// ---------------------------------------------------------------------------
// HUNTERS — who you ride out as. Jonah is the story as written; the others
// are unlocked by what you do in it.
// ---------------------------------------------------------------------------
const HEROES = {
  jonah: {
    name: 'Jonah Crane', title: 'Marshal', art: 'hero', hp: 70, sight: 3, questions: 0,
    deck: STARTER_DECK, keepsakes: ['tin_star', 'claras_locket'],
    belt: ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'], tonics: ['miracle'],
    blurb: 'Former marshal. Lost his brother, his sister and his wife in a single week. Sees through the Veil. Balanced: a revolver, a tin star and a grudge.',
  },
  martha: {
    name: 'Martha Wheeler', title: 'Mrs. Wheeler', art: 'martha', hp: 76, sight: 2, questions: 2,
    deck: ['scattergun', 'scattergun', 'scattergun', 'quick_draw', 'quick_draw', 'quick_draw', 'duck_roll', 'take_cover', 'take_cover', 'take_cover', 'reload'],
    keepsakes: ['eli_ring', 'war_paint'],
    belt: ['buckshot', 'lead', 'lead', 'buckshot', 'lead', 'lead'], tonics: ['laudanum'],
    blurb: 'Widow of the man Marshal Crane hanged. A shotgun, Buckshot in her belt, and less Veil Sight, but she knows how people lie: two extra questions in every town.',
    unlock: { key: 'martha', text: 'Finish the hunt once, with any ending.' },
  },
  agnes: {
    name: 'Sister Agnes', title: 'Sister', art: 'agnes', hp: 58, sight: 4, questions: 0,
    deck: ['quick_draw', 'quick_draw', 'quick_draw', 'holy_water', 'sermon_fire', 'take_cover', 'take_cover', 'take_cover', 'rosary_prayer', 'reload', 'pistol_whip'],
    keepsakes: ['psalter', 'tin_star'],
    belt: ['blessed', 'lead', 'lead', 'blessed', 'lead', 'lead'], tonics: ['holy_vial'],
    blurb: 'The Coldwater nun Ruth confided in. Frail, but she sees clearly (4 Veil Sight) and her Hellfire burns hotter. Blessed rounds in her belt.',
    unlock: { key: 'agnes', text: 'Tell Sister Agnes the truth.' },
  },
  toby: {
    name: 'Toby Lark', title: 'Kid', art: 'toby', hp: 62, sight: 3, questions: 1, dog: 2,
    deck: ['quick_draw', 'quick_draw', 'quick_draw', 'sic_em', 'sic_em', 'bear_trap', 'take_cover', 'take_cover', 'take_cover', 'take_cover', 'reload'],
    keepsakes: ['rangers_collar', 'elk_knife'],
    belt: ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'], tonics: ['coffee'],
    blurb: 'The stockyard boy Amos Crane looked out for, ten years grown. Ranger, his dog, bites the weakest demon after every one of your turns, and his traps go off when demons attack. Tracker cards.',
    unlock: { key: 'toby', text: 'As Jonah, give the stockyard boy in Dry Hollow the money Amos would have.' },
  },
};

// Card styles that start locked, and what unlocks them.
const STYLE_UNLOCKS = {
  brawl: { name: 'Brawler cards', text: 'Beat the Hollow Steer.' },
  seer: { name: 'Veil-seer cards', text: 'Beat the Silk Widow.' },
};

// ---------------------------------------------------------------------------
// THE LEDGER — difficulty. Each page adds to the ones before it. Winning on
// the highest page you have unlocked opens the next.
// ---------------------------------------------------------------------------
/** Every wanted demon in a chapter. */
const elitesOf = ch => [ENCOUNTERS[ch].elite, ENCOUNTERS[ch].elite2].filter(Boolean);

// ---------------------------------------------------------------------------
// SHOWDOWN — the three bosses and three wanted demons back to back, with a
// ready-made deck.
// ---------------------------------------------------------------------------
const SHOWDOWN_DECKS = {
  gun: { name: 'Gunslinger', desc: 'Silver in every other chamber and cards that care what fires next.',
    deck: ['quick_draw', 'quick_draw', 'quick_draw', 'double_tap', 'hammer_back', 'load_silver', 'trick_shot', 'take_cover', 'take_cover', 'take_cover', 'reload', 'speed_loader', 'dead_eye'],
    belt: ['silver', 'lead', 'silver', 'lead', 'silver', 'lead'] },
  holy: { name: 'Preacher', desc: 'Stack Hellfire, then cash it in with Exorcism.',
    deck: ['quick_draw', 'quick_draw', 'holy_water', 'sermon_fire', 'sermon_fire', 'brimstone_verse', 'load_blessed', 'take_cover', 'take_cover', 'take_cover', 'rosary_prayer', 'reload', 'exorcism'],
    belt: ['hellfire', 'lead', 'blessed', 'lead', 'hellfire', 'lead'] },
  brawl: { name: 'Brawler', desc: 'Fists, Wrath, and getting hurt on purpose.',
    deck: ['knuckle_duster', 'knuckle_duster', 'knuckle_duster', 'haymaker', 'chair_leg', 'take_a_punch', 'scar_tissue', 'grim_resolve', 'take_cover', 'take_cover', 'duck_roll', 'bloodied', 'reload'],
    belt: ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'] },
  seer: { name: 'Veil-seer', desc: 'Pile on Exposed, then say its true name.',
    deck: ['quick_draw', 'quick_draw', 'glimpse', 'glimpse', 'tear_veil', 'tear_veil', 'peel_skin', 'third_eye', 'take_cover', 'take_cover', 'reload', 'veil_walk', 'true_name'],
    belt: ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'] },
};
/** The fights, in order: [chapter, 'elite' | 'boss']. */
const SHOWDOWN_FIGHTS = [[1, 'elite'], [1, 'boss'], [2, 'elite'], [2, 'boss'], [3, 'elite'], [3, 'boss']];

// ---------------------------------------------------------------------------
// WANTED CHALLENGES — the story with one rule changed. One is featured each week.
// ---------------------------------------------------------------------------
const CHALLENGES = {
  bare_knuckles: { name: 'Bare Knuckles', desc: 'Brawler cards only: your deck starts with fists, and every reward and shop offers only Brawler cards.',
    deck: ['knuckle_duster', 'knuckle_duster', 'knuckle_duster', 'pistol_whip', 'pistol_whip', 'take_cover', 'take_cover', 'take_cover', 'take_cover', 'haymaker', 'reload'], onlyStyle: 'brawl' },
  tampered_iron: { name: 'Tampered Iron', desc: 'Somebody got to your gun belt: every chamber is a Dud except one Blessed round. Buy better rounds, or learn to punch.',
    belt: ['blessed', 'dud', 'dud', 'dud', 'dud', 'dud'] },
  wanted_man: { name: 'Wanted Man', desc: 'Your Infamy starts at 6. Prices are up, towns talk less, and posses are already riding.',
    infamy: 6 },
  blind_justice: { name: 'Blind Justice', desc: 'No Veil Sight at all, and one question fewer in every town. Pure detective work.',
    sight: 0, questions: -1 },
  glass_cannon: { name: 'Glass Cannon', desc: 'Only 40 max HP, but you start with Cinder War Paint and an upgraded Iron Will.',
    maxHp: 40, keepsakes: ['war_paint'], cards: [['iron_will', true]] },
  second_sight: { name: 'Second Sight', desc: 'Veil-seer cards only, and six Veil Sight to see with.',
    deck: ['quick_draw', 'quick_draw', 'quick_draw', 'glimpse', 'glimpse', 'tear_veil', 'take_cover', 'take_cover', 'take_cover', 'third_eye', 'reload'], onlyStyle: 'seer', sight: 6 },
};

// ---------------------------------------------------------------------------
// THE DAILY HUNT — one seeded run a day, the same for everyone, with one twist.
// ---------------------------------------------------------------------------
const DAILY_TWISTS = {
  blind:       { name: 'Blind Faith', desc: 'No Veil Sight this hunt. Every town is pure detective work (+1 question in each).' },
  blood_moon:  { name: 'Blood Moon', desc: 'Every demon starts each fight with 1 Wrath. So do you.' },
  hot_lead:    { name: 'Hot Lead', desc: 'Every Lead round sets its target burning (1 Hellfire).' },
  glass_jaw:   { name: 'Glass Jaw', desc: 'You start at 60% health, but campfires heal twice as much.' },
  gold_rush:   { name: 'Gold Rush', desc: 'Every fight pays double gold. Trading posts charge half again as much.' },
  heavy_heart: { name: 'Heavy Heart', desc: 'Grief rides in your deck, but you start with an extra keepsake.' },
  tight_lips:  { name: 'Tight Lips', desc: 'Two fewer questions in every town, but one more Veil Sight.' },
  quick_draw:  { name: 'Quick Draw', desc: 'Draw an extra card every turn, but every fight starts with only three rounds loaded.' },
};

const LEDGER = [
  { name: 'The Hunt', desc: 'The story as written.' },
  { name: 'Page One', desc: 'Demons have 10% more HP.' },
  { name: 'Page Two', desc: 'Demons hit 10% harder.' },
  { name: 'Page Three', desc: 'Towns answer one fewer question. Campfires heal 20% instead of 30%.' },
  { name: 'Page Four', desc: 'Elites and bosses start every fight with 2 Wrath.' },
  { name: 'The Last Page', desc: 'You start with a Grief in your deck and one less Veil Sight.' },
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
  eli_ring: { name: "Eli's Wedding Band", desc: 'Your Buckshot rounds splash 5 damage instead of 3.', hero: true },
  psalter: { name: "Agnes's Psalter", desc: 'Whenever you apply Hellfire to a demon, apply 1 more.', hero: true },
  rangers_collar: { name: "Ranger's Collar", desc: 'A red bandana gone pink with washing. Ranger bites 1 harder.', hero: true },
  elk_knife: { name: "Amos's Pocketknife", desc: 'Elk-horn handle. On your first turn of every fight, your first shot deals 4 extra damage.', hero: true },
  lawmans_notebook: { name: "Lawman's Notebook", desc: 'Ask 2 extra questions in every town. Your old handwriting, from when you still did things by the book.' },
};
const KEEPSAKE_POOL = ['snake_oil', 'silver_spurs', 'gun_oil', 'rattle', 'bible', 'horseshoe', 'war_paint', 'lawmans_notebook'];

// ---------------------------------------------------------------------------
// DEMONS
// Move fields: atk, hits, block, wrath, shaken, exposed, burn (on player),
//              heal, curse:{id,n}, summon:{id,n}
// ---------------------------------------------------------------------------
const ENEMIES = {
  // Chapter 1 ---------------------------------------------------------------
  razorjaw: {
    name: 'Razorjaw', hp: [38, 42], art: 'jaw',
    hostage: { name: 'a customer in the barber chair', threshold: 12 },
    moves: {
      slash: { n: 'Straight Razor', atk: 8 },
      snip:  { n: 'Snip Snip', atk: 4, hits: 2 },
      hone:  { n: 'Hone the Blade', wrath: 2, block: 5 },
    },
    pattern: ['slash', 'snip', 'hone'],
  },
  mourner: {
    name: 'The Crawling Mourner', hp: [34, 38], art: 'veil', veiled: true,
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

  dowser: {
    name: 'The Dowser', hp: [36, 40], art: 'veil',
    moves: {
      rod:   { n: 'Divining Rod', atk: 8 },
      drought: { n: 'Dry Spell', shaken: 1, exposed: 1, block: 6 },
      drown: { n: 'Drown', atk: 5, hits: 2 },
    },
    pattern: ['rod', 'drought', 'drown'],
  },
  bone_wagon: {
    name: 'The Bone Wagon', hp: [78, 82], art: 'coffin', elite: true,
    moves: {
      run:    { n: 'Run You Down', atk: 17 },
      toll:   { n: 'Toll the Bell', atk: 5, shaken: 2, exposed: 1 },
      whip:   { n: "Driver's Whip", atk: 4, hits: 3 },
      load:   { n: 'Load the Dead', block: 12, wrath: 2 },
    },
    pattern: ['toll', 'run', 'whip', 'load', 'run'],
  },

  // Chapter 2 ---------------------------------------------------------------
  measurer: {
    name: 'The Measurer', hp: [58, 62], art: 'coffin', ward: 2,
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
      deal:  { n: 'Deal You In', atk: 7, tamper: 2 },
      flush: { n: 'Royal Flush', atk: 4, hits: 3 },
      ante:  { n: 'Raise the Ante', block: 10, wrath: 2 },
    },
    pattern: ['deal', 'flush', 'ante'],
  },
  chalk_wraith: {
    name: 'The Chalk Wraith', hp: [50, 54], art: 'veil', veiled: true,
    moves: {
      lesson: { n: 'A Lesson', atk: 6, shaken: 2 },
      ruler:  { n: 'The Ruler', atk: 13 },
      recite: { n: 'Recite Your Lesson', mimic: true, block: 6 },
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

  pale_clerk: {
    name: 'The Pale Clerk', hp: [50, 54], art: 'grey', ward: 1,
    moves: {
      audit:     { n: 'Audit', atk: 5, collect: 1 },
      foreclose: { n: 'Foreclose', atk: 14 },
      interest:  { n: 'Compound Interest', wrath: 2, block: 8 },
    },
    pattern: ['audit', 'foreclose', 'interest'],
  },
  dust_devil: {
    name: 'The Dust Devil', hp: [100, 104], art: 'veil', elite: true, veiled: true,
    moves: {
      blast: { n: 'Sandblast', atk: 3, hits: 5 },
      whirl: { n: 'Whirl', block: 12, wrath: 2 },
      blind: { n: 'Blinding Grit', shaken: 2, exposed: 2, atk: 6 },
    },
    pattern: ['blast', 'blind', 'whirl', 'blast'],
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
    hostage: { name: 'a kneeling parishioner', threshold: 15 },
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
    name: 'The Iron Horror', hp: [96, 100], art: 'train', ward: 3,
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
    name: 'The Brimstone Marshal', hp: [140, 146], art: 'hat', elite: true, ward: 3,
    moves: {
      warrant: { n: 'Serve the Warrant', atk: 8, exposed: 2 },
      six:     { n: 'Six-Gun Salvo', atk: 4, hits: 6 },
      deputize:{ n: 'Deputize', wrath: 3, block: 14 },
    },
    pattern: ['warrant', 'six', 'deputize'],
  },
  mesmerist: {
    name: 'The Mesmerist', hp: [74, 78], art: 'veil', veiled: true,
    moves: {
      seance: { n: 'Séance', curse: { id: 'bad_hand', n: 1 }, shaken: 2 },
      hands:  { n: 'Spirit Hands', atk: 6, hits: 3 },
      ecto:   { n: 'Ectoplasm', block: 14, heal: 8 },
    },
    pattern: ['seance', 'hands', 'ecto', 'hands'],
  },
  starving_man: {
    name: 'The Starving Man', hp: [136, 140], art: 'rider', elite: true,
    moves: {
      devour: { n: 'Devour', atk: 20, heal: 10 },
      gnaw:   { n: 'Gnaw', atk: 7, hits: 2 },
      hunger: { n: 'The Hunger', wrath: 3, block: 10 },
      frost:  { n: 'Winter Breath', exposed: 2, shaken: 1, atk: 8 },
    },
    pattern: ['frost', 'devour', 'gnaw', 'hunger', 'devour'],
  },
  grey_gentleman: {
    name: 'The Gentleman in Grey', hp: [180, 180], art: 'grey', boss: true,
    moves: {
      tip:     { n: 'Tips His Hat', block: 16, wrath: 1 },
      debts:   { n: 'Collect on Debts', atk: 18 },
      whisper: { n: 'Whispers Her Name', curse: { id: 'grief', n: 2 }, shaken: 2 },
      due:     { n: "Gunslinger's Due", atk: 6, hits: 3 },
      coach:   { n: 'Hellfire Coach', atk: 8, burn: 4 },
      ledger:  { n: 'Balance the Ledger', atk: 9, collect: 1 },
    },
    pattern: ['tip', 'due', 'ledger', 'whisper', 'debts', 'coach'],
    phase2: {
      at: 0.5, pattern: ['debts', 'ledger', 'coach', 'due', 'whisper', 'ledger', 'tip'],
      text: 'He removes his hat. There is no face under the brim, only the night you came home too late.',
      wrath: 2,
    },
  },

  // Chapter 4: the Far Side -------------------------------------------------
  ferryman: {
    name: 'The Ferryman', hp: [92, 98], art: 'hat',
    moves: {
      fare: { n: 'Take the Fare', atk: 10, collect: 1 },
      oar:  { n: 'Oar', atk: 7, hits: 2 },
      mist: { n: 'River Mist', block: 16, exposed: 1 },
    },
    pattern: ['fare', 'oar', 'mist'],
  },
  bride_grey: {
    name: 'The Bride in Grey', hp: [84, 90], art: 'veil', veiled: true,
    moves: {
      vow:     { n: 'Till Death', atk: 18 },
      bouquet: { n: 'Toss the Bouquet', shaken: 2, burn: 4 },
      weep:    { n: 'Weep', block: 14, heal: 10 },
    },
    pattern: ['bouquet', 'vow', 'weep', 'vow'],
  },
  hangman_shade: {
    name: "The Hangman's Shade", hp: [100, 106], art: 'noose',
    hostage: { name: 'a lost soul on the end of his rope', threshold: 18 },
    moves: {
      measure: { n: 'Take Your Measure', wrath: 2, block: 12 },
      knot:    { n: 'Tie the Knot', atk: 8, shaken: 2 },
      drop:    { n: 'The Drop', atk: 22 },
    },
    pattern: ['measure', 'knot', 'drop'],
  },
  lost_soul: {
    name: 'Lost Soul', hp: [16, 19], art: 'veil', minion: true,
    moves: { grasp: { n: 'Grasp', atk: 7 }, moan: { n: 'Moan', shaken: 1, block: 5 } },
    pattern: ['grasp', 'moan'], start: 'random',
  },
  tallyman: {
    name: 'The Tallyman', hp: [170, 176], art: 'grey', elite: true,
    moves: {
      audit:    { n: 'Audit', atk: 6, collect: 1, exposed: 2 },
      interest: { n: 'Interest', atk: 6, hits: 3 },
      tally:    { n: 'Tally the Sins', wrath: 3, block: 14 },
      settle:   { n: 'Settle Up', atk: 20 },
    },
    pattern: ['audit', 'interest', 'tally', 'settle'],
  },
  choir: {
    name: 'The Choir Invisible', hp: [150, 156], art: 'veil', elite: true,
    moves: {
      hymn:      { n: 'Hymn for the Lost', summon: { id: 'lost_soul', n: 1 }, block: 12 },
      chorus:    { n: 'Chorus', atk: 5, hits: 4 },
      crescendo: { n: 'Crescendo', atk: 24, shaken: 1 },
    },
    pattern: ['hymn', 'chorus', 'crescendo', 'chorus'],
  },
  proprietor: {
    name: 'The Proprietor', hp: [210, 210], art: 'grey', boss: true,
    moves: {
      books:     { n: 'Open the Books', collect: 1, block: 16 },
      every:     { n: 'Every Name', atk: 4, hits: 5 },
      contract:  { n: 'Hellfire Contract', atk: 6, burn: 5, shaken: 1 },
      foreclose: { n: 'Foreclosure', atk: 21 },
      souls:     { n: 'Call the Debtors', summon: { id: 'lost_soul', n: 2 }, block: 12 },
    },
    pattern: ['books', 'every', 'contract', 'foreclose', 'souls'],
    phase2: {
      at: 0.5, pattern: ['foreclose', 'every', 'souls', 'contract', 'foreclose', 'books'],
      text: 'The Proprietor sets down his pen. For the first time he looks at you, and he has your face.',
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
      { foes: ['dowser'], role: 'water witch', g: 'f', tells: ['Every well she has witched for has run dry within the month.', 'Her divining rod points at you, and only at you.'] },
    ],
    elite: { foes: ['skinless_rider'], name: 'The Skinless Rider', bounty: 'Rode through Dry Hollow at midnight. Left eleven dead, and every one of them smiling.' },
    elite2: { foes: ['bone_wagon'], name: 'The Bone Wagon', bounty: 'An undertaker\'s wagon that drives itself. It stops outside a house, and by morning somebody inside is ready for it.' },
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
      { foes: ['jackal', 'jackal'], role: 'pair of drifters', plural: true, tells: ['Two brothers who laugh at the same moment, every time.', 'They have been "just passing through" for six years.'] },
      { foes: ['pale_clerk'], role: 'bank teller', tells: ['Knows the balance of every account in town. Including yours.', 'Never blinks behind those spectacles. The ink on his fingers is still wet.'] },
    ],
    elite2: { foes: ['dust_devil'], name: 'The Dust Devil', bounty: 'A whirlwind that walks against the wind. It has taken two stagecoaches and a church steeple.' },
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
      { foes: ['crow', 'crow', 'crow'], role: 'three sisters', plural: true, g: 'f', tells: ['Three old women who finish each other\'s sentences.', 'Birds fall silent when they pass.'] },
      { foes: ['mesmerist'], role: 'spirit medium', g: 'f', tells: ['Her séances always reach the right ghost. The ghosts always ask for you.', 'The candles lean toward her when she speaks.'] },
    ],
    elite2: { foes: ['starving_man'], name: 'The Starving Man', bounty: 'A trapper who came down from the high passes after the worst winter in memory. His whole party came down with him, in his belly.' },
    elite: { foes: ['brimstone_marshal'], name: 'The Brimstone Marshal', bounty: 'Wears a star just like the one you used to. Serves warrants for the other side.' },
    boss: {
      foes: ['grey_gentleman'], guise: 'The Gentleman in Grey', kin: 'clara', reward: null,
      before: 'You were out chasing a horse thief the night he came to your door. Clara let him in because he was polite. He always is. He is waiting for you at the end of the line, in Babel Mesa, in a grey suit that never gets dusty.',
      taunt: '"Marshal. You look tired." He does not get up. "Six years ago you needed a killer, and I gave you one. Eli Wheeler swung, the killings stopped, and you slept like a baby. Did you never wonder why they stopped?" He smiles. "Three souls for one. I call that a bargain."',
      last: '',
      after: 'The Gentleman folds into himself like a letter and burns. The Between shudders, and for a moment you see Clara on the porch of your old house, shading her eyes against the sun. Then the world is just the world again.',
    },
  },
  4: {
    normal: [
      { foes: ['ferryman'], role: 'ferry keeper', tells: ['Never takes coin from the living. Takes it from their eyes, after.', 'His boat throws no reflection on the river.'] },
      { foes: ['bride_grey'], role: 'jilted bride', g: 'f', tells: ['Has waited at the chapel for forty years. The groom is due any minute.', 'Her veil is wet, and it has not rained here in a hundred years.'] },
      { foes: ['hangman_shade'], role: 'hangman', tells: ['Measures every neck he meets with his eyes, politely.', 'Whistles while he ties knots. Nobody asked him to tie them.'] },
    ],
    elite: { foes: ['tallyman'], name: 'The Tallyman', bounty: 'Counts every sin in Lastlight and charges interest on each one. Nobody has ever seen him lose count.' },
    elite2: { foes: ['choir'], name: 'The Choir Invisible', bounty: 'A hymn with no singers rolls down Mercy Flats every night. Anybody who joins in is never heard from again, except in the chorus.' },
    boss: {
      foes: ['proprietor'], guise: 'The Proprietor', kin: 'clara', reward: null,
      before: "The Gentleman in Grey was only ever a collector. The books belong to the Proprietor, who owns every saloon, stockyard and chapel on the Far Side, and every name in the ledger. Clara's is on the last page. So is yours.",
      taunt: '"Mr. Crane." The Proprietor does not look up from his ledger. "You broke my collector. Somebody has to pay for the damage, and you are so good at paying. A brother, a sister, a wife. What else have you got?"',
      last: '',
      after: 'The Proprietor burns like a library. When the smoke clears there is only the ledger on its lectern, open to the last page.',
    },
  },
};

const CHAPTERS = {
  1: { title: 'Chapter I — Dry Hollow', towns: ['Dry Hollow', 'Gallows Creek', 'Tumbleweed Flats', 'Rattler\'s Rest', 'Saint Ember'], kin: 'amos' },
  2: { title: 'Chapter II — Coldwater', towns: ['Coldwater', 'Perdition Wells', 'Widow\'s Gulch', 'Lantern Ridge', 'Bitter Spring'], kin: 'ruth' },
  4: { title: 'Chapter IV — The Far Side', towns: ['Lastlight', 'Mercy Flats', 'Dry Bones', 'The Crossing', "Ledger's End"], kin: 'clara' },
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

// Make available to Node (tests) as well as the browser. In Node this file
// also gathers cards.js and story.js, so `require('./data.js')` gets it all.
if (typeof module !== 'undefined') {
  Object.assign(globalThis, {  elitesOf, SHOWDOWN_DECKS, SHOWDOWN_FIGHTS, CHALLENGES, DAILY_TWISTS, HEROES, STYLE_UNLOCKS, LEDGER, cap, TONIC_SLOTS, TONICS, INFAMY, POSSE_EVENT, CASE, HERO, FAMILY, STATUS, STARTER_DECK, KEEPSAKES, KEEPSAKE_POOL, ENEMIES, ENCOUNTERS, CHAPTERS, FOLK });
  module.exports = Object.assign({  elitesOf, SHOWDOWN_DECKS, SHOWDOWN_FIGHTS, CHALLENGES, DAILY_TWISTS, HEROES, STYLE_UNLOCKS, LEDGER, cap, TONIC_SLOTS, TONICS, INFAMY, POSSE_EVENT, CASE, HERO, FAMILY, STATUS, STARTER_DECK, KEEPSAKES, KEEPSAKE_POOL, ENEMIES, ENCOUNTERS, CHAPTERS, FOLK }, require('./cards.js'), require('./story.js'), require('./farside.js'));
}
