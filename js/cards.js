'use strict';
// ---------------------------------------------------------------------------
// SLINGER — cards and the rounds they fire. Loaded before data.js.
// ---------------------------------------------------------------------------

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
// splash = damage to every other foe; dud = does nothing. mark = the symbol shown
// in the cylinder when round labels are on, for players who can't rely on colour.
// ---------------------------------------------------------------------------
const ROUNDS = {
  lead:     { name: 'Lead', mark: 'L', desc: 'A plain lead round.', color: '#d7a340' },
  silver:   { name: 'Silver', mark: 'S', desc: '+4 damage. Demons hate it.', bonus: 4, color: '#e8eef2', price: 30 },
  hellfire: { name: 'Hellfire', mark: 'H', desc: 'Sets the target alight: 3 Hellfire.', color: '#ff6a2b', price: 30,
              onHit: (c, t) => c.apply(t, 'burn', 3) },
  blessed:  { name: 'Blessed', mark: '✝', desc: '+2 damage, and burns straight through Cover.', bonus: 2, pierce: true, color: '#9fe3ff', price: 35 },
  buckshot: { name: 'Buckshot', mark: '∴', desc: 'Also deals 3 damage to every other foe.', splash: 3, color: '#b98a5a', price: 25 },
  dud:      { name: 'Dud', mark: '✕', desc: 'Does nothing. Somebody tampered with your iron.', dud: true, color: '#555' },
};
const SPECIAL_ROUNDS = ['silver', 'hellfire', 'blessed', 'buckshot'];
const STARTING_BELT = ['lead', 'lead', 'silver', 'lead', 'lead', 'lead'];

// Make available to Node (tests) as well as the browser.
if (typeof module !== 'undefined') {
  module.exports = { ROUNDS, SPECIAL_ROUNDS, STARTING_BELT, CARDS };
  Object.assign(globalThis, module.exports);
}
