// Boot experience: big bang -> black hole -> logo -> main menu, plus engine settings.
const SETTINGS_KEY = "evolution-idle-settings-v1";

const DEFAULT_SETTINGS = {
  musicEnabled: true,
  musicVolume: 0.5,
  audioEnabled: true,
  volume: 0.6,
  haptics: true,
  reducedMotion: typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  skipIntro: false,
  performanceMode: false,
  largeText: false,
  admin: { fast: true, seed: "" }
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...stored, admin: { ...DEFAULT_SETTINGS.admin, ...(stored.admin || {}) } };
  } catch {
    return { ...DEFAULT_SETTINGS, admin: { ...DEFAULT_SETTINGS.admin } };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings remain session-only when storage is unavailable.
  }
}

export function applySettings(settings) {
  document.body.classList.toggle("reduced-motion", Boolean(settings.reducedMotion));
  document.body.classList.toggle("large-text", Boolean(settings.largeText));
}

export function initSettingsDialog({ settings, onChange, onWipeSave, onExportSave, onImportSave }) {
  const $ = id => document.getElementById(id);
  const dialog = $("settings-dialog");

  const sync = () => {
    $("setting-music").checked = settings.musicEnabled;
    $("setting-music-volume").value = String(Math.round((settings.musicVolume ?? 0.5) * 100));
    $("setting-audio").checked = settings.audioEnabled;
    $("setting-volume").value = String(Math.round((settings.volume ?? 0.6) * 100));
    $("setting-haptics").checked = settings.haptics;
    $("setting-reduced-motion").checked = settings.reducedMotion;
    $("setting-skip-intro").checked = settings.skipIntro;
    $("setting-performance").checked = settings.performanceMode;
    $("setting-large-text").checked = settings.largeText;
  };

  const commit = () => {
    saveSettings(settings);
    applySettings(settings);
    onChange?.(settings);
  };

  $("setting-music").addEventListener("change", event => { settings.musicEnabled = event.target.checked; commit(); });
  $("setting-music-volume").addEventListener("input", event => { settings.musicVolume = Number(event.target.value) / 100; commit(); });
  $("setting-audio").addEventListener("change", event => { settings.audioEnabled = event.target.checked; commit(); });
  $("setting-volume").addEventListener("input", event => { settings.volume = Number(event.target.value) / 100; commit(); });
  $("setting-haptics").addEventListener("change", event => { settings.haptics = event.target.checked; commit(); });
  $("setting-reduced-motion").addEventListener("change", event => { settings.reducedMotion = event.target.checked; commit(); });
  $("setting-skip-intro").addEventListener("change", event => { settings.skipIntro = event.target.checked; commit(); });
  $("setting-performance").addEventListener("change", event => { settings.performanceMode = event.target.checked; commit(); });
  $("setting-large-text").addEventListener("change", event => { settings.largeText = event.target.checked; commit(); });
  $("setting-export").addEventListener("click", () => onExportSave?.());
  $("setting-import").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) onImportSave?.(file);
    event.target.value = "";
  });
  $("setting-wipe").addEventListener("click", () => {
    if (confirm("Erase all local progress? The Species Atlas, fossils, and genome upgrades will be lost.")) onWipeSave?.();
  });
  $("close-settings").addEventListener("click", () => dialog.close());

  return { open: () => { sync(); dialog.showModal(); } };
}

export function bootSequence({ settings, hasSave, audio, onStart }) {
  const $ = id => document.getElementById(id);
  const overlay = $("boot-overlay");
  const canvas = $("intro-canvas");
  const logo = $("boot-logo");
  const menu = $("main-menu");
  const skipHint = $("skip-hint");
  const context = canvas.getContext("2d");

  $("menu-start").textContent = hasSave ? "Continue Evolution" : "Begin Evolution";
  $("menu-start").focus?.();

  let width = 0;
  let height = 0;
  let dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = overlay.clientWidth;
    height = overlay.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const particleCount = width < 700 || settings.performanceMode ? 220 : 460;
  const particles = [];
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * 1,
    y: Math.random() * 1,
    size: Math.random() * 1.4 + 0.3,
    twinkle: Math.random() * Math.PI * 2
  }));

  let phase = "singularity";
  let phaseStart = performance.now();
  let running = true;
  let menuShown = false;

  function setPhase(next) {
    phase = next;
    phaseStart = performance.now();
    if (next === "bang") {
      audio?.bigBang?.();
      spawnParticles();
    }
    if (next === "blackhole") audio?.blackHole?.();
    if (next === "logo") {
      audio?.logoReveal?.();
      logo.classList.add("visible");
      skipHint.hidden = true;
    }
  }

  function spawnParticles() {
    particles.length = 0;
    const cx = width / 2;
    const cy = height / 2;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 320;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: Math.random() < 0.55 ? 30 + Math.random() * 30 : 150 + Math.random() * 60,
        size: 0.6 + Math.random() * 2.2,
        alive: true
      });
    }
  }

  function drawStars(time, alpha) {
    context.save();
    context.globalAlpha = alpha;
    for (const star of stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(time / 900 + star.twinkle);
      context.globalAlpha = alpha * twinkle;
      context.fillStyle = "#cfe8db";
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }
    context.restore();
  }

  function frame(time) {
    if (!running) return;
    const elapsed = (time - phaseStart) / 1000;
    const cx = width / 2;
    const cy = height / 2;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#030806";
    context.fillRect(0, 0, width, height);

    if (phase === "singularity") {
      drawStars(time, Math.min(0.5, elapsed));
      const pulse = 2 + Math.sin(time / 110) * 1.2 + elapsed * 3;
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, pulse * 7);
      glow.addColorStop(0, "rgba(255,255,255,.95)");
      glow.addColorStop(0.4, "rgba(255,205,120,.5)");
      glow.addColorStop(1, "rgba(255,205,120,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, pulse * 7, 0, Math.PI * 2);
      context.fill();
      if (elapsed >= 0.9) setPhase("bang");
    } else if (phase === "bang") {
      const flash = Math.max(0, 1 - elapsed * 1.7);
      if (flash > 0) {
        context.fillStyle = `rgba(255,250,235,${flash * 0.85})`;
        context.fillRect(0, 0, width, height);
      }
      drawStars(time, Math.min(0.6, elapsed * 0.4));
      const dt = 1 / 60;
      for (const particle of particles) {
        particle.vx *= 0.992;
        particle.vy *= 0.992;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        context.fillStyle = `hsla(${particle.hue}, 90%, ${65 - elapsed * 8}%, ${Math.max(0.15, 1 - elapsed * 0.28)})`;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      if (elapsed >= 2.5) setPhase("blackhole");
    } else if (phase === "blackhole") {
      drawStars(time, 0.55);
      const progress = Math.min(1, elapsed / 2.4);
      const holeRadius = 6 + progress * Math.min(width, height) * 0.085;
      const dt = 1 / 60;
      for (const particle of particles) {
        if (!particle.alive) continue;
        const dx = cx - particle.x;
        const dy = cy - particle.y;
        const distance = Math.max(8, Math.hypot(dx, dy));
        const pull = (140 + progress * 1900) / distance;
        particle.vx = particle.vx * 0.96 + (dx / distance) * pull + (-dy / distance) * pull * 0.85;
        particle.vy = particle.vy * 0.96 + (dy / distance) * pull + (dx / distance) * pull * 0.85;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (distance < holeRadius + 3) particle.alive = false;
        const heat = Math.min(1, 130 / distance);
        context.fillStyle = `hsla(${35 + heat * 20}, 95%, ${55 + heat * 35}%, ${0.35 + heat * 0.6})`;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      const ring = context.createRadialGradient(cx, cy, holeRadius * 0.7, cx, cy, holeRadius * 2.4);
      ring.addColorStop(0, "rgba(255,190,90,0)");
      ring.addColorStop(0.45, `rgba(255,190,90,${0.25 + progress * 0.3})`);
      ring.addColorStop(1, "rgba(255,190,90,0)");
      context.fillStyle = ring;
      context.beginPath();
      context.arc(cx, cy, holeRadius * 2.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#000";
      context.beginPath();
      context.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(255,236,200,${0.5 + progress * 0.4})`;
      context.lineWidth = 1.5;
      context.stroke();
      if (elapsed >= 2.4) setPhase("collapse");
    } else if (phase === "collapse") {
      drawStars(time, 0.55);
      const progress = Math.min(1, elapsed / 0.8);
      const radius = Math.min(width, height) * 0.085 * (1 - progress);
      const burst = Math.sin(progress * Math.PI);
      context.fillStyle = "#000";
      context.beginPath();
      context.arc(cx, cy, Math.max(0.5, radius), 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(255,255,255,${burst})`;
      context.lineWidth = 2 + burst * 5;
      context.beginPath();
      context.arc(cx, cy, radius + burst * 60, 0, Math.PI * 2);
      context.stroke();
      if (progress >= 1) setPhase("logo");
    } else {
      drawStars(time, 0.55);
      if (!menuShown && elapsed >= 1.1) showMenu();
    }
    requestAnimationFrame(frame);
  }

  function showMenu() {
    if (menuShown) return;
    menuShown = true;
    logo.classList.add("visible");
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("visible"));
    skipHint.hidden = true;
  }

  function skipIntro() {
    if (menuShown) return;
    if (phase !== "logo") setPhase("logo");
    showMenu();
  }

  overlay.addEventListener("pointerdown", () => {
    audio?.unlockContext?.();
    if (!menuShown) skipIntro();
  });
  window.addEventListener("keydown", event => {
    if (!menuShown && (event.key === "Escape" || event.key === "Enter" || event.key === " ")) skipIntro();
  });

  // Returning from "Exit to Main Menu" skips the cosmic intro for this one load.
  let skipOnce = false;
  try {
    skipOnce = sessionStorage.getItem("ei-skip-intro-once") === "1";
    if (skipOnce) sessionStorage.removeItem("ei-skip-intro-once");
  } catch { /* sessionStorage unavailable */ }

  if (settings.skipIntro || settings.reducedMotion || skipOnce) {
    setPhase("logo");
    showMenu();
  }
  requestAnimationFrame(frame);

  const adminConfig = $("admin-config");
  $("menu-admin").addEventListener("click", () => {
    audio?.unlockContext?.();
    audio?.click?.();
    adminConfig.hidden = !adminConfig.hidden;
    if (!adminConfig.hidden) {
      $("admin-fast").checked = settings.admin.fast;
      $("admin-seed").value = settings.admin.seed || "";
    }
  });

  function launch(mode) {
    audio?.unlockContext?.();
    audio?.unlock?.();
    overlay.classList.add("closing");
    setTimeout(() => {
      running = false;
      overlay.hidden = true;
    }, 650);
    onStart(mode);
  }

  $("menu-start").addEventListener("click", () => launch({ mode: "default" }));
  $("menu-codex").addEventListener("click", () => launch({ mode: "codex", codexTab: "atlas" }));
  $("menu-lab").addEventListener("click", () => launch({ mode: "lab" }));
  $("admin-launch").addEventListener("click", () => {
    settings.admin.fast = $("admin-fast").checked;
    settings.admin.seed = $("admin-seed").value.trim();
    saveSettings(settings);
    launch({
      mode: "admin",
      fast: settings.admin.fast,
      seed: settings.admin.seed ? Number(settings.admin.seed) >>> 0 : null,
      fresh: $("admin-fresh").checked
    });
  });
}
