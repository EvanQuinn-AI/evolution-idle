// Procedural pixel-art creature renderer.
//
// Draws each collectible as crisp, chunky pixel art built from hard-edged
// primitives (no anti-aliasing), recolored per animal from the existing
// manifest data (family + colors + shape). One offscreen low-res buffer is
// painted each frame and blitted to the stage with nearest-neighbor scaling,
// so every creature shares a cohesive retro look while staying recognizable.

let buffer = null;
let bctx = null;

// Logical art grid (in "art pixels"). Creatures are composed inside this and
// then scaled up by an integer factor for that crunchy, pixelated feel.
const GW = 48;
const GH = 44;
const GROUND = GH - 3; // feet baseline

function ensureBuffer() {
  if (!buffer) {
    buffer = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(GW, GH)
      : Object.assign(document.createElement("canvas"), { width: GW, height: GH });
    bctx = buffer.getContext("2d");
  }
  buffer.width = GW;
  buffer.height = GH;
  bctx.imageSmoothingEnabled = false;
  bctx.clearRect(0, 0, GW, GH);
}

// ---- hard-edged pixel primitives ---------------------------------------
function pRect(x, y, w, h, color) {
  bctx.fillStyle = color;
  bctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pDot(x, y, color) {
  bctx.fillStyle = color;
  bctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

// Crisp filled ellipse via integer scanlines (no AA).
function pEllipse(cx, cy, rx, ry, color) {
  if (rx < 0.5 || ry < 0.5) return;
  bctx.fillStyle = color;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y += 1) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const w = Math.floor(rx * Math.sqrt(t) + 0.0001);
    bctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// Filled ellipse with a 1px darker outline ring.
function blob(cx, cy, rx, ry, fill, outline) {
  pEllipse(cx, cy, rx + 1, ry + 1, outline);
  pEllipse(cx, cy, rx, ry, fill);
}

// ---- color helpers ------------------------------------------------------
function adjust(hex, amt) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (Number.isNaN(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { const k = 1 + amt; r *= k; g *= k; b *= k; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function palette(colors) {
  const body = colors.body || "#b98a5a";
  return {
    body,
    light: colors.light || adjust(body, 0.28),
    dark: colors.dark || adjust(body, -0.3),
    mark: colors.mark || adjust(body, 0.18),
    outline: adjust(colors.dark || body, -0.55),
    belly: adjust(colors.light || body, 0.18),
    eye: "#10141c",
    shine: "#ffffff"
  };
}

// Standard cartoon eye: white + dark pupil + a single highlight pixel.
function eye(x, y, p, look = 0) {
  pRect(x, y - 1, 2, 3, p.shine);
  pRect(x + (look > 0 ? 1 : 0), y, 1, 2, p.eye);
  pDot(x + (look > 0 ? 1 : 0), y - 1, p.shine);
}

// Per-animal signature features so members of a family read as distinct
// species (a shark vs a whale, an elephant vs a fox), keyed by visual.id.
const FEATURES = {
  shark:    { longBody: true, tallDorsal: true, teeth: true },
  whale:    { huge: true, spout: true, noDorsal: true },
  dolphin:  { rostrum: true, curveDorsal: true },
  seal:     { pinniped: true },
  otter:    { whiskers: true, noDorsal: true, small: true },
  salmon:   { },
  elephant: { trunk: true, bigEars: true, tusks: true, huge: true },
  lion:     { mane: true, tuftTail: true },
  fox:      { pointyEars: true, bushyTail: true },
  wolf:     { pointyEars: true, bushyTail: true },
  bear:     { roundEars: true, bulky: true, stubTail: true },
  deer:     { antlers: true, thinLegs: true, stubTail: true },
  rabbit:   { longEars: true, puffTail: true },
  camel:    { hump: true },
  mountain_goat: { horns: true },
  tortoise: { shellBack: true },
  crocodile:{ longSnout: true, ridges: true },
  chicken:  { comb: true },
  penguin:  { tuxedo: true, flippers: true, upright: true },
  owl:      { bigEyes: true, earTufts: true, round: true },
  parrot:   { curvedBeak: true, longTail: true, crest: true },
  eagle:    { hookBeak: true, bigWings: true },
  butterfly:{ patternWings: true, antennae: true },
  bat:      { leatherWings: true, batEars: true },
  gorilla:  { broad: true, longArms: true },
  kangaroo: { bigLegs: true, longTail: true, upright: true }
};

// Upward triangle (apex at top), outlined — used for pointy ears, horns, fins.
function triUp(cx, baseY, halfW, h, fill, outline) {
  bctx.fillStyle = outline;
  for (let i = 0; i <= h; i += 1) {
    const w = Math.round(halfW * (1 - i / h));
    bctx.fillRect(Math.round(cx - w - 1), Math.round(baseY - i), w * 2 + 3, 1);
  }
  bctx.fillStyle = fill;
  for (let i = 0; i <= h - 1; i += 1) {
    const w = Math.round(halfW * (1 - i / h));
    bctx.fillRect(Math.round(cx - w), Math.round(baseY - i), w * 2 + 1, 1);
  }
}

// ---- per-family painters (drawn facing right) ---------------------------
function paintQuadruped(p, s, young, t, f = {}) {
  const breathe = Math.round(Math.sin(t * 2) * 0.6);
  const big = f.huge || f.bulky;
  const legY = GROUND - 6;
  const bodyRx = (big ? 14 : 12) - young * 0.5;
  const bodyRy = (big ? 9 : 8) - young;
  const bodyY = legY - 6 + breathe;
  const legH = (f.thinLegs ? 7 : 6) - young;
  const legW = f.thinLegs ? 2 : 3;
  // legs
  for (const lx of [15, 19, 25, 30]) {
    pRect(lx, legY, legW, legH, lx < 22 ? p.dark : p.body);
    pRect(lx, legY, legW, 1, p.outline);
  }
  // tail
  if (f.bushyTail) { blob(10, bodyY - 1, 5, 4, p.body, p.outline); blob(8, bodyY - 3, 3, 3, p.light, p.outline); }
  else if (f.tuftTail) { pRect(8, bodyY - 2, 4, 2, p.dark); blob(7, bodyY - 1, 2, 2, p.dark, p.outline); }
  else if (f.stubTail) pRect(9, bodyY - 1, 3, 3, p.body);
  else if (f.puffTail) blob(10, bodyY + 1, 3, 3, p.light, p.outline);
  else blob(11, bodyY, 4, 3, p.body, p.outline);
  // body
  blob(23, bodyY, bodyRx, bodyRy, p.body, p.outline);
  pEllipse(23, bodyY - 3, bodyRx - 3, 3, p.light);
  pEllipse(23, bodyY + 3, bodyRx - 3, 2, p.belly);
  if (f.hump) blob(20, bodyY - bodyRy, 4, 4, p.body, p.outline);
  if (f.shellBack) { blob(23, bodyY - 2, bodyRx - 2, bodyRy, p.dark, p.outline); pEllipse(23, bodyY - 3, bodyRx - 5, 2, p.mark); }
  if (f.ridges) for (let i = -2; i <= 2; i += 1) pDot(23 + i * 4, bodyY - bodyRy + 1, p.dark);
  // head
  const hx = big ? 35 : 33, hy = bodyY - 3 - young;
  if (f.mane) blob(hx, hy, 9 + young, 8 + young, p.dark, p.outline);
  blob(hx, hy, 7 + young, 6 + young, p.body, p.outline);
  pEllipse(hx, hy - 2, 5, 2, p.light);
  // ears / horns / antlers
  if (f.pointyEars) { triUp(hx - 3, hy - 4, 2, 5, p.body, p.outline); triUp(hx + 3, hy - 4, 2, 5, p.body, p.outline); pDot(hx - 3, hy - 5, p.mark); pDot(hx + 3, hy - 5, p.mark); }
  else if (f.roundEars) { blob(hx - 5, hy - 5, 2, 2, p.body, p.outline); blob(hx + 5, hy - 5, 2, 2, p.body, p.outline); }
  else if (f.longEars) { pRect(hx - 4, hy - 12, 2, 8, p.body); pRect(hx - 4, hy - 12, 2, 1, p.outline); pRect(hx + 3, hy - 12, 2, 8, p.body); pRect(hx + 3, hy - 12, 2, 1, p.outline); }
  else if (f.bigEars) { blob(hx - 5, hy + 1, 6, 7, p.body, p.outline); pEllipse(hx - 5, hy + 1, 4, 5, p.dark); }
  else if (f.horns) { triUp(hx - 3, hy - 5, 1, 4, p.light, p.outline); triUp(hx + 3, hy - 5, 1, 4, p.light, p.outline); }
  else if (f.antlers) { pRect(hx - 3, hy - 11, 1, 6, p.mark); pRect(hx - 5, hy - 10, 2, 1, p.mark); pRect(hx + 3, hy - 11, 1, 6, p.mark); pRect(hx + 4, hy - 10, 2, 1, p.mark); }
  else { pRect(hx - 4, hy - 8, 3, 4, p.body); pRect(hx - 4, hy - 8, 3, 1, p.outline); pRect(hx + 2, hy - 8, 3, 4, p.body); pRect(hx + 4, hy - 8, 1, 4, p.outline); }
  // snout / trunk / long snout
  if (f.trunk) {
    // trunk curls down from the face, then forward
    pRect(hx + 5, hy + 1, 3, 6, p.body); pRect(hx + 5, hy + 1, 1, 6, p.outline);
    pRect(hx + 6, hy + 6, 4, 3, p.body); pRect(hx + 8, hy + 8, 4, 2, p.body);
    pRect(hx + 11, hy + 8, 1, 2, p.outline); pRect(hx + 10, hy + 9, 2, 1, p.dark);
    if (f.tusks) { pRect(hx + 3, hy + 5, 1, 4, p.light); pRect(hx + 9, hy + 6, 1, 3, p.light); }
  }
  else if (f.longSnout) { pRect(hx + 5, hy + 1, 7, 3, p.body); pRect(hx + 5, hy + 1, 7, 1, p.outline); for (let i = 0; i < 4; i += 1) pDot(hx + 6 + i * 1.5, hy + 4, p.light); }
  else { pRect(hx + 5, hy + 1, 4, 3, p.mark); pRect(hx + 8, hy + 1, 1, 3, p.outline); pDot(hx + 8, hy + 2, p.eye); }
  eye(hx + 2, hy - 1, p, 1);
}

function paintBiped(p, s, young, t, f = {}) {
  const sway = Math.round(Math.sin(t * 2) * 0.6);
  const legY = GROUND - 8;
  if (f.bigLegs) { pRect(18, legY + 2, 7, 4, p.body); pRect(18, legY + 2, 7, 1, p.outline); pRect(22, legY + 2, 7, 4, p.body); }
  pRect(20, legY, 3, 8 - young, p.dark); pRect(20, legY, 3, 1, p.outline);
  pRect(25, legY, 3, 8 - young, p.dark); pRect(25, legY, 3, 1, p.outline);
  if (f.longTail) { pRect(28, legY + 2, 8, 3, p.body); pRect(34, legY + 4, 3, 3, p.body); pRect(28, legY + 2, 8, 1, p.outline); }
  // torso
  const tw = f.broad ? 9 : 7;
  blob(24, legY - 5 + sway, tw, 8 - young, p.body, p.outline);
  pEllipse(24, legY - 3 + sway, tw - 2, 4, p.belly);
  // arms
  const armLen = f.longArms ? 10 : 8;
  pRect(15, legY - 8 + sway, 3, armLen - young, p.body); pRect(15, legY - 8 + sway, 3, 1, p.outline);
  pRect(30, legY - 8 + sway, 3, armLen - young, p.body); pRect(30, legY - 8 + sway, 3, 1, p.outline);
  // head
  const hx = 24, hy = legY - 14 + sway - young;
  blob(hx, hy, 6 + young, 6 + young, p.mark, p.outline);
  pEllipse(hx, hy - 2, 4, 2, adjust(p.mark, 0.25));
  pRect(hx - 5, hy - 6, 11, 2, p.dark); // hair/brow
  eye(hx - 3, hy, p, 0); eye(hx + 2, hy, p, 0);
  pDot(hx, hy + 3, p.dark);
}

function paintBird(p, s, young, t, f = {}) {
  const bob = Math.round(Math.sin(t * 2.4) * 0.6);
  const legY = GROUND - 3;
  pRect(21, legY, 2, 3, f.tuxedo ? p.mark : p.dark); pRect(26, legY, 2, 3, f.tuxedo ? p.mark : p.dark);
  // plump body
  const by = legY - 8 + bob;
  blob(24, by, 9, (f.upright ? 11 : 9) - young, p.body, p.outline);
  if (f.tuxedo) { pEllipse(25, by + 1, 6, 6, p.belly); blob(24, by - 4, 6, 5, p.dark, p.outline); }
  else pEllipse(24, by - 3, 6, 4, p.belly);
  // wing / flipper
  if (f.flippers) { pRect(16, by - 2, 3, 8, p.dark); pRect(16, by - 2, 3, 1, p.outline); }
  else blob(20, by - 1, 4, 5, p.dark, p.outline);
  // tail
  if (f.longTail) { pRect(11, by - 2, 8, 3, p.mark); pRect(11, by - 2, 8, 1, p.outline); }
  else pRect(13, by - 1, 5, 4, p.dark);
  // head
  const hx = 30, hy = by - 8 - young;
  blob(hx, hy, 5 + young, 5 + young, f.tuxedo ? p.dark : p.body, p.outline);
  if (!f.tuxedo) pEllipse(hx, hy - 2, 3, 2, p.light);
  // beak
  if (f.curvedBeak) { pRect(hx + 4, hy, 3, 2, p.mark); pRect(hx + 6, hy + 1, 1, 2, p.mark); }
  else { pRect(hx + 5, hy, 4, 3, f.tuxedo ? p.light : p.mark); pRect(hx + 8, hy + 1, 1, 1, p.outline); }
  if (f.bigEyes) { blob(hx - 2, hy, 3, 3, p.shine, p.outline); pRect(hx - 2, hy, 2, 2, p.eye); blob(hx + 3, hy, 3, 3, p.shine, p.outline); pRect(hx + 3, hy, 2, 2, p.eye); }
  else eye(hx + 1, hy - 1, p, 1);
  if (f.earTufts) { triUp(hx - 4, hy - 4, 1, 3, p.body, p.outline); triUp(hx + 4, hy - 4, 1, 3, p.body, p.outline); }
  if (f.comb) { pRect(hx - 2, hy - 7, 5, 2, "#e0463c"); pRect(hx, hy - 8, 2, 1, "#e0463c"); pRect(hx + 6, hy + 3, 2, 2, "#e0463c"); }
  if (f.crest) { triUp(hx, hy - 5, 2, 4, p.mark, p.outline); }
}

function paintFlyer(p, s, young, t, f = {}) {
  const flap = Math.sin(t * 5) * (f.leatherWings ? 3 : 5);
  const cx = 24, cy = GH * 0.46;
  const span = f.bigWings || f.patternWings ? 12 : 10;
  // wings
  if (f.leatherWings) {
    triUp(cx - span + 2, cy + 4 - flap, span - 3, 7, p.dark, p.outline);
    triUp(cx + span - 2, cy + 4 - flap, span - 3, 7, p.dark, p.outline);
  } else {
    blob(cx - span, cy - flap, span - 2, 5, p.light, p.outline);
    blob(cx + span, cy - flap, span - 2, 5, p.light, p.outline);
    pEllipse(cx - span, cy - flap, span - 5, 3, p.body);
    pEllipse(cx + span, cy - flap, span - 5, 3, p.body);
    if (f.patternWings) { pDot(cx - span, cy - flap, p.mark); pDot(cx - span - 3, cy - flap + 2, p.dark); pDot(cx + span, cy - flap, p.mark); pDot(cx + span + 3, cy - flap + 2, p.dark); }
  }
  // body
  blob(cx, cy, 4, 7 - young, p.dark, p.outline);
  // head
  const hr = (f.bigEyes ? 6 : 4) + young;
  blob(cx, cy - 8, hr, hr, p.mark, p.outline);
  if (f.earTufts) { triUp(cx - 4, cy - 12, 2, 3, p.mark, p.outline); triUp(cx + 4, cy - 12, 2, 3, p.mark, p.outline); }
  if (f.hookBeak) { pRect(cx - 1, cy - 7, 3, 2, "#e0b85a"); pRect(cx, cy - 5, 1, 2, "#e0b85a"); }
  else if (f.batEars) { triUp(cx - 2, cy - 11, 2, 3, p.dark, p.outline); triUp(cx + 2, cy - 11, 2, 3, p.dark, p.outline); }
  else if (!f.bigEyes) { pRect(cx + 3, cy - 8, 3, 2, p.mark); pRect(cx + 5, cy - 8, 1, 2, p.outline); }
  if (f.antennae) { pRect(cx - 2, cy - 13, 1, 3, p.dark); pRect(cx + 1, cy - 13, 1, 3, p.dark); pDot(cx - 2, cy - 13, p.mark); pDot(cx + 1, cy - 13, p.mark); }
  if (f.bigEyes) {
    // big forward-facing owl eyes
    blob(cx - 3, cy - 8, 3, 3, p.shine, p.outline); pRect(cx - 3, cy - 8, 2, 2, p.eye);
    blob(cx + 3, cy - 8, 3, 3, p.shine, p.outline); pRect(cx + 2, cy - 8, 2, 2, p.eye);
    pRect(cx - 1, cy - 6, 2, 2, "#e0b85a"); // beak between eyes
  } else {
    eye(cx + 1, cy - 9, p, 1);
  }
}

function paintSwimmer(p, s, young, t, f = {}) {
  const sway = Math.round(Math.sin(t * 3) * 1.2);
  const cx = 23, cy = GH * 0.5;
  if (f.pinniped) { paintSeal(p, young, t, sway); return; }
  const bodyRx = (f.huge ? 16 : f.longBody ? 15 : 13) - young;
  const bodyRy = (f.round ? 9 : 7) - young;
  // tail fin (flukes for whale/dolphin point sideways)
  if (f.huge || f.noDorsal && !f.flippers) {
    pRect(6, cy - 1 + sway, 5, 3, p.dark);
    triUp(7, cy - 2 + sway, 3, 4, p.dark, p.outline); triUp(7, cy + 6 + sway, 3, 4, p.dark, p.outline);
  } else {
    pRect(8, cy - 5 + sway, 5, 10, p.dark); pRect(8, cy - 5 + sway, 1, 10, p.outline);
    pRect(7, cy - 6 + sway, 2, 4, p.dark); pRect(7, cy + 2 + sway, 2, 4, p.dark);
  }
  // body teardrop
  blob(cx, cy, bodyRx, bodyRy, p.body, p.outline);
  pEllipse(cx, cy - 3, bodyRx - 4, 2, p.light);
  pEllipse(cx, cy + 3, bodyRx - 4, 2, p.belly);
  // dorsal fin
  if (f.tallDorsal) triUp(cx - 1, cy - 7, 3, 7, p.dark, p.outline);
  else if (f.curveDorsal) { triUp(cx, cy - 7, 3, 5, p.dark, p.outline); pRect(cx + 1, cy - 7, 2, 2, p.dark); }
  else if (!f.noDorsal) { pRect(cx - 2, cy - 11, 7, 4, p.dark); pRect(cx - 2, cy - 11, 7, 1, p.outline); }
  // flippers (seal/penguin-in-water)
  if (f.flippers) { pRect(cx - 2, cy + 4, 5, 2, p.dark); }
  else blob(cx + 1, cy + 4, 3, 2, p.dark, p.outline);
  if (f.spout) { for (let i = 0; i < 4; i += 1) pDot(cx + 4, cy - bodyRy - 2 - i, p.shine); pDot(cx + 3, cy - bodyRy - 5, p.shine); pDot(cx + 5, cy - bodyRy - 5, p.shine); }
  // head / rostrum
  if (f.rostrum) { pRect(GW - 13, cy, 7, 2, p.body); pRect(GW - 13, cy, 7, 1, p.outline); pRect(GW - 7, cy + 1, 2, 1, p.dark); }
  else pDot(GW - 12, cy + 1, p.dark);
  if (f.teeth) { for (let i = 0; i < 3; i += 1) pDot(GW - 13 - i * 2, cy + 3, p.shine); }
  if (f.whiskers) { pRect(GW - 11, cy + 1, 4, 1, p.light); pRect(GW - 11, cy + 3, 4, 1, p.light); }
  eye(GW - 16, cy - 1, p, 1);
  pRect(GW - 19, cy - 3, 1, 5, p.mark); // gill / cheek mark
}

// A seal/sea-lion: rounded plump body, dog-like head with a snout + whiskers,
// rear flippers fanning back and a front flipper — NOT a fish.
function paintSeal(p, young, t, sway) {
  const cx = 22, cy = GH * 0.52;
  const rx = 13 - young, ry = 9 - young;
  // rear flippers (fan out at the tail end)
  triUp(7, cy - 1 + sway, 3, 5, p.dark, p.outline);
  triUp(7, cy + 5 + sway, 3, 4, p.dark, p.outline);
  // plump rounded body
  blob(cx, cy, rx, ry, p.body, p.outline);
  pEllipse(cx, cy - 3, rx - 4, 3, p.light);
  pEllipse(cx, cy + 3, rx - 3, 3, p.belly);
  // front flipper
  blob(cx + 2, cy + 5, 4, 2, p.dark, p.outline);
  // head: raised on a neck at the right, looking up a little
  const hx = GW - 14, hy = cy - 6;
  pRect(hx - 4, hy + 2, 5, 6, p.body); // neck
  blob(hx, hy, 6, 5, p.body, p.outline);
  pEllipse(hx, hy - 2, 4, 2, p.light);
  // snout + nose
  pRect(hx + 5, hy + 1, 4, 3, p.body); pRect(hx + 5, hy + 1, 4, 1, p.outline);
  pRect(hx + 8, hy + 1, 2, 2, p.eye);
  // whiskers
  pRect(hx + 4, hy + 4, 5, 1, p.light); pRect(hx + 4, hy + 5, 4, 1, p.light);
  eye(hx + 1, hy - 1, p, 1);
}

function paintSerpentine(p, s, young, t, f = {}) {
  const wig = t * 2.4;
  const cy = GH * 0.62;
  const r = 4 - young * 0.5;
  // One smooth continuous body: closely-overlapped same-color segments, tapering
  // toward the tail, with a quiet diamond pattern rather than alternating colors.
  const pts = [];
  for (let i = 0; i <= 9; i += 1) {
    const x = 7 + i * 3.6;
    const y = cy + Math.sin(wig + i * 0.7) * 3.5;
    pts.push([x, y, r * (0.5 + i / 12)]);
  }
  for (const [x, y, rr] of pts) blob(x, y, rr + 0.5, rr - 0.5, p.body, p.outline);
  for (const [x, y, rr] of pts) pEllipse(x, y - 1, rr - 1, 1, p.light); // top sheen
  for (let i = 2; i < pts.length - 1; i += 2) pDot(pts[i][0], pts[i][1], adjust(p.dark, 0.1)); // pattern
  // head
  const [hx, hy] = pts[pts.length - 1];
  blob(hx + 1, hy, 5, 4, p.body, p.outline);
  pEllipse(hx, hy - 1, 3, 1, p.light);
  pDot(hx + 2, hy - 1, p.shine); pDot(hx + 2, hy, p.eye); // small snake eye
  pRect(hx + 6, hy + 1, 3, 1, "#e0463c"); // forked tongue
  pRect(hx + 8, hy, 1, 1, "#e0463c"); pRect(hx + 8, hy + 2, 1, 1, "#e0463c");
}

function paintInvertebrate(p, s, young, t, f = {}) {
  const legY = GROUND - 4;
  const cx = 24;
  if (f.tentacles) {
    // octopus: round mantle + dangling tentacles
    const my = legY - 8;
    blob(cx, my, 9 - young, 9 - young, p.body, p.outline);
    pEllipse(cx, my - 3, 5, 3, p.light);
    for (let i = 0; i < 6; i += 1) {
      const tx = cx - 10 + i * 4;
      const k = Math.round(Math.sin(t * 3 + i) * 2);
      pRect(tx, my + 6, 2, 7 + k, p.dark);
      pDot(tx, my + 13 + k, p.mark);
    }
    eye(cx - 3, my - 1, p, 0); eye(cx + 3, my - 1, p, 0);
    return;
  }
  const cy = legY - 4;
  if (f.stinger) {
    // scorpion tail: a segmented arc curling up from the back, over the body,
    // ending in a stinger that points forward-down — the classic silhouette.
    const arc = [[cx - 7, cy - 5], [cx - 4, cy - 9], [cx, cy - 12], [cx + 5, cy - 12], [cx + 9, cy - 10]];
    for (const [sx, sy] of arc) blob(sx, sy, 2, 2, p.body, p.outline);
    blob(cx + 11, cy - 7, 2, 3, p.mark, p.outline); // bulb
    pRect(cx + 12, cy - 4, 1, 2, p.dark);            // sting point
  }
  // legs / appendages
  for (let i = 0; i < 4; i += 1) {
    const off = i * 3 - 5;
    const k = Math.round(Math.sin(t * 3 + i) * 1);
    pRect(cx - 12 + off, cy + 2 + k, 4, 2, p.dark);
    pRect(cx + 8 - off, cy + 2 - k, 4, 2, p.dark);
  }
  // claws / pincers
  const clawR = f.bigClaws || f.pincers ? 4 : 3;
  blob(cx - 13, cy, clawR, clawR, p.mark, p.outline);
  blob(cx + 13, cy, clawR, clawR, p.mark, p.outline);
  if (f.pincers) {
    // open two-prong pincers reaching outward
    pRect(cx - 17, cy - 2, 3, 1, p.mark); pRect(cx - 17, cy + 1, 3, 1, p.mark);
    pRect(cx + 15, cy - 2, 3, 1, p.mark); pRect(cx + 15, cy + 1, 3, 1, p.mark);
  }
  // shell body
  blob(cx, cy, (f.wideShell ? 12 : 10) - young, 7 - young, p.body, p.outline);
  pEllipse(cx, cy - 2, 7, 3, p.light);
  // eyes on stalks
  pRect(cx - 3, cy - 9, 1, 4, p.dark); pRect(cx + 3, cy - 9, 1, 4, p.dark);
  blob(cx - 3, cy - 10, 2, 2, p.shine, p.outline); pDot(cx - 3, cy - 10, p.eye);
  blob(cx + 3, cy - 10, 2, 2, p.shine, p.outline); pDot(cx + 3, cy - 10, p.eye);
}

const PAINTERS = {
  quadruped: paintQuadruped,
  biped: paintBiped,
  bird: paintBird,
  flyer: paintFlyer,
  swimmer: paintSwimmer,
  serpentine: paintSerpentine,
  invertebrate: paintInvertebrate
};

// ---- public API ---------------------------------------------------------
// Paints `visual` into the offscreen buffer and blits it to `ctx`, centered
// horizontally on `cx`, with the feet sitting on `baseY`, about `size` tall.
export function drawPixelCreature(ctx, visual, cx, baseY, size, opts = {}) {
  if (!visual) return;
  const { facing = 1, time = 0, squash = 0, stageIndex = 4, alpha = 1 } = opts;
  ensureBuffer();
  const p = palette(visual.colors || {});
  const young = Math.max(0, 2 - stageIndex); // 0..2 extra "babyness"
  const painter = PAINTERS[visual.family] || paintQuadruped;
  painter(p, visual.shape || {}, young, opts.reducedMotion ? 0 : time, FEATURES[visual.id] || {});
  return blitBuffer(ctx, cx, baseY, size, { facing, squash, alpha });
}

// Integer nearest-neighbor upscale of the offscreen buffer onto the stage.
function blitBuffer(ctx, cx, baseY, size, { facing = 1, squash = 0, alpha = 1 } = {}) {
  const scale = Math.max(2, Math.round((size * 2.1) / GH));
  const drawW = Math.round(GW * scale * (1 + squash * 0.12));
  const drawH = Math.round(GH * scale * (1 - squash * 0.16));
  const dx = Math.round(cx - drawW / 2);
  const dy = Math.round(baseY - drawH + scale * 3); // feet baseline at GROUND
  const prevSmoothing = ctx.imageSmoothingEnabled;
  const prevAlpha = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = prevAlpha * alpha;
  if (facing < 0) {
    ctx.save();
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(buffer, 0, 0, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(buffer, dx, dy, drawW, drawH);
  }
  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.globalAlpha = prevAlpha;
  return { x: cx, y: dy + drawH * 0.5, radius: Math.max(40, size * 1.1) };
}

// Early-stage forms so "Egg"/"Embryo" actually look like an egg/embryo rather
// than a shrunken adult. `scene` comes from the manifest stage (egg/spawn/nest/
// womb/nursery). cy is the CENTER of the form.
export function drawPixelEgg(ctx, visual, cx, baseY, size, opts = {}) {
  if (!visual) return;
  ensureBuffer();
  const p = palette(visual.colors || {});
  const t = opts.reducedMotion ? 0 : (opts.time || 0);
  const w = Math.round(Math.sin(t * 2) * 0.5);
  const cxg = 24, cyg = GROUND - 11 + w;
  if (opts.scene === "spawn") {
    // a soft clutch of jelly eggs (frog/fish spawn)
    for (let i = 0; i < 7; i += 1) {
      const ex = cxg - 9 + (i % 4) * 6, ey = cyg + 2 + Math.floor(i / 4) * 6;
      blob(ex, ey, 3, 3, "rgba(200,235,245,0.85)", "rgba(120,170,190,0.9)");
      pDot(ex, ey, p.dark);
    }
  } else {
    blob(cxg, cyg, 9, 12, p.light, p.outline);          // egg body
    pEllipse(cxg - 2, cyg - 4, 4, 5, adjust(p.light, 0.25)); // shine
    pDot(cxg + 3, cyg, p.mark); pDot(cxg - 3, cyg + 4, p.mark);
    pDot(cxg + 1, cyg - 3, p.mark); pDot(cxg + 4, cyg + 6, p.dark);
    if (opts.scene === "nest") { pRect(cxg - 10, cyg + 11, 20, 2, p.dark); pRect(cxg - 8, cyg + 12, 16, 2, adjust(p.dark, 0.2)); }
  }
  return blitBuffer(ctx, cx, baseY, size, { alpha: opts.alpha == null ? 1 : opts.alpha });
}

export function drawPixelEmbryo(ctx, visual, cx, baseY, size, opts = {}) {
  if (!visual) return;
  ensureBuffer();
  const p = palette(visual.colors || {});
  const t = opts.reducedMotion ? 0 : (opts.time || 0);
  const cxg = 24, cyg = GH * 0.52 + Math.round(Math.sin(t * 1.6) * 0.6);
  const flesh = adjust(p.body, 0.32);
  const fleshDark = adjust(p.body, 0.05);
  blob(cxg, cyg, 8, 7, flesh, p.outline);          // big head bulge
  pEllipse(cxg - 1, cyg - 2, 5, 3, adjust(flesh, 0.2));
  blob(cxg + 3, cyg + 6, 5, 4, fleshDark, p.outline); // curled tail/body
  blob(cxg + 6, cyg + 9, 3, 3, fleshDark, p.outline);
  pRect(cxg - 4, cyg - 1, 2, 3, p.shine); pRect(cxg - 4, cyg, 2, 2, p.eye); // big dark eye
  return blitBuffer(ctx, cx, baseY, size, { alpha: opts.alpha == null ? 1 : opts.alpha });
}

export const PIXEL_FAMILIES = Object.keys(PAINTERS);
