const NODE_WIDTH = 164;
const NODE_HEIGHT = 58;
const LEVEL_GAP = 220;
const ROW_GAP = 84;

export function createEvolutionMap(canvas, species, { onSelect = () => {} } = {}) {
  const context = canvas.getContext("2d");
  const nodes = buildLayout(species);
  const nodeById = new Map(nodes.map(node => [node.definition.id, node]));
  const root = { x: 0, y: 0, width: 112, height: 54 };
  let state = null;
  let selectedId = null;
  let width = 1;
  let height = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let moved = false;
  let pointerX = 0;
  let pointerY = 0;
  let focusedId = undefined;

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  canvas.addEventListener("pointerdown", event => {
    dragging = true;
    moved = false;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!dragging) return;
    const dx = event.clientX - pointerX;
    const dy = event.clientY - pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    offsetX += dx;
    offsetY += dy;
    pointerX = event.clientX;
    pointerY = event.clientY;
    draw();
  });
  canvas.addEventListener("pointerup", event => {
    dragging = false;
    if (!moved) {
      const point = screenToWorld(event.clientX, event.clientY);
      const hit = [...nodes].reverse().find(node => contains(node, point));
      if (hit) {
        selectedId = hit.definition.id;
        onSelect(selectedId);
        draw();
      }
    }
  });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldX = (x - offsetX) / scale;
    const worldY = (y - offsetY) / scale;
    const nextScale = clamp(scale * Math.exp(-event.deltaY * 0.001), 0.35, 1.8);
    offsetX = x - worldX * nextScale;
    offsetY = y - worldY * nextScale;
    scale = nextScale;
    draw();
  }, { passive: false });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    focus(state?.activeLineageId || null, { force: true });
  }

  function resetView() {
    focus(state?.activeLineageId || null, { force: true });
  }

  function zoomBy(multiplier) {
    const focalX = width < 700 ? width * 0.5 : Math.max(260, (width - 338) * 0.5);
    const focalY = width < 700 ? height * 0.43 : height * 0.56;
    const worldX = (focalX - offsetX) / scale;
    const worldY = (focalY - offsetY) / scale;
    const nextScale = clamp(scale * multiplier, 0.35, 1.8);
    offsetX = focalX - worldX * nextScale;
    offsetY = focalY - worldY * nextScale;
    scale = nextScale;
    draw();
  }

  function update(nextState) {
    const nextActive = nextState.activeLineageId || null;
    const activeChanged = nextActive !== focusedId;
    state = nextState;
    if (activeChanged) focus(nextActive, { force: true });
    else draw();
  }

  function select(id, { center = false } = {}) {
    if (!nodeById.has(id)) return;
    selectedId = id;
    if (center) {
      const node = nodeById.get(id);
      offsetX = width / 2 - node.x * scale;
      offsetY = height / 2 - node.y * scale;
    }
    draw();
  }

  function focus(id, { force = false } = {}) {
    if (!force && focusedId === id) {
      draw();
      return;
    }
    const target = id ? nodeById.get(id) : root;
    if (!target) return;
    focusedId = id;
    selectedId = id;
    scale = width < 700 ? 0.9 : 1.18;
    const focalX = width < 700 ? width * 0.5 : Math.max(260, (width - 338) * 0.5);
    const focalY = width < 700 ? height * 0.43 : height * 0.56;
    offsetX = focalX - target.x * scale;
    offsetY = focalY - target.y * scale;
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    drawBackdrop(context, width, height);
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);
    drawConnections();
    drawRoot();
    for (const node of nodes) drawNode(node);
    context.restore();
  }

  function drawConnections() {
    context.lineWidth = 2 / scale;
    for (const node of nodes) {
      const parents = node.definition.requires.length
        ? node.definition.requires.map(id => nodeById.get(id)).filter(Boolean)
        : [root];
      const status = state?.speciesStatus(node.definition.id).state || "silhouette";
      context.strokeStyle = status === "reached"
        ? "rgba(103,239,154,.7)"
        : status === "available"
          ? "rgba(103,239,154,.46)"
          : "rgba(71,112,94,.32)";
      for (const parent of parents) {
        const startX = parent.x + parent.width / 2;
        const endX = node.x - node.width / 2;
        const bend = (startX + endX) / 2;
        context.beginPath();
        context.moveTo(startX, parent.y);
        context.bezierCurveTo(bend, parent.y, bend, node.y, endX, node.y);
        context.stroke();
      }
    }
  }

  function drawRoot() {
    roundedRect(context, root.x - root.width / 2, root.y - root.height / 2, root.width, root.height, 16);
    context.fillStyle = state?.cells > 0 ? "#164d31" : "#0d1c17";
    context.fill();
    context.strokeStyle = state?.cells > 0 ? "#67ef9a" : "#315747";
    context.lineWidth = 2 / scale;
    context.stroke();
    context.fillStyle = "#e7f5ed";
    context.font = "800 14px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("CELL", root.x, root.y - 2);
    context.fillStyle = "#91aa9f";
    context.font = "11px Inter, system-ui, sans-serif";
    context.fillText(state?.cells > 0 ? `${state.cells} established` : "assembling", root.x, root.y + 16);
  }

  function drawNode(node) {
    const definition = node.definition;
    const status = state?.speciesStatus(definition.id) || { state: "silhouette", reasons: [] };
    const known = Boolean(state?.known.has(definition.id) || status.state === "reached");
    const selected = definition.id === selectedId;
    const palette = nodePalette(status.state, selected);
    const left = node.x - node.width / 2;
    const top = node.y - node.height / 2;

    if (selected) {
      context.shadowColor = palette.stroke;
      context.shadowBlur = 18 / scale;
    }
    roundedRect(context, left, top, node.width, node.height, 13);
    context.fillStyle = palette.fill;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = palette.stroke;
    context.lineWidth = (selected ? 3 : 1.6) / scale;
    context.stroke();

    context.fillStyle = palette.mark;
    roundedRect(context, left + 9, top + 9, 40, 40, 10);
    context.fill();
    context.fillStyle = palette.markText;
    context.font = "850 12px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(known ? definition.glyph : "?", left + 29, top + 34);

    context.textAlign = "left";
    context.fillStyle = palette.text;
    context.font = "800 12px Inter, system-ui, sans-serif";
    const title = known ? definition.name : status.state === "available" ? "Discoverable life" : "Unknown route";
    context.fillText(trimText(context, title, 100), left + 58, top + 23);
    context.fillStyle = palette.subtext;
    context.font = "10px Inter, system-ui, sans-serif";
    const subtitle = status.state === "reached"
      ? `Population ${state.populations.get(definition.id) || 1}`
      : `${definition.cost} Evolution Energy`;
    context.fillText(trimText(context, subtitle, 96), left + 58, top + 41);
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale
    };
  }

  return { update, select, focus, resize, resetView, zoomBy, destroy: () => resizeObserver.disconnect() };
}

function buildLayout(species) {
  const byId = new Map(species.map(definition => [definition.id, definition]));
  const depths = new Map();
  const depthOf = (definition, trail = new Set()) => {
    if (depths.has(definition.id)) return depths.get(definition.id);
    if (trail.has(definition.id) || definition.requires.length === 0) return 1;
    const nextTrail = new Set(trail).add(definition.id);
    const depth = 1 + Math.max(...definition.requires.map(id => depthOf(byId.get(id), nextTrail)));
    depths.set(definition.id, depth);
    return depth;
  };
  const levels = new Map();
  for (const definition of species) {
    const depth = depthOf(definition);
    if (!levels.has(depth)) levels.set(depth, []);
    levels.get(depth).push(definition);
  }
  const nodes = [];
  for (const [depth, definitions] of [...levels].sort((a, b) => a[0] - b[0])) {
    definitions.sort((a, b) => a.group.localeCompare(b.group) || a.cost - b.cost);
    const span = (definitions.length - 1) * ROW_GAP;
    definitions.forEach((definition, index) => nodes.push({
      definition,
      x: depth * LEVEL_GAP,
      y: index * ROW_GAP - span / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    }));
  }
  return nodes;
}

function graphBounds(nodes, root) {
  const left = Math.min(root.x - root.width / 2, ...nodes.map(node => node.x - node.width / 2));
  const right = Math.max(root.x + root.width / 2, ...nodes.map(node => node.x + node.width / 2));
  const top = Math.min(root.y - root.height / 2, ...nodes.map(node => node.y - node.height / 2));
  const bottom = Math.max(root.y + root.height / 2, ...nodes.map(node => node.y + node.height / 2));
  return { left, top, width: right - left, height: bottom - top };
}

function drawBackdrop(context, width, height) {
  const gradient = context.createRadialGradient(width * .45, height * .42, 0, width * .45, height * .42, Math.max(width, height) * .75);
  gradient.addColorStop(0, "#0b2119");
  gradient.addColorStop(.55, "#07140f");
  gradient.addColorStop(1, "#030906");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(103,239,154,.06)";
  for (let x = 24; x < width; x += 48) {
    for (let y = 24; y < height; y += 48) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function nodePalette(status, selected) {
  if (status === "reached") return { fill: "#102b20", stroke: selected ? "#9affbd" : "#4dbb79", mark: "#1c5b3a", markText: "#d8ffe6", text: "#e7f5ed", subtext: "#9bd9b2" };
  if (status === "available") return { fill: "#133526", stroke: selected ? "#d3ffe1" : "#67ef9a", mark: "#67ef9a", markText: "#07130f", text: "#f1fff6", subtext: "#8ff0b3" };
  if (status === "revealed") return { fill: "#292313", stroke: selected ? "#ffe6a8" : "#a2843f", mark: "#5b4922", markText: "#ffe4a0", text: "#f3e6c0", subtext: "#c8ae69" };
  return { fill: "#09130f", stroke: selected ? "#739b89" : "#274438", mark: "#14251e", markText: "#587064", text: "#71877d", subtext: "#52665d" };
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function contains(node, point) {
  return point.x >= node.x - node.width / 2 && point.x <= node.x + node.width / 2
    && point.y >= node.y - node.height / 2 && point.y <= node.y + node.height / 2;
}

function trimText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && context.measureText(`${value}...`).width > maxWidth) value = value.slice(0, -1);
  return `${value}...`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
