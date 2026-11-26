// audio.js — tiny synthesised sound: engine hum, chimes and a crash thud.
// Everything is generated with WebAudio oscillators; no audio files exist.
// All calls are safe before any user gesture and when AudioContext is absent.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx || muted) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch (err) {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, vol, type) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch (err) {
      /* sound is decoration; never break the game */
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setEngine(speedNorm, flying) {
      if (!ctx || muted) return; // never create the context before a gesture
      try {
        engineGain.gain.setTargetAtTime(flying ? 0.035 + speedNorm * 0.03 : 0, ctx.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(48 + speedNorm * 70, ctx.currentTime, 0.1);
      } catch (err) {
        /* ignore */
      }
    },
    ring() {
      blip(880, 0.28, 0.16);
      setTimeout(() => blip(1318, 0.3, 0.12), 70);
    },
    star() {
      blip(1175, 0.16, 0.12);
    },
    fuel() {
      blip(520, 0.2, 0.12, 'triangle');
    },
    crash() {
      if (!ensure() || muted) return;
      try {
        const len = ctx.sampleRate * 0.35;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = 0.25;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 500;
        src.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        src.start();
      } catch (err) {
        /* ignore */
      }
    },
    toggleMute() {
      muted = !muted;
      if (engineGain && ctx) engineGain.gain.value = 0;
      return muted;
    },
    get isMuted() {
      return muted;
    },
  };
}
