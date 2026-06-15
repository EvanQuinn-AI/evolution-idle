import { SPECIES_BY_ID } from "./content.js";
import { creatureForSpecies } from "./creatures.js";
import { createWildlifeLayer } from "./wildlife-stage.js";

// The living stage: the illustrated wildlife layer handles collectible animals
// and habitat dioramas; this procedural renderer remains the origin/load-failure
// fallback. Both preserve the same tap-to-catalyze interaction contract.

export function createStage(canvas, { getSettings = () => ({}), onTapCreature = () => {} } = {}) {
  const ctx = canvas.getContext("2d");
  const wildlife = createWildlifeLayer(canvas, { getSettings });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let running = false;
  let last = 0;
  let t = 0;

  let scene = null;
  let creature = null;
  let creatureKey = "";
  let pressure = 0;
  let karma = 100;
  let totalPopulation = 0;
  let diversity = 0;
  let activePopulation = 0;
  let backgroundSpecies = [];
  let worldEnded = false;

  // Transient feel layers.
  const motes = [];
  const sparks = [];
  const floaters = [];
  let squash = 0;          // catalyze squash-and-stretch, decays to 0
  let ripple = 0;          // expanding tap ring, 0..1
  let flashCreature = 0;   // brief palette flash on tap
  let cataclysm = null;    // { type, time } while an extinction plays
  let celebration = null;  // { time, color } while a collect celebration plays
  let shakeUntil = 0;
  let combo = 0;           // rapid-tap streak, amplifies the feel
  let lastTapTime = -10;   // value of t at the previous tap
  let evolveReady = false; // an evolution choice is available -> invite the eye

  function reduced() { return Boolean(getSettings().reducedMotion); }
  function performance_() { return Boolean(getSettings().performanceMode); }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wildlife.resize(width, height);
    seedMotes();
  }

  function seedMotes() {
    const count = reduced() ? 14 : performance_() ? 26 : 48;
    motes.length = 0;
    for (let i = 0; i < count; i += 1) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.4 + 0.6,
        speed: Math.random() * 14 + 4,
        drift: Math.random() * Math.PI * 2
      });
    }
  }

  // ---- public sync -------------------------------------------------------
  function update(state) {
    wildlife.update(state);
    scene = state.currentScene;
    creature = state.currentCreature;
    pressure = state.pressure || 0;
    karma = state.ecosystemKarma ?? 100;
    totalPopulation = [...state.populations.values()].reduce((sum, value) => sum + value, 0);
    diversity = state.populations.size;
    activePopulation = state.activeLineageId ? state.populations.get(state.activeLineageId) || 0 : 0;
    backgroundSpecies = [...state.populations.entries()]
      .filter(([id, population]) => population > 0 && SPECIES_BY_ID[id])
      .map(([id, population]) => ({ population, profile: creatureForSpecies(SPECIES_BY_ID[id]) }));
    worldEnded = Boolean(state.worldEnded);
    const key = `${creature.kind}:${creature.id}`;
    if (key !== creatureKey) {
      creatureKey = key;
      flashCreature = 1; // a soft pop whenever you become something new
    }
    evolveReady = !worldEnded && typeof state.evolutionChoices === "function"
      && state.evolutionChoices().some(choice => choice.state === "available");
  }

  // info (optional): { text, kind: "energy" | "pop", denied } from the catalyze
  // action, so the floating number and color match what the tap actually did.
  function tap(info = {}) {
    if (info.denied) {
      // A rejected tap gets a small, distinct nudge rather than the full burst.
      flashCreature = Math.max(flashCreature, 0.25);
      if (!reduced()) shakeUntil = Math.max(shakeUntil, t + 0.16);
      combo = 0;
      return;
    }
    combo = (t - lastTapTime < 0.6) ? combo + 1 : 1;
    lastTapTime = t;
    const intensity = Math.min(1.8, 0.9 + combo * 0.07);
    squash = Math.min(1.5, intensity);
    ripple = 0.001;
    flashCreature = Math.max(flashCreature, 0.6);
    wildlife.react();
    const cx = width / 2;
    const cy = creatureY();
    const sparkColor = info.kind === "pop" ? "#9fe870" : (creature?.palette?.accent || "#ffe49a");
    const count = Math.round((reduced() ? 3 : 8) * intensity);
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = (60 + Math.random() * 120) * intensity;
      sparks.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: sparkColor
      });
    }
    floaters.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy - 30,
      life: 1,
      text: info.text || "+",
      color: sparkColor,
      size: 20 + Math.min(12, combo)
    });
    if (combo >= 5 && combo % 5 === 0) {
      floaters.push({ x: cx, y: cy - 66, life: 1.3, text: `Combo x${combo}`, color: "#ffd76a", size: 18 });
    }
  }

  // The payoff moment: a big confetti burst, a banner, a flash and a shake when
  // a life form is finally collected. This is the dopamine hit of the whole loop.
  function celebrate(label = "", rarity = "Common") {
    const color = { Legendary: "#ffd34d", Rare: "#5aa9e0", Common: "#7fe08a" }[rarity] || "#7fe08a";
    celebration = { time: 0, color };
    if (!reduced()) shakeUntil = Math.max(shakeUntil, t + 0.55);
    flashCreature = 1;
    const cx = width / 2;
    const cy = creatureY();
    const confettiColors = [color, "#ffffff", "#ff8ad0", "#ffd34d", "#7fe6ff"];
    const n = reduced() ? 16 : 80;
    for (let i = 0; i < n; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 140 + Math.random() * 320;
      sparks.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 1.6 + Math.random() * 0.8,
        decay: 0.85,
        gravity: 360,
        confetti: true,
        spin: Math.random() * Math.PI * 2,
        size: 3 + Math.random() * 4,
        color: confettiColors[i % confettiColors.length]
      });
    }
    floaters.push({ x: cx, y: cy - 86, life: 2.2, text: "COLLECTED!", color, size: 34, big: true });
    if (label) floaters.push({ x: cx, y: cy - 52, life: 2.2, text: label, color: "#ffffff", size: 22, big: true });
  }

  // Each of the 5 growth stages gets its own little reward: a pop, a sparkle
  // ring and the new stage name floating up. Keeps every attempt feeling alive.
  function stageUp(label = "") {
    const cx = width / 2;
    const cy = creatureY();
    flashCreature = Math.max(flashCreature, 0.7);
    squash = Math.max(squash, 0.85);
    ripple = 0.001;
    if (!reduced()) shakeUntil = Math.max(shakeUntil, t + 0.12);
    const n = reduced() ? 6 : 16;
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const sp = 90 + Math.random() * 160;
      sparks.push({
        x: cx, y: cy - 6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: 1.1, decay: 1.2, gravity: 220, confetti: true,
        spin: Math.random() * Math.PI * 2, size: 2 + Math.random() * 2,
        color: i % 2 ? "#9fe870" : "#ffe49a"
      });
    }
    if (label) floaters.push({ x: cx, y: cy - 58, life: 1.6, text: label, color: "#bdf2a0", size: 21, big: true });
  }

  function discoveryBurst() {
    const cx = width / 2;
    const cy = creatureY();
    const count = reduced() ? 6 : 22;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.4,
        color: i % 2 ? "#ffe49a" : (creature?.palette?.glow || "#7fe6ff")
      });
    }
  }

  function playExtinction(type) {
    const visual = {
      asteroid: "asteroid",
      ice_age: "ice",
      solar_flare: "solar",
      supervolcano: "volcano",
      pandemic: "pandemic",
      ocean_anoxia: "anoxia"
    }[type] || "asteroid";
    cataclysm = { type: visual, time: 0 };
    if (!reduced()) shakeUntil = t + 1.4;
  }

  function clearExtinction() {
    cataclysm = null;
  }

  // Hit test: the creature is a generous central target for one-handed play.
  function hitCreature(clientX, clientY) {
    if (wildlife.canRender()) return wildlife.hitTest(clientX, clientY);
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = width / 2;
    const cy = creatureY();
    const radius = creatureRadius() * 1.6 + 24;
    return Math.hypot(x - cx, y - cy) <= radius;
  }

  function creatureY() { return height * 0.52; }
  function creatureRadius() { return Math.min(width, height) * 0.16 * (creature?.scale || 1); }

  // ---- main loop ---------------------------------------------------------
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    t += dt;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function step(dt) {
    wildlife.step(dt, t);
    squash = Math.max(0, squash - dt * 4);
    flashCreature = Math.max(0, flashCreature - dt * 2.5);
    if (ripple > 0) { ripple += dt * 2.2; if (ripple > 1) ripple = 0; }

    for (const m of motes) {
      m.y -= m.speed * dt * (scene?.motes === "star" ? 0.2 : 1);
      m.x += Math.sin(t + m.drift) * 6 * dt;
      if (m.y < -4) { m.y = height + 4; m.x = Math.random() * width; }
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life -= dt * (s.decay || 1.6);
      s.vy += (s.gravity == null ? 220 : s.gravity) * dt;
      if (s.confetti) s.vx += Math.sin((t + s.spin) * 7) * 26 * dt; // flutter
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.spin != null) s.spin += dt * 7;
      if (s.life <= 0) sparks.splice(i, 1);
    }
    if (celebration) { celebration.time += dt; if (celebration.time > 1.4) celebration = null; }
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      const f = floaters[i];
      f.life -= dt * 1.1;
      f.y -= 40 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    if (cataclysm) {
      cataclysm.time += dt;
      if (cataclysm.time > 2.4) cataclysm = null;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    let ox = 0;
    let oy = 0;
    if (t < shakeUntil) {
      const mag = 6 * ((shakeUntil - t) / 1.4);
      ox = (Math.random() - 0.5) * mag;
      oy = (Math.random() - 0.5) * mag;
    }
    ctx.save();
    ctx.translate(ox, oy);
    const illustrated = wildlife.draw({ time: t, pressure });
    if (!illustrated) {
      drawBackdrop();
      drawWorldActivity();
      drawMotes();
      drawCreature();
    }
    drawCelebration();
    drawSparks();
    drawFloaters();
    drawWorldStress();
    if (cataclysm) drawCataclysm();
    ctx.restore();
  }

  function drawBackdrop() {
    const s = scene || { top: "#10243a", mid: "#1c3a5a", bottom: "#08131f", light: "#7fe6ff", floor: "none" };
    // Pressure pushes the sky toward an anxious red the closer extinction looms.
    const tension = Math.min(1, pressure / 100);
    const imbalance = Math.min(1, (100 - karma) / 75);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, mix(mix(s.top, "#4b4120", imbalance * 0.4), "#3a0e0e", tension * 0.55));
    gradient.addColorStop(0.55, mix(mix(s.mid, "#51451f", imbalance * 0.34), "#2a0808", tension * 0.4));
    gradient.addColorStop(1, mix(s.bottom, "#1d1209", imbalance * 0.3));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Light shafts from above.
    if (!reduced()) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i += 1) {
        const x = width * (0.2 + i * 0.3) + Math.sin(t * 0.2 + i) * 30;
        const shaft = ctx.createLinearGradient(x, 0, x - 60, height);
        shaft.addColorStop(0, hexA(s.light, 0.05 + karma / 1000));
        shaft.addColorStop(1, hexA(s.light, 0));
        ctx.fillStyle = shaft;
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x - 80, height);
        ctx.lineTo(x - 200, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawFloor(s);
    drawBiomeDetails(s);
  }

  function drawBiomeDetails(s) {
    const floorY = height * 0.78;
    ctx.save();
    if (s.name === "Ocean" || s.name === "Primordial Sea") {
      for (let band = 0; band < 3; band += 1) {
        ctx.strokeStyle = hexA(s.light || "#7fe6ff", 0.08 + band * 0.025);
        ctx.lineWidth = 2;
        ctx.beginPath();
        const y = height * (0.25 + band * 0.19);
        for (let x = -20; x <= width + 20; x += 24) {
          const wave = Math.sin(x * 0.018 + t * (0.35 + band * 0.08)) * (5 + band * 2);
          if (x === -20) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 10; i += 1) {
        const x = (i + 0.5) * width / 10;
        const sway = Math.sin(t * 0.7 + i) * 8;
        ctx.strokeStyle = `rgba(48,126,88,${0.18 + karma / 500})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.quadraticCurveTo(x + sway, floorY + 35, x + sway * 0.5, floorY - 15 - (i % 3) * 10);
        ctx.stroke();
      }
    } else if (s.name === "Forest") {
      for (let i = 0; i < 9; i += 1) {
        const x = i * width / 8 + Math.sin(i * 8.7) * 24;
        const crownY = floorY - 50 - (i % 3) * 28;
        ctx.fillStyle = `rgba(4,28,15,${0.35 + (100 - karma) / 300})`;
        ctx.fillRect(x - 5, crownY, 10, height - crownY);
        ctx.beginPath();
        ctx.arc(x, crownY, 34 + (i % 2) * 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (s.name === "Wetland") {
      ctx.strokeStyle = `rgba(88,132,62,${0.25 + karma / 500})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i += 1) {
        const x = i * width / 23;
        const reed = 24 + (i % 5) * 9;
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.quadraticCurveTo(x + Math.sin(t + i) * 5, floorY, x + 2, floorY - reed);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWorldActivity() {
    if (totalPopulation <= 0 || backgroundSpecies.length === 0) return;
    const maxCount = reduced() ? 10 : performance_() ? 18 : 34;
    const count = Math.min(maxCount, Math.max(diversity, Math.round(Math.sqrt(totalPopulation) * 3.4 + diversity)));
    const vitality = 0.18 + karma / 180;
    const totalWeight = backgroundSpecies.reduce((sum, item) => sum + item.population, 0);
    ctx.save();
    for (let i = 0; i < count; i += 1) {
      let cursor = ((i * 0.61803398875) % 1) * totalWeight;
      let item = backgroundSpecies[0];
      for (const candidate of backgroundSpecies) {
        cursor -= candidate.population;
        if (cursor <= 0) { item = candidate; break; }
      }
      const profile = item.profile;
      const aquatic = profile.motion === "swim" || scene?.name === "Ocean" || scene?.name === "Primordial Sea";
      const flying = profile.motion === "fly";
      const rooted = profile.motion === "sway" || profile.archetype === "flora" || profile.archetype === "city";
      const direction = i % 2 ? 1 : -1;
      const speed = reduced() ? 0 : 10 + (i % 5) * 4;
      const travel = ((i * 137 + t * speed * direction) % (width + 140) + width + 140) % (width + 140);
      const x = direction > 0 ? travel - 70 : width + 70 - travel;
      const lane = flying
        ? height * (0.22 + (i % 5) * 0.07)
        : aquatic
          ? height * (0.28 + (i % 6) * 0.075)
          : height * (0.67 + (i % 4) * 0.032);
      const y = lane + Math.sin(t * 0.8 + i * 2.1) * (flying ? 16 : aquatic ? 12 : rooted ? 1 : 4);
      const size = (3.6 + (i % 4) * 1.15 + Math.min(2.5, Math.sqrt(item.population) * 0.28)) * Math.min(1.2, profile.scale || 1);
      ctx.globalAlpha = vitality * (0.45 + (i % 3) * 0.16);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(direction, 1);
      const drawer = ARCHETYPES[profile.archetype] || ARCHETYPES.particle;
      drawer(ctx, size, profile.palette, t * 2 + i, profile, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWorldStress() {
    const imbalance = Math.max(0, (65 - karma) / 65);
    const tension = Math.max(0, (pressure - 35) / 65);
    if (imbalance <= 0 && tension <= 0) return;
    ctx.save();
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(62,12,7,${tension * 0.34 + imbalance * 0.18})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const ashCount = reduced() ? 5 : Math.round(8 + (imbalance + tension) * 16);
    for (let i = 0; i < ashCount; i += 1) {
      const x = ((i * 83 + t * (reduced() ? 0 : 18 + i % 4)) % (width + 30)) - 15;
      const y = ((i * 137 + t * (reduced() ? 0 : 24 + i % 5)) % (height + 30)) - 15;
      ctx.globalAlpha = 0.12 + (imbalance + tension) * 0.18;
      ctx.fillStyle = i % 3 ? "#d5b16a" : "#ff7568";
      ctx.fillRect(x, y, 1.5 + (i % 2), 8 + (i % 4) * 3);
    }
    if (!reduced() && pressure >= 75 && Math.sin(t * 3.7) > 0.94) {
      ctx.globalAlpha = Math.min(0.32, tension * 0.4);
      ctx.fillStyle = "#fff1d0";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  function drawFloor(s) {
    if (!s.floor || s.floor === "none") return;
    const floorY = height * 0.78;
    const colors = {
      sand: "#caa86a", grass: "#2f6f3a", mud: "#5a4a2e", city: "#3a3458", snow: "#dfeef5", rock: "#5a5f6a"
    };
    const c = colors[s.floor] || "#3a3a3a";
    const grd = ctx.createLinearGradient(0, floorY, 0, height);
    grd.addColorStop(0, hexA(c, 0.0));
    grd.addColorStop(1, hexA(c, 0.55));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, floorY + Math.sin(t * 0.4) * 4);
    for (let x = 0; x <= width; x += 40) {
      ctx.lineTo(x, floorY + Math.sin(x * 0.01 + t * 0.4) * 6);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  function drawMotes() {
    const s = scene || {};
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const m of motes) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 2 + m.drift);
      ctx.fillStyle = s.motes === "star" ? "#cfe0ff" : hexA(s.light || "#7fe6ff", 0.8);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCreature() {
    if (!creature) return;
    const cx = width / 2;
    const cy = creatureY();
    const size = creatureRadius();
    const palette = creature.palette || { body: "#8fd6ff", accent: "#ffffff", glow: "#4d8fff" };
    const motion = creature.motion || "drift";
    const phase = t * (motion === "fly" ? 6 : motion === "walk" ? 5 : motion === "swim" ? 3 : 2);

    // Idle locomotion offsets keep the hero alive without leaving the tap zone.
    let bob = 0;
    let lean = 0;
    if (motion === "fly") bob = Math.sin(phase) * size * 0.18;
    else if (motion === "swim") { bob = Math.sin(phase) * size * 0.08; lean = Math.sin(phase) * 0.12; }
    else if (motion === "drift") bob = Math.sin(t * 1.4) * size * 0.12;
    else if (motion === "pulse") bob = Math.sin(t * 2) * size * 0.05;
    else if (motion === "sway") lean = Math.sin(t * 1.2) * 0.1;
    else if (motion === "crawl") bob = Math.abs(Math.sin(phase)) * size * 0.06;
    else if (motion === "walk") bob = Math.abs(Math.sin(phase)) * size * 0.04;

    const sx = 1 + squash * 0.18;
    const sy = 1 - squash * 0.22;

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(lean);
    ctx.scale(sx, sy);

    // Soft glow halo (brightens on tap / on becoming something new).
    const halo = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.7);
    halo.addColorStop(0, hexA(palette.glow, 0.45 + flashCreature * 0.4));
    halo.addColorStop(1, hexA(palette.glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.7, 0, Math.PI * 2);
    ctx.fill();

    const drawer = ARCHETYPES[creature.archetype] || ARCHETYPES.particle;
    drawer(ctx, size, palette, phase, creature, flashCreature);

    ctx.restore();

    // Tap ripple ring.
    if (ripple > 0) {
      ctx.save();
      ctx.globalAlpha = (1 - ripple) * 0.6;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (0.8 + ripple * 1.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Evolution invitation: a soft golden aura pulses when a new species can be
    // chosen, drawing the eye toward the Evolve menu without blocking play.
    if (evolveReady && !cataclysm && !worldEnded) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.save();
      ctx.globalAlpha = 0.2 + pulse * 0.3;
      ctx.strokeStyle = "#ffd76a";
      ctx.lineWidth = 2 + pulse * 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (1.18 + pulse * 0.14), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Name tag.
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `600 ${Math.max(13, size * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(creature.label || "", cx, cy + size * 1.55);
    if (creature.rarity) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = rarityColor(creature.rarity);
      ctx.font = `500 ${Math.max(10, size * 0.11)}px system-ui, sans-serif`;
      ctx.fillText(creature.rarity.toUpperCase(), cx, cy + size * 1.78);
    }
    ctx.restore();
  }

  function drawSparks() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
      ctx.fillStyle = s.color;
      if (s.confetti) {
        // Solid rotating pixel squares — reads as celebratory confetti.
        const sz = Math.round(s.size || 4);
        ctx.save();
        ctx.translate(Math.round(s.x), Math.round(s.y));
        ctx.rotate(s.spin || 0);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      } else {
        // Pixel sparkle: a small additive square instead of a soft circle.
        ctx.globalCompositeOperation = "lighter";
        const sz = Math.round(s.size || 3);
        ctx.fillRect(Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
  }

  function drawFloaters() {
    ctx.save();
    ctx.textAlign = "center";
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      const weight = f.big ? 900 : 700;
      ctx.font = `${weight} ${f.size || 20}px system-ui, sans-serif`;
      // Pop-in scale: text springs up then settles, for a juicy entrance.
      const age = (f.startLife || (f.startLife = f.life)) - f.life;
      const pop = f.big ? 1 + Math.max(0, 0.35 - age) : 1;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(pop, pop);
      // dark outline for readability over any backdrop
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = "rgba(8,12,10,0.85)";
      ctx.lineJoin = "round";
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color || "#ffe49a";
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCelebration() {
    if (!celebration) return;
    const k = celebration.time;
    // a quick bright flash that fades
    const flash = Math.max(0, 0.5 - k) ;
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash;
      ctx.fillStyle = celebration.color;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    // an expanding ring
    const cx = width / 2;
    const cy = creatureY();
    const r = k * 520;
    if (k < 0.9) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.6 - k);
      ctx.strokeStyle = celebration.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCataclysm() {
    const k = cataclysm.time;
    if (cataclysm.type === "asteroid") {
      const p = Math.min(1, k / 0.9);
      const x = width * (0.1 + p * 0.4);
      const y = height * (-0.1 + p * 0.62);
      if (p < 1) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const trail = ctx.createLinearGradient(x - 160, y - 160, x, y);
        trail.addColorStop(0, "rgba(255,180,80,0)");
        trail.addColorStop(1, "rgba(255,220,150,0.9)");
        ctx.strokeStyle = trail;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x - 160, y - 160);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "#ffe9c0";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const flash = Math.max(0, 1 - (k - 0.9) * 1.4);
        ctx.fillStyle = `rgba(255,240,210,${flash})`;
        ctx.fillRect(0, 0, width, height);
        const shock = (k - 0.9) * 600;
        ctx.strokeStyle = `rgba(255,200,140,${flash})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.62, shock, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (cataclysm.type === "ice") {
      // Ice age: frost creeps inward from every edge and the world dims to blue.
      const p = Math.min(1, k / 1.8);
      ctx.save();
      ctx.fillStyle = `rgba(150,200,255,${p * 0.35})`;
      ctx.fillRect(0, 0, width, height);
      const inset = Math.min(width, height) * 0.5 * p;
      const frost = ctx.createLinearGradient(0, 0, 0, height);
      frost.addColorStop(0, `rgba(220,240,255,${p * 0.9})`);
      frost.addColorStop(0.5, "rgba(220,240,255,0)");
      frost.addColorStop(1, `rgba(220,240,255,${p * 0.9})`);
      ctx.fillStyle = frost;
      ctx.fillRect(0, 0, width, inset);
      ctx.fillRect(0, height - inset, width, inset);
      const side = ctx.createLinearGradient(0, 0, width, 0);
      side.addColorStop(0, `rgba(220,240,255,${p * 0.9})`);
      side.addColorStop(0.5, "rgba(220,240,255,0)");
      side.addColorStop(1, `rgba(220,240,255,${p * 0.9})`);
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, inset, height);
      ctx.fillRect(width - inset, 0, inset, height);
      ctx.restore();
    } else {
      const p = Math.min(1, k / 1.8);
      const styles = {
        solar: [255, 120, 90],
        volcano: [120, 45, 25],
        pandemic: [110, 190, 90],
        anoxia: [20, 45, 70]
      };
      const [r, g, b] = styles[cataclysm.type] || styles.volcano;
      ctx.save();
      ctx.fillStyle = `rgba(${r},${g},${b},${0.18 + p * 0.42})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = cataclysm.type === "solar" ? "lighter" : "source-over";
      ctx.strokeStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${0.75 * p})`;
      ctx.lineWidth = cataclysm.type === "pandemic" ? 3 : 7;
      for (let i = 0; i < 7; i += 1) {
        const radius = (30 + i * 70) * p;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.52, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---- lifecycle ---------------------------------------------------------
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  canvas.addEventListener("pointerdown", event => {
    if (worldEnded || cataclysm) return;
    if (hitCreature(event.clientX, event.clientY)) {
      // Run the action first so the floating number reflects what actually
      // happened (grew a population, or catalyzed Energy, or was rejected).
      const info = onTapCreature() || {};
      tap(info);
    }
  });
  window.addEventListener("resize", resize);
  resize();

  return { update, tap, celebrate, stageUp, discoveryBurst, playExtinction, clearExtinction, start, stop, resize };
}

// ---------------------------------------------------------------------------
// Archetype draw routines. Each is centered at (0,0) and scaled by `size`.
// `creature.features` lets one routine render many distinct species.
const ARCHETYPES = {
  particle(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    const wobble = 1 + Math.sin(phase) * 0.06;
    if (f.flagella) {
      // Bacteria: a whipping tail.
      ctx.strokeStyle = hexA(p.glow, 0.8);
      ctx.lineWidth = size * 0.06;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, 0);
      for (let i = 1; i <= 6; i += 1) {
        const t = i / 6;
        ctx.lineTo(-size * (0.4 + t * 0.8), Math.sin(phase * 2 + t * 6) * size * 0.18 * t);
      }
      ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    blob(ctx, size * 0.55 * wobble, phase);
    ctx.fill();
    if (f.spiky) {
      ctx.strokeStyle = hexA(p.glow, 0.9);
      ctx.lineWidth = size * 0.05;
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
        ctx.lineTo(Math.cos(a) * size * 0.75, Math.sin(a) * size * 0.75);
        ctx.stroke();
      }
    }
    ctx.fillStyle = hexA(p.accent, 0.85);
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.12, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Orbiting electrons only for the literal atom/molecule (no biology yet).
    if (creature && creature.kind === "origin") {
      ctx.strokeStyle = hexA(p.glow, 0.7);
      ctx.lineWidth = 2;
      const orbits = creature.parts ? Math.min(3, Math.max(1, Math.round(creature.parts / 2))) : 3;
      for (let i = 0; i < orbits; i += 1) {
        const a = phase + i * (Math.PI / 1.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.9, size * 0.34, a, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = p.glow;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.34, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  flora(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    const sway = Math.sin(phase) * size * 0.12;
    // Trunk / stalk.
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = f.cap ? size * 0.22 : size * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, size * 0.9);
    ctx.quadraticCurveTo(sway * 0.5, size * 0.1, sway, -size * 0.4);
    ctx.stroke();
    ctx.fillStyle = p.body;
    if (f.conifer) {
      // Stacked triangles.
      for (let i = 0; i < 3; i += 1) {
        const y = -size * 0.1 - i * size * 0.32;
        const w = size * (0.8 - i * 0.18);
        ctx.beginPath();
        ctx.moveTo(sway, y - size * 0.45);
        ctx.lineTo(sway - w, y);
        ctx.lineTo(sway + w, y);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.cap) {
      // Mushroom dome on a pale stem.
      ctx.fillStyle = hexA(p.accent, 0.9);
      ctx.fillRect(-size * 0.16, -size * 0.4, size * 0.32, size * 0.9);
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.45, size * 0.62, size * 0.4, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = hexA(p.accent, 0.7);
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * size * 0.28, -size * 0.55, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.flower) {
      // Petals around a bright center.
      ctx.fillStyle = p.body;
      for (let i = 0; i < 6; i += 1) {
        const a = phase * 0.2 + i * (Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(sway + Math.cos(a) * size * 0.4, -size * 0.6 + Math.sin(a) * size * 0.4, size * 0.26, size * 0.16, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd76a";
      ctx.beginPath();
      ctx.arc(sway, -size * 0.6, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Leafy canopy (algae, moss, ferns, sponge).
      ctx.beginPath();
      ctx.ellipse(sway, -size * 0.6, size * 0.72, size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexA(p.accent, 0.8);
      ctx.beginPath();
      ctx.ellipse(sway - size * 0.2, -size * 0.72, size * 0.28, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (f.pores) {
        ctx.fillStyle = hexA(p.glow, 0.6);
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.arc(sway + (i - 2) * size * 0.22, -size * 0.6 + Math.sin(i) * size * 0.18, size * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },
  swimmer(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    const tail = Math.sin(phase) * size * 0.35;
    ctx.fillStyle = p.body;
    // Body.
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.85, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail: a horizontal fluke for whales, a vertical fin otherwise.
    if (f.fluke) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.quadraticCurveTo(-size * 1.1, tail * 0.4, -size * 1.25, tail * 0.4 - size * 0.05);
      ctx.lineTo(-size * 1.25, tail * 0.4 + size * 0.05);
      ctx.quadraticCurveTo(-size * 1.0, 0, -size * 1.25, -tail * 0.4 - size * 0.05);
      ctx.lineTo(-size * 1.25, -tail * 0.4 + size * 0.05);
      ctx.quadraticCurveTo(-size * 1.1, -tail * 0.4, -size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.lineTo(-size * 1.15, tail - size * 0.3);
      ctx.lineTo(-size * 1.15, tail + size * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // Dorsal fin — tall and sharp for sharks.
    ctx.fillStyle = hexA(p.accent, 0.85);
    const finH = f.dorsal ? size * 0.95 : size * 0.7;
    ctx.beginPath();
    ctx.moveTo(size * 0.12, -size * 0.32);
    ctx.lineTo(-size * 0.15, -finH - Math.sin(phase) * size * 0.05);
    ctx.lineTo(-size * 0.35, -size * 0.3);
    ctx.closePath();
    ctx.fill();
    if (f.blowhole) {
      // A faint spout.
      ctx.strokeStyle = hexA("#dff4ff", 0.5);
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.moveTo(size * 0.35, -size * 0.4);
      ctx.lineTo(size * 0.35, -size * 0.85);
      ctx.stroke();
    }
    eye(ctx, size * 0.55, -size * 0.08, size * 0.1);
    if (f.teeth) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = size * 0.04;
      ctx.beginPath();
      ctx.moveTo(size * 0.85, size * 0.08);
      ctx.lineTo(size * 0.55, size * 0.2);
      ctx.stroke();
    }
  },
  earlyFish(ctx, size, p, phase, creature) {
    const f = creature?.features || {};
    const tailBeat = Math.sin(phase) * size * 0.24;
    const stripe = f.lineageAccent || "#42d1c2";

    // A rounded ray-finned generalist: broad head, tapered body, paired fins.
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(-size * 0.82, 0);
    ctx.bezierCurveTo(-size * 0.55, -size * 0.43, size * 0.38, -size * 0.48, size * 0.78, -size * 0.12);
    ctx.quadraticCurveTo(size * 0.96, 0, size * 0.78, size * 0.18);
    ctx.bezierCurveTo(size * 0.28, size * 0.48, -size * 0.56, size * 0.38, -size * 0.82, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size * 0.76, 0);
    ctx.lineTo(-size * 1.2, tailBeat - size * 0.34);
    ctx.lineTo(-size * 1.12, tailBeat);
    ctx.lineTo(-size * 1.2, tailBeat + size * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hexA(p.accent, 0.86);
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.34);
    ctx.lineTo(-size * 0.34, -size * 0.75);
    ctx.lineTo(size * 0.18, -size * 0.36);
    ctx.closePath();
    ctx.fill();
    for (const y of [-0.02, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(size * 0.05, size * y);
      ctx.lineTo(-size * 0.25, size * (y + 0.34));
      ctx.lineTo(size * 0.35, size * (y + 0.12));
      ctx.closePath();
      ctx.fill();
    }

    // The teal lateral line is the inherited mark carried onto land.
    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.075;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.72, -size * 0.02);
    ctx.quadraticCurveTo(0, size * 0.04, size * 0.62, -size * 0.06);
    ctx.stroke();
    eye(ctx, size * 0.66, -size * 0.13, size * 0.105);
  },
  amphibian(ctx, size, p, phase, creature) {
    const f = creature?.features || {};
    const stripe = f.lineageAccent || "#42d1c2";
    const step = Math.sin(phase * 1.5) * size * 0.12;
    const tailSway = Math.sin(phase * 0.8) * size * 0.12;

    // Salamander proportions retain the fish tail and introduce four limbs.
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.13;
    ctx.lineCap = "round";
    const limbRoots = [[-0.38, -1], [-0.38, 1], [0.38, 1], [0.38, -1]];
    limbRoots.forEach(([x, direction], index) => {
      const swing = (index % 2 ? step : -step) * direction;
      ctx.beginPath();
      ctx.moveTo(size * x, size * 0.12);
      ctx.quadraticCurveTo(size * (x + direction * 0.18), size * 0.38, size * (x + direction * 0.28) + swing, size * 0.5);
      ctx.stroke();
      ctx.lineWidth = size * 0.035;
      for (let toe = -1; toe <= 1; toe += 1) {
        ctx.beginPath();
        ctx.moveTo(size * (x + direction * 0.28) + swing, size * 0.5);
        ctx.lineTo(size * (x + direction * (0.34 + toe * 0.025)) + swing, size * (0.55 + Math.abs(toe) * 0.025));
        ctx.stroke();
      }
      ctx.lineWidth = size * 0.13;
    });

    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, 0, size * 0.72, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.58, -size * 0.05, size * 0.42, size * 0.31, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.body;
    ctx.lineWidth = size * 0.24;
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, 0);
    ctx.quadraticCurveTo(-size * 1.05, tailSway, -size * 1.42, tailSway * 1.4);
    ctx.stroke();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(-size * 1.25, tailSway * 1.2);
    ctx.quadraticCurveTo(-size * 0.45, -size * 0.04, size * 0.55, -size * 0.1);
    ctx.stroke();

    // Raised eyes are the first obvious land-facing change.
    ctx.fillStyle = p.body;
    for (const y of [-0.19, 0.11]) {
      ctx.beginPath();
      ctx.arc(size * 0.67, size * y, size * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    eye(ctx, size * 0.72, -size * 0.2, size * 0.075);
  },
  smallReptile(ctx, size, p, phase, creature) {
    const f = creature?.features || {};
    const stripe = f.lineageAccent || "#42b9a9";
    const plates = f.plateAccent || p.accent;
    const stride = Math.sin(phase) * size * 0.14;
    const tailSway = Math.sin(phase * 0.65) * size * 0.08;

    // Stronger, tucked-under limbs establish weight-bearing on dry land.
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.14;
    ctx.lineCap = "round";
    for (const [x, sign, phaseSign] of [[-0.38, -1, 1], [-0.38, 1, -1], [0.38, -1, -1], [0.38, 1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(size * x, size * 0.08);
      ctx.lineTo(size * (x + sign * 0.12), size * 0.42);
      ctx.lineTo(size * (x + sign * 0.28) + stride * phaseSign, size * 0.52);
      ctx.stroke();
    }

    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, -size * 0.04, size * 0.78, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.48, -size * 0.25);
    ctx.lineTo(size * 0.98, -size * 0.2);
    ctx.lineTo(size * 1.08, size * 0.02);
    ctx.lineTo(size * 0.72, size * 0.2);
    ctx.lineTo(size * 0.42, size * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = p.body;
    ctx.lineWidth = size * 0.27;
    ctx.beginPath();
    ctx.moveTo(-size * 0.72, -size * 0.02);
    ctx.quadraticCurveTo(-size * 1.15, tailSway, -size * 1.52, tailSway * 1.5);
    ctx.stroke();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.055;
    ctx.beginPath();
    ctx.moveTo(-size * 1.25, tailSway);
    ctx.quadraticCurveTo(-size * 0.5, -size * 0.12, size * 0.55, -size * 0.13);
    ctx.stroke();

    // Amber cheek and dorsal plates are the new amniote armor motif.
    ctx.fillStyle = plates;
    for (let i = 0; i < 5; i += 1) {
      const x = size * (-0.5 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, -size * 0.32);
      ctx.lineTo(x + size * 0.09, -size * (0.46 + (i % 2) * 0.04));
      ctx.lineTo(x + size * 0.18, -size * 0.31);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = hexA(plates, 0.82);
    ctx.beginPath();
    ctx.ellipse(size * 0.76, -size * 0.04, size * 0.22, size * 0.13, -0.1, 0, Math.PI * 2);
    ctx.fill();
    eye(ctx, size * 0.86, -size * 0.2, size * 0.075);
  },
  basalMammal(ctx, size, p, phase, creature) {
    const f = creature?.features || {};
    const stripe = f.lineageAccent || "#3fa99d";
    const step = Math.sin(phase) * size * 0.16;
    const breathe = 1 + Math.sin(phase * 0.35) * 0.025;

    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = "round";
    for (const [x, swing] of [[-0.4, step], [-0.18, -step], [0.32, -step], [0.48, step]]) {
      ctx.beginPath();
      ctx.moveTo(size * x, size * 0.12);
      ctx.lineTo(size * (x + swing / size), size * 0.53);
      ctx.stroke();
    }

    ctx.save();
    ctx.scale(breathe, 1);
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(-size * 0.12, -size * 0.04, size * 0.74, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.42, -size * 0.22);
    ctx.quadraticCurveTo(size * 0.76, -size * 0.42, size * 1.05, -size * 0.1);
    ctx.quadraticCurveTo(size * 0.84, size * 0.16, size * 0.48, size * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Flexible tail retains the ancestral line, now with a small teal tip band.
    ctx.strokeStyle = p.body;
    ctx.lineWidth = size * 0.16;
    ctx.beginPath();
    ctx.moveTo(-size * 0.76, -size * 0.04);
    ctx.quadraticCurveTo(-size * 1.14, -size * 0.2, -size * 1.32, -size * 0.48 + Math.sin(phase * 0.6) * size * 0.08);
    ctx.stroke();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(-size * 1.16, -size * 0.36);
    ctx.lineTo(-size * 1.3, -size * 0.46);
    ctx.stroke();

    ctx.fillStyle = p.body;
    for (const [x, y, r] of [[0.58, -0.43, 0.18], [0.38, -0.39, 0.15]]) {
      ctx.beginPath();
      ctx.arc(size * x, size * y, size * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexA(p.accent, 0.7);
      ctx.beginPath();
      ctx.arc(size * x, size * y, size * r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.body;
    }

    // Broad fur clumps replace reptile plates but keep their dorsal rhythm.
    ctx.fillStyle = hexA(p.accent, 0.48);
    for (let i = 0; i < 5; i += 1) {
      const x = size * (-0.5 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, -size * 0.3);
      ctx.lineTo(x + size * 0.08, -size * 0.43);
      ctx.lineTo(x + size * 0.17, -size * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    eye(ctx, size * 0.79, -size * 0.2, size * 0.082);
  },
  canid(ctx, size, p, phase, creature) {
    const f = creature?.features || {};
    const stripe = f.lineageAccent || "#3b9d94";
    const stride = Math.sin(phase) * size * 0.24;
    const counter = Math.sin(phase + Math.PI) * size * 0.24;

    // Long legs and a deep chest turn the basal mammal into a distance hunter.
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.13;
    ctx.lineCap = "round";
    for (const [x, swing] of [[-0.44, stride], [-0.2, counter], [0.3, counter], [0.52, stride]]) {
      ctx.beginPath();
      ctx.moveTo(size * x, size * 0.08);
      ctx.lineTo(size * (x - 0.02), size * 0.45);
      ctx.lineTo(size * x + swing, size * 0.72);
      ctx.stroke();
    }

    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(-size * 0.72, -size * 0.12);
    ctx.quadraticCurveTo(-size * 0.18, -size * 0.5, size * 0.42, -size * 0.34);
    ctx.lineTo(size * 0.62, size * 0.12);
    ctx.quadraticCurveTo(0, size * 0.42, -size * 0.68, size * 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = p.body;
    ctx.lineWidth = size * 0.25;
    ctx.beginPath();
    ctx.moveTo(-size * 0.66, -size * 0.16);
    ctx.quadraticCurveTo(-size * 1.08, -size * 0.48, -size * 1.32, -size * 0.24 + Math.sin(phase * 0.5) * size * 0.11);
    ctx.stroke();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.065;
    ctx.beginPath();
    ctx.moveTo(-size * 1.14, -size * 0.34);
    ctx.lineTo(-size * 1.3, -size * 0.25);
    ctx.stroke();

    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.arc(size * 0.63, -size * 0.43, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.8, -size * 0.45);
    ctx.lineTo(size * 1.2, -size * 0.36);
    ctx.lineTo(size * 1.16, -size * 0.16);
    ctx.lineTo(size * 0.74, -size * 0.18);
    ctx.closePath();
    ctx.fill();

    for (const [x, lean] of [[0.48, -0.08], [0.72, 0.08]]) {
      ctx.beginPath();
      ctx.moveTo(size * x, -size * 0.68);
      ctx.lineTo(size * (x + lean), -size * 1.02);
      ctx.lineTo(size * (x + 0.2), -size * 0.69);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = hexA(p.accent, 0.55);
    ctx.beginPath();
    ctx.moveTo(size * 0.18, -size * 0.36);
    ctx.lineTo(size * 0.42, size * 0.2);
    ctx.lineTo(size * 0.64, size * 0.08);
    ctx.lineTo(size * 0.5, -size * 0.35);
    ctx.closePath();
    ctx.fill();
    eye(ctx, size * 0.77, -size * 0.5, size * 0.085);
    ctx.fillStyle = "#172018";
    ctx.beginPath();
    ctx.arc(size * 1.17, -size * 0.28, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
  },
  crawler(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    const segments = f.segments || 4;
    ctx.fillStyle = p.body;
    for (let i = 0; i < segments; i += 1) {
      const x = (i - (segments - 1) / 2) * size * 0.42;
      ctx.beginPath();
      ctx.arc(x, Math.sin(phase + i) * size * 0.05, size * (f.smooth ? 0.34 : 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    const legs = f.legs || segments;
    for (let i = 0; i < legs; i += 1) {
      const x = (i - (legs - 1) / 2) * size * 0.42;
      const k = Math.sin(phase * 2 + i) * size * 0.16;
      ctx.beginPath();
      ctx.moveTo(x, size * 0.2);
      ctx.lineTo(x + k, size * 0.5);
      ctx.stroke();
    }
    if (f.antennae) {
      const headX = (legs - 1) / 2 * size * 0.42 + size * 0.2;
      ctx.beginPath();
      ctx.moveTo(headX, -size * 0.1);
      ctx.lineTo(headX + size * 0.25, -size * 0.45);
      ctx.stroke();
    }
    eye(ctx, ((segments - 1) / 2) * size * 0.42 + size * 0.2, -size * 0.06, size * 0.09);
  },
  walker(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    if (f.upright) return drawBiped(ctx, size, p, phase, f);
    // Quadruped with a walk cycle.
    const stepA = Math.sin(phase) * size * 0.22;
    const stepB = Math.sin(phase + Math.PI) * size * 0.22;
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = "round";
    for (const [base, swing] of [[-size * 0.45, stepA], [size * 0.35, stepB]]) {
      ctx.beginPath();
      ctx.moveTo(base, size * 0.1);
      ctx.lineTo(base + swing, size * 0.7);
      ctx.stroke();
    }
    if (f.tail) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.78, -size * 0.05);
      ctx.quadraticCurveTo(-size * 1.15, -size * 0.1, -size * 1.2, -size * 0.35 - Math.sin(phase) * size * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head (+ optional snout for canids / big head for dinos).
    const headR = f.bigHead ? size * 0.44 : size * 0.34;
    ctx.beginPath();
    ctx.arc(size * 0.7, -size * 0.35, headR, 0, Math.PI * 2);
    ctx.fill();
    if (f.snout) {
      ctx.beginPath();
      ctx.ellipse(size * 1.02, -size * 0.28, size * 0.2, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (f.ears) {
      for (const dx of [-0.12, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(size * (0.7 + dx), -size * 0.6);
        ctx.lineTo(size * (0.62 + dx), -size * 0.85);
        ctx.lineTo(size * (0.8 + dx), -size * 0.62);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = hexA(p.accent, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.1, size * 0.5, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    eye(ctx, size * (f.snout ? 0.95 : 0.82), -size * 0.4, size * 0.08);
  },
  flyer(ctx, size, p, phase, creature) {
    const f = (creature && creature.features) || {};
    const flap = Math.sin(phase) * size * 0.5;
    // Insects flap two pairs of translucent wings; others a single pair.
    ctx.fillStyle = hexA(p.accent, f.insectWings ? 0.55 : 0.9);
    const pairs = f.insectWings ? [0.0, 0.35] : [0.0];
    for (const offset of pairs) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * size * offset, -size * 0.1);
        ctx.quadraticCurveTo(dir * size * 0.9, -flap, dir * size * 1.1, size * 0.15);
        ctx.quadraticCurveTo(dir * size * 0.7, size * 0.2, dir * size * offset, size * 0.15);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.beginPath();
    ctx.arc(0, -size * 0.5, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    if (f.beak) {
      ctx.fillStyle = "#ffb14a";
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.4, -size * 0.52);
      ctx.lineTo(0, -size * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    if (f.antennae) {
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = size * 0.04;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * size * 0.08, -size * 0.66);
        ctx.lineTo(dir * size * 0.28, -size * 0.95);
        ctx.stroke();
      }
    }
    eye(ctx, f.beak ? -size * 0.05 : size * 0.1, -size * 0.55, size * 0.07);
  },
  city(ctx, size, p, phase) {
    // Civilization: a glowing skyline with twinkling windows.
    const buildings = [[-0.85, 0.7], [-0.45, 1.1], [-0.05, 0.85], [0.35, 1.25], [0.78, 0.6]];
    for (let i = 0; i < buildings.length; i += 1) {
      const [bx, bh] = buildings[i];
      const x = bx * size;
      const w = size * 0.3;
      const h = bh * size;
      ctx.fillStyle = p.glow;
      ctx.fillRect(x - w / 2, size * 0.6 - h, w, h);
      ctx.fillStyle = hexA(p.accent, 0.85);
      for (let wy = 0; wy < Math.floor(h / (size * 0.18)); wy += 1) {
        for (let wx = -1; wx <= 1; wx += 1) {
          const lit = (Math.sin(phase + i * 2 + wy + wx) > -0.3) ? 0.9 : 0.18;
          ctx.globalAlpha = lit;
          ctx.fillRect(x + wx * size * 0.08 - size * 0.025, size * 0.5 - h + wy * size * 0.18, size * 0.05, size * 0.08);
        }
      }
      ctx.globalAlpha = 1;
    }
  },
  rocket(ctx, size, p, phase) {
    // Spacefarer: an ascending rocket with a flickering exhaust.
    const flick = 0.7 + Math.abs(Math.sin(phase * 2)) * 0.6;
    ctx.fillStyle = "#ffb14a";
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, size * 0.5);
    ctx.quadraticCurveTo(0, size * (0.5 + 0.7 * flick), size * 0.22, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexA("#fff2c0", 0.8);
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, size * 0.5);
    ctx.quadraticCurveTo(0, size * (0.5 + 0.4 * flick), size * 0.12, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.quadraticCurveTo(size * 0.4, -size * 0.2, size * 0.32, size * 0.5);
    ctx.lineTo(-size * 0.32, size * 0.5);
    ctx.quadraticCurveTo(-size * 0.4, -size * 0.2, 0, -size * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.glow;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * size * 0.3, size * 0.2);
      ctx.lineTo(dir * size * 0.55, size * 0.55);
      ctx.lineTo(dir * size * 0.28, size * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = hexA("#9fd0ff", 0.95);
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  },
  ufo(ctx, size, p, phase) {
    // Star Voyager: an alien in a saucer with a tractor beam and blinking lights.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(0, size * 0.2, 0, size * 1.1);
    beam.addColorStop(0, hexA(p.glow, 0.5));
    beam.addColorStop(1, hexA(p.glow, 0));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.2);
    ctx.lineTo(size * 0.25, size * 0.2);
    ctx.lineTo(size * 0.6, size * 1.1);
    ctx.lineTo(-size * 0.6, size * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Dome + little alien.
    ctx.fillStyle = hexA(p.accent, 0.85);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.4, size * 0.32, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#1c2a24";
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.22, size * 0.16, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    eye(ctx, -size * 0.06, -size * 0.24, size * 0.05);
    eye(ctx, size * 0.06, -size * 0.24, size * 0.05);
    // Saucer body.
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.06, size * 0.95, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.glow;
    for (let i = 0; i < 5; i += 1) {
      const lit = Math.sin(phase * 2 + i) > 0 ? 1 : 0.3;
      ctx.globalAlpha = lit;
      ctx.beginPath();
      ctx.arc((i - 2) * size * 0.34, size * 0.14, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

// A standing biped (primates, humans) — distinct from the quadruped walker.
function drawBiped(ctx, size, p, phase, f) {
  const stepA = Math.sin(phase) * size * 0.18;
  const stepB = Math.sin(phase + Math.PI) * size * 0.18;
  ctx.strokeStyle = p.glow;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  // Legs.
  for (const swing of [stepA, stepB]) {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.25);
    ctx.lineTo(swing, size * 0.85);
    ctx.stroke();
  }
  // Torso.
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.05, size * 0.3, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arms (longer for apes), swinging opposite the legs.
  const armLen = f.longArms ? size * 0.7 : size * 0.55;
  for (const swing of [-stepA, -stepB]) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.2);
    ctx.lineTo(swing, -size * 0.2 + armLen);
    ctx.stroke();
  }
  // Head.
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.arc(0, -size * 0.65, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, size * 0.1, -size * 0.66, size * 0.07);
}

function eye(ctx, x, y, r) {
  ctx.fillStyle = "#0b0b12";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function blob(ctx, r, phase) {
  const points = 10;
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const rad = r * (1 + Math.sin(a * 3 + phase) * 0.08);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function rarityColor(rarity) {
  return { Common: "#9fb0c0", Uncommon: "#74d68a", Rare: "#6db5ff", Mythic: "#ffcaff" }[rarity] || "#9fb0c0";
}

// Colour helpers (accept #rgb / #rrggbb).
function parseHex(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function hexA(hex, alpha) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
function mix(a, b, k) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * k);
  const g = Math.round(ca.g + (cb.g - ca.g) * k);
  const bl = Math.round(ca.b + (cb.b - ca.b) * k);
  return `rgb(${r},${g},${bl})`;
}
