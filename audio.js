"use strict";
// ============================================================================
// BALAKOTUWA — sound. Every sound is synthesised live with WebAudio: no
// recordings, no downloads. game.js calls SOUND.play(kind) for effects and
// SOUND.update() once a frame for the ambience (season beds, wildlife, drums).
// Reads S and audio from game.js; never changes game state.
// ============================================================================
const SOUND = (() => {
  let ac = null, master, fx, bed, noise;
  const beds = {};
  const next = { bird: 0, koel: 0, thunder: 0, frog: 0, drum: 0 };
  let beat = 0;
  // Every one-shot is varied a little each time it plays (the ear catches exact
  // repeats fast): pitch, filter and level, chosen once per play. Ambience is not.
  const SAME = { pitch: 1, filt: 1, vol: 1 };
  let vary = SAME;
  const IN_TUNE = new Set(["harvest", "win", "lose"]); // melodic: level only, keep the key

  function init() {
    if (ac) return true;
    try {
      ac = audio.ctx || new AudioContext();
      audio.ctx = ac;
      const comp = ac.createDynamicsCompressor();
      comp.connect(ac.destination);
      master = gainNode(0.75, comp);
      fx = gainNode(0.9, master);
      bed = gainNode(0.6, master);
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = i % 2 ? w : b * 3.5; }
      return true;
    } catch (e) { audio.on = false; return false; }
  }
  function gainNode(v, to) { const g = ac.createGain(); g.gain.value = v; g.connect(to); return g; }

  // ---- building blocks ----
  function env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(t, f, { type = "sine", dur = 0.2, vol = 0.2, a = 0.005, f2 = null, out = fx } = {}) {
    const v = out === fx ? vary : SAME;
    f *= v.pitch; if (f2) f2 *= v.pitch; vol *= v.vol;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
    env(g, t, vol, a, dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function hiss(t, { dur = 0.2, vol = 0.2, a = 0.003, type = "bandpass", f = 1000, f2 = null, q = 1, out = fx } = {}) {
    const v = out === fx ? vary : SAME;
    f *= v.filt; if (f2) f2 *= v.filt; vol *= v.vol;
    const s = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; s.loop = true;
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
    env(g, t, vol, a, dur);
    s.connect(flt).connect(g).connect(out);
    s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
  }
  // a looping filtered-noise bed whose level follows a target
  function makeBed(type, f, q, amF = 0, amDepth = 0) {
    const s = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; s.loop = true;
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    g.gain.value = 0;
    let node = flt;
    if (amF) {
      const am = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
      am.gain.value = 1 - amDepth; lfo.frequency.value = amF; depth.gain.value = amDepth;
      lfo.connect(depth).connect(am.gain); lfo.start();
      flt.connect(am); node = am;
    }
    s.connect(flt); node.connect(g).connect(bed);
    s.start();
    return g;
  }
  const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];

  // ---- one-shot effects ----
  const KINDS = {
    build(t) { // two wooden knocks
      for (const k of [0, 0.09]) { hiss(t + k, { f: 900, q: 6, dur: 0.06, vol: 0.5 }); tone(t + k, 190, { type: "triangle", dur: 0.07, vol: 0.18 }); }
    },
    conch(t) { // sankha: a breathy horn with a slow swell and vibrato
      const o = ac.createOscillator(), flt = ac.createBiquadFilter(), g = ac.createGain();
      const lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(148, t + 0.4); o.frequency.linearRampToValueAtTime(138, t + 1.5);
      lfo.frequency.value = 5.2; lg.gain.value = 2.5; lfo.connect(lg).connect(o.frequency);
      flt.type = "lowpass"; flt.frequency.setValueAtTime(400, t); flt.frequency.linearRampToValueAtTime(1300, t + 0.35); flt.frequency.linearRampToValueAtTime(700, t + 1.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.25); g.gain.setValueAtTime(0.22, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      o.connect(flt).connect(g).connect(fx); o.start(t); lfo.start(t); o.stop(t + 1.8); lfo.stop(t + 1.8);
      hiss(t, { f: 1500, q: 2, a: 0.2, dur: 1.4, vol: 0.05 });
    },
    harvest(t) { // a plucked pentatonic phrase
      const base = Math.floor(Math.random() * 3);
      [0, 2, 4].forEach((k, i) => tone(t + i * 0.09, PENTA[base + k], { type: "triangle", dur: 0.35, vol: 0.12 }));
    },
    hit(t) { // metal on metal
      tone(t, 420 + Math.random() * 60, { type: "square", dur: 0.12, vol: 0.05 });
      tone(t, 611 + Math.random() * 80, { type: "square", dur: 0.09, vol: 0.04 });
      hiss(t, { type: "highpass", f: 3000, dur: 0.08, vol: 0.25 });
    },
    fire(t) { // crackle
      for (let i = 0; i < 9; i++) hiss(t + Math.random() * 0.6, { type: "highpass", f: 1800 + Math.random() * 2500, dur: 0.02, vol: 0.25 });
      hiss(t, { type: "lowpass", f: 500, a: 0.1, dur: 0.6, vol: 0.12 });
    },
    splash(t) { hiss(t, { type: "lowpass", f: 2600, f2: 300, dur: 0.35, vol: 0.35 }); },
    coin(t) { tone(t, 1568, { type: "sine", dur: 0.12, vol: 0.08 }); tone(t + 0.06, 2093, { type: "sine", dur: 0.18, vol: 0.06 }); },
    win(t) { [0, 1, 2, 4, 5, 7].forEach((k, i) => tone(t + i * 0.13, PENTA[k], { type: "triangle", dur: 0.5, vol: 0.12 })); },
    lose(t) { [4, 3, 1, 0].forEach((k, i) => tone(t + i * 0.32, PENTA[k] / 2, { type: "sawtooth", dur: 0.6, vol: 0.06 })); }
  };

  // ---- ambience ----
  const drum = (t, f, vol) => { tone(t, f, { dur: 0.22, vol, f2: f * 0.55 }); hiss(t, { f: 2200, q: 1.5, dur: 0.03, vol: vol * 0.6 }); };
  function chirp(t) { const n = 2 + Math.floor(Math.random() * 3), f = 2600 + Math.random() * 1400; for (let i = 0; i < n; i++) tone(t + i * 0.11, f, { dur: 0.06, vol: 0.035, f2: f * 1.3, out: bed }); }
  function koel(t) { // the Asian koel's rising "ku-oo", repeated
    for (let i = 0; i < 4; i++) { const f = 640 + i * 55; tone(t + i * 0.55, f, { dur: 0.12, vol: 0.05, out: bed }); tone(t + i * 0.55 + 0.17, f * 1.25, { dur: 0.25, vol: 0.06, a: 0.04, out: bed }); }
  }
  function frog(t) { const o = tone(t, 110 + Math.random() * 40, { type: "square", dur: 0.14, vol: 0.03, out: bed }); o.detune.setValueAtTime(-200, t); }
  function thunder(t) { hiss(t, { type: "lowpass", f: 180, q: 0.7, a: 0.15, dur: 3.2, vol: 0.5, out: bed }); hiss(t, { type: "lowpass", f: 700, f2: 120, dur: 0.6, vol: 0.25, out: bed }); }

  function update() {
    if (!ac || !audio.on || typeof S === "undefined" || !S) { if (ac && master) master.gain.setTargetAtTime(audio.on ? 0.75 : 0, ac.currentTime, 0.2); return; }
    master.gain.setTargetAtTime(0.75, ac.currentTime, 0.2);
    if (!beds.rain) {
      beds.rain = makeBed("lowpass", 1800, 0.4);
      beds.drops = makeBed("highpass", 4500, 0.7, 7, 0.6);
      beds.wind = makeBed("bandpass", 420, 0.6, 0.15, 0.7);
      beds.cicada = makeBed("bandpass", 5200, 9, 38, 0.9);
    }
    const t = ac.currentTime, live = S.mode === "play" && !S.paused;
    const maha = S.season === "maha", k = live ? 1 : 0.35;
    beds.rain.gain.setTargetAtTime((maha ? 0.18 : 0) * k, t, 1.5);
    beds.drops.gain.setTargetAtTime((maha ? 0.05 : 0) * k, t, 1.5);
    beds.wind.gain.setTargetAtTime((maha ? 0.03 : 0.1) * k, t, 1.5);
    beds.cicada.gain.setTargetAtTime((maha ? 0 : 0.025) * k, t, 2);
    if (!live) return;
    if (t > next.bird) { next.bird = t + 2 + Math.random() * (maha ? 9 : 4); chirp(t); }
    if (!maha && t > next.koel) { next.koel = t + 18 + Math.random() * 25; koel(t); }
    if (maha && t > next.frog) { next.frog = t + 0.4 + Math.random() * 2.5; frog(t); }
    if (maha && t > next.thunder) { if (next.thunder) thunder(t); next.thunder = t + 20 + Math.random() * 30; }
    // drums: a steady war beat while raiders are on the field, a quick festival beat at a Perahera
    const fest = typeof edictOn === "function" && edictOn("perahera");
    const war = S.units.some(u => u.team === "e");
    if ((fest || war) && t > next.drum) {
      const step = fest ? 0.19 : 0.32;
      next.drum = Math.max(next.drum, t) + step;
      const pat = fest ? [1, 0, 1, 1, 0, 1, 1, 0] : [1, 0, 0, 1, 0, 1, 0, 0];
      if (pat[beat % pat.length]) drum(next.drum, beat % 4 === 0 ? 75 : 120, fest ? 0.22 : 0.18);
      if (fest && beat % 8 === 6) hiss(next.drum, { type: "highpass", f: 6000, dur: 0.15, vol: 0.12 }); // cymbal
      beat++;
    }
  }

  function play(kind) {
    if (!audio.on || !init()) return;
    const f = KINDS[kind];
    const r = () => Math.random() - 0.5;
    vary = { pitch: IN_TUNE.has(kind) ? 1 : 2 ** (r() * 0.16), filt: 2 ** (r() * 0.5), vol: 0.85 + Math.random() * 0.3 }; // ±1.4 semitones, ±0.35 octave
    if (f) try { f(ac.currentTime + 0.01); } catch (e) { /* ignore a dropped effect */ }
    vary = SAME;
  }
  return { init, play, update };
})();
