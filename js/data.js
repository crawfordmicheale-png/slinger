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
  ward:    { name: 'Warded',  good: true,  desc: 'Hits that are not Silver or Blessed rounds deal half damage. Each Silver or Blessed hit, and each Hellfire tick, strips 1 Ward.' },
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

  scattergun: {
    name: 'Scattergun', type: 'attack', rarity: 'starter', cost: 1, rounds: 1, target: 'all',
    v: { dmg: 6 }, up: { dmg: 8 },
    text: v => `Deal ${v.dmg} damage to ALL foes.`,
    play: (c, v) => c.hitAll(v.dmg),
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

  // ---- Gunslinger: the order of the rounds in your iron matters ------------
  hammer_back: {
    name: 'Hammer Back', type: 'skill', rarity: 'common', cost: 0, style: 'gun',
    v: { dmg: 5 }, up: { dmg: 8 },
    text: v => `Your next shot this turn deals ${v.dmg} extra damage.`,
    play: (c, v) => { c.nextShotBonus += v.dmg; },
  },
  double_tap: {
    name: 'Double Tap', type: 'attack', rarity: 'common', cost: 1, rounds: 2, target: 'enemy', style: 'gun',
    v: { dmg: 5 }, up: { dmg: 7 },
    text: v => `Fire 2 rounds. Each deals ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg, 2),
  },
  spin_cylinder: {
    name: 'Spin the Cylinder', type: 'skill', rarity: 'common', cost: 0, style: 'gun',
    v: { draw: 1 }, up: { draw: 2 },
    text: v => `Skip the next loaded round without firing it. Draw ${v.draw}.`,
    play: (c, v) => { c.spin(); c.draw(v.draw); },
  },
  load_silver: {
    name: 'Load Silver', type: 'skill', rarity: 'uncommon', cost: 0, style: 'gun',
    v: { n: 2 }, up: { n: 3 },
    text: v => `Load Silver into your next ${v.n} chambers.`,
    play: (c, v) => c.loadRound('silver', v.n),
  },
  trick_shot: {
    name: 'Trick Shot', type: 'attack', rarity: 'uncommon', cost: 1, rounds: 1, target: 'enemy', style: 'gun',
    v: { dmg: 7, draw: 2 }, up: { dmg: 10, draw: 2 },
    text: v => `Deal ${v.dmg} damage. If the round wasn't Lead, draw ${v.draw}.`,
    play: (c, v, t) => { const special = c.firedThisCard.some(r => r && r !== 'lead'); c.hit(t, v.dmg); if (special) c.draw(v.draw); },
  },
  gunsmoke: {
    name: 'Gunsmoke', type: 'skill', rarity: 'uncommon', cost: 1, style: 'gun',
    v: { per: 2 }, up: { per: 3 },
    text: v => `Gain ${v.per} Cover for every loaded round.`,
    play: (c, v) => c.cover(v.per * c.p.rounds),
  },
  last_bullet: {
    name: 'The Last Bullet', type: 'attack', rarity: 'uncommon', cost: 1, rounds: 1, target: 'enemy', style: 'gun',
    v: { dmg: 8, big: 24 }, up: { dmg: 10, big: 30 },
    text: v => `Deal ${v.dmg} damage. If this empties your iron, deal ${v.big} instead.`,
    play: (c, v, t) => c.hit(t, c.p.rounds === 0 ? v.big : v.dmg),
  },
  steady_aim: {
    name: 'Steady Aim', type: 'power', rarity: 'rare', cost: 1, style: 'gun',
    v: { dmg: 4 }, up: { dmg: 6 },
    text: v => `Your first shot each turn deals ${v.dmg} extra damage.`,
    play: (c, v) => c.power('steady_aim', v.dmg),
  },
  six_shooter: {
    name: 'Six-Shooter', type: 'attack', rarity: 'rare', cost: 2, rounds: 'all', target: 'all', style: 'gun',
    v: { dmg: 7 }, up: { dmg: 9 },
    text: v => `Fire every loaded round. Each hits the weakest foe for ${v.dmg}.`,
    play: (c, v) => { for (let i = 0; i < c.spent; i++) { const t = c.alive().sort((a, b) => a.hp - b.hp)[0]; if (t) c.hit(t, v.dmg); } },
  },

  // ---- Preacher: Hellfire and Blessed rounds ---------------------------------
  load_blessed: {
    name: 'Load Blessed', type: 'skill', rarity: 'common', cost: 0, style: 'holy',
    v: { n: 2 }, up: { n: 3 },
    text: v => `Load Blessed rounds into your next ${v.n} chambers.`,
    play: (c, v) => c.loadRound('blessed', v.n),
  },
  sermon_fire: {
    name: 'Sermon of Fire', type: 'skill', rarity: 'common', cost: 1, target: 'all', style: 'holy',
    v: { burn: 3 }, up: { burn: 5 },
    text: v => `Apply ${v.burn} Hellfire to ALL foes.`,
    play: (c, v) => c.applyAll('burn', v.burn),
  },
  rosary_prayer: {
    name: 'A Prayer for Ruth', type: 'skill', rarity: 'common', cost: 1, style: 'holy',
    v: { cov: 7, heal: 3 }, up: { cov: 10, heal: 4 },
    text: v => `Gain ${v.cov} Cover. Heal ${v.heal} HP.`,
    play: (c, v) => { c.cover(v.cov); c.heal(v.heal); },
  },
  hellfire_load: {
    name: 'Hellfire Load', type: 'skill', rarity: 'uncommon', cost: 1, style: 'holy',
    v: { n: 3 }, up: { n: 4 },
    text: v => `Load Hellfire rounds into your next ${v.n} chambers.`,
    play: (c, v) => c.loadRound('hellfire', v.n),
  },
  brimstone_verse: {
    name: 'Brimstone Verse', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', style: 'holy',
    v: { dmg: 6 }, up: { dmg: 9 },
    text: v => `Deal ${v.dmg} damage. Double the foe's Hellfire.`,
    play: (c, v, t) => { c.hit(t, v.dmg); if (t && t.st.burn) c.apply(t, 'burn', t.st.burn); },
  },
  baptism: {
    name: 'Baptism by Fire', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', style: 'holy', exhaust: true,
    v: { per: 3 }, up: { per: 4 },
    text: v => `Deal ${v.per} damage for each Hellfire on the foe, then put it out. Exhaust.`,
    play: (c, v, t) => { const b = (t && t.st.burn) || 0; c.hit(t, v.per * b); if (t) delete t.st.burn; },
  },
  consecrate_ground: {
    name: 'Consecrate the Ground', type: 'power', rarity: 'rare', cost: 2, style: 'holy',
    v: { burn: 2 }, up: { burn: 3 },
    text: v => `At the start of each turn, apply ${v.burn} Hellfire to ALL foes.`,
    play: (c, v) => c.power('consecrate_ground', v.burn),
  },
  exorcism: {
    name: 'Exorcism', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', style: 'holy',
    v: { dmg: 18, per: 3 }, up: { dmg: 24, per: 4 },
    text: v => `Deal ${v.dmg} damage, plus ${v.per} for each Hellfire on the foe.`,
    play: (c, v, t) => c.hit(t, v.dmg + v.per * ((t && t.st.burn) || 0)),
  },

  // ---- Brawler: fists, Wrath, and getting hurt on purpose -------------------
  haymaker: {
    name: 'Haymaker', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', style: 'brawl',
    v: { dmg: 15 }, up: { dmg: 20 },
    text: v => `Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },
  knuckle_duster: {
    name: 'Knuckle Duster', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', style: 'brawl',
    v: { dmg: 6, w: 1 }, up: { dmg: 8, w: 1 },
    text: v => `Deal ${v.dmg} damage. Gain ${v.w} Wrath.`,
    play: (c, v, t) => { c.hit(t, v.dmg); c.applySelf('wrath', v.w); },
  },
  chair_leg: {
    name: 'Chair Leg', type: 'attack', rarity: 'common', cost: 1, target: 'all', style: 'brawl',
    v: { dmg: 5 }, up: { dmg: 8 },
    text: v => `Deal ${v.dmg} damage to ALL foes.`,
    play: (c, v) => c.hitAll(v.dmg),
  },
  take_a_punch: {
    name: 'Take a Punch', type: 'skill', rarity: 'common', cost: 0, style: 'brawl',
    v: { self: 3, grit: 2 }, up: { self: 2, grit: 2 },
    text: v => `Lose ${v.self} HP. Gain ${v.grit} Grit.`,
    play: (c, v) => { c.loseHp(c.p, v.self); c.gainGrit(v.grit); },
  },
  bloodied: {
    name: 'Bloodied', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', style: 'brawl',
    v: { dmg: 5, per: 4 }, up: { dmg: 7, per: 3 },
    text: v => `Deal ${v.dmg} damage, plus 1 for every ${v.per} HP you're missing.`,
    play: (c, v, t) => c.hit(t, v.dmg + Math.floor((c.p.maxHp - c.p.hp) / v.per)),
  },
  red_mist: {
    name: 'Red Mist', type: 'skill', rarity: 'uncommon', cost: 1, style: 'brawl',
    v: { w: 2, self: 4 }, up: { w: 3, self: 4 },
    text: v => `Gain ${v.w} Wrath. Lose ${v.self} HP.`,
    play: (c, v) => { c.applySelf('wrath', v.w); c.loseHp(c.p, v.self); },
  },
  scar_tissue: {
    name: 'Scar Tissue', type: 'power', rarity: 'uncommon', cost: 1, style: 'brawl',
    v: { cov: 2 }, up: { cov: 3 },
    text: v => `Whenever you lose HP, gain ${v.cov} Cover.`,
    play: (c, v) => c.power('scar_tissue', v.cov),
  },
  bare_knuckle: {
    name: 'Bare-Knuckle Rules', type: 'power', rarity: 'rare', cost: 2, style: 'brawl',
    v: { dmg: 4 }, up: { dmg: 6 },
    text: v => `Attacks that don't fire rounds deal ${v.dmg} extra damage.`,
    play: (c, v) => c.power('bare_knuckle', v.dmg),
  },
  last_stand: {
    name: 'Last Stand', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', style: 'brawl',
    v: { dmg: 30 }, up: { dmg: 40 },
    req: c => c.p.hp * 2 < c.p.maxHp, reqWhy: 'Only below half HP',
    text: v => `Only playable below half HP. Deal ${v.dmg} damage.`,
    play: (c, v, t) => c.hit(t, v.dmg),
  },

  // ---- Veil-seer: Exposed, Sight, and seeing what comes ---------------------
  glimpse: {
    name: 'Glimpse', type: 'skill', rarity: 'common', cost: 0, target: 'enemy', style: 'seer',
    v: { ex: 1, draw: 1 }, up: { ex: 2, draw: 1 },
    text: v => `Apply ${v.ex} Exposed. Draw ${v.draw}.`,
    play: (c, v, t) => { c.apply(t, 'exposed', v.ex); c.draw(v.draw); },
  },
  third_eye: {
    name: 'Third Eye', type: 'skill', rarity: 'common', cost: 1, style: 'seer',
    v: { cov: 6, more: 5 }, up: { cov: 8, more: 6 },
    text: v => `Gain ${v.cov} Cover. If any foe means to attack, gain ${v.more} more.`,
    play: (c, v) => c.cover(v.cov + (c.alive().some(e => e.intent && e.intent.atk) ? v.more : 0)),
  },
  tear_veil: {
    name: 'Tear the Veil', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', style: 'seer',
    v: { dmg: 7 }, up: { dmg: 10 },
    text: v => `Deal ${v.dmg} damage. Double it if the foe is Exposed.`,
    play: (c, v, t) => c.hit(t, t && t.st.exposed ? v.dmg * 2 : v.dmg),
  },
  peel_skin: {
    name: 'Peel the Skin', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', style: 'seer',
    v: { ex: 1 }, up: { ex: 2, cost: 0 },
    text: v => `Strip the foe's Cover and Ward. Apply ${v.ex} Exposed.`,
    play: (c, v, t) => { if (t) { t.block = 0; delete t.st.ward; } c.apply(t, 'exposed', v.ex); },
  },
  second_sight: {
    name: 'Second Sight', type: 'skill', rarity: 'uncommon', cost: 1, style: 'seer', exhaust: true,
    v: { draw: 1 }, up: { draw: 2 },
    text: v => `Restore 1 Veil Sight. Draw ${v.draw}. Exhaust.`,
    play: (c, v) => { c.run.sight = Math.min(c.run.maxSight, c.run.sight + 1); c.draw(v.draw); },
  },
  veil_walk: {
    name: 'Veil Walk', type: 'skill', rarity: 'uncommon', cost: 1, style: 'seer',
    v: { cov: 8, draw: 1 }, up: { cov: 11, draw: 1 },
    text: v => `Gain ${v.cov} Cover. Draw ${v.draw}.`,
    play: (c, v) => { c.cover(v.cov); c.draw(v.draw); },
  },
  true_name: {
    name: 'Its True Name', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', style: 'seer',
    v: { per: 8 }, up: { per: 11 },
    text: v => `Deal ${v.per} damage for each Exposed on the foe.`,
    play: (c, v, t) => c.hit(t, v.per * ((t && t.st.exposed) || 0)),
  },
  clairvoyance: {
    name: 'Clairvoyance', type: 'power', rarity: 'rare', cost: 1, style: 'seer',
    v: { ex: 1 }, up: { ex: 1, cost: 0 },
    text: v => `At the start of each turn, apply ${v.ex} Exposed to a random foe.`,
    play: (c, v) => c.power('clairvoyance', v.ex),
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

// ---------------------------------------------------------------------------
// ROUNDS — what sits in each chamber of the revolver.
// Your gun belt (run.belt) is the load you start every fight with; Reload
// restores it. bonus = extra damage; pierce = breaks the target's Cover first;
// splash = damage to every other foe; dud = does nothing.
// ---------------------------------------------------------------------------
const ROUNDS = {
  lead:     { name: 'Lead', desc: 'A plain lead round.', color: '#d7a340' },
  silver:   { name: 'Silver', desc: '+4 damage. Demons hate it.', bonus: 4, color: '#e8eef2', price: 30 },
  hellfire: { name: 'Hellfire', desc: 'Sets the target alight: 3 Hellfire.', color: '#ff6a2b', price: 30,
              onHit: (c, t) => c.apply(t, 'burn', 3) },
  blessed:  { name: 'Blessed', desc: '+2 damage, and burns straight through Cover.', bonus: 2, pierce: true, color: '#9fe3ff', price: 35 },
  buckshot: { name: 'Buckshot', desc: 'Also deals 3 damage to every other foe.', splash: 3, color: '#b98a5a', price: 25 },
  dud:      { name: 'Dud', desc: 'Does nothing. Somebody tampered with your iron.', dud: true, color: '#555' },
};
const SPECIAL_ROUNDS = ['silver', 'hellfire', 'blessed', 'buckshot'];
const STARTING_BELT = ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'];

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
    id: 'clara_dream', jonahOnly: true,
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
  {
    id: 'stagecoach',
    title: 'The Overturned Stagecoach',
    text: 'A stagecoach on its side in a dry wash, wheels still turning. No horses, no passengers. The strongbox is chained to the seat, and it is heavy.',
    options: [
      { label: 'Break it open. (Gain 60 gold, more Infamy)', run: r => { r.gold += 60; r.addInfamy(2); return 'Sixty dollars in Wells Fargo scrip. Somebody will come looking for it, and they will know your face. (+60 gold, +2 Infamy)'; } },
      { label: 'Haul it to the next town. (Less Infamy, gain a tonic)', run: r => { r.addInfamy(-2); const t = r.randomTonic(); const got = r.gainTonic(t); return `The express agent nearly weeps. He gives you a reward from the company stores${got ? `: ${TONICS[t].name}` : ', but your satchel is full'}. Word gets around. (-2 Infamy)`; } },
      { label: 'Look through the Veil at the wreck. (1 Sight)', req: r => r.sight > 0, run: (r, api) => { r.sight--; api.gainCard('pierce_veil'); return 'The passengers are still inside, just on the other side of the Veil, sitting politely and waiting for a stop that will never come. You tell them they can get off now. They thank you. (Gain Pierce the Veil.)'; } },
    ],
  },
  {
    id: 'ghost_town',
    title: 'A Town With No Name',
    text: 'The sign has weathered blank. Every door hangs open. In the saloon, a player piano is working through "Camptown Races" for nobody at all.',
    options: [
      { label: 'Search the general store. (Gain a tonic)', run: r => { const t = r.randomTonic(); return r.gainTonic(t) ? `Behind the counter, under an inch of dust: ${TONICS[t].name}. You leave a dollar on the counter out of habit.` : 'You find a tonic, but your satchel is full.'; } },
      { label: 'Sit at the bar and let the piano finish. (Heal 12, remove a card)', run: (r, api) => { r.hp = Math.min(r.maxHp, r.hp + 12); api.removeCardPrompt(); return 'When the song ends, the piano plays one more bar, slowly, like a question. You find you have let go of something. (Heal 12. Remove a card.)'; } },
      { label: 'Ride through without stopping.', run: () => 'The piano stops the moment you pass the town limits.' },
    ],
  },
  {
    id: 'prospector',
    title: 'The Old Prospector',
    text: 'A prospector with one tooth and one mule is panning a creek that has never held gold. "Found me some silver, though," he says, and shows you a lump of ore as big as a fist. "Real silver. The kind that burns them."',
    options: [
      { label: 'Buy it and have a round cast. (35 gold, Silver in your belt)', req: r => r.gold >= 35, run: r => { r.gold -= 35; const i = r.belt.indexOf('lead'); if (i >= 0) r.belt[i] = 'silver'; return i >= 0 ? `He watches you pour it by the campfire. The round comes out bright as a dime. (A Lead chamber in your gun belt is now Silver.)` : 'You have no Lead chambers left to fill. He keeps the money anyway.'; } },
      { label: 'Help him dig. (Lose 8 HP, gain 40 gold)', run: r => { r.hp = Math.max(1, r.hp - 8); r.gold += 40; return 'The creek bank gives way and you spend an hour in cold water, but the old man was right about one thing: there is a second lump. He splits it fair. (Lose 8 HP. Gain 40 gold.)'; } },
      { label: 'Wish him luck.', run: () => '"Don\'t need luck," he says. "Need a bigger pan."' },
    ],
  },
  {
    id: 'duel',
    title: 'A Duel at Noon',
    text: 'A kid with two pearl-handled pistols and no beard steps into the street. "You\'re the demon hunter. I\'m faster than you." Half the town is watching from the boardwalk.',
    options: [
      { label: 'Accept the duel. (Lose 6 HP, upgrade a card)', run: (r, api) => { r.hp = Math.max(1, r.hp - 6); api.upgradeCardPrompt(); return 'He is fast. You are faster, just barely, and you shoot the pistol out of his hand instead of his heart. He grazes your arm on the way down. He asks you to teach him. You teach him one thing. (Lose 6 HP. Upgrade a card.)'; } },
      { label: 'Look through the Veil at him first. (1 Sight)', req: r => r.sight > 0, run: (r, api) => { r.sight--; api.gainCard('warning_shot'); r.addInfamy(-1); return 'Just a boy. Human, scared, and trying hard not to show it. You put a warning shot through his hat. He goes home. The town decides you are a decent sort. (Gain Warning Shot. -1 Infamy.)'; } },
      { label: 'Walk away.', run: r => { r.addInfamy(1); return 'The kid crows about it in every saloon from here to Coldwater. (+1 Infamy)'; } },
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
          r.addInfamy(-2);
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
          r.addInfamy(-1);
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

// ---------------------------------------------------------------------------
// OTHER HUNTERS' STORIES — the same three demons, seen by someone else.
// storyFor(hero) returns one bundle for any hunter; Jonah's is assembled from
// the tables above so nothing is written twice.
// ---------------------------------------------------------------------------
const CHAR_STORY = {
  martha: {
    intro: [
      'Six years ago Marshal Jonah Crane hanged your husband, Eli Wheeler, from the cottonwood at the foot of Babel Mesa. There was no trial. There was a stranger in a grey suit who said Eli was the Cinder County Butcher, and a marshal tired enough to believe him.',
      'The killings stopped. Everybody said that proved it. You knew better. Eli cried at weddings. Eli caught spiders in a teacup and carried them outside.',
      "Last spring you finally saw what nobody else can: the things that walk the frontier wearing people. Three of them built the rope that hanged Eli. A cattle baron who planted the evidence. A saloon madam who swore to a lie. And the Gentleman in Grey, who did the killing himself.",
      "You took Eli's shotgun down from over the door. You are going to clear his name, one skin at a time.",
    ],
    hunt: { 1: 'Hunting the man who planted the evidence.', 2: 'Hunting the woman who swore to the lie.', 3: 'Hunting the killer who got away with it.' },
    chapters: {
      1: { letter: { from: 'Eli Wheeler', text: "Martha. They say I'll hang Thursday. The Marshal is not a cruel man, only a tired one. Mr. Pike swears he found my coat by the stockyard, soaked through. It isn't my coat, Martha. Mine has your patch on the elbow. Don't let them tell you different. Water the tomatoes. Eli." },
        paras: ['Eli wrote that the night before they hanged him. The Marshal never read it. Nobody did.', 'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike, the man who found the coat.'] },
      2: { letter: { from: 'Madame Odile', text: 'I, Odile Vasseur, proprietress of the Gilded Lily, Coldwater, do swear that on the night of the ninth I saw the drifter Eli Wheeler lead two children toward the dry wash. So help me God.' },
        paras: ['The court clerk sold you a copy of her statement for a dollar. Madame Odile signed it in a hand like no hand you have ever seen, all loops and no pressure.', 'Coldwater sits at the bottom of a canyon where the sun comes up late and leaves early.'] },
      3: { letter: { from: 'unsigned', text: 'Mrs. Wheeler. I was so sorry to hear about Eli. Truly. Come up to Babel Mesa and I will tell you everything you want to know about that night. I was there, after all. Cordially, G.' },
        paras: ['The card was tucked into your front door. Somebody had watered the tomatoes.', 'Marshal Crane is somewhere near the mesa too. You have not decided what you will do about him.'] },
    },
    bosses: {
      1: { cry: 'For Eli.', rest: 'One lie down.', reward: null,
        before: "Silas Pike swore on a stack of Bibles that he found Eli's coat in his stockyard, soaked in blood. It was a steer's blood, and it was not Eli's coat. Pike has been buying up land ever since with money nobody can account for.",
        taunt: '"Wheeler? Can\'t say I recall," says Silas Pike, and his jaw swings open like a gate. "Hanged a lot of men that summer."',
        last: '"The Gentleman paid me in land," the Steer gurgles as it burns. "Paid Odile in years. What do you suppose he\'ll pay you?"',
        after: "The Steer comes apart into smoke and flies. In Pike's office safe you find the coat: bloodstained, the wrong size, a price tag from the Dry Hollow mercantile still on the collar. You fold it carefully. It is evidence." },
      2: { cry: 'For Eli.', rest: 'Two lies down.', reward: null,
        before: 'Madame Odile swore to a lie in open court and has sworn to it every year since, to anyone who asks. She has not aged a day in six years.',
        taunt: '"I remember your Eli," says Madame Odile. "He cried for you at the end. It was very sweet. Stay a while, Mrs. Wheeler. I will tell you what he said."',
        last: '"He paid me in years," the Widow hisses. "Ask him what he paid the Marshal in." Then she comes apart.',
        after: 'The Widow unravels, thread by thread. In the silk you find her sworn statement, the original, and the ink is still wet. You watch the words crawl off the page like ants.' },
      3: { cry: 'For Eli.', rest: '', reward: null,
        before: 'The Gentleman in Grey is waiting at the top of Babel Mesa, in a suit that never gets dusty. He has been waiting six years for you, he says. He sounds pleased.',
        taunt: '"Mrs. Wheeler. You look well." He does not get up. "Your husband was very useful. A marshal needed a killer, and Eli was there. I only had to point." He smiles. "One rope, and the Marshal owed me everything he loved. I call that a bargain."',
        last: '',
        after: "The Gentleman folds into himself like a letter and burns. For a moment you smell Eli's pipe tobacco on the wind, and then it is only the wind." },
    },
    story: {
      1: { id: 'pikes_ledger', title: "Pike's Ledger", kicker: 'Eli',
        text: 'Pike\'s land office is empty after dark. In the bottom drawer of the desk is a ledger, and on the page for the summer Eli died is a single line in a hand like spilled ink: "Wheeler matter. Paid in full, 640 acres."',
        options: [
          { label: 'Take the ledger as evidence.', run: (r, api) => { r.flags.evidence = (r.flags.evidence || 0) + 1; r.addJournal('Paid in Full', 'Pike\'s ledger, the summer Eli died: "Wheeler matter. Paid in full, 640 acres." You have it now.'); api.gainCard('buckshot'); return 'You wrap the ledger in oilcloth and put it at the bottom of your saddlebag. (Evidence: 1. Gain Buckshot.)'; } },
          { label: 'Take the cash box and burn the office.', run: (r, api) => { r.gold += 45; r.addInfamy(1); r.addJournal('Fire in Dry Hollow', 'You burned Silas Pike\'s land office to the ground, ledger and all. It felt good. It proves nothing.'); return 'The cash box has forty-five dollars in it. The office burns until dawn. (Gain 45 gold. More Infamy.)'; } },
        ] },
      2: { id: 'pruitt_girl', title: 'The Pruitt Girl', kicker: 'Eli',
        text: 'The Pruitt children were the ones Madame Odile swore she saw with Eli. One of them lived. She is nineteen now and works the laundry behind the Gilded Lily. "I never saw your husband," she whispers. "Not ever. The lady told me what to say. She gave me a sugar mouse."',
        options: [
          { label: 'Ask her to swear to it in writing.', run: (r, api) => { r.flags.evidence = (r.flags.evidence || 0) + 1; r.addJournal("The Pruitt Girl's Statement", '"I never saw Eli Wheeler with me or my brother. Madame Odile told me what to say." Signed, with an X, and witnessed.'); api.gainCard('last_bullet'); return 'She signs with an X. Her hand shakes the whole time. (Evidence: 1 more. Gain The Last Bullet.)'; } },
          { label: 'Tell her it was never her fault.', run: r => { r.hp = Math.min(r.maxHp, r.hp + 15); r.addJournal('Sugar Mouse', 'You told the Pruitt girl it was never her fault. She cried, and so did you, a little.'); return 'She cries. So do you, a little. (Heal 15.)'; } },
        ] },
      3: { id: 'the_marshal', title: 'The Marshal', kicker: 'Eli',
        text: 'Under the cottonwood at the foot of Babel Mesa, a tired man in a long duster is sitting where you usually sit. He stands when he sees you. It is Jonah Crane. "Mrs. Wheeler," he says. "I know what I did. I know who I did it for. I don\'t expect anything from you."',
        options: [
          { label: 'Forgive him.', run: r => { r.flags.forgiven = true; r.addInfamy(-1); r.hp = r.maxHp; r.addJournal('Forgiveness', 'You forgave Jonah Crane under the tree where he hanged your husband. You are not sure you meant it. You said it anyway, and something in your chest came unknotted.'); return 'You say it before you can stop yourself. He takes off his hat and does not say anything at all. (Health fully restored.)'; } },
          { label: '"Then help me finish it."', run: (r, api) => { r.flags.ally = true; r.addJournal('An Unlikely Posse', 'Jonah Crane gave you a box of his silver rounds and told you where the Gentleman sleeps.'); api.gainCard('judgment', true); r.gainTonic('silver_box'); return 'He gives you a box of silver rounds and tells you where the Gentleman sleeps. (Gain an upgraded Judgment and a Box of Silver.)'; } },
          { label: 'Walk past him.', run: r => { r.addJournal('Walking Past', 'You walked past Jonah Crane without a word. He did not follow.'); r.gold += 30; return 'He does not follow. Later you find thirty dollars in your saddlebag that you did not put there. (Gain 30 gold.)'; } },
        ] },
    },
    finale: [
      "The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is only a ledger bound in black leather, and on its first page is Eli's name, crossed out, with PAID written beside it. He is still smiling.",
      '"Well played, Mrs. Wheeler. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes forever. Or pick up the hat, and you may write whatever you like in here. Even a pardon."',
    ],
    rest: { req: r => r.flags.forgiven || (r.flags.evidence || 0) >= 2, locked: 'You would need proof Eli was innocent, or to have forgiven the man who hanged him.' },
    endings: {
      hunter: { title: 'The Widow with the Shotgun', text: ['You put both barrels through the ledger.', "Eli's headstone still has MURDERER scratched into it. You leave it. You know the truth. That will have to be enough.", "The Veil stays open. You keep Eli's shotgun oiled, and you keep riding."] },
      rest: { title: 'Pardoned', text: ["You tear the ledger out of him and carry it down the mesa. In the morning you lay it on the circuit judge's desk with everything else you found.", 'It takes the territory eleven months to admit a mistake. The pardon comes on thick paper with a wax seal. You nail it to the cottonwood.', 'The Sight fades. You plant tomatoes. Some evenings a tired man in a long duster rides past and tips his hat, and some evenings you nod back.'] },
      collector: { title: 'The Lady in Grey', text: ['You pick up the grey hat. It fits.', 'You write a pardon for Eli in the ledger, in beautiful handwriting. Then you turn the page. There are so many other names.', 'Somewhere in the territory a tired marshal is hunting a killer he cannot catch. You straighten your gloves and go to buy him a drink.'] },
    },
    memories: [
      'Eli catching a spider in a teacup and carrying it out to the porch, talking to it the whole way.',
      'Eli sewing a patch on his own elbow, badly, because he did not want to bother you.',
      'The first tomato of the summer, split between the two of you with a pocketknife.',
      'Eli teaching the Pruitt children to whistle through a blade of grass, the week before.',
      'The cottonwood creaking in the wind. You still cannot sleep through it.',
      "Eli's last letter, read so many times the folds have worn through.",
    ],
    restFlash: 'You sleep with the shotgun across your knees. You dream Eli is humming in the kitchen.',
  },

  agnes: {
    intro: [
      'You were the sister at the Coldwater chapel for eleven years. You buried miners and babies and a sheriff, and you never once saw anything you could not explain.',
      "Then Ruth Crane came to sing in your choir. She had the finest voice in the territory and the saddest brother. One Sunday she did not come. The Gilded Lily said she had gone away. You held a funeral with an empty coffin, and at the graveside, God help you, you saw them.",
      "Demons. In the pews. In the saloon. In the mayor's house. Wearing people like Sunday clothes.",
      'The bishop told you to pray. You did. Then you took the revolver somebody left in the poor box and had it blessed by a priest who asked no questions.',
    ],
    hunt: { 1: 'Hunting the Steer of Dry Hollow.', 2: 'Hunting the thing that took Ruth.', 3: 'Hunting the one who keeps the ledger.' },
    chapters: {
      1: { letter: { from: 'Ruth Crane', text: "Sister. I've told Jonah nothing, he has enough to carry. But a man in a grey suit comes to the Lily every Saturday, and he knows things about my family no stranger should. He says my brother Amos is 'next in the ledger.' If anything happens to Amos, it was him. Pray for us. Ruth." },
        paras: ['Amos Crane was trampled in the Dry Hollow stockyards a week after Ruth wrote that.', 'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike.'] },
      2: { letter: { from: 'Ruth Crane', text: "Sister, if you are reading this, I didn't come to choir. Madame Odile has asked me to sing for her alone tonight. I think I have to. I think if I don't, it will be Jonah. Don't let him come looking for me. He'll only get hurt. Your Ruth." },
        paras: ['Ruth left this under the hymnals the Sunday she vanished. You have never shown it to anyone.', 'The Gilded Lily is lit up tonight. It is always lit up.'] },
      3: { letter: { from: 'unsigned', text: "Sister Agnes. You have been praying very loudly. I hear everything, you know. Come up to Babel Mesa and we'll discuss your faith. I have always enjoyed a good theological argument. Cordially, G." },
        paras: ['It was nailed to the chapel door. The nail was still hot.', 'You cross yourself, load the Blessed rounds, and ride.'] },
    },
    bosses: {
      1: { cry: 'For Amos.', rest: 'Amos Crane can rest now.', reward: 'amos_harmonica',
        before: "Silas Pike owns every cow in Dry Hollow and most of the men. Ruth's letter named his Sunday visitor. Amos Crane died in Pike's stockyard. You mean to find out why.",
        taunt: '"A nun with a gun," says Silas Pike, and his jaw swings open like a gate. "Now I\'ve seen everything. Herd\'s hungry, Sister."',
        last: '"He keeps a ledger," the Steer gurgles as it burns. "The Crane boy was just a page."',
        after: "The Steer comes apart into smoke and flies. In the stockyard dust you find a battered harmonica. You will give it to Amos's brother, if you ever find him." },
      2: { cry: 'For Ruth.', rest: 'Ruth can rest now.', reward: 'ruths_rosary',
        before: "Madame Odile told the town Ruth had simply gone away. Ruth's note says otherwise. Tonight the Gilded Lily is full of music, and none of it is human.",
        taunt: '"Sister!" says Madame Odile, delighted. "Ruth sang your hymns for me, right up until she couldn\'t. Shall I teach you the words?"',
        last: '"You pray to someone who never answers," the Widow hisses. "He always answers." Then she comes apart.',
        after: "The Widow unravels, thread by thread. Tangled in the silk you find Ruth's rosary, every bead still warm. You say all fifty-nine beads, kneeling in the ruin of the Gilded Lily." },
      3: { cry: 'For all of them.', rest: '', reward: null,
        before: 'The Gentleman in Grey is waiting at the top of Babel Mesa. He has been collecting souls in this territory for longer than there has been a territory, and he has always been very polite about it.',
        taunt: '"Sister. You look tired." He does not get up. "You pray to someone who never answers. I always answer. Ask the Marshal. He asked me for one name, once, and look how generously he paid."',
        last: '',
        after: 'The Gentleman folds into himself like a letter and burns. The Between goes quiet, the way a church goes quiet after the last hymn.' },
    },
    story: {
      1: { id: 'burned_mission', title: 'The Burned Mission', kicker: 'Amos',
        text: 'The Dry Hollow mission burned the night after Amos Crane died. The padre is gone. The children who lived there are sleeping in Pike\'s barn now, and they will not stop staring at the cattle. "The cows talk," a little boy tells you. "At night. They say your name."',
        options: [
          { label: 'Bless the barn and stay the night.', run: (r, api) => { r.hp = Math.min(r.maxHp, r.hp + 12); api.gainCard('load_blessed'); r.addJournal('The Children in the Barn', 'You blessed Pike\'s barn and sat up all night with the mission children. The cattle did not talk. They only watched.'); return 'The cattle do not talk that night. They only watch. (Heal 12. Gain Load Blessed.)'; } },
          { label: 'Ask the boy what else the cows say.', run: (r, api) => { r.flags.remembered = true; api.gainCard('glimpse'); r.addJournal('What the Cows Say', '"They say the Crane family is all in the ledger," the boy said. "They say the Marshal signed it himself."'); return '"They say the Crane family is all in the ledger," he says. "They say the Marshal signed it himself." (Gain Glimpse.)'; } },
        ] },
      2: { id: 'confessional', title: 'The Confessional', kicker: 'Ruth',
        text: 'Someone is waiting in the Coldwater confessional. Through the grille you know the voice: Jonah Crane, Ruth\'s brother, who has not been inside a church in six years. "Sister," he says. "I need to tell someone what I did."',
        options: [
          { label: 'Hear his confession.', run: (r, api) => { r.flags.confessed = true; r.addInfamy(-2); r.hp = Math.min(r.maxHp, r.hp + 15); api.gainCard('last_rites'); r.addJournal('Confession', 'Jonah Crane confessed to you: the Butcher he could not catch, the polite man in grey who gave him a name, and Eli Wheeler, whom he hanged without a trial. You gave him absolution. You were not sure you had the right.'); return 'He tells you everything: the Butcher, the man in grey, Eli Wheeler, the rope. You give him absolution. You are not sure you have the right. (Heal 15. Gain Last Rites.)'; } },
          { label: '"Find Ruth first. Confess after."', run: (r, api) => { api.gainCard('blood_oath'); r.addJournal('Not Yet', 'You sent Jonah Crane away from the confessional. You told yourself it was for Ruth.'); return 'He leaves without another word. You tell yourself it was for Ruth. (Gain Blood Oath.)'; } },
        ] },
      3: { id: 'widow_and_sister', title: 'The Widow Wheeler', kicker: 'Eli',
        text: 'Martha Wheeler is sitting under the cottonwood at the foot of Babel Mesa. "You\'re the nun," she says. "The Marshal told you, didn\'t he. About Eli." She looks at your rosary. "Does God forgive a man for that?"',
        options: [
          { label: '"He does. The question is whether you can."', run: r => { r.flags.forgiven = true; r.hp = r.maxHp; r.addJournal('The Question', 'You told Martha Wheeler that God forgives. She asked whether she had to. You did not have an answer. She let you pray with her anyway.'); return 'She is quiet a long time. Then she lets you pray with her. (Health fully restored.)'; } },
          { label: '"Ask the Gentleman. He wrote the ledger."', run: (r, api) => { api.gainCard('judgment', true); r.addJournal('The Ledger', 'You told Martha Wheeler the Gentleman wrote the ledger. She handed you a box of her husband\'s shells without a word.'); return 'She hands you a box of her husband\'s shells without a word. (Gain an upgraded Judgment.)'; } },
        ] },
    },
    finale: [
      'The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is no face, only a ledger bound in black leather where a heart should be, full of names: Amos, Ruth, Clara, Eli, and thousands more. He is still smiling.',
      '"Well played, Sister. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes forever. Or pick up the hat, and you may decide who is saved. Isn\'t that what you always wanted?"',
    ],
    rest: { req: r => r.flags.confessed || r.flags.forgiven, locked: 'You would have to have heard a confession, or offered forgiveness.' },
    endings: {
      hunter: { title: 'The Riding Sister', text: ['You put a Blessed round through the ledger and say a prayer for whatever the Gentleman used to be.', 'The bishop asks for his revolver back. You tell him you lost it.', 'The Veil stays open. There are still things in the pews on Sunday. You keep Blessed rounds in the collection plate, where they are handy.'] },
      rest: { title: 'Absolution', text: ['You tear the ledger out of him and read every name aloud, one by one, and at each name the page burns white. It takes all night.', 'When you reach the end, the Sight goes out of you like a candle.', 'You go back to Coldwater. The choir needs a soprano. On the first Sunday, a tired man in a long duster sits in the back pew and, for the first time in six years, sings.'] },
      collector: { title: 'The Grey Sister', text: ['You pick up the grey hat. It fits.', 'You tell yourself you will only use it to save people. You tell yourself that for a long time.', 'The suit never gets dusty. The ledger never runs out of pages.'] },
    },
    memories: [
      'Ruth hitting the high note in "Shall We Gather at the River" and the whole congregation forgetting to breathe.',
      'Ruth stealing communion wafers to feed the chapel mouse, and confessing it every single week.',
      'Burying an empty coffin, and letting the congregation believe she was inside.',
      "Ruth's brother at the back of the church at her funeral, not coming in.",
      'Your mother telling you God speaks quietly. He has not spoken at all lately.',
      "Ruth's rosary, which you never could find after she vanished.",
    ],
    restFlash: 'You say the evening office by firelight and sleep with your rosary around the revolver.',
  },
};

/** Everything story-shaped for one hunter, in one shape. */
function storyFor(hero) {
  const alt = CHAR_STORY[hero];
  if (alt) {
    return {
      intro: alt.intro, hunt: ch => alt.hunt[ch], chapter: ch => alt.chapters[ch],
      boss: ch => ({ ...ENCOUNTERS[ch].boss, ...alt.bosses[ch] }),
      story: ch => alt.story[ch], finaleText: alt.finale, rest: alt.rest, endings: alt.endings,
      memories: alt.memories, restFlash: alt.restFlash, voiced: false,
    };
  }
  const kin = ch => FAMILY[ENCOUNTERS[ch].boss.kin];
  return {
    intro: STORY.intro, hunt: ch => `Hunting the one who killed ${kin(ch)}.`, chapter: ch => CHAPTER_INTROS[ch],
    boss: ch => ({ ...ENCOUNTERS[ch].boss, cry: `For ${kin(ch)}.`, rest: `${kin(ch)} can rest now.` }),
    story: ch => ({ ...STORY_EVENTS[ch], kicker: kin(ch) }), finaleText: FINALE.text,
    rest: { req: FINALE.options[1].req, locked: FINALE.options[1].locked }, endings: ENDINGS,
    memories: MEMORIES, restFlash: 'You sleep with your hat over your eyes and your hand on your iron. You dream of Clara laughing.', voiced: true,
  };
}

// Make available to Node (tests) as well as the browser.
if (typeof module !== 'undefined') {
  module.exports = { elitesOf, SHOWDOWN_DECKS, SHOWDOWN_FIGHTS, CHALLENGES, DAILY_TWISTS, CHAR_STORY, storyFor, HEROES, STYLE_UNLOCKS, LEDGER, cap, TONIC_SLOTS, TONICS, INFAMY, POSSE_EVENT, ROUNDS, SPECIAL_ROUNDS, STARTING_BELT, CASE, HERO, FAMILY, STATUS, CARDS, STARTER_DECK, KEEPSAKES, KEEPSAKE_POOL, ENEMIES, ENCOUNTERS, CHAPTERS, FOLK, EVENTS, STORY, CHAPTER_INTROS, STORY_EVENTS, FINALE, ENDINGS, MEMORIES, THANKS };
}
