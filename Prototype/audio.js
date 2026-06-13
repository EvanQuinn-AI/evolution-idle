// Procedurally synthesized SFX. No audio assets are required, which keeps the
// prototype a zero-dependency static page on iOS, Android, and desktop browsers.
export function createAudio(getSettings) {
  let context = null;
  let master = null;

  function ensureContext() {
    const settings = getSettings();
    if (!settings.audioEnabled) return null;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      master = context.createGain();
      master.connect(context.destination);
    }
    if (context.state === "suspended") context.resume();
    master.gain.value = Math.max(0, Math.min(1, settings.volume ?? 0.6));
    return context;
  }

  function tone({ frequency, endFrequency = null, duration = 0.15, type = "sine", gain = 0.18, delay = 0 }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function rumble({ duration = 1.2, gain = 0.3, delay = 0 }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, start);
    filter.frequency.exponentialRampToValueAtTime(40, start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
  }

  function vibrate(pattern) {
    const settings = getSettings();
    if (settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
  }

  return {
    unlockContext: ensureContext,
    click() {
      tone({ frequency: 660, duration: 0.05, type: "triangle", gain: 0.07 });
    },
    create() {
      tone({ frequency: 220, endFrequency: 440, duration: 0.12, type: "square", gain: 0.08 });
    },
    grow() {
      tone({ frequency: 330, endFrequency: 392, duration: 0.1, type: "sine", gain: 0.1 });
    },
    denied() {
      tone({ frequency: 120, duration: 0.09, type: "sawtooth", gain: 0.06 });
    },
    discovery(rarity = "Common") {
      const rare = rarity === "Rare" || rarity === "Mythic";
      tone({ frequency: 523, duration: 0.16, gain: 0.16 });
      tone({ frequency: 659, duration: 0.18, gain: 0.16, delay: 0.09 });
      tone({ frequency: 784, duration: 0.3, gain: 0.18, delay: 0.18 });
      if (rare) tone({ frequency: 1046, duration: 0.5, gain: 0.16, delay: 0.3 });
      if (rarity === "Mythic") tone({ frequency: 1318, duration: 0.7, gain: 0.13, delay: 0.42 });
      vibrate(rare ? [25, 35, 45] : 20);
    },
    choice() {
      tone({ frequency: 196, duration: 0.18, type: "triangle", gain: 0.14 });
      tone({ frequency: 261, duration: 0.24, type: "triangle", gain: 0.14, delay: 0.12 });
      vibrate(15);
    },
    unlock() {
      tone({ frequency: 392, duration: 0.4, gain: 0.13 });
      tone({ frequency: 494, duration: 0.4, gain: 0.13, delay: 0.03 });
      tone({ frequency: 587, duration: 0.55, gain: 0.13, delay: 0.06 });
      vibrate(30);
    },
    extinctionWarning() {
      tone({ frequency: 98, duration: 0.5, type: "sawtooth", gain: 0.1 });
      tone({ frequency: 92, duration: 0.6, type: "sawtooth", gain: 0.1, delay: 0.4 });
    },
    extinction() {
      rumble({ duration: 1.4, gain: 0.32 });
      tone({ frequency: 110, endFrequency: 30, duration: 1.2, type: "sawtooth", gain: 0.16 });
      vibrate([60, 60, 120]);
    },
    bigBang() {
      rumble({ duration: 1.8, gain: 0.26 });
      tone({ frequency: 60, endFrequency: 880, duration: 1.4, type: "sine", gain: 0.1 });
    },
    blackHole() {
      tone({ frequency: 880, endFrequency: 40, duration: 1.8, type: "sine", gain: 0.12 });
      rumble({ duration: 2, gain: 0.18, delay: 0.4 });
    },
    logoReveal() {
      tone({ frequency: 523, duration: 0.6, gain: 0.12 });
      tone({ frequency: 784, duration: 0.9, gain: 0.12, delay: 0.12 });
      tone({ frequency: 1046, duration: 1.2, gain: 0.1, delay: 0.24 });
    }
  };
}
