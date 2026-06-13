// Looping background soundtrack. A plain HTMLAudioElement (not WebAudio) keeps
// memory low for a 1.7 MB file and lets the browser stream it. Plays slowed to
// 0.75x with pitch lowered for the "slowed" ambient feel. Must be kicked off by
// a user gesture (autoplay policy), so call start() from the first interaction.
const TRACK = "soundtrack.m4a";
const RATE = 0.75;

export function createMusic(getSettings) {
  let element = null;

  function ensure() {
    if (element) return element;
    element = new Audio(TRACK);
    element.loop = true;
    element.preload = "auto";
    element.id = "soundtrack";
    if (document.body) document.body.appendChild(element);
    setRate();
    apply();
    return element;
  }

  function setRate() {
    if (!element) return;
    // Lower the pitch with the tempo for the slowed aesthetic.
    element.preservesPitch = false;
    element.mozPreservesPitch = false;
    element.webkitPreservesPitch = false;
    try { element.playbackRate = RATE; } catch { /* some browsers clamp rate */ }
  }

  function apply() {
    if (!element) return;
    const settings = getSettings();
    element.volume = Math.max(0, Math.min(1, settings.musicVolume ?? 0.5));
  }

  // Idempotent: starts playback if music is enabled and not already playing.
  function start() {
    const settings = getSettings();
    if (!settings.musicEnabled) { stop(); return; }
    ensure();
    apply();
    setRate();
    if (element.paused) {
      const promise = element.play();
      if (promise && promise.catch) promise.catch(() => { /* awaiting a user gesture */ });
    }
  }

  function stop() {
    if (element) element.pause();
  }

  // Re-evaluate after a settings change (toggle on/off, volume).
  function update() {
    const settings = getSettings();
    if (!settings.musicEnabled) { stop(); return; }
    ensure();
    apply();
    setRate();
    start();
  }

  return { start, stop, update, unlock: start };
}
