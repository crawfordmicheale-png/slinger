'use strict';
// ---------------------------------------------------------------------------
// SLINGER — sound. Every effect and all the music are synthesized with the
// Web Audio API: no audio files to download.
//
//   AUDIO.sfx(name, delaySeconds)   play a sound effect
//   AUDIO.music(name)               'trail' | 'between' | 'boss' | 'farside' | 'somber' | null
//   AUDIO.unlock()                  call from a user gesture (browsers require it)
//   AUDIO.toggle('music'|'sfx'|'voice')  flip a channel on/off; remembered per browser
//   AUDIO.voice(id) / stopVoice()   play a recorded line from art/voice/<id>.mp3
// ---------------------------------------------------------------------------

const AUDIO = (() => {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } },
  };
  const on = {
    music: store.get('slinger.music') !== '0',
    sfx: store.get('slinger.sfx') !== '0',
    voice: store.get('slinger.voice') !== '0',
  };
  const LEVEL = { music: 0.26, sfx: 0.9 };

  let ctx = null;
  let bus = {};          // music, sfx, musicVerb, sfxVerb, echo
  let noiseBuf = null;
  let wanted = null;     // track requested (possibly before unlock)
  let track = null;      // { name, def, step, next, voices[] }

  // ---- setup ------------------------------------------------------------------
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    comp.connect(ctx.destination);

    bus.music = gain(on.music ? LEVEL.music : 0, comp);
    bus.sfx = gain(on.sfx ? LEVEL.sfx : 0, comp);
    bus.musicVerb = reverb(3.4, 2.4, bus.music, 0.55);
    bus.sfxVerb = reverb(2.6, 2.8, bus.sfx, 0.45);
    // Canyon echo, used by gunshots.
    const d = ctx.createDelay(1.5); d.delayTime.value = 0.31;
    const fb = gain(0.33); const lp = filter('lowpass', 1600);
    bus.echo = gain(1);
    bus.echo.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d);
    lp.connect(gain(0.45, bus.sfx));

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    setInterval(tick, 40);
    if (wanted) startTrack(wanted);
  }

  function toggle(ch) {
    on[ch] = !on[ch];
    store.set('slinger.' + ch, on[ch] ? '1' : '0');
    if (ch === 'voice') { if (!on.voice) stopVoice(); }
    else if (ctx) bus[ch].gain.setTargetAtTime(on[ch] ? LEVEL[ch] : 0, ctx.currentTime, 0.08);
    return on[ch];
  }

  // ---- primitives ---------------------------------------------------------------
  function gain(v, dest) { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  function filter(type, f, q = 0.8) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function reverb(seconds, decay, dest, wet) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    const input = gain(1); input.connect(conv); conv.connect(gain(wet, dest));
    return input;
  }
  /** Envelope: silence -> peak in `a` s -> ~silence after `d` more seconds. */
  function env(param, t, a, peak, d) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, dur, dest) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function noise(t, dur, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s;
  }
  /** A voice: a gain node feeding a bus, with an optional reverb send. */
  function voice(dest, verb, wet) {
    const g = gain(0, dest);
    if (verb && wet) g.connect(gain(wet, verb));
    return g;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // Plucked string (Karplus-Strong), cached per pitch. Sounds like a nylon guitar.
  const ksCache = {};
  function ksBuffer(f) {
    const key = f.toFixed(2);
    if (ksCache[key]) return ksCache[key];
    const sr = ctx.sampleRate, n = Math.floor(sr * 2.4), P = Math.max(2, Math.round(sr / f));
    const buf = ctx.createBuffer(1, n, sr), out = buf.getChannelData(0), ring = new Float32Array(P);
    let prev = 0;
    for (let i = 0; i < P; i++) { const r = Math.random() * 2 - 1; ring[i] = 0.5 * (r + prev); prev = r; } // softened pluck
    for (let i = 0, k = 0; i < n; i++, k = (k + 1) % P) {
      const v = ring[k];
      out[i] = v;
      ring[k] = 0.4985 * (v + ring[(k + 1) % P]);
    }
    return (ksCache[key] = buf);
  }
  function pluck(m, t, vol = 0.5, dest = bus.music, bend = 0) {
    const s = ctx.createBufferSource(); s.buffer = ksBuffer(hz(m));
    if (bend) { s.playbackRate.setValueAtTime(1, t); s.playbackRate.linearRampToValueAtTime(Math.pow(2, bend / 12), t + 0.6); }
    const g = voice(dest, dest === bus.music ? bus.musicVerb : bus.sfxVerb, 0.35);
    g.gain.setValueAtTime(vol, t);
    const lp = filter('lowpass', 2600); s.connect(lp); lp.connect(g);
    s.start(t); s.stop(t + 2.4);
  }
  // The lonesome whistle of every western ever made.
  function whistle(m, t, dur, vol = 0.12, bendTo = null) {
    const o = osc('sine', hz(m), t, dur + 0.3, ctx.createGain());
    if (bendTo !== null) o.frequency.linearRampToValueAtTime(hz(bendTo), t + dur);
    const vib = osc('sine', 5.4, t, dur + 0.3, ctx.createGain());
    const vd = gain(0); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(hz(m) * 0.012, t + dur * 0.6);
    vib.disconnect(); vib.connect(vd); vd.connect(o.frequency);
    const g = voice(bus.music, bus.musicVerb, 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.09);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    o.disconnect(); o.connect(g);
  }
  function tom(t, f = 72, vol = 0.5, dest = bus.music) {
    const g = voice(dest, dest === bus.music ? bus.musicVerb : bus.sfxVerb, 0.25);
    const o = osc('sine', f, t, 0.5, g); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.35);
    env(g.gain, t, 0.005, vol, 0.4);
  }
  function tick_(t, vol = 0.05, f = 1200, dest = bus.music) { // woodblock / hoof / hat
    const g = voice(dest); const bp = filter('bandpass', f, 6);
    noise(t, 0.06, bp); bp.connect(g); env(g.gain, t, 0.002, vol, 0.05);
  }
  function bell(m, t, vol = 0.1) { // FM bell, for the Between
    const g = voice(bus.music, bus.musicVerb, 0.8);
    const car = osc('sine', hz(m), t, 4, g);
    const mod = ctx.createOscillator(); mod.frequency.value = hz(m) * 3.51;
    const md = gain(0); md.gain.setValueAtTime(hz(m) * 2.2, t); md.gain.exponentialRampToValueAtTime(1, t + 3);
    mod.connect(md); md.connect(car.frequency); mod.start(t); mod.stop(t + 4);
    env(g.gain, t, 0.004, vol, 3.6);
  }
  function swell(t, dur, vol = 0.08) { // reversed-cymbal rush
    const g = voice(bus.music, bus.musicVerb, 0.6); const lp = filter('lowpass', 400);
    lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(4000, t + dur);
    noise(t, dur, lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.setValueAtTime(0.0001, t + dur + 0.01);
  }
  /** A held drone for a track; returns a stop function. */
  function drone(notes, cutoff, vol, lfoRate) {
    const t = ctx.currentTime;
    const g = voice(bus.music, bus.musicVerb, 0.4);
    const lp = filter('lowpass', cutoff, 2); lp.connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = lfoRate;
    const ld = gain(cutoff * 0.6); lfo.connect(ld); ld.connect(lp.frequency); lfo.start();
    const oscs = [];
    notes.forEach(m => [-7, 7].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
      o.connect(lp); o.start(); oscs.push(o);
    }));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 2.5);
    return () => {
      const n = ctx.currentTime;
      g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value || 0.0001, n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + 1.5);
      oscs.forEach(o => o.stop(n + 1.6)); lfo.stop(n + 1.6);
    };
  }

  // ---- music ------------------------------------------------------------------------
  const TRAIL_CHORDS = [ // 6/8, one chord per bar, arpeggio in eighths
    [45, 52, 57, 60, 57, 52], [45, 52, 57, 60, 64, 60], // Am
    [43, 50, 55, 59, 55, 50], [43, 50, 55, 59, 62, 59], // G
    [41, 48, 53, 57, 53, 48], [41, 48, 53, 57, 60, 57], // F
    [40, 47, 52, 56, 52, 47], [40, 47, 52, 56, 59, 56], // E
  ];
  const TRAIL_TUNE = [ // [step, midi, length in steps]
    [0, 69, 3], [3, 72, 2], [5, 71, 1], [6, 69, 5],
    [12, 67, 3], [15, 71, 2], [17, 74, 1], [18, 72, 5],
    [24, 69, 2], [26, 72, 1], [27, 69, 3], [30, 65, 5],
    [36, 68, 3], [39, 71, 2], [41, 76, 6],
  ];
  const TRACKS = {
    // A minor, 6/8, a lone guitar and a whistle. Hooves on the off-beats.
    trail: {
      dur: 60 / 80 / 2, len: 48,
      step(i, t, loop) {
        const bar = Math.floor(i / 6), n = i % 6;
        pluck(TRAIL_CHORDS[bar][n], t, n === 0 ? 0.55 : 0.36);
        if (n === 0) tom(t, 64, 0.22);
        if (n === 0 || n === 3) tick_(t, 0.035, 900);
        if (n === 2 || n === 5) tick_(t, 0.02, 1500);
        if (loop % 2 === 1) for (const [s, m, l] of TRAIL_TUNE) if (s === i) whistle(m, t, l * this.dur * 0.95, 0.1, l >= 5 ? m - 1 : null);
      },
    },
    // D minor, slow. A drone, a heartbeat, bells from nowhere.
    between: {
      dur: 60 / 58, len: 16,
      start() { return drone([26, 33], 240, 0.09, 0.07); },
      step(i, t) {
        if (i % 4 === 0) { tom(t, 58, 0.4); tom(t + 0.24, 52, 0.28); }
        if (Math.random() < 0.38) bell([62, 65, 69, 72, 74, 77][Math.floor(Math.random() * 6)], t + Math.random() * 0.2, 0.05);
        if (i === 2 || i === 10) pluck(i === 2 ? 50 : 45, t, 0.3, bus.music, -0.6);
        if (i === 12) swell(t, this.dur * 3.8, 0.05);
      },
    },
    // E phrygian, driving. For the three who killed your family.
    boss: {
      dur: 60 / 104 / 2, len: 32,
      start() { return drone([28, 35], 380, 0.1, 0.25); },
      step(i, t, loop) {
        if ([0, 3, 6, 8, 11, 14].includes(i % 16)) tom(t, 78, 0.5);
        tick_(t, i % 2 ? 0.015 : 0.03, 6000);
        pluck([52, 53, 52, 51, 52, 53, 55, 53][i % 8], t, 0.28);
        if (i === 0 && loop % 2 === 0) whistle(76, t, this.dur * 12, 0.08, 75);
        if (i === 16 && loop % 2 === 1) whistle(71, t, this.dur * 8, 0.07, 70);
      },
    },
    // The Far Side: a music-box waltz in D minor over a low drone, for Chapter IV.
    farside: {
      dur: 60 / 66, len: 24,
      start() { return drone([26, 33], 260, 0.06, 0.05); },
      step(i, t, loop) {
        const bar = Math.floor(i / 3), beat = i % 3;
        const roots = [50, 46, 48, 45, 50, 46, 43, 45]; // Dm Bb C A, Dm Bb Gm A
        const minor = [0, 1, 0, 1, 0, 1, 0, 1][bar];
        if (beat === 0) pluck(roots[bar] - 12, t, 0.32);
        else pluck(roots[bar] + (beat === 1 ? 3 + minor : 7), t, 0.13);
        const MEL = [74, 0, 77, 76, 0, 74, 72, 0, 70, 69, 0, 0, 74, 0, 77, 79, 0, 77, 76, 74, 73, 74, 0, 0];
        if (MEL[i] && (loop % 3 !== 2 || i < 12)) bell(MEL[i], t, 0.042);
        if (loop % 2 === 1 && i === 12) whistle(69, t, this.dur * 5, 0.06, 68);
      },
    },
    // Plays once, then silence.
    somber: {
      dur: 60 / 56 / 2, len: 36, once: true,
      step(i, t) {
        const arp = [45, 52, 57, 60, 57, 52];
        if (i < 24) pluck(arp[i % 6] - (i >= 12 ? 5 : 0), t, 0.35);
        if (i === 6) whistle(69, t, this.dur * 5, 0.09);
        if (i === 12) whistle(67, t, this.dur * 5, 0.08);
        if (i === 18) whistle(64, t, this.dur * 10, 0.08, 63);
      },
    },
  };

  function startTrack(name) {
    if (track && track.stop) track.stop();
    track = null;
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name];
    track = { name, def, step: 0, loop: 0, next: ctx.currentTime + 0.15 };
    if (def.start) track.stop = def.start();
  }

  function music(name) {
    if (wanted === name) return;
    wanted = name;
    if (ctx) startTrack(name);
  }

  function tick() {
    if (!track || !ctx) return;
    const now = ctx.currentTime;
    if (track.next < now - 0.5) track.next = now + 0.05; // tab was asleep; don't play catch-up
    while (track && track.next < now + 0.15) {
      if (on.music) track.def.step(track.step, track.next, track.loop);
      track.next += track.def.dur;
      if (++track.step >= track.def.len) {
        track.step = 0; track.loop++;
        if (track.def.once) { track = null; }
      }
    }
  }

  // ---- sound effects -----------------------------------------------------------------
  const FX = {
    shot(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.25); g.connect(bus.echo);
      const bp = filter('bandpass', 1400, 0.7); noise(t, 0.3, bp); bp.connect(g); env(g.gain, t, 0.001, 1, 0.22);
      const crack = voice(bus.sfx); const hp = filter('highpass', 4000); noise(t, 0.05, hp); hp.connect(crack); env(crack.gain, t, 0.001, 0.7, 0.03);
      const th = voice(bus.sfx); const o = osc('sine', 140, t, 0.25, th); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); env(th.gain, t, 0.002, 0.9, 0.2);
    },
    reload(t) {
      [0, 0.11, 0.22].forEach((d, k) => {
        const g = voice(bus.sfx); const bp = filter('bandpass', 2600 + k * 300, 8); noise(t + d, 0.04, bp); bp.connect(g); env(g.gain, t + d, 0.001, 0.5, 0.035);
        const p = voice(bus.sfx); osc('sine', 1900 - k * 150, t + d, 0.08, p); env(p.gain, t + d, 0.001, 0.08, 0.06);
      });
      for (let k = 0; k < 6; k++) { const d = 0.38 + k * (0.045 - k * 0.004); tick_(t + d, 0.18, 3200, bus.sfx); }
    },
    whoosh(t, vol = 0.25) {
      const g = voice(bus.sfx); const bp = filter('bandpass', 400, 1.2);
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
      noise(t, 0.3, bp); bp.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    },
    deal(t) { const g = voice(bus.sfx); const hp = filter('highpass', 2500); noise(t, 0.05, hp); hp.connect(g); env(g.gain, t, 0.002, 0.12, 0.04); },
    blade(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.2); const hp = filter('highpass', 2000, 1);
      hp.frequency.setValueAtTime(2000, t); hp.frequency.exponentialRampToValueAtTime(7000, t + 0.14);
      noise(t, 0.18, hp); hp.connect(g); env(g.gain, t, 0.005, 0.5, 0.14);
      const r = voice(bus.sfx, bus.sfxVerb, 0.3); osc('triangle', 2350, t + 0.03, 0.5, r); env(r.gain, t + 0.03, 0.002, 0.07, 0.4);
    },
    claw(t) {
      [0, 0.05, 0.1].forEach(d => {
        const g = voice(bus.sfx); const bp = filter('bandpass', 700, 1.5);
        bp.frequency.setValueAtTime(700, t + d); bp.frequency.exponentialRampToValueAtTime(3200, t + d + 0.12);
        noise(t + d, 0.14, bp); bp.connect(g); env(g.gain, t + d, 0.004, 0.45, 0.11);
      });
      const gr = voice(bus.sfx); const o = osc('sawtooth', 90, t, 0.3, filter('lowpass', 500)); o.disconnect();
      const lp = filter('lowpass', 420); o.connect(lp); lp.connect(gr); env(gr.gain, t, 0.02, 0.25, 0.25);
    },
    hit(t) {
      const g = voice(bus.sfx); const o = osc('sine', 110, t, 0.2, g); o.frequency.exponentialRampToValueAtTime(48, t + 0.15); env(g.gain, t, 0.002, 0.6, 0.17);
      const n = voice(bus.sfx); const lp = filter('lowpass', 900); noise(t, 0.08, lp); lp.connect(n); env(n.gain, t, 0.001, 0.35, 0.06);
    },
    hurt(t) {
      FX.hit(t);
      const g = voice(bus.sfx); const lp = filter('lowpass', 600); const o = osc('sawtooth', 70, t, 0.35, lp); lp.connect(g);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.3); env(g.gain, t, 0.01, 0.25, 0.3);
    },
    death(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.6); const bp = filter('bandpass', 900, 3);
      const o = osc('sawtooth', 620, t, 1.2, bp); o.frequency.exponentialRampToValueAtTime(70, t + 1.1);
      const lfo = osc('sine', 11, t, 1.2, gain(30)); lfo.disconnect(); const ld = gain(40); lfo.connect(ld); ld.connect(o.frequency);
      bp.connect(g); env(g.gain, t, 0.03, 0.7, 1.1);
      for (let k = 0; k < 14; k++) tick_(t + 0.2 + Math.random() * 0.9, 0.08 + Math.random() * 0.08, 800 + Math.random() * 2500, bus.sfx);
    },
    cover(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.35);
      osc('sine', 1180, t, 0.6, g); osc('sine', 1770, t, 0.6, g); env(g.gain, t, 0.002, 0.12, 0.5);
      const n = voice(bus.sfx); const hp = filter('highpass', 5000); noise(t, 0.06, hp); hp.connect(n); env(n.gain, t, 0.001, 0.2, 0.05);
    },
    hex(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.7);
      const a = osc('sine', 220, t, 0.6, g), b = osc('sine', 233, t, 0.6, g);
      a.frequency.exponentialRampToValueAtTime(660, t + 0.45); b.frequency.exponentialRampToValueAtTime(700, t + 0.45);
      env(g.gain, t, 0.03, 0.14, 0.5);
    },
    buff(t) { [0, 0.07, 0.14].forEach((d, k) => { const g = voice(bus.sfx, bus.sfxVerb, 0.5); osc('triangle', hz(62 + k * 4), t + d, 0.5, g); env(g.gain, t + d, 0.01, 0.1, 0.4); }); },
    burn(t) { for (let k = 0; k < 8; k++) tick_(t + Math.random() * 0.4, 0.16, 1500 + Math.random() * 3000, bus.sfx); },
    heal(t) { [72, 76, 79, 84].forEach((m, k) => { const g = voice(bus.sfx, bus.sfxVerb, 0.6); osc('sine', hz(m), t + k * 0.08, 0.7, g); env(g.gain, t + k * 0.08, 0.005, 0.08, 0.6); }); },
    coin(t) { [88, 93].forEach((m, k) => { const g = voice(bus.sfx, bus.sfxVerb, 0.3); osc('triangle', hz(m), t + k * 0.07, 0.3, g); env(g.gain, t + k * 0.07, 0.002, 0.12, 0.25); }); },
    click(t) { tick_(t, 0.12, 2200, bus.sfx); },
    sight(t) { // looking through the Veil
      const g = voice(bus.sfx, bus.sfxVerb, 0.9);
      [0, 7, 12].forEach(iv => { const o = osc('sine', hz(64 + iv), t, 1.4, g); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(-40, t + 1.3); });
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    },
    slip(t) { // entering the Between
      const g = voice(bus.sfx, bus.sfxVerb, 0.8); const lp = filter('lowpass', 200);
      lp.frequency.setValueAtTime(200, t); lp.frequency.exponentialRampToValueAtTime(3000, t + 1.1);
      noise(t, 1.2, lp); lp.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 1.1); g.gain.setValueAtTime(0.0001, t + 1.12);
      FX.boom(t + 1.12);
    },
    boom(t) {
      const g = voice(bus.sfx, bus.sfxVerb, 0.9); const o = osc('sine', 60, t, 2, g); o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
      env(g.gain, t, 0.005, 0.9, 1.7);
    },
    wrong(t) { const g = voice(bus.sfx, bus.sfxVerb, 0.6); const o = osc('triangle', 104, t, 1.2, g); o.frequency.linearRampToValueAtTime(92, t + 1); env(g.gain, t, 0.01, 0.3, 1.1); },
    toll(t) { bell(45, t, 0.3); bell(57, t + 0.01, 0.12); },
    bark(t) { // Ranger: two short ruffs
      [0, 0.16].forEach((d, k) => {
        const g = voice(bus.sfx, bus.sfxVerb, 0.15); const bp = filter('bandpass', 620 - k * 60, 2.2);
        bp.frequency.setValueAtTime(820 - k * 80, t + d); bp.frequency.exponentialRampToValueAtTime(420, t + d + 0.12);
        noise(t + d, 0.14, bp); bp.connect(g); env(g.gain, t + d, 0.008, 0.55, 0.11);
        const o = osc('sawtooth', 260 - k * 30, t + d, 0.14, filter('lowpass', 900)); o.disconnect();
        const lp = filter('lowpass', 900); const og = voice(bus.sfx); o.connect(lp); lp.connect(og);
        o.frequency.exponentialRampToValueAtTime(150, t + d + 0.12); env(og.gain, t + d, 0.006, 0.18, 0.11);
      });
    },
    snap(t) { // a trap's iron jaws
      const n = voice(bus.sfx, bus.sfxVerb, 0.3); const hp = filter('highpass', 2500); noise(t, 0.05, hp); hp.connect(n); env(n.gain, t, 0.001, 0.7, 0.04);
      [1840, 2390, 3110].forEach((f, k) => { const g = voice(bus.sfx, bus.sfxVerb, 0.4); osc('triangle', f, t + 0.005 * k, 0.4, g); env(g.gain, t + 0.005 * k, 0.001, 0.09, 0.32); });
      tom(t, 90, 0.25, bus.sfx);
    },
  };

  // ---- voice acting -----------------------------------------------------------------
  // Recorded lines play through a plain <audio> element (works from file:// too);
  // the music ducks underneath while someone is talking.
  let speaking = null;
  function duck(down) {
    if (ctx && on.music) bus.music.gain.setTargetAtTime(down ? LEVEL.music * 0.3 : LEVEL.music, ctx.currentTime, 0.25);
  }
  function stopVoice() {
    if (!speaking) return;
    speaking.pause();
    speaking = null;
    duck(false);
  }
  function speak(id, delay = 0.6) {
    stopVoice();
    if (!on.voice || !id) return;
    const a = new Audio(`art/voice/${id}.mp3`);
    a.volume = 1;
    speaking = a;
    a.addEventListener('ended', () => { if (speaking === a) { speaking = null; duck(false); } });
    setTimeout(() => {
      if (speaking !== a) return;
      duck(true);
      const p = a.play();
      if (p && p.catch) p.catch(() => { if (speaking === a) { speaking = null; duck(false); } });
    }, delay * 1000);
  }

  function sfx(name, delay = 0) {
    if (!ctx || !on.sfx || !FX[name]) return;
    try { FX[name](ctx.currentTime + 0.01 + delay); } catch (e) { /* never let sound break the game */ }
  }

  /** Run every effect and one bar of every track; returns any errors (used by tests). */
  function selfCheck() {
    unlock();
    const errs = [];
    const t = ctx.currentTime + 0.05;
    for (const n of Object.keys(FX)) { try { FX[n](t); } catch (e) { errs.push(n + ': ' + e.message); } }
    for (const [n, def] of Object.entries(TRACKS)) {
      try { const stop = def.start && def.start(); for (let i = 0; i < def.len; i++) def.step(i, t + i * 0.01, 1); if (stop) stop(); }
      catch (e) { errs.push('track ' + n + ': ' + e.message); }
    }
    return errs;
  }

  return { unlock, music, sfx, voice: speak, stopVoice, toggle, isOn: ch => on[ch], selfCheck };
})();
