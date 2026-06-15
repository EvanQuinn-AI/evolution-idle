import { ACHIEVEMENTS, ALBUMS, EXTINCTIONS, GENOME_UPGRADES, INTERVENTIONS, LIFE_TARGETS, LIFE_TARGETS_BY_ID, MEMORY_UPGRADES, MUTATION_UPGRADES, ORIGIN_ANCHORS, SPECIES, SPECIES_BY_ID, WORLD_FEATURES, WORLD_MILESTONES, EvolutionGame, ecologyOf, genomeUpgradeCost, memoryUpgradeCost, mutationUpgradeCost, worldFeatureCost } from "./game.js";
import { createStage } from "./stage.js";
import { createEvolutionMap } from "./evolution-map.js";
import { ANIMAL_VISUALS, HABITAT_VISUALS } from "./assets/stage/manifest.js";
import { createWildlifePreview } from "./wildlife-stage.js";

export const SAVE_KEY = "evolution-idle-progression-v2";

const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(item => [item.id, item]));
const COLLECTION_ACHIEVEMENT_IDS = new Set([
  "first_life", "menagerie", "noahs_ark", "globetrotter",
  "living_planet", "first_legend", "legend_keeper"
]);
const LIFE_WORLD_LABELS = {
  cave: "Cave", desert: "Desert", forest: "Forest", grassland: "Grassland",
  jungle: "Jungle", mountain: "Mountain", ocean: "Open Ocean", reef: "Coral Reef",
  river: "River", sky: "Open Sky", tundra: "Polar Tundra", wetland: "Wetland"
};

const RESOURCE_INFO = {
  energy: { name: "Energy &#9889;", text: "Fuel for chemistry and development. Tap the current life form to catalyze more Energy." },
  adaptation: { name: "Adaptation &#129516;", text: "A legacy resource retained for save compatibility. The collectible life-cycle loop advances with Energy." },
  memory: { name: "Evolution Memory &#9851;", text: "A legacy progression resource retained in existing saves." },
  dna: { name: "DNA Fragments &#129516;", text: "A legacy progression resource retained in existing saves." },
  mutation: { name: "Mutation Points &#10022;", text: "A legacy progression resource retained in existing saves." },
  knowledge: { name: "Discovery Knowledge &#128270;", text: "A legacy progression resource retained in existing saves." },
  pressure: { name: "Disaster Risk &#9888;", text: "Risk rises during development. At 100%, the current attempt is lost and the next run restarts from the Cell." }
};

const ROLE_ICON = {
  producer: "\u{1F33F}", herbivore: "\u{1F407}", omnivore: "\u{1F417}",
  carnivore: "\u{1F98A}", decomposer: "\u{1F344}", post: "\u{1F6F0}\u{FE0F}"
};

// First-run coaching: contextual one-liners that teach the core loop. Each is
// shown at most once (dismissal is persisted), so returning players never see
// them again. They appear one at a time and only during uninterrupted play.
const COACH_KEY = "evolution-idle-coach-v2";
const COACH_TIPS = [
  {
    id: "evolve",
    trigger: state => state.lifeTargetChoices().length === 2,
    text: "Choose one of the two adult targets. Raise it through all five stages to add it to your collection."
  },
  {
    id: "grow",
    trigger: state => Boolean(state.lifeTargetId),
    text: "Your chosen life form grows over time. Tap it to catalyze Energy while the current stage progresses."
  },
  {
    id: "balance",
    trigger: state => Boolean(state.pendingChoice?.lifeTarget),
    text: "Animal encounters use a d20 roll. A success keeps development moving; a failure can end the attempt."
  },
  {
    id: "survive",
    trigger: state => Boolean(state.lifeTargetId) && state.pressure >= 35,
    text: "Disaster risk is rising. At 100%, the unfinished life form is lost and development restarts from the Cell."
  }
];

const $ = id => document.getElementById(id);

export function startGame({ fast = false, seed = null, fresh = false, admin = false, openCodex = false, openCodexTab = "atlas", openLab = false, settings = {}, audio = null } = {}) {
  const discoveryQueue = [];
  let activeAlbum = "all";
  let saveTimer = null;
  let lastSavedAt = 0;
  let lastExtinctionSummary = null;
  let queuedChoiceEvent = null;
  let suppressLineageUntil = 0; // hold the "choose next" modal back so the collect celebration is seen
  let hiddenAt = null;
  let tickInterval = null;
  let toastTimer = null;
  let fateToastTimer = null;
  let discoveryTimer = null;
  let discoveryCountdownTimer = null;
  let evolutionInteractionActive = false;
  let pendingEvolutionRender = false;
  let setDrawerOpen = () => {};
  let refreshResourceInfo = () => {};
  let evolutionMap = null;
  let selectedTreeSpeciesId = null;
  let coachActiveId = null;
  let wildlifePreview = null;
  const coachShown = loadCoachShown();
  const renderCache = {};
  const stage = createStage($("stage-canvas"), {
    getSettings: () => settings,
    onTapCreature: () => catalyze()
  });

  if (fresh) localStorage.removeItem(SAVE_KEY);
  const snapshot = loadSnapshot();
  const profileSeed = seed ?? snapshot?.profileSeed ?? randomSeed();

  const game = new EvolutionGame({
    fast,
    collectionMode: true,
    seed: profileSeed,
    snapshot,
    onChange: state => {
      render(state);
      scheduleSave();
    },
    onDiscovery: discovery => {
      // The collection loop returns to the Cell on every attempt; popping the
      // origin-discovery modal each time interrupts the flow and buries the
      // collect celebration. Keep the little particle burst, skip the modal.
      if (discovery.kind === "origin") { stage.discoveryBurst(); return; }
      audio?.discovery?.(discovery.definition.rarity);
      stage.discoveryBurst();
      discoveryQueue.push(discovery);
      showNextDiscovery();
    },
    onChoiceEvent: event => {
      audio?.choice?.();
      queueChoiceEvent(event);
    },
    onDiceRoll: result => showFateToast(result.success ? "D20 SUCCESS" : "D20 FAILURE", `d20 ${result.natural}${result.bonus ? ` + ${result.bonus}` : ""} = ${result.total}`, result.text, !result.success),
    onFossilCollected: fossil => {
      renderCache.atlas = "";
      showFateToast("FOSSIL COLLECTED", fossil.definition.name, `${fossil.definition.name} was recorded after ${fossil.cause}.`, false);
    },
    onLifeCollected: result => {
      const rarity = LIFE_TARGETS_BY_ID[result.target.id]?.rarity || "Common";
      stage.celebrate(result.target.name, rarity);
      audio?.collect?.(rarity === "Legendary");
      haptic("heavy");
      // Let the celebration breathe before the next "choose a life form" prompt appears.
      suppressLineageUntil = performance.now() + 1900;
      setTimeout(() => render(game), 1950);
      showFateToast("LIFE FORM COLLECTED", result.target.name, `Congratulations! You collected an adult ${result.target.name}. A new attempt begins from the cell.`, false);
      renderCache.lifeCollection = "";
    },
    onLifeStage: info => {
      stage.stageUp(info.label);
      audio?.stageUp?.(info.stageIndex);
      haptic("medium");
    },
    onAttemptEnded: result => showFateToast("ATTEMPT LOST", result.target.name, `${result.target.name} was lost to ${result.cause}. You return to the cell without collecting it.`, true),
    onExtinctionReady: () => {
      audio?.extinctionWarning?.();
      shake();
      render(game);
    },
    onExtinction: showExtinction,
    onAchievement: achievement => {
      if (!COLLECTION_ACHIEVEMENT_IDS.has(achievement.id)) return;
      audio?.unlock?.();
      showAchievementToast(achievement);
      renderCache.achievements = "";
    }
  });

  evolutionMap = createEvolutionMap($("evolution-map-canvas"), SPECIES, {
    onSelect: id => {
      selectedTreeSpeciesId = id;
      if (game.isSpeciesLiving(id)) {
        game.setActiveSpecies(id);
        renderEvolutionInspector(game);
      }
      else {
        evolutionMap.select(id, { center: true });
        renderEvolutionInspector(game);
      }
    }
  });

  window.prototypeGame = game;
  $("game-shell").hidden = false;
  document.body.classList.add("immersive"); // the fullscreen canvas is the default view

  if (!openLab && snapshot?.savedAt && !game.worldEnded) {
    const elapsed = Math.min(172800, Math.max(0, (Date.now() - snapshot.savedAt) / 1000));
    if (elapsed > 2) {
      game.advanceOffline(elapsed);
      saveNow();
    }
  }
  $("fast-badge").hidden = !fast && !admin;
  $("fast-badge").textContent = admin ? `ADMIN MODE${fast ? " / FAST SIMULATION" : ""}` : "FAST PLAYTEST MODE";
  $("admin-panel").hidden = !admin;
  $("admin-gallery-open").hidden = !admin;

  wireControls();
  wireDialogGuards();
  wireLifecycle();
  wireTabs();
  wireImmersive();
  wireMenu();
  wireResourceInfo();
  if (admin) wireAdminPanel();
  if (!openLab) {
    startLoop();
    stage.start();
    requestAnimationFrame(() => stage.resize());
  }
  render(game);
  if (openCodex) openCodexScreen(openCodexTab);
  if (openLab) openLabScreen();
  if (!openLab && !openCodex) {
    if (game.worldEnded && game.completedRunSummary) showExtinction(game.completedRunSummary);
    else if (game.pendingChoice) queueChoiceEvent(game.pendingChoice);
  }

  return {
    game,
    saveNow,
    onSettingsChanged() {
      if (!openLab) startLoop();
      render(game);
    }
  };

  function wireControls() {
    const press = (id, handler, sound = "click") => {
      $(id).addEventListener("click", () => {
        const succeeded = handler();
        if (succeeded === false) audio?.denied?.();
        else audio?.[sound]?.();
      });
    };
    press("create-atom", () => game.createAtom(), "create");
    press("create-molecule", () => game.createMolecule(), "create");
    press("create-organic", () => game.createOrganic(), "create");
    press("create-cell", () => game.createCell(), "create");
    $("evolution-reset").addEventListener("click", () => {
      evolutionMap.resetView();
      audio?.click?.();
    });
    $("evolution-zoom-out").addEventListener("click", () => {
      evolutionMap.zoomBy(0.8);
      audio?.click?.();
    });
    $("evolution-zoom-in").addEventListener("click", () => {
      evolutionMap.zoomBy(1.25);
      audio?.click?.();
    });
    const inspector = $("species-actions");
    let speciesSwipe = null;
    inspector.addEventListener("pointerdown", event => {
      evolutionInteractionActive = true;
      if (event.pointerType !== "mouse" && !event.target.closest("button")) {
        speciesSwipe = { x: event.clientX, y: event.clientY };
      }
    });
    inspector.addEventListener("click", event => {
      const navigation = event.target.closest("[data-species-nav]");
      if (!navigation) return;
      selectOwnedSpecies(Number(navigation.dataset.speciesNav));
      audio?.click?.();
    });
    const releaseEvolutionInteraction = event => {
      if (speciesSwipe && event?.pointerType !== "mouse") {
        const dx = event.clientX - speciesSwipe.x;
        const dy = event.clientY - speciesSwipe.y;
        if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          selectOwnedSpecies(dx < 0 ? 1 : -1);
          haptic("light");
        }
      }
      speciesSwipe = null;
      if (!evolutionInteractionActive) return;
      evolutionInteractionActive = false;
      if (pendingEvolutionRender) {
        pendingEvolutionRender = false;
        renderCache.evolution = "";
        requestAnimationFrame(() => render(game));
      }
    };
    window.addEventListener("pointerup", releaseEvolutionInteraction);
    window.addEventListener("pointercancel", releaseEvolutionInteraction);
    $("stage-evolution").addEventListener("click", () => {
      document.querySelector('[data-tab="evolve"]')?.click();
      setDrawerOpen(true);
      audio?.click?.();
    });
    $("stage-objectives").addEventListener("click", () => {
      document.querySelector('[data-tab="evolve"]')?.click();
      setDrawerOpen(true);
      audio?.click?.();
    });
    press("unlock-cellular", () => game.unlockOriginAnchor("cellular"), "unlock");
    press("reveal-hidden", () => {
      const result = game.revealHiddenCondition();
      if (result) renderCache.world = "";
      return result;
    }, "unlock");
    press("vent-pressure", () => game.ventPressure(), "grow");
    // Ecosystem interventions are event-delegated so the dynamically rebuilt
    // population rows (cull / protect) and the static action bar all work.
    $("karma-meter").addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button || !button.dataset.action || button.disabled) return;
      const succeeded = runEcoAction(button.dataset.action, button.dataset.target);
      audio?.[succeeded ? "grow" : "denied"]?.();
      if (succeeded) haptic("light");
    });
    $("world-feature-shop").addEventListener("click", event => {
      const button = event.target.closest("[data-world-feature]");
      if (!button || button.disabled) return;
      const succeeded = game.buyWorldFeature(button.dataset.worldFeature);
      audio?.[succeeded ? "unlock" : "denied"]?.();
      if (succeeded) haptic("medium");
    });
    $("face-extinction").addEventListener("click", () => {
      if (game.resolveExtinction()) {
        audio?.extinction?.();
        shake();
      }
    });
    $("coach-dismiss").addEventListener("click", () => {
      if (coachActiveId) {
        coachShown.add(coachActiveId);
        saveCoachShown(coachShown);
        coachActiveId = null;
      }
      $("coach").hidden = true;
      audio?.click?.();
    });
    $("close-entry").addEventListener("click", () => $("entry-dialog").close());
    $("atlas-search").addEventListener("input", () => renderAtlas(game));
    $("atlas-state-filter").addEventListener("change", () => renderAtlas(game));
    $("fossil-species").addEventListener("change", event => game.setFossilSpecies(event.target.value || null));
    $("close-discovery").addEventListener("click", () => $("discovery-dialog").close());
    $("discovery-dialog").addEventListener("close", () => {
      clearDiscoveryTimer();
      showNextDiscovery();
      if (!$("discovery-dialog").open && queuedChoiceEvent) showChoiceEvent(queuedChoiceEvent);
    });
    $("begin-next-run").addEventListener("click", () => {
      clearTransientDialogs();
      stage.clearExtinction();
      game.startNextWorld();
      audio?.create?.();
      $("extinction-dialog").close();
    });
  }

  function wireImmersive() {
    // The creature is the catalyze target; Space/Enter is the keyboard equivalent.
    window.addEventListener("keydown", event => {
      if (event.key !== " " && event.key !== "Enter") return;
      const tag = (event.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "button" || tag === "textarea") return;
      if (document.querySelector("dialog[open]")) return;
      if ($("panel-drawer").classList.contains("open")) return;
      if (!$("codex-screen").hidden) return;
      stage.tap(catalyze());
      event.preventDefault();
    });
    // The fullscreen canvas is the default view; the ✕ exits to the main menu.
    $("stage-exit").addEventListener("click", exitToMenu);
  }

  // Evolve and World share one full-screen in-game view.
  function wireMenu() {
    const drawer = $("panel-drawer");
    setDrawerOpen = open => {
      if (open) {
        const activeTab = document.querySelector(".tab.active")?.dataset.tab;
        drawer.classList.toggle("evolution-mode", activeTab === "evolve");
        drawer.classList.toggle("world-mode", activeTab === "world");
      }
      drawer.classList.toggle("open", open);
      if (open) requestAnimationFrame(() => evolutionMap.resize());
    };
    $("stage-menu").addEventListener("click", () => {
      setDrawerOpen(!drawer.classList.contains("open"));
      audio?.click?.();
    });
    $("drawer-close").addEventListener("click", () => { setDrawerOpen(false); audio?.click?.(); });
    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && drawer.classList.contains("open")) setDrawerOpen(false);
    });
    // The Codex is its own full screen; the only way back to the game is the menu.
    $("stage-codex").addEventListener("click", () => { openCodexScreen(); audio?.click?.(); });
    $("codex-exit").addEventListener("click", exitToMenu);
    $("lab-exit").addEventListener("click", exitToMenu);
  }

  function openCodexScreen(subtab = "atlas") {
    setDrawerOpen(false);
    render(game);
    for (const item of document.querySelectorAll(".codex-subtab")) item.classList.toggle("active", item.dataset.codex === subtab);
    for (const view of document.querySelectorAll(".codex-view")) view.classList.toggle("active", view.dataset.codexView === subtab);
    $("codex-screen").hidden = false;
  }

  function openLabScreen() {
    setDrawerOpen(false);
    render(game);
    $("lab-screen").hidden = false;
  }

  // Exit to the title screen (saving first), skipping the intro on the way back.
  function exitToMenu() {
    saveNow();
    try { sessionStorage.setItem("ei-skip-intro-once", "1"); } catch { /* sessionStorage unavailable */ }
    location.reload();
  }

  // Tap any resource counter (HUD or fullscreen chip) to learn what it does.
  function wireResourceInfo() {
    const info = $("resource-info");
    let openRes = null;
    const close = () => { info.hidden = true; openRes = null; };
    const renderInfo = res => {
      const meta = RESOURCE_INFO[res];
      if (!meta) return;
      const liveValue = res === "pressure"
        ? `<span class="resource-info-value danger-value">Current risk: ${Math.floor(game.pressure)}%</span><span class="resource-info-value karma-value">Ecosystem Health: ${game.ecosystemHealth}%</span>`
        : "";
      info.innerHTML = `<strong>${meta.name}</strong>${liveValue}<p>${meta.text}</p>`;
    };
    refreshResourceInfo = () => {
      if (openRes) renderInfo(openRes);
    };
    document.addEventListener("click", event => {
      const stat = event.target.closest("[data-res]");
      if (stat) {
        const res = stat.dataset.res;
        const meta = RESOURCE_INFO[res];
        if (!meta) return;
        if (openRes === res) { close(); return; }
        openRes = res;
        renderInfo(res);
        info.hidden = false;
        const rect = stat.getBoundingClientRect();
        const width = Math.min(280, window.innerWidth * 0.86);
        const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
        info.style.width = `${width}px`;
        info.style.left = `${left}px`;
        // Prefer below the element, but flip/clamp so it never leaves the screen.
        const height = info.offsetHeight;
        let top = rect.bottom + 8;
        if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
        info.style.top = `${top}px`;
        event.stopPropagation();
        return;
      }
      if (!event.target.closest("#resource-info")) close();
    });
  }

  // Shared "catalyze" action for tapping the creature (canvas) and the Space /
  // Enter keyboard shortcut: grow the active population if a lineage is alive,
  // otherwise spark raw Energy. Returns juice info so the stage can float the
  // matching number and color (and a distinct nudge when the tap is rejected).
  function catalyze() {
    const activeId = game.activeLineageId;
    if (activeId) {
      if (!game.growPopulation(activeId)) { audio?.denied?.(); return { denied: true }; }
      audio?.grow?.();
      haptic("medium");
      return { kind: "pop", text: "+1" };
    }
    if (!game.generateEnergy()) { audio?.denied?.(); return { denied: true }; }
    audio?.pop?.();
    haptic("light");
    return { kind: "energy", text: `+${game.fast ? 20 : 1}` };
  }

  // Haptics: real feedback on iOS via the Expo WebView bridge, with a
  // navigator.vibrate fallback for Android browsers.
  function haptic(style = "light") {
    if (!settings.haptics) return;
    try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "haptic", style })); } catch { /* not in webview */ }
    if (navigator.vibrate) navigator.vibrate(style === "heavy" ? 40 : style === "medium" ? 22 : 12);
  }

  function wireTabs() {
    const drawer = $("panel-drawer");
    const activateTab = (target, activeTab) => {
      for (const item of document.querySelectorAll(".tab")) item.classList.toggle("active", item === activeTab);
      for (const pane of document.querySelectorAll(".tab-pane")) pane.classList.toggle("active", pane.dataset.pane === target);
      drawer.classList.toggle("evolution-mode", target === "evolve");
      drawer.classList.toggle("world-mode", target === "world");
      if (target === "evolve") requestAnimationFrame(() => evolutionMap.resize());
    };
    for (const tab of document.querySelectorAll(".tab")) {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        activateTab(target, tab);
        audio?.click?.();
      });
    }
    const initialTab = document.querySelector(".tab.active");
    if (initialTab) activateTab(initialTab.dataset.tab, initialTab);
    for (const subtab of document.querySelectorAll(".codex-subtab")) {
      subtab.addEventListener("click", () => {
        const target = subtab.dataset.codex;
        for (const item of document.querySelectorAll(".codex-subtab")) item.classList.toggle("active", item === subtab);
        for (const view of document.querySelectorAll(".codex-view")) view.classList.toggle("active", view.dataset.codexView === target);
        audio?.click?.();
      });
    }
  }

  function showAchievementToast(achievement) {
    const toast = $("achievement-toast");
    $("toast-name").textContent = achievement.name;
    $("toast-desc").textContent = achievement.description;
    toast.hidden = false;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { toast.hidden = true; }, 400);
    }, 3600);
  }

  function showFateToast(title, roll, copy, failed = false) {
    const toast = $("fate-toast");
    $("fate-toast-title").textContent = title;
    $("fate-toast-roll").textContent = roll;
    $("fate-toast-copy").textContent = copy;
    toast.hidden = false;
    toast.classList.toggle("failure", failed);
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    if (fateToastTimer) clearTimeout(fateToastTimer);
    fateToastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { toast.hidden = true; }, 400);
    }, 4600);
  }

  function wireDialogGuards() {
    // A finished world must not be stranded without restart UI (the decision card
    // can't be dismissed, so its soft-lock is inherent).
    $("extinction-dialog").addEventListener("cancel", event => event.preventDefault());
    $("extinction-dialog").addEventListener("close", () => {
      if (game.worldEnded && lastExtinctionSummary) setTimeout(() => $("extinction-dialog").showModal(), 150);
    });
    $("lineage-dialog").addEventListener("cancel", event => event.preventDefault());
  }

  function wireLifecycle() {
    if (openLab) {
      window.addEventListener("pagehide", saveNow);
      return;
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        saveNow();
      } else if (hiddenAt) {
        const away = (Date.now() - hiddenAt) / 1000;
        hiddenAt = null;
        if (away > 5 && !game.worldEnded) {
          game.advanceOffline(away);
          saveNow();
        }
      }
    });
    window.addEventListener("pagehide", saveNow);
  }

  function wireAdminPanel() {
    const grant = (id, apply) => $(id).addEventListener("click", () => {
      apply();
      renderCache.world = "";
      game.changed();
      audio?.click?.();
    });
    grant("admin-energy", () => { game.energy += 1000; });
    grant("admin-adaptation", () => { game.adaptation += 500; });
    grant("admin-memory", () => { game.evolutionMemory += 10; });
    grant("admin-dna", () => { game.dna += 10; });
    grant("admin-mutation", () => { game.mutationPoints += 10; });
    grant("admin-knowledge", () => { game.discoveryKnowledge += 5; });
    grant("admin-pressure", () => { game.pressure = Math.min(100, game.pressure + 25); });
    grant("admin-reveal", () => { game.revealedHiddenModifier = true; });
    $("admin-event").addEventListener("click", () => {
      if (!game.triggerChoiceEvent()) audio?.denied?.();
    });
    $("admin-wipe").addEventListener("click", () => {
      if (confirm("Wipe the local save and reload?")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    });
    wireWildlifeGallery();
  }

  function wireWildlifeGallery() {
    const dialog = $("wildlife-gallery");
    const animalSelect = $("gallery-animal");
    const habitatSelect = $("gallery-habitat");
    animalSelect.replaceChildren(...Object.values(ANIMAL_VISUALS).map(visual => {
      const option = document.createElement("option");
      option.value = visual.id;
      option.textContent = LIFE_TARGETS_BY_ID[visual.id]?.name || visual.id;
      if (visual.id === "fox") option.selected = true;
      return option;
    }));
    habitatSelect.replaceChildren(...Object.values(HABITAT_VISUALS).map(habitat => {
      const option = document.createElement("option");
      option.value = habitat.id;
      option.textContent = habitat.name;
      if (habitat.id === "forest") option.selected = true;
      return option;
    }));

    const galleryState = () => {
      const stageIndex = Number($("gallery-stage").value);
      return {
      animalId: animalSelect.value,
      stageIndex,
      stageLabel: LIFE_TARGETS_BY_ID[animalSelect.value]?.stages[stageIndex],
      habitatId: habitatSelect.value,
      motion: $("gallery-motion").value
    }; };
    const refresh = () => {
      $("gallery-frame").classList.toggle("mobile", $("gallery-viewport").value === "mobile");
      wildlifePreview?.update(galleryState());
    };
    for (const id of ["gallery-animal", "gallery-stage", "gallery-habitat", "gallery-motion", "gallery-viewport"]) {
      $(id).addEventListener("change", refresh);
    }
    $("admin-gallery-open").addEventListener("click", () => {
      dialog.showModal();
      if (!wildlifePreview) wildlifePreview = createWildlifePreview($("wildlife-gallery-canvas"), galleryState());
      refresh();
    });
    $("wildlife-gallery-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      wildlifePreview?.stop();
      wildlifePreview = null;
    });
  }

  function startLoop() {
    if (tickInterval) clearInterval(tickInterval);
    let lastFrame = performance.now();
    tickInterval = setInterval(() => {
      if (document.hidden) {
        lastFrame = performance.now();
        return;
      }
      const now = performance.now();
      const elapsed = Math.min(0.5, (now - lastFrame) / 1000);
      lastFrame = now;
      game.tick(elapsed);
    }, settings.performanceMode ? 500 : 200);
  }

  function shake() {
    if (settings.reducedMotion) return;
    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 700);
  }

  function render(state) {
    stage.update(state);
    renderStageHud(state);
    $("world-number").textContent = state.attemptNumber;
    $("world-seed").textContent = String(state.worldSeed).padStart(8, "0");
    const activeTarget = state.lifeTargetId ? LIFE_TARGETS_BY_ID[state.lifeTargetId] : null;
    $("world-title").textContent = activeTarget
      ? `${activeTarget.name} Development`
      : state.lifeTargetChoices().length > 0 ? "Choose A Life Form" : "Building Cellular Life";
    $("world-age").textContent = formatDuration(state.worldAgeSeconds);
    $("collection-total").textContent = `${state.known.size} / ${SPECIES.length}`;
    $("fossil-total").textContent = `${state.lifeCollection.size} / ${LIFE_TARGETS.length} life forms`;
    $("completion-percent").textContent = `${Math.round(state.known.size / SPECIES.length * 100)}%`;
    $("memory-total").textContent = format(state.evolutionMemory);
    $("dna-total").textContent = format(state.dna);
    $("mutation-total").textContent = format(state.mutationPoints);
    $("knowledge-total").textContent = format(state.discoveryKnowledge);

    const worldKey = `${state.worldNumber}|${state.revealedHiddenModifier}|${Math.floor(state.mutationPoints)}|${state.worldEnded}`;
    if (renderCache.world !== worldKey) {
      renderCache.world = worldKey;
      renderWorld(state);
    }
    renderEcosystem(state);
    renderWorldObjectives(state);
    renderEconomy(state);
    renderWorldFeatures(state);
    renderOrigins(state);
    renderEvolutionProgress(state);
    renderLifeCycleDashboard(state);
    renderLineageDialog(state);
    renderLifeCollection(state);
    if (evolutionMap) evolutionMap.update(state);
    const selectedDefinition = SPECIES_BY_ID[selectedTreeSpeciesId];
    const selectedStatus = selectedDefinition ? state.speciesStatus(selectedDefinition.id) : null;
    const evolutionKey = [
      state.cells > 0,
      state.activeLineageId,
      selectedTreeSpeciesId,
      selectedStatus?.state,
      selectedStatus?.reasons.filter(reason => !reason.startsWith("Charge ")).join("|"),
      selectedDefinition ? state.runReached.has(selectedDefinition.id) : false,
      selectedDefinition ? state.isSpeciesLiving(selectedDefinition.id) : false,
      selectedDefinition ? state.mastery.get(selectedDefinition.id) || 0 : 0,
      selectedDefinition ? state.known.has(selectedDefinition.id) : false,
      state.worldEnded,
      state.awaitingCataclysm
    ].join("~");
    if (renderCache.evolution !== evolutionKey) {
      renderCache.evolution = evolutionKey;
      renderEvolution(state);
    } else updateEvolutionInspectorLive(state);
    const eventKey = state.eventLog.map(item => item.id).join("|");
    if (renderCache.events !== eventKey) {
      renderCache.events = eventKey;
      renderEvents(state);
    }
    renderExtinction(state);
    renderMeta(state);
    renderGenome(state);
    renderMemoryUpgrades(state);
    renderMutationUpgrades(state);
    renderWorldMilestones(state);
    refreshDecisionAffordability(state);
    const atlasKey = `${activeAlbum}|${[...state.known].join(",")}|${[...state.fossilCollection].join(",")}|${[...state.survivorStamps.keys()].join(",")}|${$("atlas-search").value}|${$("atlas-state-filter").value}|${SPECIES.filter(item => state.speciesStatus(item.id).state === "available").map(item => item.id).join(",")}`;
    if (renderCache.atlas !== atlasKey) {
      renderCache.atlas = atlasKey;
      renderAtlas(state);
    }
    const achKey = [...state.unlockedAchievements].sort().join(",");
    if (renderCache.achievements !== achKey) {
      renderCache.achievements = achKey;
      renderAchievements(state);
    }
    const boardKey = state.leaderboard.map(entry => entry.score).join(",");
    if (renderCache.leaderboard !== boardKey) {
      renderCache.leaderboard = boardKey;
      renderLeaderboard(state);
    }
    updateCoach(state);
  }

  // Surface the next unseen coaching tip during uninterrupted play. A tip stays
  // up (it persists across renders) until the player dismisses it, then the next
  // eligible tip can appear. Anything modal hides it without consuming it.
  function updateCoach(state) {
    const coach = $("coach");
    const blocked = state.worldEnded || state.awaitingCataclysm || Boolean(state.pendingChoice)
      || Boolean(document.querySelector("dialog[open]"))
      || $("panel-drawer").classList.contains("open")
      || !$("codex-screen").hidden || !$("lab-screen").hidden;
    if (blocked) { coach.hidden = true; return; }
    if (!coachActiveId) {
      const next = COACH_TIPS.find(tip => !coachShown.has(tip.id) && tip.trigger(state));
      if (!next) { coach.hidden = true; return; }
      coachActiveId = next.id;
      $("coach-text").textContent = next.text;
    }
    coach.hidden = false;
  }

  function renderStageHud(state) {
    renderStageResources(state);
    renderStageEvolution(state);
    renderStageObjectives(state);
    $("stage-biome").textContent = state.currentScene.name;
    const ecosystemPill = $("stage-ecosystem");
    const target = state.lifeTargetId ? LIFE_TARGETS_BY_ID[state.lifeTargetId] : null;
    ecosystemPill.textContent = target
      ? `Attempt ${state.attemptNumber} · Stage ${state.lifeStageIndex + 1} / ${target.stages.length}`
      : `Collection ${state.lifeCollection.size} / ${LIFE_TARGETS.length}`;
    ecosystemPill.classList.toggle("strained", state.pressure >= 55);
    ecosystemPill.classList.toggle("unstable", state.pressure >= 80);
    const scoreEl = $("stage-score");
    scoreEl.hidden = state.cells < 1;
    scoreEl.textContent = `★ ${state.lifeCollection.size} / ${LIFE_TARGETS.length}`;
    // Vertical "rising risk" bar — visible once life exists, fills bottom-to-top.
    const pressureBar = $("stage-pressure");
    pressureBar.hidden = !(state.lifeTargetId && !state.worldEnded);
    $("stage-pressure-fill").style.height = `${state.pressure}%`;
    pressureBar.classList.toggle("severe", state.pressure >= 90);
    refreshResourceInfo();
    $("stage-action").hidden = !state.awaitingCataclysm || state.worldEnded;
    const hint = $("stage-hint");
    if (state.worldEnded) hint.textContent = "This world has ended.";
    else if (state.awaitingCataclysm) hint.textContent = "The cataclysm is ready.";
    else if (state.lifeTargetId) {
      const target = LIFE_TARGETS_BY_ID[state.lifeTargetId];
      hint.textContent = `${target.name}: ${target.stages[state.lifeStageIndex]} · ${format(state.lifeStageProgress)} / ${format(state.lifeStageCost)}`;
    } else if (state.lifeTargetChoices().length > 0) hint.textContent = "Open Life Cycle and choose one of two new life forms";
    else hint.textContent = "Tap the forming life to catalyze Energy and build the first Cell";
    const evolveBadge = $("tab-evolve-badge");
    const available = state.lifeTargetChoices().length;
    evolveBadge.textContent = available > 0 ? String(available) : "";
    evolveBadge.hidden = available === 0;
    // Surface a dot on the canvas menu button when something is worth opening for.
    const menuCrisis = Boolean(state.lifeTargetId) && state.pressure >= 70 && !state.worldEnded;
    const menuBadge = $("menu-badge");
    menuBadge.hidden = !(available > 0 || menuCrisis || state.awaitingCataclysm);
    menuBadge.classList.toggle("crisis", menuCrisis || state.awaitingCataclysm);
  }

  function evolutionProgress(state) {
    if (state.lifeTargetId) {
      const target = LIFE_TARGETS_BY_ID[state.lifeTargetId];
      const checkpoint = state.lifeStageCost;
      const current = Math.min(state.lifeStageProgress, checkpoint);
      const remaining = Math.max(0, checkpoint - current);
      return { choices: [], checkpoint, ready: false, current, percent: current / checkpoint * 100, remaining, eta: state.evolutionRate > 0 ? remaining / state.evolutionRate : 0, next: [], stageLabel: `${target.name}: ${target.stages[state.lifeStageIndex]}` };
    }
    const targetChoices = state.lifeTargetChoices();
    if (targetChoices.length) return { choices: targetChoices, checkpoint: 1, ready: true, current: 1, percent: 100, remaining: 0, eta: 0, next: targetChoices };
    const current = Math.min(3, state.cells);
    return { choices: [], checkpoint: 3, ready: false, current, percent: current / 3 * 100, remaining: 3 - current, eta: 0, next: [], stageLabel: "Building the first Cell" };
  }

  // When no route is charging (checkpoint === 0) the player is either fully
  // maxed for this world or blocked by a non-energy condition. Surface the
  // nearest actionable lead instead of a dead "awaiting a viable route".
  function evolutionGuidance(state) {
    const frontier = SPECIES.filter(species => !state.runReached.has(species.id)
      && (species.requires.length === 0 || species.requires.every(required => state.runReached.has(required))))
      .sort((left, right) => left.cost - right.cost);
    for (const species of frontier) {
      const reason = state.speciesStatus(species.id).reasons.find(item => !item.startsWith("Charge "));
      if (reason) return reason;
    }
    return "Every route here is evolved — grow populations and survive onward.";
  }

  function renderStageEvolution(state) {
    const bar = $("stage-evolution");
    bar.hidden = state.cells < 1 || state.worldEnded;
    if (bar.hidden) return;
    const progress = evolutionProgress(state);
    const available = progress.ready ? progress.choices.length : 0;
    const detail = progress.ready
      ? `${available} life-form choices ready. Tap to choose.`
      : state.lifeTargetId
        ? `${progress.stageLabel}: ${format(progress.current)} of ${format(progress.checkpoint)} development Energy.`
        : "Cellular life is assembling. Tap the stage to catalyze Energy.";
    bar.title = detail;
    bar.setAttribute("aria-label", detail);
    $("stage-evolution-fill").style.height = `${progress.percent}%`;
    bar.classList.toggle("ready", progress.ready);
  }

  function renderStageObjectives(state) {
    $("stage-objectives").hidden = state.worldEnded;
    if (state.worldEnded) return;
    const target = state.lifeTargetId ? LIFE_TARGETS_BY_ID[state.lifeTargetId] : null;
    $("stage-objectives-title").textContent = `Life Forms ${state.lifeCollection.size} / ${LIFE_TARGETS.length}`;
    $("stage-objectives-next").textContent = target
      ? `${target.name}: ${target.stages[state.lifeStageIndex]} · Stage ${state.lifeStageIndex + 1} / ${target.stages.length}`
      : state.lifeTargetChoices().length > 0 ? "Two new branches are ready to choose" : "Build the Cell to reveal two branches";
    $("stage-objectives").classList.toggle("complete", state.lifeCollection.size === LIFE_TARGETS.length);
  }

  // In immersive fullscreen the HUD is hidden, so surface the resources that
  // actually matter (non-zero) as compact icon chips over the stage.
  function renderStageResources(state) {
    const container = $("stage-resources");
    const defs = [
      { key: "energy", icon: "&#9889;", value: state.energy, rate: state.productionRate }
    ];
    const html = defs
      .filter(def => Math.floor(def.value) > 0)
      .map(def => `<span class="stage-res-chip" data-res="${def.key}"><span class="ico">${def.icon}</span><strong>${format(def.value)}</strong>${def.rate ? `<small>+${format(def.rate)}/s</small>` : ""}</span>`)
      .join("");
    if (container.dataset.html !== html) {
      container.dataset.html = html;
      container.innerHTML = html;
    }
  }

  function renderAchievements(state) {
    const grid = $("achievement-grid");
    const collectionAchievements = ACHIEVEMENTS.filter(achievement => COLLECTION_ACHIEVEMENT_IDS.has(achievement.id));
    const unlockedCount = collectionAchievements.filter(achievement => state.unlockedAchievements.has(achievement.id)).length;
    $("achievement-progress").textContent = `${unlockedCount} / ${collectionAchievements.length}`;
    grid.replaceChildren(...collectionAchievements.map(achievement => {
      const unlocked = state.unlockedAchievements.has(achievement.id);
      const card = document.createElement("article");
      card.className = `achievement-card ${unlocked ? "unlocked" : "locked"}`;
      const hidden = achievement.secret && !unlocked;
      card.innerHTML = `<span class="achievement-mark">${unlocked ? "&#9733;" : achievement.secret ? "?" : "&#9734;"}</span>`
        + `<div><strong>${hidden ? "Secret Achievement" : achievement.name}</strong>`
        + `<small>${hidden ? "Discover this one yourself." : achievement.description}</small></div>`;
      return card;
    }));
  }

  function renderLeaderboard(state) {
    $("best-score").textContent = format(state.bestScore);
    const list = $("leaderboard-list");
    if (state.leaderboard.length === 0) {
      list.innerHTML = '<li class="empty-copy">Survive an extinction to set your first record.</li>';
      return;
    }
    list.replaceChildren(...state.leaderboard.map((entry, index) => {
      const item = document.createElement("li");
      item.className = "leaderboard-row";
      item.innerHTML = `<span class="rank">${index + 1}</span>`
        + `<span class="apex-glyph">${entry.apexGlyph || "?"}</span>`
        + `<div class="board-main"><strong>${format(entry.score)} pts</strong>`
        + `<small>${entry.apex} &middot; ${entry.species} species &middot; World ${entry.world}</small></div>`
        + `<span class="board-cause">${entry.extinction}</span>`;
      return item;
    }));
  }

  function renderWorld(state) {
    $("biome-list").replaceChildren(...state.worldBiomes.map(biome => chip(biome.name, "biome")));
    const modifierChips = state.visibleModifiers.map(modifier => chip(`${modifier.name}: ${modifier.effect}`, "modifier"));
    modifierChips.push(state.revealedHiddenModifier
      ? chip(`Hidden: ${state.hiddenModifier.name} - ${state.hiddenModifier.effect}`, "secret")
      : chip("Hidden condition: ???", "unknown"));
    $("modifier-list").replaceChildren(...modifierChips);
    $("reveal-hidden").hidden = state.revealedHiddenModifier || state.worldEnded;
    $("reveal-hidden").disabled = state.mutationPoints < 1;
  }

  function renderWorldFeatures(state) {
    const shop = $("world-feature-shop");
    const key = Object.keys(WORLD_FEATURES).map(type => `${type}:${state.worldFeatures?.[type] || 0}`).join("|");
    if (renderCache.worldFeatures !== key) {
      renderCache.worldFeatures = key;
      shop.replaceChildren(...Object.entries(WORLD_FEATURES).map(([type, feature]) => {
        const level = state.worldFeatures?.[type] || 0;
        const card = document.createElement("article");
        card.className = "world-feature-card";
        card.dataset.featureCard = type;
        card.innerHTML = `<div><span>${feature.name}</span><strong>Level ${level} / ${feature.maxLevel}</strong><p>${feature.description}</p></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.worldFeature = type;
        card.append(button);
        return card;
      }));
    }
    for (const [type, feature] of Object.entries(WORLD_FEATURES)) {
      const level = state.worldFeatures?.[type] || 0;
      const button = shop.querySelector(`[data-world-feature="${type}"]`);
      if (!button) continue;
      if (level >= feature.maxLevel) {
        button.textContent = "Maxed";
        button.disabled = true;
      } else {
        const cost = worldFeatureCost(type, level);
        button.innerHTML = `Upgrade<span>${cost.toLocaleString()} Energy</span>`;
        button.disabled = state.worldEnded || state.awaitingCataclysm || state.energy < cost;
      }
    }
  }

  function renderWorldObjectives(state) {
    const progress = state.objectiveProgress;
    $("objective-summary").textContent = `${progress.completed} / ${progress.total} complete`;
    $("world-objectives").replaceChildren(...state.worldObjectives.map(objective => {
      const card = document.createElement("article");
      const percent = Math.min(100, objective.progress / objective.target * 100);
      card.className = `world-objective${objective.completed ? " completed" : ""}`;
      card.innerHTML = `<span class="objective-check">${objective.completed ? "&#10003;" : ""}</span>`
        + `<div class="objective-copy"><strong>${objective.title}</strong><p>${objective.description}</p>`
        + `<div class="objective-track"><i style="width:${percent}%"></i></div>`
        + `<small>${formatObjectiveProgress(objective)}</small></div>`
        + `<span class="objective-reward">+${objective.reward.amount.toLocaleString()}<small>${objectiveRewardLabel(objective.reward.resource)}</small></span>`;
      return card;
    }));
  }

  function renderEcosystem(state) {
    const health = state.ecosystemHealth;
    $("karma-value").textContent = `${health}%`;
    $("karma-state").textContent = state.ecosystemHealthState;
    $("karma-fill").style.width = `${health}%`;
    const meter = $("karma-meter");
    meter.classList.toggle("strained", health < 60);
    meter.classList.toggle("unstable", health < 40);
    meter.classList.toggle("critical", health < 20);
    $("karma-copy").textContent = state.runReached.size === 0
      ? "Evolve your first species to seed a living food web."
      : `Extinction risk is rising ${state.extinctionRiskRate < 0.01 ? "under 0.01" : state.extinctionRiskRate.toFixed(2)}% per second. Keep producers, herbivores, and predators in proportion.`;

    // One-tap recommended fix for the worst current problem.
    const rec = state.recommendedAction;
    const recEl = $("recommended-action");
    if (rec && !state.worldEnded) {
      recEl.hidden = false;
      recEl.dataset.action = rec.action;
      recEl.dataset.target = rec.target || "";
      recEl.innerHTML = `<span class="rec-label">${rec.label}</span><span class="rec-reason">${rec.reason}</span>`;
    } else {
      recEl.hidden = true;
      recEl.dataset.action = "";
    }

    // The "why" feed: the food web narrates what is happening this moment.
    const causes = state.ecosystemCauses || [];
    $("ecosystem-causes").replaceChildren(...causes.map(item => {
      const row = document.createElement("div");
      const severity = item.severity >= 80 ? "high" : item.severity >= 45 ? "mid" : "low";
      row.className = `eco-cause sev-${severity}`;
      row.textContent = item.text;
      return row;
    }));

    // Live population rows with role, biome, trend, and per-species actions.
    const rows = [...state.populations.entries()].sort((left, right) => right[1] - left[1]);
    const cullReady = state.interventionStatus("cull")?.ready;
    const protectReady = state.interventionStatus("protect")?.ready;
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-copy";
      empty.textContent = "No living populations yet.";
      $("karma-populations").replaceChildren(empty);
    } else {
      $("karma-populations").replaceChildren(...rows.map(([id, pop]) => buildPopRow(state, id, pop, cullReady, protectReady)));
    }

    // Refresh the always-present action buttons (cost/cooldown gating).
    for (const key of ["boostPlants", "stabilise"]) {
      const status = state.interventionStatus(key);
      const button = document.querySelector(`#ecosystem-actions [data-action="${key}"]`);
      if (button && status) {
        button.disabled = !status.ready;
        button.classList.toggle("on-cooldown", status.cooldown > 0);
      }
    }
  }

  function buildPopRow(state, id, pop, cullReady, protectReady) {
    const definition = SPECIES_BY_ID[id];
    const eco = ecologyOf(definition) || {};
    const trend = state.popTrend?.get(id) || 0;
    const arrow = trend > 0 ? "▲" : trend < 0 ? "▼" : "–";
    const protectedActive = (state.protectedUntil?.[id] || 0) > state.worldAgeSeconds;
    const fill = Math.min(100, (pop / Math.max(1, eco.cap || 12)) * 100);
    const row = document.createElement("div");
    row.className = `pop-row role-${eco.role || "herbivore"}${id === state.activeLineageId ? " active" : ""}${protectedActive ? " protected" : ""}`;
    row.innerHTML =
      `<span class="pop-role" title="${eco.role || ""}">${ROLE_ICON[eco.role] || "•"}</span>` +
      `<span class="pop-name">${definition?.name || id}</span>` +
      `<span class="pop-biome">${capitalize(eco.biome || definition?.biome || "")}</span>` +
      `<span class="pop-bar"><i style="width:${fill}%"></i></span>` +
      `<span class="pop-count trend-${trend > 0 ? "up" : trend < 0 ? "down" : "flat"}">${arrow} ${pop < 10 ? pop.toFixed(1) : Math.round(pop)}</span>`;
    const actions = document.createElement("span");
    actions.className = "pop-actions";
    const cull = document.createElement("button");
    cull.type = "button"; cull.dataset.action = "cull"; cull.dataset.target = id;
    cull.title = "Cull (40 Adaptation)"; cull.textContent = "✂";
    cull.disabled = !cullReady || pop <= 1;
    const protect = document.createElement("button");
    protect.type = "button"; protect.dataset.action = "protect"; protect.dataset.target = id;
    protect.title = "Protect (60 Adaptation)"; protect.textContent = "\u{1F6E1}";
    protect.disabled = !protectReady || protectedActive;
    actions.append(cull, protect);
    row.append(actions);
    return row;
  }

  function runEcoAction(action, target) {
    switch (action) {
      case "boostPlants": return game.boostPlants(target || mostStressedBiome());
      case "cull": return game.cullSpecies(target);
      case "protect": return game.protectSpecies(target);
      case "introduce": return game.introduceSpecies(target);
      case "stabilise": return game.stabiliseClimate();
      default: return false;
    }
  }

  function mostStressedBiome() {
    let worst = game.dominantBiome?.id;
    let max = -1;
    for (const [id, biome] of game.biomeState) {
      if ((biome.stress || 0) > max) { max = biome.stress || 0; worst = id; }
    }
    return worst;
  }

  function renderEconomy(state) {
    $("energy-value").textContent = format(state.energy);
    $("energy-rate").textContent = `+${format(state.productionRate)}/sec`;
    $("adaptation-value").textContent = format(state.adaptation);
    $("adaptation-rate").textContent = `+${format(state.adaptationRate)}/sec`;
  }

  function renderOrigins(state) {
    const established = state.establishedOrigins;
    $("atoms-value").textContent = established.atoms.toLocaleString();
    $("molecules-value").textContent = established.molecules.toLocaleString();
    $("organics-value").textContent = established.organics.toLocaleString();
    $("cells-value").textContent = established.cells.toLocaleString();
    // The origin chain now assembles itself; the manual buttons are retired.
    for (const id of ["create-atom", "create-molecule", "create-organic", "create-cell"]) $(id).hidden = true;
    const cellular = state.cells > 0;
    $("origin-title").textContent = cellular ? "Cellular Life Established" : "Life Is Assembling";
    $("origin-summary").textContent = cellular
      ? "Every cell retains its atomic, molecular, and organic foundation as origin chemistry continues."
      : "Matter assembles into life automatically — tap your creature to fuel it.";
    $("origin-panel").classList.toggle("completed-panel", cellular);
  }

  function renderLifeCycleDashboard(state) {
    const dashboard = $("life-cycle-dashboard");
    if (!dashboard) return;
    const target = state.lifeTargetId ? LIFE_TARGETS_BY_ID[state.lifeTargetId] : null;
    const draft = target ? [] : state.lifeTargetChoices();
    const progressBucket = target ? Math.floor(state.lifeStageProgress / Math.max(1, state.lifeStageCost) * 100) : 0;
    const key = [
      state.atoms > 0, state.molecules > 0, state.organics > 0, state.cells > 0,
      state.lifeTargetId, state.lifeStageIndex, progressBucket,
      draft.map(item => item.id).join(","), [...state.lifeCollection].sort().join(",")
    ].join("|");
    if (renderCache.lifeCycleDashboard === key) return;
    renderCache.lifeCycleDashboard = key;

    const origins = [
      ["Atom", state.atoms > 0 || state.molecules > 0 || state.organics > 0 || state.cells > 0],
      ["Molecule", state.molecules > 0 || state.organics > 0 || state.cells > 0],
      ["Compound", state.organics > 0 || state.cells > 0],
      ["Cell", state.cells > 0]
    ];
    const originHtml = origins.map(([label, reached], index) =>
      `<div class="origin-step ${reached ? "reached" : ""}"><span>${index + 1}</span><strong>${label}</strong></div>`
    ).join("");

    let attemptHtml;
    if (target) {
      const percent = Math.min(100, state.lifeStageProgress / Math.max(1, state.lifeStageCost) * 100);
      const stages = target.stages.map((stage, index) => {
        const status = index < state.lifeStageIndex ? "complete" : index === state.lifeStageIndex ? "active" : "";
        return `<div class="life-stage-node ${status}"><span>${index + 1}</span><strong>${stage}</strong></div>`;
      }).join("");
      attemptHtml = `<div class="attempt-heading"><div><p class="eyebrow">CURRENT ATTEMPT</p><h2>${target.name}</h2><span class="life-rarity rarity-${target.rarity.toLowerCase()}">${target.rarity}</span></div><strong>${state.lifeStageIndex + 1} / ${target.stages.length}</strong></div>
        <div class="life-stage-track">${stages}</div>
        <div class="attempt-progress"><div style="width:${percent}%"></div></div>
        <p>${target.description} Current stage: <strong>${target.stages[state.lifeStageIndex]}</strong>.</p>`;
    } else if (draft.length === 2) {
      attemptHtml = `<p class="eyebrow">NEXT BRANCH</p><h2>Choose Your Adult Target</h2><p>Two routes are ready: <strong>${draft[0].name}</strong> or <strong>${draft[1].name}</strong>. Close this screen to make the choice.</p>`;
    } else {
      attemptHtml = `<p class="eyebrow">ORIGIN CHAIN</p><h2>Building The First Cell</h2><p>Atoms combine into molecules, compounds, and finally a living cell. Two adult targets appear when the Cell is ready.</p>`;
    }

    const worldsHtml = Object.entries(LIFE_WORLD_LABELS).map(([biome, label]) => {
      const members = LIFE_TARGETS.filter(item => item.biome === biome);
      const collected = members.filter(item => state.lifeCollection.has(item.id)).length;
      const active = target?.biome === biome;
      const animals = members.map(item => `<span class="${state.lifeCollection.has(item.id) ? "collected" : ""}">${item.name}</span>`).join("");
      return `<article class="life-world-card ${active ? "active" : ""}"><header><strong>${label}</strong><small>${collected} / ${members.length}</small></header><div>${animals}</div></article>`;
    }).join("");

    dashboard.innerHTML = `<div class="life-cycle-shell">
      <header class="life-cycle-header"><div><p class="eyebrow">COLLECTIBLE EVOLUTION</p><h1>Life Cycle</h1></div><div><strong>${state.lifeCollection.size} / ${LIFE_TARGETS.length}</strong><span>adults collected</span></div></header>
      <section class="origin-route">${originHtml}</section>
      <section class="current-attempt-card">${attemptHtml}</section>
      <section class="world-branches"><div class="section-heading"><div><p class="eyebrow">TWELVE WORLDS</p><h2>Habitat Branches</h2></div><span>Each attempt drafts two animals</span></div><div class="life-world-grid">${worldsHtml}</div></section>
    </div>`;
  }

  function renderEvolutionProgress(state) {
    const progress = evolutionProgress(state);
    $("checkpoint-label").textContent = progress.stageLabel || (progress.ready ? "Choose a collectible" : progress.checkpoint > 0 ? `Charging at ${format(state.evolutionRate)}/sec` : "Next route");
    $("checkpoint-value").textContent = progress.checkpoint > 0
      ? `${format(progress.current)} / ${format(progress.checkpoint)} Evolution Energy · ${progress.ready ? "Ready" : formatEta(progress.eta)}`
      : evolutionGuidance(state);
    $("checkpoint-fill").style.width = `${progress.percent}%`;
    $("evolution-checkpoint").classList.toggle("ready", progress.ready);
  }

  function renderEvolution(state) {
    $("evolution-panel").classList.toggle("locked-panel", state.cells < 1);
    if (evolutionInteractionActive) {
      pendingEvolutionRender = true;
      return;
    }
    pendingEvolutionRender = false;
    renderEvolutionInspector(state);
    updateEvolutionInspectorLive(state);
  }

  function renderLineageDialog(state) {
    const dialog = $("lineage-dialog");
    const choices = state.lifeTargetChoices();
    const ready = choices.length === 2;
    const anotherModal = [...document.querySelectorAll("dialog[open]")].some(item => item !== dialog);
    // The Codex is a fullscreen overlay, not a <dialog>, so it isn't caught by
    // anotherModal — guard it explicitly so the choose-collectible prompt never
    // pops over the Codex. It re-appears once the player leaves the Codex.
    const codexOpen = !$("codex-screen").hidden;
    const celebrating = performance.now() < suppressLineageUntil;
    if (!ready || state.pendingChoice || state.worldEnded || anotherModal || codexOpen || celebrating) {
      if (dialog.open) dialog.close();
      if (!ready) renderCache.lineage = "";
      return;
    }

    const lineageKey = choices.map(choice => choice.id).join("~");
    if (dialog.open && renderCache.lineage === lineageKey) return;
    renderCache.lineage = lineageKey;

    $("lineage-copy").textContent = "Choose the adult life form you want to collect. You will then grow it through five stages.";
    const container = $("lineage-options");
    container.replaceChildren(...choices.map(choice => {
      const button = document.createElement("button");
      const collected = state.lifeCollection.has(choice.id);
      button.type = "button";
      button.className = "lineage-option";
      button.innerHTML = `<span class="lineage-glyph">${choice.glyph}</span><strong>${choice.name}</strong><span class="lineage-rarity rarity-${(choice.rarity || "Common").toLowerCase()}">${choice.rarity || "Common"}</span><small>${choice.stages.join(" → ")}</small><span class="lineage-cost">Choose ${choice.name}</span><span class="lineage-tag">${collected ? "ALREADY COLLECTED" : "NEW COLLECTIBLE"}</span>`;
      button.addEventListener("click", () => {
        dialog.close();
        if (state.chooseLifeTarget(choice.id)) {
          audio?.unlock?.();
          haptic("heavy");
          renderCache.evolution = "";
        } else {
          audio?.denied?.();
          render(state);
        }
      });
      return button;
    }));
    if (!dialog.open) dialog.showModal();
  }

  function ownedSpecies(state) {
    return SPECIES.filter(species => state.runReached.has(species.id));
  }

  function selectOwnedSpecies(direction) {
    const owned = ownedSpecies(game);
    if (owned.length === 0) return false;
    let index = owned.findIndex(species => species.id === selectedTreeSpeciesId);
    if (index < 0) index = Math.max(0, owned.findIndex(species => species.id === game.activeLineageId));
    selectedTreeSpeciesId = owned[(index + direction + owned.length) % owned.length].id;
    evolutionMap.select(selectedTreeSpeciesId, { center: true });
    renderCache.evolution = "";
    render(game);
    return true;
  }

  // Commit touch actions on pointerup before a WebView's delayed click. The
  // inspector itself stays mounted; only live labels and disabled states move.
  function wireEvolutionAction(button, action, successSound, { structural = false } = {}) {
    let handledPointer = false;
    const run = () => {
      const succeeded = action();
      audio?.[succeeded ? successSound : "denied"]?.();
      if (succeeded) {
        haptic("light");
        if (structural) {
          renderCache.evolution = "";
          requestAnimationFrame(() => render(game));
        } else updateEvolutionInspectorLive(game);
      }
    };
    button.addEventListener("pointerup", event => {
      if (event.pointerType === "mouse" || button.disabled) return;
      handledPointer = true;
      event.preventDefault();
      run();
      setTimeout(() => { handledPointer = false; }, 400);
    });
    button.addEventListener("click", event => {
      if (handledPointer) {
        event.preventDefault();
        return;
      }
      run();
    });
  }

  function renderEvolutionInspector(state) {
    const container = $("species-actions");
    const choices = state.cells > 0 ? state.evolutionChoices() : [];
    if (!selectedTreeSpeciesId) selectedTreeSpeciesId = state.activeLineageId || choices[0]?.definition.id || null;
    const definition = SPECIES_BY_ID[selectedTreeSpeciesId];
    const status = definition ? state.speciesStatus(definition.id) : null;
    const reached = Boolean(definition && state.runReached.has(definition.id));
    const living = Boolean(definition && state.isSpeciesLiving(definition.id));
    const active = living && state.activeLineageId === definition.id;
    const title = definition?.name || (state.cells > 0 ? "Cellular Life" : "Origins assembling");
    const glyph = definition?.glyph || (state.cells > 0 ? "CE" : "...");
    const group = definition ? `${definition.group} / ${definition.rarity}` : "ORIGIN / CELLULAR";
    const copy = state.cells < 1
      ? "Automatic chemistry is building the first viable cells."
      : definition
        ? definition.fact
        : "The first stable cells are waiting at the root of the tree of life.";
    const statusLabel = active ? "Active species" : living ? "Living species" : reached ? "Locally extinct" : status?.state === "available" ? "Ready to purchase" : status?.state === "revealed" ? "Route revealed" : "Undiscovered route";
    const owned = ownedSpecies(state);
    const ownedIndex = owned.findIndex(species => species.id === selectedTreeSpeciesId);
    const browser = owned.length > 0
      ? `<div class="species-browser"><button type="button" data-species-nav="-1" aria-label="Previous owned species">&#8249;</button><span>Owned ${ownedIndex >= 0 ? ownedIndex + 1 : "-"} / ${owned.length}</span><button type="button" data-species-nav="1" aria-label="Next owned species">&#8250;</button></div>`
      : "";
    container.innerHTML = browser + `<p class="eyebrow">SELECTED SPECIES</p>`
      + `<div class="evolution-inspector-title"><span class="species-mark">${glyph}</span><div><small>${group}</small><h2>${title}</h2></div></div>`
      + `<p id="evolution-copy" class="muted">${copy}</p>`
      + `<span class="evolution-status ${active || living ? "reached" : reached ? "extinct" : status?.state || "silhouette"}">${statusLabel}</span>`
      + '<div class="evolution-choice-list"></div>';

    const list = container.querySelector(".evolution-choice-list");
    if (state.cells < 1) {
      list.innerHTML = '<p class="evolution-fact">Atoms, molecules, and organics convert automatically as Energy arrives.</p>';
      return;
    }
    if (!definition || !status) {
      list.innerHTML = '<p class="evolution-fact">Select a species node to inspect its population, price, and route.</p>';
      return;
    }

    if (reached) {
      const population = state.populations.get(definition.id) || 0;
      const growthCost = state.populationGrowthCost(definition.id);
      const mastery = state.mastery.get(definition.id) || 0;
      list.innerHTML = `<div class="species-management"><div><span>Population</span><strong class="species-population-value">${population > 0 ? format(population) : "Extinct"}</strong></div><div><span class="species-cost-label">${living ? "Growth cost" : "Reintroduction"}</span><strong class="species-growth-cost">${format(growthCost)} Energy</strong></div><div><span>Mastery</span><strong>${mastery} / 3</strong></div></div>`
        + `<p class="evolution-fact">${living ? "Swipe between owned species, then grow or balance the selected population." : "This lineage was discovered but no longer has a living population in this world."}</p>`
        + '<div class="evolution-actions"></div>';
      const actions = list.querySelector(".evolution-actions");
      const button = document.createElement("button");
      button.type = "button";
      button.className = active ? "primary evolution-action" : "evolution-action";
      button.dataset.evolutionMain = "";
      if (!living) {
        wireEvolutionAction(button, () => state.introduceSpecies(definition.id), "unlock", { structural: true });
      } else if (active) {
        wireEvolutionAction(button, () => state.growPopulation(definition.id), "grow");
      } else {
        wireEvolutionAction(button, () => state.setActiveSpecies(definition.id), "click", { structural: true });
      }
      actions.append(button);
      if (living) {
        const balance = document.createElement("button");
        balance.type = "button";
        balance.className = "evolution-action balance-action";
        balance.dataset.evolutionBalance = "";
        wireEvolutionAction(balance, () => state.balancePopulation(definition.id), "grow");
        actions.append(balance);
      }
      return;
    }

    const reasons = status.reasons.filter(reason => !reason.startsWith("Charge "));
    const evolutionCost = state.speciesEvolutionCost(definition.id);
    const remaining = Math.max(0, evolutionCost - state.evolutionEnergy);
    list.innerHTML = `<div class="species-price"><span>Evolution price</span><strong>${evolutionCost} Evolution Energy</strong></div>`
      + (reasons.length ? `<ul class="evolution-requirements">${reasons.slice(0, 4).map(reason => `<li>${reason}</li>`).join("")}</ul>` : `<p class="evolution-fact evolution-charge-copy">${remaining > 0 ? `${format(remaining)} more Evolution Energy · about ${formatEta(remaining / state.evolutionRate)}` : definition.clue}</p>`);
    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = status.state === "available" ? "primary evolution-action" : "evolution-action";
    buy.innerHTML = `Purchase ${definition.name}<span>${evolutionCost} Evolution Energy${state.known.has(definition.id) ? " · Mastery discount" : ""}</span>`;
    buy.disabled = status.state !== "available" || state.worldEnded;
    buy.dataset.evolutionPurchase = "";
    wireEvolutionAction(buy, () => state.discoverSpecies(definition.id), "unlock", { structural: true });
    list.append(buy);
  }

  function updateEvolutionInspectorLive(state) {
    const definition = SPECIES_BY_ID[selectedTreeSpeciesId];
    if (!definition) return;
    const reached = state.runReached.has(definition.id);
    const living = state.isSpeciesLiving(definition.id);
    if (reached) {
      const population = state.populations.get(definition.id) || 0;
      const growthCost = state.populationGrowthCost(definition.id);
      const populationEl = document.querySelector("#species-actions .species-population-value");
      const costEl = document.querySelector("#species-actions .species-growth-cost");
      const costLabel = document.querySelector("#species-actions .species-cost-label");
      if (populationEl) populationEl.textContent = population > 0 ? format(population) : "Extinct";
      if (costEl) costEl.textContent = `${format(growthCost)} Energy`;
      if (costLabel) costLabel.textContent = living ? "Growth cost" : "Reintroduction";
      const main = document.querySelector("#species-actions [data-evolution-main]");
      if (main) {
        if (!living) {
          const introduce = state.interventionStatus("introduce");
          main.innerHTML = `Revive ${definition.name}<span>${format(growthCost)} Energy · Population 3</span>`;
          main.disabled = state.worldEnded || state.awaitingCataclysm || state.energy < growthCost || !introduce?.ready;
        } else if (state.activeLineageId === definition.id) {
          main.innerHTML = `Grow ${definition.name}<span>${format(growthCost)} Energy</span>`;
          main.disabled = state.energy < growthCost || state.worldEnded || state.awaitingCataclysm;
        } else {
          main.innerHTML = `Become ${definition.name}<span>Population ${format(population)}</span>`;
          main.disabled = state.worldEnded || state.awaitingCataclysm;
        }
      }
      const balance = document.querySelector("#species-actions [data-evolution-balance]");
      if (balance) {
        const balanceCost = state.populationBalanceCost(definition.id);
        const target = state.populationBalanceTarget(definition.id);
        balance.innerHTML = `Balance ${definition.name}<span>${format(balanceCost)} Energy · target ${format(target)}</span>`;
        balance.disabled = state.worldEnded || state.awaitingCataclysm || state.energy < balanceCost || Math.abs(population - target) < 0.15;
      }
      return;
    }

    const status = state.speciesStatus(definition.id);
    const remaining = Math.max(0, state.speciesEvolutionCost(definition.id) - state.evolutionEnergy);
    const chargeCopy = document.querySelector("#species-actions .evolution-charge-copy");
    if (chargeCopy) chargeCopy.textContent = remaining > 0
      ? `${format(remaining)} more Evolution Energy - about ${formatEta(remaining / state.evolutionRate)}`
      : definition.clue;
    const purchase = document.querySelector("#species-actions [data-evolution-purchase]");
    if (purchase) {
      purchase.disabled = status.state !== "available" || state.worldEnded || state.awaitingCataclysm;
      purchase.classList.toggle("primary", status.state === "available");
    }
  }

  function renderEvents(state) {
    $("event-count").textContent = `${state.totalChoiceEvents} choices made`;
    const log = $("event-log");
    if (state.eventLog.length === 0) {
      log.innerHTML = '<p class="empty-copy">Life has not started making questionable decisions yet.</p>';
      return;
    }
    log.replaceChildren(...state.eventLog.slice(0, 8).map(event => {
      const item = document.createElement("article");
      item.className = `event-item ${event.type}`;
      item.innerHTML = `<span>${event.type}</span><p>${event.text}</p>`;
      return item;
    }));
  }

  function renderExtinction(state) {
    $("extinction-panel").classList.toggle("locked-panel", state.runReached.size === 0);
    $("extinction-panel").classList.toggle("crisis", state.pressure >= 90 && !state.worldEnded);
    $("extinction-name").textContent = state.visibleExtinctionName;
    $("pressure-value").textContent = `${Math.floor(state.pressure)}%`;
    $("threat-stage").textContent = state.threatStage;
    $("pressure-fill").style.width = `${state.pressure}%`;
    $("extinction-copy").textContent = extinctionCopy(state);
    $("face-extinction").disabled = !state.awaitingCataclysm || state.worldEnded;
    $("vent-pressure").hidden = state.runReached.size === 0 || state.worldEnded || state.awaitingCataclysm;
    $("vent-pressure").disabled = state.mutationPoints < 2 || state.pressure < 10;

    const preparations = $("preparation-actions");
    const preparationKey = `${state.pressure >= 70}|${state.selectedPreparation}|${state.adaptation >= 50}|${state.worldEnded}|${state.extinction.id}`;
    if (renderCache.preparations === preparationKey) return;
    renderCache.preparations = preparationKey;
    preparations.replaceChildren();
    if (state.pressure >= 70 && !state.worldEnded) {
      for (const preparation of state.extinction.preparation) {
        const button = document.createElement("button");
        button.type = "button";
        const detail = state.extinction.preparationDetails?.[preparation];
        button.innerHTML = `<strong>${preparation}</strong>${detail?.description ? `<span>${detail.description}</span>` : ""}<small>50 Adaptation</small>`;
        button.disabled = Boolean(state.selectedPreparation) || state.adaptation < 50;
        button.classList.toggle("selected", state.selectedPreparation === preparation);
        button.addEventListener("click", () => {
          if (state.selectPreparation(preparation)) audio?.unlock?.();
        });
        preparations.append(button);
      }
    }
  }

  function renderMeta(state) {
    const cellular = ORIGIN_ANCHORS.find(item => item.id === "cellular");
    const unlocked = state.unlockedOrigins.has("cellular");
    $("unlock-cellular").disabled = unlocked || state.evolutionMemory < cellular.memoryCost;
    $("unlock-cellular").textContent = unlocked ? "Cellular Origin Unlocked" : "Unlock Cellular Origin";
    $("origin-checkpoint-copy").textContent = unlocked
      ? `Future worlds may begin at Cell. Next world origin: ${state.activeOrigin === "cellular" ? "Cellular" : "Atomic"}.`
      : `${format(state.evolutionMemory)} / ${cellular.memoryCost} Memory. Extinction rewards unlock the checkpoint.`;
    $("lab-memory-total").textContent = format(state.evolutionMemory);
    $("lab-dna-total").textContent = format(state.dna);
    $("lab-mutation-total").textContent = format(state.mutationPoints);
  }

  function renderGenome(state) {
    const genomeKey = `${state.genome.production}|${state.genome.adaptation}|${state.genome.survival}|${Math.floor(state.dna)}`;
    if (renderCache.genome === genomeKey) return;
    renderCache.genome = genomeKey;
    for (const containerId of ["genome-shop", "extinction-genome"]) {
      const container = $(containerId);
      container.replaceChildren();
      for (const [type, upgrade] of Object.entries(GENOME_UPGRADES)) {
        const level = state.genome[type] || 0;
        const maxed = level >= upgrade.maxLevel;
        const cost = genomeUpgradeCost(level);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "genome-button";
        button.disabled = maxed || state.dna < cost;
        button.innerHTML = `<strong>${upgrade.name} <em>Lv ${level}/${upgrade.maxLevel}</em></strong><span>${upgrade.description}</span><small>${maxed ? "Fully sequenced" : `${cost} DNA`}</small>`;
        button.addEventListener("click", () => {
          if (state.buyGenomeUpgrade(type)) audio?.unlock?.();
        });
        container.append(button);
      }
    }
  }

  function renderMemoryUpgrades(state) {
    const container = $("memory-shop");
    if (!container) return;
    const key = `${Object.values(state.memoryUpgrades).join("|")}|${Math.floor(state.evolutionMemory)}`;
    if (renderCache.memoryUpgrades === key) return;
    renderCache.memoryUpgrades = key;
    container.replaceChildren();
    for (const [type, upgrade] of Object.entries(MEMORY_UPGRADES)) {
      const level = state.memoryUpgrades[type] || 0;
      const maxed = level >= upgrade.maxLevel;
      const cost = memoryUpgradeCost(type, level);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "genome-button";
      button.disabled = maxed || state.evolutionMemory < cost;
      button.innerHTML = `<strong>${upgrade.name} <em>Lv ${level}/${upgrade.maxLevel}</em></strong><span>${upgrade.description}</span><small>${maxed ? "Fully remembered" : `${cost} Memory`}</small>`;
      button.addEventListener("click", () => {
        if (state.buyMemoryUpgrade(type)) audio?.unlock?.();
      });
      container.append(button);
    }
  }

  function renderMutationUpgrades(state) {
    const container = $("mutation-shop");
    if (!container) return;
    const key = `${Object.values(state.mutationGenome).join("|")}|${Math.floor(state.mutationPoints)}`;
    if (renderCache.mutationUpgrades === key) return;
    renderCache.mutationUpgrades = key;
    container.replaceChildren();
    for (const [type, upgrade] of Object.entries(MUTATION_UPGRADES)) {
      const level = state.mutationGenome[type] || 0;
      const maxed = level >= upgrade.maxLevel;
      const cost = mutationUpgradeCost(type, level);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "genome-button";
      button.disabled = maxed || state.mutationPoints < cost;
      button.innerHTML = `<strong>${upgrade.name} <em>Lv ${level}/${upgrade.maxLevel}</em></strong><span>${upgrade.description}</span><small>${maxed ? "Mutation stabilized" : `${cost} Mutation Points`}</small>`;
      button.addEventListener("click", () => {
        if (state.buyMutationUpgrade(type)) audio?.unlock?.();
      });
      container.append(button);
    }
  }

  function renderWorldMilestones(state) {
    const container = $("world-milestones");
    if (!container) return;
    const key = String(state.worldNumber);
    if (renderCache.worldMilestones === key) return;
    renderCache.worldMilestones = key;
    container.replaceChildren(...WORLD_MILESTONES.map(milestone => {
      const reached = state.worldNumber >= milestone.world;
      const item = document.createElement("article");
      item.className = `milestone-card ${reached ? "reached" : "locked"}`;
      item.innerHTML = `<span>WORLD ${milestone.world}</span><strong>${milestone.name}</strong><small>${milestone.description}</small>`;
      return item;
    }));
  }

  function renderAtlas(state) {
    renderAtlasTabs(state);
    const progress = state.albumProgress(activeAlbum);
    const album = ALBUMS.find(item => item.id === activeAlbum);
    $("album-progress").textContent = `${progress.known} / ${progress.total}`;
    $("album-description").textContent = album.description;

    const query = $("atlas-search").value.trim().toLowerCase();
    const filter = $("atlas-state-filter").value;
    const entries = progress.members.filter(entry => {
      const atlasState = state.atlasState(entry.id);
      const knownName = state.known.has(entry.id) ? entry.name.toLowerCase() : "";
      if (query && !knownName.includes(query)) return false;
      if (filter === "discovered" && atlasState !== "discovered") return false;
      if (filter === "missing" && atlasState === "discovered") return false;
      if (filter === "reachable" && state.speciesStatus(entry.id).state !== "available") return false;
      if (filter === "survivor" && !state.survivorStamps.has(entry.id)) return false;
      if (filter === "fossil" && !state.fossilCollection.has(entry.id)) return false;
      return true;
    });

    const grid = $("encyclopedia-grid");
    grid.replaceChildren();
    for (const entry of entries) {
      const atlasState = state.atlasState(entry.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `entry-slot ${atlasState}${state.speciesStatus(entry.id).state === "available" ? " reachable" : ""}`;
      const known = state.known.has(entry.id);
      button.setAttribute("aria-label", known ? entry.name : `Unknown ${entry.group} species`);
      button.innerHTML = `<span class="slot-number">${String(SPECIES.indexOf(entry) + 1).padStart(3, "0")}</span><span class="glyph">${known ? entry.glyph : "?"}</span><span class="slot-name">${known ? entry.name : atlasState === "revealed" ? "Clue available" : "Unknown"}</span>${state.survivorStamps.has(entry.id) ? '<span class="survivor-stamp">S</span>' : ""}${state.fossilCollection.has(entry.id) ? '<span class="fossil-stamp">F</span>' : ""}`;
      button.addEventListener("click", () => showEntry(entry.id));
      grid.append(button);
    }
  }

  function renderLifeCollection(state) {
    const key = [...state.lifeCollection].sort().join(",");
    if (renderCache.lifeCollection === key) return;
    renderCache.lifeCollection = key;
    $("life-collection-grid").replaceChildren(...LIFE_TARGETS.map(target => {
      const collected = state.lifeCollection.has(target.id);
      const card = document.createElement("article");
      card.className = `life-collection-card rarity-${(target.rarity || "Common").toLowerCase()} ${collected ? "collected" : ""}`;
      card.innerHTML = `<span>${collected ? target.glyph : "?"}</span><strong>${collected ? target.name : "Not collected"}</strong><em class="life-rarity">${target.rarity || "Common"}</em>`;
      return card;
    }));
  }

  function renderAtlasTabs(state) {
    const tabs = $("atlas-tabs");
    tabs.replaceChildren();
    for (const album of ALBUMS) {
      const progress = state.albumProgress(album.id);
      if (album.id === "survivors" && progress.total === 0) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", activeAlbum === album.id);
      button.innerHTML = `${album.name}<small>${progress.known}/${progress.total}</small>`;
      button.addEventListener("click", () => {
        activeAlbum = album.id;
        renderCache.atlas = "";
        renderAtlas(state);
      });
      tabs.append(button);
    }
  }

  function showNextDiscovery() {
    const dialog = $("discovery-dialog");
    // Don't interrupt the Codex, the boot intro, or the extinction summary.
    if (dialog.open || discoveryQueue.length === 0 || $("extinction-dialog").open) return;
    if (!$("codex-screen").hidden || !$("boot-overlay").hidden) return;
    const discovery = discoveryQueue.shift();
    const isSpecies = discovery.kind === "species";
    $("discovery-kicker").textContent = isSpecies ? "NEW SPECIES DISCOVERED" : "ORIGIN DISCOVERED";
    $("discovery-glyph").textContent = discovery.definition.glyph;
    $("discovery-name").textContent = discovery.definition.name;
    $("discovery-meta").textContent = `${discovery.definition.rarity} / ${discovery.definition.group}`;
    $("discovery-fact").textContent = discovery.definition.fact;
    $("dialog-progress-label").textContent = isSpecies ? "Legacy Species Record" : "Origin Milestone";
    $("dialog-total").textContent = isSpecies ? `${discovery.total} / ${discovery.maximum}` : "Cell established";
    $("new-clue").textContent = isSpecies ? `New clue: ${discovery.nextClue}` : "Cellular life is ready. Two collectible life forms will appear next.";
    const glyph = $("discovery-glyph");
    glyph.classList.remove("pop");
    void glyph.offsetWidth;
    glyph.classList.add("pop");
    dialog.classList.toggle("mythic", discovery.definition.rarity === "Mythic");
    dialog.showModal();
    startDiscoveryTimer(dialog);
  }

  function startDiscoveryTimer(dialog) {
    clearDiscoveryTimer();
    const button = $("close-discovery");
    const deadline = Date.now() + 5000;
    const updateLabel = () => {
      const seconds = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      button.textContent = `Continue (${seconds}s)`;
    };
    updateLabel();
    discoveryCountdownTimer = setInterval(updateLabel, 250);
    discoveryTimer = setTimeout(() => {
      clearDiscoveryTimer();
      if (dialog.open) dialog.close();
    }, 5000);
  }

  function clearDiscoveryTimer() {
    if (discoveryTimer) clearTimeout(discoveryTimer);
    if (discoveryCountdownTimer) clearInterval(discoveryCountdownTimer);
    discoveryTimer = null;
    discoveryCountdownTimer = null;
    $("close-discovery").textContent = "Continue";
  }

  function showEntry(id) {
    const definition = SPECIES_BY_ID[id];
    const atlasState = game.atlasState(id);
    const known = game.known.has(id);
    $("entry-number").textContent = `SPECIES ${String(SPECIES.indexOf(definition) + 1).padStart(3, "0")}`;
    $("entry-glyph").textContent = known ? definition.glyph : "?";
    $("entry-name").textContent = known ? definition.name : "Unknown Species";
    $("entry-status").textContent = known ? `${definition.rarity} / ${definition.group}${game.fossilCollection.has(id) ? " / FOSSIL COLLECTED" : ""}` : atlasState === "revealed" ? "CLUE AVAILABLE" : "UNDISCOVERED";
    $("entry-description").textContent = game.entryClue(id);
    $("entry-albums").replaceChildren(...definition.albums.map(album => chip(ALBUMS.find(item => item.id === album)?.name || album, "album")));
    const status = game.speciesStatus(id);
    const mastery = game.mastery.get(id) || 0;
    $("entry-route").textContent = known
      ? `Known route: ${definition.requires.length ? definition.requires.map(parent => SPECIES_BY_ID[parent].name).join(" + ") : "Cellular life"}. Habitat: ${definition.biome}. Mastery: ${mastery}/3.`
      : status.reasons.length ? `Current lead: ${status.reasons.join(" / ")}` : definition.clue;
    const stamps = [...(game.survivorStamps.get(id) || [])];
    $("entry-stamps").replaceChildren(
      ...(game.fossilCollection.has(id) ? [chip("Fossil Collection", "stamp")] : []),
      ...stamps.map(stamp => chip(EXTINCTIONS.find(item => item.id === stamp)?.stamp || `${capitalize(stamp)} survivor`, "stamp"))
    );
    $("entry-dialog").showModal();
  }

  // Decisions appear as a bottom-sheet card over the living stage (not a modal),
  // so the creature and the rising risk bar stay visible while you choose.
  function showChoiceEvent(event) {
    if (!event) return;
    // Wait behind any modal summary or the fullscreen Codex; it re-shows when
    // that dialog closes (the Codex isn't a <dialog>, so it needs an explicit check).
    if ($("discovery-dialog").open || $("entry-dialog").open || $("extinction-dialog").open || $("lineage-dialog").open || !$("codex-screen").hidden) {
      queuedChoiceEvent = event;
      return;
    }
    queuedChoiceEvent = null;
    $("decision-title").textContent = event.title;
    $("decision-copy").textContent = event.text;
    const options = $("decision-options");
    options.replaceChildren();
    for (const option of event.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.optionId = option.id;
      button.innerHTML = `<strong>${option.label}</strong><span>${option.description}</span>`;
      button.disabled = !game.canResolveChoice(option);
      button.addEventListener("click", () => {
        if (game.resolveChoice(option.id)) {
          audio?.click?.();
          stage.tap();
          hideDecisionCard();
        } else audio?.denied?.();
      });
      options.append(button);
    }
    const card = $("decision-card");
    card.hidden = false;
    document.body.classList.add("deciding");
    requestAnimationFrame(() => card.classList.add("show"));
  }

  function hideDecisionCard() {
    const card = $("decision-card");
    card.classList.remove("show");
    document.body.classList.remove("deciding");
    // Keep it mounted briefly for the slide-out; a still-pending choice keeps it up.
    setTimeout(() => { if (!game.pendingChoice) card.hidden = true; }, 420);
  }

  function refreshDecisionAffordability(state) {
    if (!state.pendingChoice) {
      // The engine can clear a pending choice out from under the open card — a
      // disaster or growth completion ending the attempt mid-encounter. Reconcile
      // the DOM so a dead decision card never stays stranded over the stage.
      const card = $("decision-card");
      if (card.classList.contains("show")) hideDecisionCard();
      return;
    }
    for (const button of $("decision-options").querySelectorAll("[data-option-id]")) {
      const option = state.pendingChoice.options.find(item => item.id === button.dataset.optionId);
      button.disabled = !state.canResolveChoice(option);
    }
  }

  function queueChoiceEvent(event) {
    queuedChoiceEvent = event;
    showChoiceEvent(event);
  }

  function showExtinction(summary) {
    lastExtinctionSummary = summary;
    clearTransientDialogs();
    stage.playExtinction(summary.extinction.id);
    haptic("heavy");
    $("extinction-dialog-title").textContent = summary.extinction.name;
    $("run-discovery-count").textContent = summary.reached;
    $("new-discovery-count").textContent = summary.newDiscoveries;
    $("new-fossil-count").textContent = summary.newFossils || 0;
    $("survivor-count").textContent = summary.survivors.length;
    $("run-score").textContent = format(summary.score || 0);
    $("reward-list").replaceChildren(
      reward("Evolution Memory", summary.rewards.memory),
      reward("DNA Fragments", summary.rewards.dna),
      reward("Mutation Points", summary.rewards.mutation),
      reward("Discovery Knowledge", summary.rewards.knowledge)
    );

    const fossilSelect = $("fossil-species");
    fossilSelect.replaceChildren(new Option("No fossil selected", ""));
    for (const id of summary.survivors) fossilSelect.add(new Option(SPECIES_BY_ID[id].name, id));
    fossilSelect.value = summary.survivors.includes(game.fossilSpecies) ? game.fossilSpecies : "";
    renderCache.genome = "";
    renderGenome(game);
    renderOriginChoices();
    // Let the catastrophe play on the stage before the fossil-record summary.
    const delay = settings.reducedMotion ? 0 : 1500;
    setTimeout(() => {
      if (game.worldEnded && !$("extinction-dialog").open) $("extinction-dialog").showModal();
    }, delay);
  }

  function renderOriginChoices() {
    const container = $("origin-choice");
    container.replaceChildren();
    for (const anchor of ORIGIN_ANCHORS) {
      const unlocked = game.unlockedOrigins.has(anchor.id);
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = !unlocked;
      button.classList.toggle("selected", game.activeOrigin === anchor.id);
      button.innerHTML = `<strong>${anchor.name}</strong><span>${unlocked ? anchor.description : `Requires ${anchor.memoryCost} Memory`}</span>`;
      button.addEventListener("click", () => {
        game.setActiveOrigin(anchor.id);
        renderOriginChoices();
      });
      container.append(button);
    }
    if (lastExtinctionSummary?.cellularAvailable && !game.unlockedOrigins.has("cellular")) {
      const unlock = document.createElement("button");
      unlock.type = "button";
      unlock.className = "primary";
      unlock.textContent = "Unlock Cellular Origin for 12 Memory";
      unlock.addEventListener("click", () => {
        if (game.unlockOriginAnchor("cellular")) audio?.unlock?.();
        renderOriginChoices();
      });
      container.append(unlock);
    }
  }

  function clearTransientDialogs() {
    discoveryQueue.length = 0;
    queuedChoiceEvent = null;
    for (const id of ["discovery-dialog", "entry-dialog", "lineage-dialog"]) {
      const dialog = $(id);
      if (dialog.open) dialog.close();
    }
    const card = $("decision-card");
    card.classList.remove("show");
    document.body.classList.remove("deciding");
    card.hidden = true;
  }

  function extinctionCopy(state) {
    if (state.runReached.size === 0) return "Biological complexity will eventually destabilize the world.";
    if (state.pressure < 20) return "The ecosystem is stable. This is temporary, but pleasant.";
    if (state.pressure < 45) return "Background instability is rising. The cause remains unclear.";
    if (state.pressure < 70) return state.extinction.omens[Math.min(state.extinction.omens.length - 1, Math.floor((state.pressure - 45) / 9))];
    if (state.pressure < 90) return `${state.extinction.crisis} Spend 50 Adaptation to preserve more lineages.`;
    if (state.pressure < 100) return `${state.extinction.name} is now certain. The world will pause at the final decision.`;
    return "The catastrophe is ready. Choose when to close this fossil record.";
  }

  function scheduleSave() {
    if (saveTimer) return;
    const wait = Math.max(0, 3000 - (Date.now() - lastSavedAt));
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNow();
    }, wait);
  }

  function saveNow() {
    if (openLab && !snapshot) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game.exportSnapshot()));
      lastSavedAt = Date.now();
    } catch {
      // The prototype remains playable when storage is unavailable.
    }
  }
}

export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadCoachShown() {
  try {
    const raw = localStorage.getItem(COACH_KEY);
    return new Set(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveCoachShown(shown) {
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify([...shown]));
  } catch {
    // Coaching state is best-effort; play continues without it.
  }
}

function randomSeed() {
  if (crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] || 1;
  }
  return (Math.floor(Math.random() * 4294967295) >>> 0) || 1;
}

function chip(text, className) {
  const element = document.createElement("span");
  element.className = `chip ${className}`;
  element.textContent = text;
  return element;
}

function reward(label, amount) {
  const element = document.createElement("div");
  element.innerHTML = `<span>${label}</span><strong>+${amount}</strong>`;
  return element;
}

function format(value) {
  if (value >= 1_000_000) return value.toExponential(2);
  if (value >= 1000) return Math.floor(value).toLocaleString();
  if (value >= 100) return Math.floor(value).toString();
  return value.toFixed(value < 10 ? 1 : 0);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "ready now";
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.ceil(seconds % 3600 / 60)}m`;
}

function formatObjectiveProgress(objective) {
  const current = objective.unit === "seconds" ? Math.floor(objective.progress) : Math.floor(objective.progress);
  const suffix = objective.unit === "seconds" ? "s" : ` ${objective.unit}`;
  return `${current} / ${objective.target}${suffix}`;
}

function objectiveRewardLabel(resource) {
  return {
    energy: "Energy",
    adaptation: "Adaptation",
    discoveryKnowledge: "Knowledge"
  }[resource] || resource;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
