"use client";
import type * as THREE from "three";

// Procedural sound design: everything here is synthesised with WebAudio, so the
// scene stays asset-free (no samples to ship or to wait for). Three layers:
//   - an ambient bed (meadow wind, distant highway rumble, occasional birds)
//   - a helicopter voice (rotor chop + turbine) that follows the chopper
//   - one voice per car, so traffic whooshes past as it crosses the camera
// Voices are positional: gain from distance, pan and brightness from where the
// emitter sits in the camera's view.

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface Placement {
  gain: number; // 0..1 loudness
  pan: number; // -1..1 stereo position
  near: number; // 0..1, 1 = right on top of the camera (drives brightness)
  dist: number; // metres from the camera, for the doppler shift
}

/** Where an emitter sits relative to the camera, as audio parameters. */
export function placementOf(pos: THREE.Vector3, camera: THREE.Camera, reach: number, tmp: THREE.Vector3): Placement {
  const d = camera.position.distanceTo(pos);
  const near = clamp(1 - d / reach, 0, 1);
  const gain = near * near; // inverse-square-ish, silent at the edge of reach
  tmp.copy(pos).project(camera);
  // behind the camera the projection flips: keep the side, drop the confusion
  const behind = tmp.z > 1;
  const pan = clamp(behind ? -tmp.x : tmp.x, -1, 1);
  return { gain, pan, near, dist: d };
}

type VoiceKind = "heli" | "car";

interface VoiceNodes {
  out: GainNode;
  tone: BiquadFilterNode;
  panner: StereoPannerNode;
  sources: (AudioScheduledSourceNode | AudioBufferSourceNode)[];
  // pitched parts, shifted while the emitter closes in or pulls away
  doppler?: { engine: OscillatorNode; band: BiquadFilterNode; engineHz: number; bandHz: number };
}

class Voice {
  private target: Placement = { gain: 0, pan: 0, near: 0, dist: Infinity };
  private prev: { dist: number; at: number } | null = null;
  private nodes: VoiceNodes | null = null;
  private dead = false;

  constructor(
    private engine: SceneAudio,
    readonly kind: VoiceKind,
    readonly variant: number,
  ) {}

  place(p: Placement) {
    this.target = p;
    this.apply();
  }

  /** Called by the engine when audio turns on/off. */
  attach(nodes: VoiceNodes | null) {
    this.nodes = nodes;
    if (nodes) this.apply();
  }

  private apply() {
    const n = this.nodes;
    const ctx = this.engine.context;
    if (!n || !ctx) return;
    const t = ctx.currentTime;
    const base = this.kind === "heli" ? 0.5 : 0.32;
    n.out.gain.setTargetAtTime(this.target.gain * base, t, 0.08);
    n.panner.pan.setTargetAtTime(this.target.pan, t, 0.12);
    const lo = this.kind === "heli" ? 420 : 320;
    const hi = this.kind === "heli" ? 2600 : 3000;
    n.tone.frequency.setTargetAtTime(lo + this.target.near * (hi - lo), t, 0.1);

    // doppler: closing in raises the pitch, pulling away drops it
    const d = n.doppler;
    if (d && Number.isFinite(this.target.dist)) {
      const prev = this.prev;
      let shift = 1;
      if (prev && t > prev.at) {
        const closing = (prev.dist - this.target.dist) / (t - prev.at); // m/s
        shift = 1 + clamp(closing, -45, 45) / 330;
      }
      this.prev = { dist: this.target.dist, at: t };
      d.engine.frequency.setTargetAtTime(d.engineHz * shift, t, 0.05);
      d.band.frequency.setTargetAtTime(d.bandHz * shift, t, 0.05);
    }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.engine.releaseVoice(this);
  }
}

class SceneAudio {
  context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Set<Voice>();
  private nodesOf = new Map<Voice, VoiceNodes>();
  private ambient: { sources: AudioScheduledSourceNode[]; gain: GainNode } | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private subs = new Set<(on: boolean) => void>();
  private on = false;
  private visibilityBound = false;

  get enabled() {
    return this.on;
  }

  subscribe(fn: (on: boolean) => void) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
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
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5);
    this.watchVisibility();
    this.startAmbient();
    for (const v of this.voices) v.attach(this.buildVoice(v));
    this.remember(true);
    this.subs.forEach((f) => f(true));
  }

  /** A background tab shouldn't keep the highway running. */
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
    // let the fade finish before tearing the graph down
    setTimeout(() => {
      if (this.on) return;
      for (const v of this.voices) {
        this.teardown(this.nodesOf.get(v));
        this.nodesOf.delete(v);
        v.attach(null);
      }
      this.stopAmbient();
      void this.context?.suspend();
    }, 400);
    this.remember(false);
    this.subs.forEach((f) => f(false));
  }

  /** Restore the user's last choice on their first gesture of the session. */
  armFromPreference() {
    if (typeof window === "undefined" || this.on) return () => {};
    let want = false;
    try {
      want = window.localStorage.getItem("billboard.sound") === "on";
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

  voice(kind: VoiceKind, variant = 0): Voice {
    const v = new Voice(this, kind, variant);
    this.voices.add(v);
    if (this.on) v.attach(this.buildVoice(v));
    return v;
  }

  releaseVoice(v: Voice) {
    this.teardown(this.nodesOf.get(v));
    this.nodesOf.delete(v);
    this.voices.delete(v);
  }

  private remember(on: boolean) {
    try {
      window.localStorage.setItem("billboard.sound", on ? "on" : "off");
    } catch {
      /* private mode — the toggle just won't be remembered */
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // brown-ish noise: softer and more "air" than raw white noise
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

  private buildVoice(v: Voice): VoiceNodes | null {
    const ctx = this.context;
    if (!ctx || !this.master) return null;
    const out = ctx.createGain();
    out.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 600;
    const panner = ctx.createStereoPanner();
    tone.connect(out).connect(panner).connect(this.master);
    const sources: AudioScheduledSourceNode[] = [];
    let doppler: VoiceNodes["doppler"];

    if (v.kind === "heli") {
      // rotor: band-passed noise chopped by a blade-rate LFO
      const rotor = this.loopNoise(ctx);
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 300;
      band.Q.value = 1.4;
      const chop = ctx.createGain();
      chop.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = "sawtooth";
      lfo.frequency.value = 11.5;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.45;
      lfo.connect(lfoDepth).connect(chop.gain);
      lfo.start();
      rotor.connect(band).connect(chop).connect(tone);
      // turbine whine
      const turbine = ctx.createOscillator();
      turbine.type = "sawtooth";
      turbine.frequency.value = 232;
      const twin = ctx.createGain();
      twin.gain.value = 0.05;
      turbine.connect(twin).connect(tone);
      turbine.start();
      sources.push(rotor, lfo, turbine);
    } else {
      // tyre roar: broad noise, plus a quiet engine hum detuned per car
      const roar = this.loopNoise(ctx);
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 520 + v.variant * 70;
      band.Q.value = 0.7;
      const level = ctx.createGain();
      level.gain.value = 0.8;
      roar.connect(band).connect(level).connect(tone);
      const engine = ctx.createOscillator();
      engine.type = "triangle";
      engine.frequency.value = 88 + v.variant * 11;
      const eg = ctx.createGain();
      eg.gain.value = 0.12;
      engine.connect(eg).connect(tone);
      engine.start();
      sources.push(roar, engine);
      doppler = { engine, band, engineHz: engine.frequency.value, bandHz: band.frequency.value };
    }

    const nodes: VoiceNodes = { out, tone, panner, sources, doppler };
    this.nodesOf.set(v, nodes);
    return nodes;
  }

  private teardown(nodes: VoiceNodes | undefined) {
    if (!nodes) return;
    nodes.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    });
    nodes.out.disconnect();
    nodes.tone.disconnect();
    nodes.panner.disconnect();
  }

  private startAmbient() {
    const ctx = this.context;
    if (!ctx || !this.master || this.ambient) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    gain.connect(this.master);
    const sources: AudioScheduledSourceNode[] = [];

    // meadow air, breathing in slow gusts
    const wind = this.loopNoise(ctx);
    const windBand = ctx.createBiquadFilter();
    windBand.type = "bandpass";
    windBand.frequency.value = 620;
    windBand.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.16;
    const gust = ctx.createOscillator();
    gust.type = "sine";
    gust.frequency.value = 0.06;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.09;
    gust.connect(gustDepth).connect(windGain.gain);
    gust.start();
    wind.connect(windBand).connect(windGain).connect(gain);

    // the highway itself, a low rumble under everything
    const road = this.loopNoise(ctx);
    const roadLow = ctx.createBiquadFilter();
    roadLow.type = "lowpass";
    roadLow.frequency.value = 240;
    const roadGain = ctx.createGain();
    roadGain.gain.value = 0.5;
    road.connect(roadLow).connect(roadGain).connect(gain);

    sources.push(wind, gust, road);
    this.ambient = { sources, gain };
    this.scheduleBird();
  }

  private stopAmbient() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.birdTimer = null;
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

  /** Sparse chirps so the meadow doesn't read as pure machine noise. */
  private scheduleBird() {
    this.birdTimer = setTimeout(
      () => {
        const ctx = this.context;
        const a = this.ambient;
        if (!ctx || !a || !this.on) return;
        const t = ctx.currentTime;
        const notes = 2 + Math.floor(Math.random() * 3);
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.random() * 1.6 - 0.8;
        panner.connect(a.gain);
        for (let i = 0; i < notes; i++) {
          const at = t + i * (0.09 + Math.random() * 0.06);
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const f = 2100 + Math.random() * 1300;
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, at);
          osc.frequency.exponentialRampToValueAtTime(f * 1.5, at + 0.05);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.05, at + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
          osc.connect(g).connect(panner);
          osc.start(at);
          osc.stop(at + 0.12);
        }
        setTimeout(() => panner.disconnect(), 1500);
        this.scheduleBird();
      },
      4000 + Math.random() * 9000,
    );
  }
}

export const sceneAudio = new SceneAudio();
export type { Voice };
