# Telugu Radio — PWA upgrade

This upgrade adds cross-platform install guidance, user-approved service-worker
updates, an offline fallback page, and network-first caching for the app shell.

## Files in this package

- `manifest.json` — replace the repository root manifest.
- `service-worker.js` — replace the repository root service worker.
- `pwa-manager.js` — add this new file to the repository root.
- `offline.html` — add this new file to the repository root.
- `INDEX-INTEGRATION.txt` — exact changes to make in the existing `index.html`
  and optional CSS additions.

Your existing `icons/icon-192.png` and `icons/icon-512.png` are reused.
Do not overwrite `archive.json`, `sync.py`, your existing search/player code,
or your existing `style.css`.

## Deployment

1. Download and extract this package.
2. In GitHub, open `harikrishnach27/telugu-radio`, branch `main`.
3. Upload/replace `manifest.json` and `service-worker.js`.
4. Add `pwa-manager.js` and `offline.html` at the repository root.
5. Apply `INDEX-INTEGRATION.txt` to the existing `index.html`; retain all
   current application logic and remove only the old PWA registration/install
   block as described.
6. Optionally append the CSS rules to `style.css`.
7. Commit the changes to `main`.
8. Wait for GitHub Pages deployment, then visit:
   https://harikrishnach27.github.io/telugu-radio/
9. Test in a private/incognito browser window and on a real iPhone/Android
   device. Confirm the site is served over HTTPS.

## Releasing future versions

Whenever you change app-shell files (HTML, CSS, JS, manifest or offline page),
change `APP_VERSION` at the top of `service-worker.js`, for example:

`const APP_VERSION = "2026-11-21-1";`

Commit and deploy. Existing users will see an “Update now” prompt when the new
worker has downloaded and installed. The app reloads after the user chooses
Update now. If they choose Later, the current version stays active until a
later visit/reload.

The page checks for updates at startup, when it becomes visible, and hourly
while open. Browser service-worker update checks are still subject to browser
scheduling and network availability.

## Offline behavior and limitations

- The app shell and most recently fetched archive JSON are cached.
- Previously loaded archive entries remain viewable offline.
- The audio streams/files are hosted by News on AIR or other external servers;
  they are not downloaded by this PWA and generally require internet access.
- The first visit must be online so the service worker can install and cache
  the app shell.
- iOS installation is manual: Safari Share → Add to Home Screen. iOS does not
  expose the Chromium `beforeinstallprompt` event.
- Installation availability differs by browser and OS. Chromium browsers have
  the broadest desktop install support; Firefox desktop may only create a
  shortcut.
- This is a web app, not a native App Store / Microsoft Store package.

## Important release note

The service worker intentionally does not force-activate an update. It waits
until the user clicks Update now, avoiding an unexpected reload while audio
is playing or a bulletin is being read.
