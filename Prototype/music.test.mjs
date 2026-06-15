import assert from "node:assert/strict";

class FakeTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }
}

class FakeAudio extends FakeTarget {
  constructor() {
    super();
    FakeAudio.lastCreated = this;
    this.currentTime = 0;
    this.duration = 120;
    this.paused = true;
    this.playbackRate = 1;
    this.playCalls = 0;
  }

  play() {
    this.paused = false;
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

const documentTarget = new FakeTarget();
documentTarget.hidden = false;
documentTarget.body = { appendChild() {} };
documentTarget.getElementById = () => null;

const windowTarget = new FakeTarget();
globalThis.document = documentTarget;
globalThis.window = windowTarget;
globalThis.Audio = FakeAudio;

const { createMusic } = await import("./music.js");
const settings = { musicEnabled: true, musicVolume: 0.5 };
const music = createMusic(() => settings);

await music.start();
const audio = FakeAudio.lastCreated;
assert.equal(audio.playCalls, 1, "music starts playing");

audio.currentTime = audio.duration;
audio.dispatch("ended");
await Promise.resolve();
assert.equal(audio.currentTime, 0, "ended tracks seek back to the beginning");
assert.equal(audio.playCalls, 2, "ended tracks start playing again");

music.stop();
audio.dispatch("ended");
await Promise.resolve();
assert.equal(audio.playCalls, 2, "stopped music does not restart itself");

console.log("music loop tests passed");
