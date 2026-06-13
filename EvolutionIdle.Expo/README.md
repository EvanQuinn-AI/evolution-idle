# Evolution Idle — Expo Go shell

Test Evolution Idle on your iPhone (or Android) through **Expo Go**. This is a thin
native shell: it loads the existing web game (`../Prototype`) in a full-screen
WebView and adds real device **haptics** (the web build only buzzes on Android
browsers; here taps and cataclysms use the native Taptic Engine on iOS).

## One-time setup

1. Install the **Expo Go** app from the App Store (iOS) or Play Store (Android).
2. In this folder, install dependencies:

   ```powershell
   cd EvolutionIdle.Expo
   npm install
   ```

   If `npm install` complains about versions, let Expo align them:

   ```powershell
   npx expo install
   ```

## Run it (two terminals, same computer)

Your phone and computer must be on the **same Wi-Fi network**.

**Terminal 1 — serve the game** (from the repo root):

```powershell
python -m http.server 4180 -d Prototype
```

**Terminal 2 — start Expo** (from this folder):

```powershell
cd EvolutionIdle.Expo
npx expo start
```

Then scan the QR code with the **Camera app (iOS)** or the **Expo Go app (Android)**.
The shell auto-detects your computer's LAN address from the Expo dev server and
points the WebView at `http://<your-computer-ip>:4180`, so there's nothing to
configure. Pull-to-retry is built in if the server isn't up yet.

## Troubleshooting

- **Blank / "Could not reach the game server."** Make sure Terminal 1 is running
  and your phone is on the same Wi-Fi. As a fallback, set `MANUAL_URL` near the top
  of `App.js` to `http://<your-computer-ip>:4180` (find the IP with `ipconfig`).
- **Firewall prompt** on first run — allow Python through the local network.
- **No haptics** — check the in-game Engine Settings ▸ "Haptic feedback" is on, and
  that your iPhone's system haptics are enabled.

## Notes

- This shell intentionally streams the live dev files, so any edit under
  `../Prototype` shows up on the phone after a reload — great for iterating.
- For a standalone build that runs **without** the laptop server (bundled offline),
  the game would be inlined into a single HTML asset and loaded via `require`. That
  packaging step isn't set up yet; ask if you want it.
