"use client";

// Procedural night ambience for the 404 easter egg — same WebAudio-only
// approach as lib/audio.ts (no samples to ship), but its own mood: a lower,
// uneasier bed, an owl call and a crow instead of the daytime meadow's birds.

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

class NightAudio {
  context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambient: { sources: AudioScheduledSourceNode[]; gain: GainNode } | null = null;
  private owlTimer: ReturnType<typeof setTimeout> | null = null;
  private crowTimer: ReturnType<typeof setTimeout> | null = null;
  private creakTimer: ReturnType<typeof setTimeout> | null = null;
  private subs = new Set<(on: boolean) => void>();
  private on = false;
  private visibilityBound = false;
  private level = 1;

  get enabled() {
    return this.on;
  }

  get volume() {
    return this.level;
  }

  subscribe(fn: (on: boolean) => void) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  setVolume(v: number) {
    this.level = clamp(v, 0, 1);
    const ctx = this.context;
    if (ctx && this.master && this.on) {
      this.master.gain.setTargetAtTime(0.85 * this.level, ctx.currentTime, 0.08);
    }
  }

  toggle() {
    if (this.on) this.disable();
    else this.enable();
  }

  /** Must be called from a user gesture — browsers block audio otherwise. */
  enable() {
    if (this.on) return;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = this.context ?? new Ctor();
    this.context = ctx;
    void ctx.resume();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
    }
    this.on = true;
    this.master.gain.setTargetAtTime(0.85 * this.level, ctx.currentTime, 0.6);
    this.watchVisibility();
    this.startAmbient();
    this.scheduleOwl();
    this.scheduleCrow();
    this.scheduleCreak();
    this.remember(true);
    this.subs.forEach((f) => f(true));
  }

  private watchVisibility() {
    if (this.visibilityBound) return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      const ctx = this.context;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (this.on) void ctx.resume();
    });
  }

  disable() {
    if (!this.on) return;
    this.on = false;
    const ctx = this.context;
    if (this.master && ctx) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    if (this.owlTimer) clearTimeout(this.owlTimer);
    if (this.crowTimer) clearTimeout(this.crowTimer);
    if (this.creakTimer) clearTimeout(this.creakTimer);
    this.owlTimer = this.crowTimer = this.creakTimer = null;
    setTimeout(() => {
      if (this.on) return;
      this.stopAmbient();
      void this.context?.suspend();
    }, 400);
    this.remember(false);
    this.subs.forEach((f) => f(false));
  }

  /** Restore the visitor's last choice on their first gesture of the session. */
  armFromPreference() {
    if (typeof window === "undefined" || this.on) return () => {};
    let want = false;
    try {
      want = window.localStorage.getItem("billboard.sound404") === "on";
    } catch {
      want = false;
    }
    if (!want) return () => {};
    const go = () => {
      this.enable();
      off();
    };
    const off = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerdown", go);
    window.addEventListener("keydown", go);
    return off;
  }

  private remember(on: boolean) {
    try {
      window.localStorage.setItem("billboard.sound404", on ? "on" : "off");
    } catch {
      /* private mode — the toggle just won't be remembered */
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    this.noise = buf;
    return buf;
  }

  private loopNoise(ctx: AudioContext): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    src.start();
    return src;
  }

  private startAmbient() {
    const ctx = this.context;
    if (!ctx || !this.master || this.ambient) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.34;
    gain.connect(this.master);
    const sources: AudioScheduledSourceNode[] = [];

    // low uneasy wind, darker and slower than the daytime meadow bed
    const wind = this.loopNoise(ctx);
    const windLow = ctx.createBiquadFilter();
    windLow.type = "lowpass";
    windLow.frequency.value = 340;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.22;
    const gust = ctx.createOscillator();
    gust.type = "sine";
    gust.frequency.value = 0.045;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.08;
    gust.connect(gustDepth).connect(windGain.gain);
    gust.start();
    wind.connect(windLow).connect(windGain).connect(gain);

    // a sub drone, two slightly detuned tones beating against each other
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.07;
    droneGain.connect(gain);
    const d1 = ctx.createOscillator();
    d1.type = "sine";
    d1.frequency.value = 54;
    const d2 = ctx.createOscillator();
    d2.type = "sine";
    d2.frequency.value = 57;
    d1.connect(droneGain);
    d2.connect(droneGain);
    d1.start();
    d2.start();

    sources.push(wind, gust, d1, d2);
    this.ambient = { sources, gain };
  }

  private stopAmbient() {
    const a = this.ambient;
    if (!a) return;
    a.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    });
    a.gain.disconnect();
    this.ambient = null;
  }

  /** A rusty sign, swinging just enough on its bolts to creak once in a while. */
  private scheduleCreak() {
    this.creakTimer = setTimeout(
      () => {
        const ctx = this.context;
        const a = this.ambient;
        if (!ctx || !a || !this.on) return;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(ctx);
        const band = ctx.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.setValueAtTime(700, t);
        band.frequency.exponentialRampToValueAtTime(420, t + 0.5);
        band.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.4 - 0.7;
        src.connect(band).connect(g).connect(pan).connect(a.gain);
        src.start(t);
        src.stop(t + 0.6);
        setTimeout(() => {
          try {
            pan.disconnect();
          } catch {
            /* already gone */
          }
        }, 700);
        this.scheduleCreak();
      },
      9000 + Math.random() * 14000,
    );
  }

  /** Two-note descending hoot, the kind that carries across an empty lot. */
  private scheduleOwl() {
    this.owlTimer = setTimeout(
      () => {
        const ctx = this.context;
        const a = this.ambient;
        if (!ctx || !a || !this.on) return;
        const t = ctx.currentTime;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        pan.connect(a.gain);
        const notes = [
          { at: 0, f0: 620, f1: 480, dur: 0.34, peak: 0.16 },
          { at: 0.46, f0: 430, f1: 330, dur: 0.42, peak: 0.14 },
        ];
        for (const n of notes) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          const g = ctx.createGain();
          const at = t + n.at;
          osc.frequency.setValueAtTime(n.f0, at);
          osc.frequency.exponentialRampToValueAtTime(n.f1, at + n.dur);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(n.peak, at + 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, at + n.dur);
          osc.connect(g).connect(pan);
          osc.start(at);
          osc.stop(at + n.dur + 0.05);
        }
        setTimeout(() => {
          try {
            pan.disconnect();
          } catch {
            /* already gone */
          }
        }, 1500);
        this.scheduleOwl();
      },
      7000 + Math.random() * 11000,
    );
  }

  /** A short harsh burst, one to three caws in a row. */
  private scheduleCrow() {
    this.crowTimer = setTimeout(
      () => {
        const ctx = this.context;
        const a = this.ambient;
        if (!ctx || !a || !this.on) return;
        const t = ctx.currentTime;
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        pan.connect(a.gain);
        const caws = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < caws; i++) {
          const at = t + i * (0.16 + Math.random() * 0.05);
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          const g = ctx.createGain();
          const band = ctx.createBiquadFilter();
          band.type = "bandpass";
          band.frequency.value = 900;
          band.Q.value = 3.5;
          osc.frequency.setValueAtTime(520, at);
          osc.frequency.exponentialRampToValueAtTime(210, at + 0.13);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.13, at + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
          osc.connect(band).connect(g).connect(pan);
          osc.start(at);
          osc.stop(at + 0.17);
        }
        setTimeout(() => {
          try {
            pan.disconnect();
          } catch {
            /* already gone */
          }
        }, 1500);
        this.scheduleCrow();
      },
      6000 + Math.random() * 9000,
    );
  }
}

export const nightAudio = new NightAudio();
