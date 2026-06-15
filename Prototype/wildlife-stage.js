import { habitatVisual, wildlifeVisual } from "./assets/stage/manifest.js";
import { drawPixelCreature, drawPixelEgg, drawPixelEmbryo } from "./pixel-sprites.js";

const SVG_CACHE = new Map();

export function createWildlifeLayer(canvas, { getSettings = () => ({}) } = {}) {
  const ctx = canvas.getContext("2d");
  let width = 1;
  let height = 1;
  let visual = null;
  let habitat = habitatVisual("ocean");
  let assets = null;
  let previous = null;
  let stageIndex = 4;
  let stageLabel = "Adult";
  let visualKey = "";
  let fade = 0;
  let x = 0.5;
  let targetX = 0.68;
  let direction = 1;
  let behaviorClock = 2.5;
  let reaction = 0;
  let ambient = [];
  let enabled = true;
  let loadToken = 0;
  let lastTime = 0;
  let heroBounds = { x: 0, y: 0, radius: 0 };

  function resize(nextWidth, nextHeight) {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
  }

  function update(state) {
    enabled = getSettings().wildlifeArt !== false;
    const candidate = state.lifeTargetId ? wildlifeVisual(state.lifeTargetId) : wildlifeVisual(state.currentCreature?.id);
    if (!enabled || !candidate || state.currentCreature?.kind !== "life-stage") {
      visual = null;
      assets = null;
      visualKey = "";
      return;
    }

    const nextStage = Math.max(0, Math.min(4, Number(state.lifeStageIndex) || 0));
    const habitatId = state.wildlifeHabitatId || candidate.biome;
    const nextKey = `${candidate.id}:${nextStage}:${habitatId}`;
    habitat = habitatVisual(habitatId);
    stageLabel = state.currentCreature?.label || "Developing";
    if (nextKey !== visualKey) {
      previous = visual && assets ? { visual, assets, stageIndex, x, direction } : null;
      fade = previous ? 1 : 0;
      visual = candidate;
      stageIndex = nextStage;
      visualKey = nextKey;
      x = stageIndex < 2 ? 0.5 : clamp(x, 0.26, 0.74);
      targetX = seeded(candidate.id, nextStage) > 0.5 ? 0.7 : 0.3;
      direction = targetX >= x ? 1 : -1;
      buildAmbient();
      preload(candidate);
      preloadNext(state.lifeTargetId, nextStage);
    }
  }

  async function preload(candidate) {
    const token = ++loadToken;
    try {
      const loaded = await loadVisualAssets(candidate);
      if (token === loadToken && visual?.id === candidate.id) assets = loaded;
    } catch {
      if (token === loadToken) assets = null;
    }
  }

  function preloadNext(id, index) {
    if (!id || index >= 4) return;
    const candidate = wildlifeVisual(id);
    if (candidate) loadVisualAssets(candidate).catch(() => {});
  }

  function buildAmbient() {
    const count = getSettings().performanceMode ? 2 : 4;
    ambient = Array.from({ length: count }, (_, index) => {
      const id = habitat.ambient[index % habitat.ambient.length];
      const seed = seeded(`${habitat.id}:${id}`, index);
      const actor = {
        id,
        visual: wildlifeVisual(id),
        assets: null,
        x: 0.06 + ((seed * 7.19 + index * 0.27) % 0.88),
        y: 0.42 + ((seed * 3.7 + index * 0.137) % 0.31),
        scale: 0.05 + ((seed * 5.3) % 0.03),
        speed: 0.006 + ((seed * 11.1) % 0.012),
        phase: seed * Math.PI * 2,
        direction: index % 2 ? 1 : -1
      };
      if (actor.visual) loadVisualAssets(actor.visual).then(value => { actor.assets = value; }).catch(() => {});
      return actor;
    });
  }

  function step(dt, time) {
    lastTime = time;
    reaction = Math.max(0, reaction - dt * 2.8);
    fade = Math.max(0, fade - dt * 2.2);
    if (!visual || getSettings().reducedMotion || visual.stages[stageIndex].scene !== "habitat") return;
    behaviorClock -= dt;
    if (behaviorClock <= 0) {
      const choice = seeded(`${visual.id}:${Math.floor(time / 3)}`, stageIndex);
      targetX = 0.25 + choice * 0.5;
      direction = targetX >= x ? 1 : -1;
      behaviorClock = 2.2 + choice * 3.4;
    }
    const familySpeed = visual.family === "flyer" ? 0.07 : visual.family === "swimmer" ? 0.052 : visual.family === "serpentine" ? 0.028 : 0.035;
    const delta = targetX - x;
    x += Math.sign(delta) * Math.min(Math.abs(delta), familySpeed * dt);
    for (const actor of ambient) {
      actor.x += actor.speed * actor.direction * dt;
      if (actor.x > 1.08) { actor.x = -0.08; actor.direction = 1; }
      if (actor.x < -0.08) { actor.x = 1.08; actor.direction = -1; }
    }
  }

  // Render the smooth vector habitat into a low-res buffer, then upscale it with
  // nearest-neighbor so the WHOLE backdrop is pixelated — cohesive with the pixel
  // creatures drawn crisply on top. This is the single biggest "make it look like
  // a real pixel game" win.
  let habCanvas = null;
  let habCtx = null;
  function pixelHabitat(time, pressure) {
    const PX = 3; // art-pixel size of the backdrop
    const lw = Math.max(1, Math.ceil(width / PX));
    const lh = Math.max(1, Math.ceil(height / PX));
    if (!habCanvas) {
      habCanvas = (typeof OffscreenCanvas !== "undefined") ? new OffscreenCanvas(lw, lh) : document.createElement("canvas");
      habCtx = habCanvas.getContext("2d");
    }
    if (habCanvas.width !== lw || habCanvas.height !== lh) { habCanvas.width = lw; habCanvas.height = lh; }
    // Draw the habitat at full size into a 1/PX-scaled context so every element
    // (gradients and absolute-sized shapes alike) shrinks uniformly.
    habCtx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
    habCtx.clearRect(0, 0, width, height);
    drawHabitat(habCtx, habitat, width, height, time, pressure, getSettings());
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(habCanvas, 0, 0, lw, lh, 0, 0, lw * PX, lh * PX);
    ctx.restore();
  }

  function draw({ time = lastTime, pressure = 0 } = {}) {
    // Pixel-art rendering needs only the visual data (family/colors/shape),
    // not the async SVG parts, so the creature shows instantly.
    if (!visual || !enabled) return false;
    pixelHabitat(time, pressure);
    drawAmbient(time);
    if (previous && fade > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.75, fade);
      drawFeatured(previous.visual, previous.assets, previous.stageIndex, previous.x, previous.direction, time, true);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 1 - Math.min(0.75, fade);
    drawFeatured(visual, assets, stageIndex, x, direction, time, false);
    ctx.restore();
    return true;
  }

  function drawAmbient(time) {
    const visible = getSettings().performanceMode ? ambient.slice(0, 4) : ambient;
    for (const actor of visible) {
      if (!actor.visual || (actor.id === visual.id && actor.x > 0.3 && actor.x < 0.7)) continue;
      const flying = actor.visual.family === "flyer" || actor.visual.family === "bird";
      const aquatic = actor.visual.family === "swimmer" || habitat.ground === "water" || habitat.ground === "reef-sand";
      const baseY = flying ? 0.25 + actor.y * 0.18 : aquatic ? actor.y : 0.7 + (actor.y - 0.42) * 0.26;
      const bob = getSettings().reducedMotion ? 0 : Math.sin(time * 1.4 + actor.phase) * (flying ? 10 : aquatic ? 5 : 2);
      // Ambient critters are subtle background life — small and faded so they
      // never compete with the hero or clump into mud at the bottom.
      const aSize = Math.min(58, Math.min(width, height) * actor.scale * 0.7);
      drawPixelCreature(ctx, actor.visual, actor.x * width, baseY * height + bob, aSize, {
        facing: actor.direction, time: time + actor.phase, stageIndex: 4, alpha: 0.5, reducedMotion: getSettings().reducedMotion
      });
    }
  }

  function drawFeatured(candidate, loaded, index, xNorm, facing, time, ghost) {
    const stage = candidate.stages[index];
    const minSide = Math.min(width, height);
    const mobile = width < 600 ? stage.mobileScale : 1;
    const size = minSide * 0.205 * stage.scale * mobile;
    const scene = stage.scene;
    const motion = getSettings().reducedMotion ? 0 : time;
    const baseX = xNorm * width;
    const baseY = heroY(candidate, scene, motion);

    if (scene !== "habitat") {
      // Early development: an actual egg/embryo, not a shrunken adult. den/nursery
      // stages already show a small juvenile creature, which reads fine.
      const cx = width * 0.5;
      const cy = height * 0.52 + Math.sin(motion * 1.3) * size * 0.03;
      drawDevelopmentGlow(ctx, cx, cy, size, scene);
      const tapLift = reaction * size * 0.09;
      const baseY = cy + size * 0.5 - tapLift;
      const common = { time: motion, alpha: ghost ? 0.35 : 1, reducedMotion: getSettings().reducedMotion, scene };
      if (["egg", "spawn", "nest"].includes(scene)) {
        drawPixelEgg(ctx, candidate, cx, baseY, size * 0.85, common);
      } else if (["womb", "nursery"].includes(scene)) {
        drawPixelEmbryo(ctx, candidate, cx, baseY, size * 0.9, common);
      } else {
        drawPixelCreature(ctx, candidate, cx, baseY, size, { ...common, facing, stageIndex: index, squash: reaction });
      }
      heroBounds = { x: cx, y: cy, radius: Math.max(56, size * 1.15) };
      if (!ghost) drawAnimalLabel(ctx, candidate, stageLabel, cx, cy + size * 0.95, size);
      return;
    }

    const travelling = Math.abs(targetX - xNorm) > 0.015 && !getSettings().reducedMotion;
    const stride = travelling ? motion * locomotionRate(candidate.family) : motion * 0.45;
    const bob = travelling ? locomotionBob(candidate.family, stride, size) : Math.sin(motion * 1.2) * size * 0.018;
    const tapLift = reaction * size * 0.09;
    drawGroundShadow(ctx, baseX, baseY + size * 0.55, size, candidate.family, ghost ? 0.08 : 0.24);
    drawPixelCreature(ctx, candidate, baseX, baseY + size * 0.5 + bob - tapLift, size, {
      facing, time: motion, stageIndex: index, squash: reaction,
      alpha: ghost ? 0.35 : 1, reducedMotion: getSettings().reducedMotion
    });
    heroBounds = { x: baseX, y: baseY + bob, radius: Math.max(48, size * 1.15) };
    if (!ghost) drawAnimalLabel(ctx, candidate, stageLabel, baseX, baseY + size * 1.02, size);
  }

  function heroY(candidate, scene, time) {
    if (scene !== "habitat") return height * 0.53;
    if (candidate.family === "flyer") return height * 0.43 + Math.sin(time * 0.8) * 12;
    if (candidate.family === "swimmer") return height * 0.53 + Math.sin(time * 0.65) * 8;
    return height * 0.68;
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return Math.hypot(px - heroBounds.x, py - heroBounds.y) <= heroBounds.radius * 1.25;
  }

  function react() { reaction = 1; }
  function canRender() { return Boolean(enabled && visual); }

  function drawDevelopmentGlow(c, cx, cy, size, scene) {
    const tint = scene === "egg" || scene === "spawn" || scene === "nest" ? "#ffe6a8"
      : scene === "den" || scene === "shallows" ? "#bfe0ff" : "#ffd0e0";
    const r = size * 1.5;
    const g = c.createRadialGradient(cx, cy, size * 0.2, cx, cy, r);
    g.addColorStop(0, hexAlpha(tint, 0.5));
    g.addColorStop(1, hexAlpha(tint, 0));
    c.save();
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function hexAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  return { update, resize, step, draw, hitTest, react, canRender };
}

export function createWildlifePreview(canvas, initial = {}) {
  const settings = { wildlifeArt: true, reducedMotion: false, performanceMode: false };
  const layer = createWildlifeLayer(canvas, { getSettings: () => settings });
  let config = { animalId: "fox", stageIndex: 4, habitatId: "forest", motion: "normal", ...initial };
  let running = true;
  let last = performance.now();

  function apply() {
    settings.reducedMotion = config.motion === "reduced";
    settings.performanceMode = config.motion === "performance";
    const visual = wildlifeVisual(config.animalId) || wildlifeVisual("fox");
    const fake = {
      lifeTargetId: visual.id,
      lifeStageIndex: Number(config.stageIndex),
      wildlifeHabitatId: config.habitatId,
      currentCreature: { kind: "life-stage", id: visual.id, label: config.stageLabel || `Stage ${Number(config.stageIndex) + 1}` }
    };
    layer.update(fake);
  }

  function frame(now) {
    if (!running) return;
    resizePreviewCanvas(canvas);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    layer.resize(canvas.clientWidth, canvas.clientHeight);
    layer.step(dt, now / 1000);
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    layer.draw({ time: now / 1000, pressure: 0 });
    requestAnimationFrame(frame);
  }

  apply();
  requestAnimationFrame(frame);
  return {
    update(next) { config = { ...config, ...next }; apply(); },
    stop() { running = false; }
  };
}

async function loadVisualAssets(visual) {
  const entries = await Promise.all(visual.parts.map(async part => [part, await loadSvgPart(visual, part)]));
  return Object.fromEntries(entries);
}

async function loadSvgPart(visual, part) {
  const key = `${visual.visualId}:${part}`;
  if (SVG_CACHE.has(key)) return SVG_CACHE.get(key);
  const promise = svgToDrawable(makePartSvg(visual, part));
  SVG_CACHE.set(key, promise);
  try {
    const image = await promise;
    SVG_CACHE.set(key, image);
    return image;
  } catch (error) {
    SVG_CACHE.delete(key);
    throw error;
  }
}

async function svgToDrawable(svg) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(blob); } catch { /* Safari may reject SVG blobs. */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makePartSvg(visual, part) {
  const { body, light, dark, mark } = visual.colors;
  const f = visual.shape;
  const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${light}"/><stop offset=".42" stop-color="${body}"/><stop offset="1" stop-color="${dark}"/></linearGradient><filter id="s"><feGaussianBlur stdDeviation=".7"/></filter></defs>`;
  const style = `stroke="${dark}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
  let art = "";
  if (part === "body") art = bodySvg(visual, style);
  else if (part === "head") art = headSvg(visual, style);
  else if (part === "tail") art = tailSvg(visual, style);
  else if (part === "wing") art = wingSvg(visual, style);
  else if (part === "fin") art = finSvg(visual, style);
  else if (part === "leg" || part === "arm") art = limbSvg(visual, part, style);
  else art = appendageSvg(visual, style);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}<g>${art}</g><path d="M30 92 Q64 106 100 91" fill="none" stroke="${mark}" stroke-opacity=".22" stroke-width="3"/></svg>`;
}

function bodySvg(visual, style) {
  const f = visual.shape;
  if (visual.family === "serpentine") return `<path d="M10 82 C30 28 54 104 76 54 S112 26 118 66 C104 48 98 94 73 86 S35 55 20 96Z" fill="url(#g)" ${style}/><path d="M19 77 C43 52 56 94 82 63" fill="none" stroke="${visual.colors.mark}" stroke-width="5" stroke-opacity=".45"/>`;
  if (visual.family === "invertebrate") return `<ellipse cx="64" cy="67" rx="${f.claws ? 36 : 30}" ry="${f.tentacles ? 34 : 24}" fill="url(#g)" ${style}/>${f.armored ? `<path d="M36 62 Q64 33 93 62" fill="none" stroke="${visual.colors.light}" stroke-width="6"/>` : ""}`;
  if (f.sharkSnout) return `<path d="M8 65 Q26 38 72 36 Q104 37 121 57 Q109 80 70 88 Q28 91 8 65Z" fill="url(#g)" ${style}/><path d="M19 72 Q64 91 108 66 Q73 86 29 77Z" fill="${visual.colors.light}" opacity=".68"/>`;
  const hump = f.hump ? `<ellipse cx="51" cy="40" rx="25" ry="24" fill="url(#g)" ${style}/>` : "";
  const shell = f.shell ? `<ellipse cx="60" cy="61" rx="39" ry="29" fill="${visual.colors.dark}" ${style}/><path d="M28 61 Q60 31 95 61 Q61 94 28 61Z" fill="${visual.colors.body}" stroke="${visual.colors.light}" stroke-width="4"/><path d="M43 48 L60 61 L77 47 M43 75 L60 61 L78 76" fill="none" stroke="${visual.colors.light}" stroke-opacity=".5" stroke-width="3"/>` : "";
  const spots = f.spots || f.speckles ? Array.from({ length: 7 }, (_, i) => `<circle cx="${33 + i * 9}" cy="${54 + (i % 3) * 8}" r="${f.speckles ? 2 : 4}" fill="${visual.colors.mark}" opacity=".55"/>`).join("") : "";
  const belly = `<path d="M27 72 Q65 96 103 67 Q67 85 31 67Z" fill="${visual.colors.light}" opacity=".62"/>`;
  return `${hump}<ellipse cx="62" cy="62" rx="45" ry="${f.heavy ? 34 : Math.round(26 + f.bodyHeight * 7)}" fill="url(#g)" ${style}/>${belly}${shell}${spots}`;
}

function headSvg(visual, style) {
  const f = visual.shape;
  if (f.sharkSnout) {
    return `<path d="M12 51 Q51 35 99 43 Q119 47 124 62 Q116 78 90 85 Q47 91 12 76Z" fill="url(#g)" ${style}/><path d="M18 71 Q67 87 114 67 Q83 84 37 80Z" fill="${visual.colors.light}" opacity=".72"/><circle cx="88" cy="55" r="4.5" fill="#11191d"/><circle cx="89" cy="53.5" r="1.2" fill="#fff"/><path d="M43 55 Q38 64 43 75 M51 54 Q46 64 51 76 M59 53 Q54 64 59 75" fill="none" stroke="${visual.colors.dark}" stroke-width="3" stroke-linecap="round"/><path d="M100 72 Q111 73 118 67" fill="none" stroke="${visual.colors.dark}" stroke-width="2.5"/>`;
  }
  const long = f.pointedFace || f.longJaw || f.beakFace || f.trunk || f.longNeck;
  const head = `<ellipse cx="${long ? 53 : 61}" cy="62" rx="${f.faceDisk ? 34 : 29}" ry="${f.faceDisk ? 34 : 27}" fill="url(#g)" ${style}/>`;
  const muzzle = f.pointedFace ? `<path d="M72 58 L118 70 L78 84 Q65 76 72 58Z" fill="${visual.colors.body}" ${style}/><circle cx="116" cy="70" r="4" fill="${visual.colors.dark}"/>`
    : f.longJaw ? `<path d="M69 60 L122 64 L118 81 L68 79Z" fill="${visual.colors.body}" ${style}/><path d="M78 78 L114 78" stroke="${visual.colors.light}" stroke-width="3"/>`
      : f.beak || f.hookedBeak || f.curvedBeak ? `<path d="M78 61 Q118 68 ${f.hookedBeak || f.curvedBeak ? 101 : 114} 83 L78 76Z" fill="${visual.colors.mark}" ${style}/>`
        : f.beakFace ? `<path d="M74 60 Q122 66 113 78 L73 77Z" fill="${visual.colors.body}" ${style}/>`
          : `<ellipse cx="81" cy="72" rx="21" ry="14" fill="${visual.colors.light}" opacity=".72"/>`;
  const ears = f.earSize > 0.19 ? `<path d="M39 42 L${f.earSize > 0.4 ? 29 : 34} 4 L55 38Z M63 38 L${f.earSize > 0.4 ? 78 : 73} 5 L81 45Z" fill="${visual.colors.body}" ${style}/>` : "";
  const horns = f.antlers ? `<path d="M40 40 Q24 17 17 7 M31 25 L17 22 M29 18 L37 7 M66 39 Q79 17 88 7 M78 25 L92 20 M81 17 L76 5" fill="none" stroke="${visual.colors.dark}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
    : f.horns ? `<path d="M39 42 Q19 19 31 8 Q42 24 48 42 M67 41 Q87 18 76 7 Q65 23 60 41" fill="${visual.colors.mark}" ${style}/>` : "";
  const trunk = f.trunk ? `<path d="M75 71 Q105 75 93 111 Q87 123 80 109 Q86 91 70 80Z" fill="${visual.colors.body}" ${style}/>` : "";
  const mane = f.mane ? `<circle cx="56" cy="60" r="42" fill="${visual.colors.dark}" opacity=".78" ${style}/>` : "";
  const disk = f.faceDisk ? `<path d="M40 48 Q62 27 84 48 Q92 69 63 89 Q32 70 40 48Z" fill="${visual.colors.light}" opacity=".7"/>` : "";
  const eyeY = f.faceDisk ? 58 : 57;
  return `${horns}${mane}${ears}${head}${disk}${muzzle}${trunk}<ellipse cx="${f.pointedFace || f.longJaw ? 66 : 69}" cy="${eyeY}" rx="5" ry="6" fill="#121817"/><circle cx="70" cy="${eyeY - 2}" r="1.5" fill="#fff"/>${f.tusks ? `<path d="M80 77 Q102 94 99 73" fill="none" stroke="#efe5cf" stroke-width="5"/>` : ""}`;
}

function limbSvg(visual, part, style) {
  const f = visual.shape;
  const hoof = f.longFeet ? 34 : f.flippers ? 29 : 22;
  return `<path d="M48 18 Q62 12 75 20 L74 90 Q88 96 ${hoof + 63} 107 Q70 114 42 107 Q36 103 48 94Z" fill="url(#g)" ${style}/>${f.socks ? `<path d="M45 80 Q60 75 74 81 L74 101 Q57 109 43 102Z" fill="${visual.colors.light}" opacity=".9"/>` : ""}${part === "arm" && f.longArms ? `<path d="M73 83 Q94 101 111 109" fill="none" stroke="${visual.colors.dark}" stroke-width="9"/>` : ""}`;
}

function tailSvg(visual, style) {
  const f = visual.shape;
  if (f.tailLength <= 0) return "";
  if (f.sharkTail) return `<path d="M20 65 Q52 54 77 63 Q91 25 118 7 Q111 49 84 66 Q104 78 108 112 Q87 96 76 72 Q48 80 20 70Z" fill="url(#g)" ${style}/><path d="M82 64 Q98 39 112 21" fill="none" stroke="${visual.colors.light}" stroke-width="3" stroke-opacity=".45"/>`;
  if (f.fluke) return `<path d="M20 65 Q52 54 77 64 Q96 43 119 43 Q105 64 84 68 Q105 72 119 91 Q94 92 76 72 Q47 81 20 70Z" fill="url(#g)" ${style}/>`;
  const width = f.fluffyTail ? 27 : f.tailTuft ? 15 : 10;
  return `<path d="M18 71 Q49 31 83 54 Q108 68 116 30 Q125 89 83 84 Q48 78 18 79Z" fill="none" stroke="url(#g)" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>${f.fluffyTail ? `<path d="M91 51 Q114 52 117 30" fill="none" stroke="${visual.colors.light}" stroke-width="18" stroke-linecap="round"/>` : ""}`;
}

function finSvg(visual, style) {
  if (visual.shape.sharkSnout) {
    return `<path d="M44 63 Q62 15 89 10 Q87 42 73 67Z" fill="url(#g)" ${style}/><path d="M48 72 Q78 75 112 103 Q72 101 43 82Z" fill="url(#g)" ${style}/>`;
  }
  return `<path d="M18 64 Q54 16 106 55 Q73 66 31 94Z" fill="url(#g)" ${style}/>`;
}

function wingSvg(visual, style) {
  const f = visual.shape;
  if (f.insectWing) return `<path d="M62 63 Q19 4 7 35 Q4 64 54 70 Q10 76 21 111 Q49 117 64 75 Q78 117 107 108 Q116 75 73 69 Q122 61 115 28 Q91 8 65 63Z" fill="${visual.colors.light}" fill-opacity=".8" ${style}/><path d="M17 36 L61 68 L22 104 M110 31 L67 68 L105 102" fill="none" stroke="${visual.colors.dark}" stroke-opacity=".45" stroke-width="3"/>`;
  const leathery = f.leatheryWing ? `fill="${visual.colors.dark}"` : `fill="url(#g)"`;
  return `<path d="M8 75 Q27 25 62 55 Q92 19 121 36 Q107 70 70 91 Q38 105 8 75Z" ${leathery} ${style}/><path d="M20 72 Q48 60 66 58 M66 58 Q87 49 109 39" fill="none" stroke="${visual.colors.light}" stroke-opacity=".45" stroke-width="4"/>`;
}

function appendageSvg(visual, style) {
  if (visual.shape.claws) return `<path d="M65 74 Q88 29 115 39 Q122 66 93 75 Q120 83 106 108 Q78 105 66 82Z" fill="url(#g)" ${style}/>`;
  return `<path d="M62 18 Q41 61 53 112 M68 17 Q91 60 75 113" fill="none" stroke="url(#g)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function drawRig(ctx, visual, assets, index, px, py, size, facing, phase, reaction, ambient = false) {
  const f = visual.shape;
  const stage = visual.stages[index];
  const headScale = stage.headScale;
  const limbScale = stage.limbScale;
  const stride = Math.sin(phase * 3.2) * (ambient ? 0.18 : 0.25);
  const tapSquash = 1 - reaction * 0.12;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(facing || 1, tapSquash);

  if (visual.family === "serpentine") {
    drawPart(ctx, assets.body, -size * 0.1, 0, size * 2.15, size * 1.06, Math.sin(phase) * 0.035);
    drawPart(ctx, assets.head, size * 0.83, -size * 0.14, size * 0.72 * headScale, size * 0.72 * headScale, 0.04);
  } else if (visual.family === "swimmer") {
    drawPart(ctx, assets.tail, -size * 0.92, 0, size * f.tailLength, size * 0.86, Math.sin(phase * 2.2) * 0.18, -0.06, 0.5);
    drawPart(ctx, assets.body, 0, 0, size * f.bodyLength, size * f.bodyHeight * 1.55, 0);
    if (assets.fin) drawPart(ctx, assets.fin, -size * 0.03, size * 0.02, size * 0.82, size * 0.7, Math.sin(phase) * 0.035);
    drawPart(ctx, assets.head, size * f.bodyLength * 0.42, -size * 0.03, size * f.headSize * 1.75 * headScale, size * f.headSize * 1.55 * headScale, 0);
  } else if (visual.family === "bird" || visual.family === "flyer") {
    const flying = visual.family === "flyer";
    const flap = flying ? Math.sin(phase * 2.6) * 0.55 : Math.sin(phase) * 0.08;
    drawPart(ctx, assets.tail, -size * 0.43, size * 0.1, size * f.tailLength, size * 0.66, -0.1);
    drawPart(ctx, assets.leg, -size * 0.12, size * 0.42, size * 0.28, size * f.legLength * limbScale, stride);
    drawPart(ctx, assets.leg, size * 0.13, size * 0.42, size * 0.28, size * f.legLength * limbScale, -stride);
    drawPart(ctx, assets.wing, -size * 0.05, -size * 0.04, size * (f.wingSpan || 1.1), size * 0.92, flap);
    drawPart(ctx, assets.body, 0, 0, size * f.bodyLength, size * f.bodyHeight, 0);
    drawPart(ctx, assets.head, size * 0.29, -size * 0.43, size * f.headSize * 1.7 * headScale, size * f.headSize * 1.7 * headScale, 0);
  } else if (visual.family === "invertebrate") {
    const legs = Math.min(8, f.tentacles || 8);
    for (let i = 0; i < legs; i += 1) {
      const angle = (i / Math.max(1, legs - 1) - 0.5) * 1.4;
      const part = assets.appendage || assets.leg;
      drawPart(ctx, part, (i - (legs - 1) / 2) * size * 0.13, size * 0.29, size * 0.34, size * f.legLength, angle + Math.sin(phase + i) * 0.12);
    }
    drawPart(ctx, assets.body, 0, 0, size * f.bodyLength, size * f.bodyHeight * 1.4, 0);
    drawPart(ctx, assets.head, size * 0.32, -size * 0.1, size * f.headSize * 1.45 * headScale, size * f.headSize * 1.4 * headScale, 0);
  } else {
    if (assets.tail && f.tailLength > 0) drawPart(ctx, assets.tail, -size * f.bodyLength * 0.48, -size * 0.08, size * f.tailLength, size * 0.72, Math.sin(phase * 0.7) * 0.13, -0.15, 0.5);
    const biped = visual.family === "biped";
    const legX = biped ? 0.2 : 0.37;
    for (const [lx, swing] of [[-legX, stride], [legX, -stride]]) {
      drawPart(ctx, assets.leg, size * lx, size * 0.08, size * 0.34, size * f.legLength * limbScale, swing, 0.5, 0.1);
    }
    if (!biped) {
      for (const [lx, swing] of [[-0.18, -stride], [0.5, stride]]) drawPart(ctx, assets.leg, size * lx, size * 0.08, size * 0.32, size * f.legLength * limbScale, swing, 0.5, 0.1);
    }
    drawPart(ctx, assets.body, 0, biped ? -size * 0.05 : 0, size * f.bodyLength, size * f.bodyHeight, biped ? -0.08 : 0);
    if (biped && assets.arm) {
      drawPart(ctx, assets.arm, -size * 0.35, -size * 0.04, size * 0.29, size * (f.longArms ? 0.92 : 0.68), -stride * 0.8, 0.5, 0.08);
      drawPart(ctx, assets.arm, size * 0.33, -size * 0.04, size * 0.29, size * (f.longArms ? 0.92 : 0.68), stride * 0.8, 0.5, 0.08);
    }
    const hx = biped ? 0.05 : f.bodyLength * 0.43;
    const hy = biped ? -f.bodyHeight * 0.58 : -f.bodyHeight * 0.27;
    drawPart(ctx, assets.head, size * hx, size * hy, size * f.headSize * 1.8 * headScale, size * f.headSize * 1.75 * headScale, 0);
  }
  ctx.restore();
}

function drawPart(ctx, image, x, y, w, h, rotation = 0, pivotX = 0.5, pivotY = 0.5) {
  if (!image || w <= 0 || h <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -w * pivotX, -h * pivotY, w, h);
  ctx.restore();
}

function drawDevelopmentVignette(ctx, visual, assets, index, scene, width, height, time, reaction) {
  const cx = width * 0.5;
  const cy = height * 0.53;
  const size = Math.min(width, height) * 0.2;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, size * 0.15, cx, cy, size * 1.35);
  glow.addColorStop(0, rgba(visual.colors.light, 0.28));
  glow.addColorStop(1, rgba(visual.colors.dark, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - size * 1.4, cy - size * 1.4, size * 2.8, size * 2.8);

  if (["egg", "egg-case", "nest"].includes(scene)) {
    drawNest(ctx, cx, cy + size * 0.55, size, visual.colors);
    ctx.fillStyle = visual.colors.light;
    ctx.strokeStyle = visual.colors.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (scene === "egg-case") ctx.roundRect(cx - size * 0.42, cy - size * 0.62, size * 0.84, size * 1.12, size * 0.18);
    else ctx.ellipse(cx, cy, size * 0.42, size * 0.57, Math.sin(time) * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rgba(visual.colors.body, 0.55);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 1.7);
    ctx.stroke();
  } else if (["spawn", "shallows"].includes(scene)) {
    drawWaterCradle(ctx, cx, cy, size, time, visual.colors);
    if (scene === "shallows") drawRig(ctx, visual, assets, index, cx, cy, size * 0.68, 1, time, reaction);
  } else if (scene === "chrysalis") {
    ctx.fillStyle = visual.colors.body;
    ctx.strokeStyle = visual.colors.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.78);
    ctx.bezierCurveTo(cx - size * 0.42, cy - size * 0.34, cx - size * 0.32, cy + size * 0.42, cx, cy + size * 0.7);
    ctx.bezierCurveTo(cx + size * 0.32, cy + size * 0.42, cx + size * 0.42, cy - size * 0.34, cx, cy - size * 0.78);
    ctx.fill();
    ctx.stroke();
  } else if (["womb", "pouch", "brood"].includes(scene)) {
    ctx.fillStyle = rgba("#b84f65", scene === "pouch" ? 0.58 : 0.32);
    ctx.strokeStyle = rgba(visual.colors.light, 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.82, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (scene === "pouch") {
      ctx.save();
      ctx.globalAlpha = 0.75;
      drawRig(ctx, visual, assets, Math.min(2, index), cx, cy + size * 0.08, size * 0.44, 1, time * 0.3, reaction);
      ctx.restore();
    } else if (scene === "brood") {
      for (let i = 0; i < 8; i += 1) {
        const angle = i / 8 * Math.PI * 2;
        ctx.fillStyle = i % 2 ? visual.colors.light : visual.colors.body;
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(angle) * size * 0.36, cy + Math.sin(angle) * size * 0.5, size * 0.1, size * 0.15, angle, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.42);
      ctx.fillStyle = visual.colors.body;
      ctx.strokeStyle = visual.colors.dark;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(-size * 0.04, size * 0.08, size * 0.42, size * 0.28, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(size * 0.29, -size * 0.12, size * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(size * 0.36, -size * 0.14, size * 0.035, 0, Math.PI * 2); ctx.fillStyle = "#172018"; ctx.fill();
      ctx.strokeStyle = visual.colors.body; ctx.lineWidth = size * 0.12; ctx.beginPath(); ctx.arc(-size * 0.28, size * 0.1, size * 0.35, -0.8, 1.6); ctx.stroke();
      ctx.restore();
    }
  } else if (scene === "larva") {
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 ? visual.colors.light : visual.colors.body;
      ctx.beginPath();
      ctx.arc(cx + (i - 2.5) * size * 0.22, cy + Math.sin(time + i) * size * 0.06, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawNest(ctx, cx, cy + size * 0.55, size, visual.colors);
    drawRig(ctx, visual, assets, index, cx, cy, size * 0.72, 1, time, reaction);
  }
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = `700 ${Math.max(14, size * 0.13)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(stageLabelFor(scene), cx, cy + size * 1.3);
  ctx.restore();
}

function drawHabitat(ctx, habitat, width, height, time, pressure, settings) {
  const p = habitat.palette;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, mix(p[0], "#542a24", pressure / 260));
  gradient.addColorStop(0.58, p[1]);
  gradient.addColorStop(1, p[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  drawAtmosphere(ctx, habitat, width, height, time, settings);
  drawDistantLayer(ctx, habitat.layers[1].kind, p, width, height, time);
  drawMidgroundLayer(ctx, habitat.layers[2].kind, p, width, height, time, settings);
  drawPlayfield(ctx, habitat.layers[3].kind, p, width, height, time);
  drawForeground(ctx, habitat.layers[4].kind, p, width, height, time, settings);
  const haze = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.78);
  haze.addColorStop(0, "rgba(255,255,255,.06)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.35, width, height * 0.43);
}

function drawAtmosphere(ctx, habitat, width, height, time, settings) {
  const still = settings.reducedMotion;
  const count = settings.performanceMode ? 10 : 22;
  ctx.save();
  if (["ocean", "reef"].includes(habitat.id)) {
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 5; i += 1) {
      const x = width * (0.12 + i * 0.2) + (still ? 0 : Math.sin(time * 0.18 + i) * 24);
      ctx.fillStyle = "rgba(170,235,245,.07)";
      ctx.beginPath();
      ctx.moveTo(x - 35, 0); ctx.lineTo(x + 35, 0); ctx.lineTo(x - 85, height); ctx.lineTo(x - 170, height); ctx.fill();
    }
  }
  for (let i = 0; i < count; i += 1) {
    const seed = seeded(habitat.id, i);
    const speed = still ? 0 : 7 + seed * 18;
    const x = ((seed * width * 3 + time * speed * (i % 2 ? 1 : -1)) % (width + 40) + width + 40) % (width + 40) - 20;
    const y = ((seed * 7.3 + i * 0.083) % 1) * height;
    const snow = habitat.weather === "snow";
    const bubble = habitat.weather === "bubbles";
    ctx.fillStyle = snow ? "rgba(255,255,255,.7)" : bubble ? "rgba(190,245,255,.35)" : "rgba(236,223,164,.24)";
    ctx.beginPath();
    ctx.arc(x, y, snow ? 1.5 + seed * 2 : bubble ? 2 + seed * 4 : 1 + seed * 1.5, 0, Math.PI * 2);
    bubble ? ctx.stroke() : ctx.fill();
  }
  ctx.restore();
}

function drawDistantLayer(ctx, kind, p, width, height, time) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = p[2];
  const horizon = height * 0.54;
  if (["peaks", "mesas", "hills", "icebergs"].includes(kind)) {
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let i = 0; i <= 8; i += 1) {
      const x = i * width / 8;
      const rise = kind === "peaks" ? (i % 2 ? 0.34 : 0.18) : kind === "mesas" ? (i % 3 ? 0.1 : 0.22) : 0.08 + (i % 3) * 0.035;
      ctx.lineTo(x, horizon - height * rise);
    }
    ctx.lineTo(width, horizon); ctx.closePath(); ctx.fill();
  } else if (["cloudbank", "sun-rays", "water-rays"].includes(kind)) {
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = `rgba(235,248,250,${0.08 + i * 0.015})`;
      ctx.beginPath(); ctx.ellipse(i * width / 6, horizon - (i % 2) * 18, width * 0.16, height * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (["canopy", "cave-mouth"].includes(kind)) {
    ctx.fillStyle = kind === "cave-mouth" ? "rgba(5,6,9,.72)" : p[0];
    for (let i = 0; i < 10; i += 1) { ctx.beginPath(); ctx.arc(i * width / 9, height * 0.32 + (i % 3) * 18, 55 + (i % 2) * 24, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function drawMidgroundLayer(ctx, kind, p, width, height, time, settings) {
  ctx.save();
  const sway = settings.reducedMotion ? 0 : Math.sin(time * 0.7) * 7;
  if (["trees", "acacias", "vines", "willows"].includes(kind)) {
    const count = settings.performanceMode ? 6 : 10;
    for (let i = 0; i < count; i += 1) {
      const x = i * width / (count - 1) + (i % 2 ? 15 : -15);
      const trunkTop = height * (0.35 + (i % 3) * 0.035);
      ctx.strokeStyle = p[2]; ctx.lineWidth = kind === "vines" ? 4 : 12; ctx.beginPath(); ctx.moveTo(x, height * 0.82); ctx.quadraticCurveTo(x + sway, height * 0.54, x, trunkTop); ctx.stroke();
      ctx.fillStyle = rgba(p[0], 0.75); ctx.beginPath(); ctx.ellipse(x + sway, trunkTop, kind === "acacias" ? 56 : 38, kind === "acacias" ? 20 : 35, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (["coral", "kelp", "reeds"].includes(kind)) {
    for (let i = 0; i < 18; i += 1) {
      const x = i * width / 17;
      const h = 35 + (i % 5) * 15;
      ctx.strokeStyle = kind === "coral" ? ["#d46f68", "#e2a35a", "#8c5ba8"][i % 3] : p[2];
      ctx.lineWidth = kind === "coral" ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(x, height * 0.83); ctx.quadraticCurveTo(x + sway * (i % 2 ? 1 : -1), height * 0.75, x + sway * 0.4, height * 0.83 - h); ctx.stroke();
    }
  } else if (kind === "cliffs" || kind === "ice") {
    ctx.fillStyle = rgba(p[3], 0.32); ctx.beginPath(); ctx.moveTo(0, height * 0.68); ctx.lineTo(width * 0.22, height * 0.5); ctx.lineTo(width * 0.45, height * 0.7); ctx.lineTo(width * 0.76, height * 0.52); ctx.lineTo(width, height * 0.67); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
  }
  ctx.restore();
}

function drawPlayfield(ctx, kind, p, width, height, time) {
  if (kind === "air") return;
  const y = height * 0.72;
  const water = ["water", "reef-sand"].includes(kind);
  ctx.fillStyle = water ? rgba(p[2], 0.32) : rgba(p[2], 0.72);
  ctx.beginPath(); ctx.moveTo(0, y);
  for (let x = 0; x <= width; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.018 + time * 0.22) * (water ? 4 : 7));
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
  if (kind.includes("grass") || kind.includes("floor") || kind === "riverbank") {
    ctx.strokeStyle = rgba(p[3], 0.42); ctx.lineWidth = 2;
    for (let i = 0; i < 42; i += 1) { const x = i * width / 41; ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x + (i % 2 ? 5 : -5), y - (i % 4) * 7); ctx.stroke(); }
  }
}

function drawForeground(ctx, kind, p, width, height, time, settings) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  // Foreground foliage must read as ground-level greenery/scrub, NOT the sky
  // colour (p[0]) — that was painting blue "lily pads" into the desert.
  ctx.fillStyle = mix(p[2], "#0a0e08", 0.25);
  const sway = settings.reducedMotion ? 0 : Math.sin(time * 0.5) * 8;
  if (["branches", "leaves", "bank-plants", "lilies", "tall-grass", "scrub"].includes(kind)) {
    for (let side = 0; side < 2; side += 1) {
      const anchor = side ? width : 0;
      for (let i = 0; i < 7; i += 1) {
        const x = anchor + (side ? -1 : 1) * (12 + i * 16);
        const y = height * (0.18 + i * 0.1);
        ctx.beginPath(); ctx.ellipse(x + sway * (side ? -1 : 1), y, 24 + i * 2, 11 + i, side ? -0.6 : 0.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (["rocks", "boulders", "snowdrifts", "coral-frame"].includes(kind)) {
    for (let i = 0; i < 6; i += 1) {
      const x = i < 3 ? i * 48 - 12 : width - (i - 3) * 48 + 12;
      ctx.fillStyle = kind === "coral-frame" ? ["#a85762", "#d39354", "#72548d"][i % 3] : rgba(p[2], 0.84);
      ctx.beginPath(); ctx.ellipse(x, height * 0.88, 48, 62 + (i % 2) * 22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawNest(ctx, x, y, size, colors) {
  ctx.save(); ctx.strokeStyle = colors.dark; ctx.lineWidth = 5;
  for (let i = 0; i < 9; i += 1) { ctx.beginPath(); ctx.ellipse(x, y + i * 1.5, size * (0.62 - i * 0.025), size * 0.16, i * 0.11, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawWaterCradle(ctx, x, y, size, time, colors) {
  ctx.save(); ctx.strokeStyle = rgba(colors.light, 0.62); ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.ellipse(x, y + size * 0.2, size * (0.45 + i * 0.14), size * (0.12 + i * 0.03), Math.sin(time) * 0.01, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 7; i += 1) { ctx.fillStyle = rgba(colors.body, 0.62); ctx.beginPath(); ctx.arc(x + (i - 3) * size * 0.17, y - (i % 2) * size * 0.16, size * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawGroundShadow(ctx, x, y, size, family, alpha) {
  if (family === "flyer" || family === "swimmer") return;
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.beginPath(); ctx.ellipse(x, y, size * 0.72, size * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawAnimalLabel(ctx, visual, label, x, y, size) {
  ctx.save(); ctx.textAlign = "center"; ctx.fillStyle = "rgba(248,252,247,.94)"; ctx.font = `700 ${Math.max(13, size * 0.13)}px system-ui, sans-serif`; ctx.fillText(label || visual.id, x, y); ctx.restore();
}

function stageLabelFor(scene) {
  return ({ womb: "Protected development", egg: "Developing inside the egg", "egg-case": "Developing inside the egg case", nest: "Sheltered in the nest", spawn: "Early life in the water", shallows: "Growing in sheltered water", pouch: "Protected in the pouch", chrysalis: "Transformation inside the chrysalis", larva: "Feeding and growing", brood: "Protected by the parent", den: "Safe inside the den", nursery: "Growing under protection" })[scene] || "Early development";
}

function locomotionRate(family) { return family === "flyer" ? 2.6 : family === "swimmer" ? 1.8 : family === "serpentine" ? 1.2 : 1.5; }
function locomotionBob(family, phase, size) { return family === "flyer" ? Math.sin(phase * 1.7) * size * 0.12 : family === "swimmer" ? Math.sin(phase) * size * 0.06 : Math.abs(Math.sin(phase * 2)) * size * 0.035; }

function resizePreviewCanvas(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);
  if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
  canvas.width = pixelWidth; canvas.height = pixelHeight;
  canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seeded(text, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967295;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function rgba(hex, alpha) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map(char => char + char).join("") : value;
  const number = parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}
function mix(a, b, amount) {
  const read = value => { const n = parseInt(value.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const left = read(a); const right = read(b);
  return `rgb(${left.map((value, index) => Math.round(value + (right[index] - value) * amount)).join(",")})`;
}
