# CampusConnectICU — Running the App

## Architecture

The Android app is a **thin WebView shell**. It contains no app logic of its
own — `MainActivity.kt` loads the built React SPA out of the APK assets:

```kotlin
webView.loadUrl("file:///android_asset/web/index.html")
```

So there is one codebase (the SPA at the repo root) and two ways to run it.

```
CampusConnectICU/
├── src/                     # React 18 + TypeScript SPA (the actual app)
├── dist/                    # build output — NOT committed, produced by npm run build
├── app/                     # Android WebView wrapper
│   └── src/main/
│       ├── java/.../MainActivity.kt
│       └── assets/web/      # committed copy of the built SPA, copied from dist/
├── package.json
└── build.gradle.kts / app/build.gradle.kts
```

## Running the web app

```bash
npm install
npm run dev      # http://localhost:5173, bound to 0.0.0.0
npm run build    # -> dist/
npm run preview
```

Deployed to https://campusconnect.freebuff.app.

## Running on an Android emulator or device

**Order matters: build the SPA first, then run the app.** The `copyWebAssets`
Gradle task copies `dist/` into `app/src/main/assets/web/` on every
preBuild, so if `dist/` is missing the task is skipped and the app runs
whatever committed bundle happens to be in `assets/web/` — which may be stale.

```bash
npm install
npm run build
```

Then in Android Studio:

1. **Open the repository root** as the project (`File > Open`, pick the folder
   containing `settings.gradle.kts`). Do not open `app/` on its own and do not
   paste these files into a different project — the repo already *is* a valid
   Android Studio project.
2. Let Gradle sync. Android Studio supplies its own bundled JDK 21; if Gradle
   ever tries to download a toolchain and fails, set
   `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr`.
3. Select a device/emulator (API 24+) and press Run.

First build takes a few minutes. `local.properties` (which holds `sdk.dir`) is
gitignored, so a fresh clone will not have it — Android Studio normally
regenerates it on open; if it complains, create it with
`sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`.

## Verifying a build from the command line

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :app:assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk
```

## Things that will bite you

**The app ships unencrypted messages if crypto init fails.** `crypto.subtle`
and IndexedDB both need to work in the WebView. The SPA treats any crypto
error as "send plaintext" rather than surfacing it, so a failure is silent —
messages will still appear to send and receive normally, just unencrypted.
If you care about that, check the logcat output for
`Failed to initialize user crypto` before trusting a test conversation.

**The bundle is a snapshot.** Editing `src/` has no effect on the app until
you re-run `npm run build` and rebuild the APK. `npm run dev` on its own does
nothing for the Android app — there is no live-reload path into the WebView.

**`google-services (1).json` is inert.** The filename is a browser download
artifact and no Gradle plugin applies it, so Firebase is not wired into this
build. The filename would also have to be exactly `google-services.json` for
the plugin to pick it up.

**Crypto is hourly-scoped.** Conversation keys rotate every hour and the hour
is not stored with the message, so messages from a previous hour will not
decrypt.