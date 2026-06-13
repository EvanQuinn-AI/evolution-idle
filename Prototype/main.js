import { SAVE_KEY, loadSnapshot, startGame } from "./app.js";
import { createAudio } from "./audio.js";
import { createMusic } from "./music.js";
import { applySettings, bootSequence, initSettingsDialog, loadSettings } from "./menu.js";

const params = new URLSearchParams(location.search);
if (params.get("fresh") === "1") localStorage.removeItem(SAVE_KEY);
const urlFast = params.get("fast") === "1";

const settings = loadSettings();
applySettings(settings);

const audio = createAudio(() => settings);
const music = createMusic(() => settings);
// Autoplay is gated behind a gesture — kick the soundtrack off on first interaction.
document.addEventListener("pointerdown", () => music.unlock(), { passive: true });
document.addEventListener("keydown", () => music.unlock());
let session = null;

const settingsDialog = initSettingsDialog({
  settings,
  onChange: () => { session?.onSettingsChanged(); music.update(); },
  onWipeSave: () => {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  },
  onExportSave: () => {
    const data = session ? JSON.stringify(session.game.exportSnapshot()) : localStorage.getItem(SAVE_KEY);
    if (!data) {
      alert("No save data exists yet.");
      return;
    }
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `evolution-idle-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },
  onImportSave: async file => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed.version !== "number") throw new Error("Unrecognized save format");
      localStorage.setItem(SAVE_KEY, text);
      location.reload();
    } catch {
      alert("That file is not a valid Evolution Idle save.");
    }
  }
});

document.getElementById("menu-settings").addEventListener("click", () => {
  audio.unlockContext();
  settingsDialog.open();
});

bootSequence({
  settings,
  hasSave: Boolean(loadSnapshot()),
  audio,
  onStart: launch => {
    if (session) return;
    session = startGame({
      fast: launch.mode === "admin" ? launch.fast : urlFast,
      seed: launch.mode === "admin" ? launch.seed : null,
      fresh: launch.mode === "admin" ? launch.fresh : false,
      admin: launch.mode === "admin",
      openCodex: launch.mode === "codex",
      openCodexTab: launch.codexTab || "atlas",
      openLab: launch.mode === "lab",
      settings,
      audio
    });
  }
});
