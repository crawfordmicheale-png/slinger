'use strict';
// ---------------------------------------------------------------------------
// SLINGER — tiny inline-SVG silhouettes for people and demons.
// ---------------------------------------------------------------------------

const ART = (() => {
  const EYES = (y = 30, gap = 6) =>
    `<g class="eyes"><circle cx="${50 - gap}" cy="${y}" r="2.6"/><circle cx="${50 + gap}" cy="${y}" r="2.6"/></g>`;
  const BODY = 'M27 58 Q50 44 73 58 L82 120 L18 120 Z';
  const HEAD = '<circle cx="50" cy="32" r="13"/>';
  const HAT = '<ellipse cx="50" cy="22" rx="24" ry="4.5"/><path d="M37 22 L39 6 Q50 2 61 6 L63 22Z"/>';
  const HORNS = '<path class="horn" d="M40 22 Q30 10 34 0 Q38 12 45 19Z M60 22 Q70 10 66 0 Q62 12 55 19Z"/>';

  const parts = {
    hat: () => HEAD + HAT + `<path d="${BODY}"/>` + EYES(),
    jaw: () => HEAD + `<path d="${BODY}"/>` +
      '<path class="maw" d="M38 34 Q50 52 62 34 Q50 40 38 34Z"/>' +
      '<path class="tooth" d="M41 36 l2 5 l2-4 l2 5 l2-5 l2 5 l2-5 l2 5 l2-5 l2 4Z"/>' +
      '<path class="blade" d="M76 70 L96 40 L98 42 L80 74Z"/>' + EYES(28),
    veil: () => HEAD + `<path d="${BODY}"/>` +
      '<path class="veil" d="M34 22 Q50 8 66 22 L74 70 Q50 78 26 70Z"/>' + EYES(32, 5),
    noose: () => HEAD + HAT + `<path d="${BODY}"/>` +
      '<path class="rope" d="M50 -2 L50 12 M44 46 Q50 54 56 46"/>' +
      '<path class="blade" d="M18 80 L8 70 L14 64 L24 74Z"/>' + EYES(),
    crook: () => HEAD + `<path d="${BODY}"/>` +
      '<path class="rope thick" d="M84 120 L84 30 Q84 14 72 14 Q62 14 64 26"/>' +
      '<path class="collar" d="M44 50 h12 v6 h-12z"/>' + EYES(),
    card: () => HEAD + HAT + `<path d="${BODY}"/>` +
      '<g class="cardprop"><rect x="70" y="64" width="18" height="26" rx="2" transform="rotate(18 79 77)"/><text x="75" y="82" transform="rotate(18 79 77)">A</text></g>' + EYES(),
    coffin: () => '<path class="coffin" d="M30 4 L70 4 L82 30 L70 118 L30 118 L18 30Z"/>' + HEAD + HAT + `<path d="${BODY}"/>` + EYES(),
    candle: () => `<path d="${BODY}"/>` +
      '<path d="M38 50 L38 24 Q44 20 50 24 Q56 20 62 24 L62 50Z"/>' +
      '<path class="flame" d="M50 4 Q58 14 50 22 Q42 14 50 4Z"/>' +
      '<path class="drip" d="M40 28 v10 a2 2 0 0 0 4 0 v-8 M56 30 v14 a2 2 0 0 0 4 0 v-12"/>' + EYES(36, 5),
    grey: () => `<circle cx="50" cy="34" r="12"/>` +
      '<ellipse cx="50" cy="24" rx="20" ry="3.5"/><path d="M40 24 L40 -4 L60 -4 L60 24Z"/>' +
      `<path d="${BODY}"/><path class="lapel" d="M43 50 L50 72 L57 50 L53 48 L50 60 L47 48Z"/>` +
      '<path class="rope" d="M84 120 L84 64"/><circle class="knob" cx="84" cy="62" r="3"/>' + EYES(34, 5),
    rider: () => HEAD + HAT + `<path d="${BODY}"/>` +
      '<path class="ribs" d="M36 70 Q50 64 64 70 M34 80 Q50 74 66 80 M33 90 Q50 84 67 90 M50 60 L50 100"/>' + EYES(),
    hound: () => '<path d="M10 90 Q14 64 34 62 L60 60 Q70 46 80 44 L92 36 L90 50 L96 58 L84 64 L78 78 L80 110 L72 110 L68 84 L40 86 L34 110 L26 110 L26 86 Q16 90 10 108Z"/>' +
      '<g class="eyes"><circle cx="86" cy="50" r="2.4"/></g><path class="flame" d="M12 88 Q2 76 8 66 Q12 78 16 80Z"/>',
    spider: () => '<g class="legs"><path d="M40 60 L14 44 L6 70 M40 66 L12 66 L4 92 M60 60 L86 44 L94 70 M60 66 L88 66 L96 92 M42 72 L20 88 L16 112 M58 72 L80 88 L84 112 M44 56 L30 30 L22 40 M56 56 L70 30 L78 40"/></g>' +
      '<ellipse cx="50" cy="74" rx="18" ry="16"/><circle cx="50" cy="54" r="10"/>' +
      '<g class="eyes"><circle cx="46" cy="52" r="2"/><circle cx="54" cy="52" r="2"/><circle cx="43" cy="56" r="1.4"/><circle cx="57" cy="56" r="1.4"/></g>',
    crow: () => '<path d="M50 30 Q66 30 70 46 L96 54 L70 60 Q72 84 60 100 L66 118 L56 106 L48 118 L48 100 Q28 84 30 58 L6 46 L32 44 Q36 30 50 30Z"/>' +
      '<path class="beak" d="M50 38 L40 44 L50 46Z"/><g class="eyes"><circle cx="54" cy="40" r="2.4"/></g>',
    lamb: () => '<g><circle cx="36" cy="70" r="16"/><circle cx="58" cy="66" r="18"/><circle cx="48" cy="84" r="16"/><circle cx="66" cy="84" r="14"/></g>' +
      '<path d="M40 96 L38 116 L44 116 L46 96Z M60 96 L62 116 L68 116 L66 96Z"/>' +
      '<circle cx="28" cy="54" r="11"/><path class="horn" d="M22 46 Q10 40 14 54 Q18 48 24 52Z M34 46 Q46 38 44 52 Q40 46 32 50Z"/>' +
      '<g class="eyes"><circle cx="24" cy="56" r="2"/><circle cx="32" cy="56" r="2"/></g>',
    steer: () => '<path class="horn" d="M30 30 Q6 26 2 8 Q14 20 34 22Z M70 30 Q94 26 98 8 Q86 20 66 22Z"/>' +
      '<path d="M30 20 Q50 12 70 20 L66 56 Q60 74 50 76 Q40 74 34 56Z"/>' +
      '<path d="M18 120 Q20 76 40 72 L60 72 Q80 76 82 120Z"/>' +
      '<path class="maw" d="M44 66 Q50 70 56 66"/><circle class="ring" cx="50" cy="70" r="4"/>' +
      '<g class="eyes"><circle cx="41" cy="38" r="3"/><circle cx="59" cy="38" r="3"/></g>',
    widow: () => '<g class="legs"><path d="M40 60 L8 30 L2 60 M40 70 L6 70 L0 104 M60 60 L92 30 L98 60 M60 70 L94 70 L100 104"/></g>' +
      HEAD + '<path d="M36 24 Q50 4 64 24 Q60 12 50 12 Q40 12 36 24Z"/>' +
      '<path d="M36 50 Q50 44 64 50 L60 70 L90 120 L10 120 L40 70Z"/>' +
      '<path class="veil" d="M36 22 Q50 14 64 22 L62 44 Q50 48 38 44Z"/>' + EYES(32, 5),
    train: () => '<path d="M14 118 L14 50 L30 50 L30 24 L44 24 L44 50 L86 50 L86 118Z"/>' +
      '<path d="M28 24 L46 24 L42 12 L32 12Z"/><path class="grate" d="M20 100 L80 100 M24 108 L76 108 M28 116 L72 116"/>' +
      '<circle class="lamp" cx="64" cy="72" r="12"/><path class="flame" d="M34 10 Q30 -2 38 -6 Q36 2 42 6Z"/>',
  };

  function demon(art) {
    const inner = (parts[art] || parts.hat)();
    return `<svg class="art demon art-${art}" viewBox="0 0 100 120" aria-hidden="true">${inner}</svg>`;
  }

  // Townsfolk silhouettes: hat, bonnet, bare head. If `revealed` and demon, horns & eyes.
  function folk(seed, reveal) {
    const style = seed % 3;
    let head = '<circle cx="50" cy="34" r="13"/>';
    if (style === 0) head += HAT;
    if (style === 1) head += '<path d="M34 34 Q34 14 50 14 Q66 14 66 34 L70 38 Q50 30 30 38Z"/>';
    const body = seed % 2 ? `<path d="${BODY}"/>` : '<path d="M30 58 Q50 46 70 58 L90 120 L10 120 Z"/>';
    let extra = '';
    if (reveal === 'demon') extra = HORNS + EYES(34, 5);
    if (reveal === 'human') extra = '<g class="halo"><ellipse cx="50" cy="34" rx="22" ry="22"/></g>';
    const cls = reveal ? `revealed-${reveal}` : '';
    return `<svg class="art folk ${cls}" viewBox="0 0 100 120" aria-hidden="true">${reveal === 'human' ? extra : ''}${head}${body}${reveal === 'demon' ? extra : ''}</svg>`;
  }

  function hero() {
    return `<svg class="art hero" viewBox="0 0 100 120" aria-hidden="true">
      <ellipse cx="46" cy="22" rx="30" ry="5"/><path d="M32 22 L35 4 Q46 0 57 4 L60 22Z"/>
      <circle cx="46" cy="34" r="12"/>
      <path class="bandana" d="M34 38 Q46 50 58 38 L58 44 Q46 54 34 44Z"/>
      <path d="M24 56 Q46 44 66 56 L74 90 L82 120 L12 120 L18 90Z"/>
      <path class="duster" d="M18 90 L8 120 L26 120Z M74 90 L90 120 L70 120Z"/>
      <path class="iron" d="M66 82 L92 76 L93 81 L72 86 L74 94 L66 96Z"/>
      <g class="eyes hero-eye"><circle cx="51" cy="32" r="1.8"/></g>
    </svg>`;
  }

  const eye = (on = true) =>
    `<svg class="eye-ico ${on ? 'on' : 'off'}" viewBox="0 0 24 16" aria-hidden="true"><path d="M1 8 Q12 -4 23 8 Q12 20 1 8Z"/><circle cx="12" cy="8" r="3.4"/></svg>`;

  // Painted art (art/*.webp). The SVG silhouettes above remain as a fallback
  // when an image fails to load.
  const img = (file, cls, alt, fallback) =>
    `<img class="${cls}" src="art/${file}.webp" alt="${alt}" draggable="false" loading="lazy" ` +
    `onerror="this.outerHTML=this.dataset.fb" data-fb="${fallback.replace(/"/g, '&quot;')}">`;
  const demonArt = id => img(id, 'paint demon-paint', ENEMIES[id].name, demon(ENEMIES[id].art));
  const heroArt = (key = 'jonah') => img(HEROES[key].art, 'paint hero-paint', HEROES[key].name, hero());
  const folkArt = (f, demonId, seed) =>
    `<div class="portrait-stack">${img(f.img || 'folk_0', 'paint guise', f.name, folk(seed, null))}` +
    (demonId ? img(demonId, 'paint true-form', ENEMIES[demonId].name, demon(ENEMIES[demonId].art)) : '') + '</div>';

  const dogArt = () => img('ranger', 'paint dog-paint', 'Ranger', demon('hound'));

  return { demon, folk, hero, eye, demonArt, heroArt, folkArt, dogArt };
})();
