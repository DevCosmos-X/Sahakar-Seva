# Sahakar Seva — Web → React Native Migration Notes

This document records how the **Sahakar Seva** web app (Vite + React, at `e:\sahakar-seva-progress`)
was ported to a bare **React Native 0.87.1** Android app (this repo, `E:\Slopinator`), what was
preserved verbatim, what had to change, and the operational/security notes you need to build and
ship it.

The guiding rule of the port: **preserve all business logic exactly; redesign the UI as an
original modern Indian consumer app** (patterns borrowed from Urban Company / Zomato / Amazon /
Flipkart) on the app's own indigo-primary + amber-accent brand. It is deliberately **not** a
webview wrapper and **not** a visual clone of the website.

---

## 1. Stack & toolchain

| | Web app | RN app |
|---|---|---|
| Framework | React 18 + Vite | React 19.2.3 + React Native 0.87.1 (New Architecture ON) |
| Language | mixed JS/TS | **JS/JSX only** (TypeScript stripped — see §3) |
| Routing | react-router | React Navigation 7 (native-stack + bottom-tabs) |
| Env vars | `import.meta.env.VITE_*` | `react-native-config` (`Config.*`, build-time) |
| Storage | `localStorage` | `react-native-mmkv` (sync JSI) + AsyncStorage (Supabase session) |
| Icons | `lucide-react` | `lucide-react-native` (pinned 0.544.0 for React 19) |
| AI | Google Gemini (`@google/genai`) | **Groq** (OpenAI-compatible REST via `fetch`) — see §6 |
| Styling | CSS + CSS custom properties | RN `StyleSheet` + a ported theme object (`src/theme/`) |

Key pinned versions (see `package.json`): `react-native@0.87.1`, `react@19.2.3`,
`lucide-react-native@0.544.0`, `react-native-mmkv@3.3.3`, `@supabase/supabase-js@2.112.4`,
`react-native-config@1.7.2`.

---

## 2. Directory mapping (web `src/` → RN `src/`)

The RN `src/` mirrors the web `src/` 1:1 so ported files needed minimal import changes. Path
aliases in `babel.config.js` (`@components`, `@context`, `@data`, `@services`, `@utils`,
`@theme`, `@storage`, `@screens`, `@navigation`) match that structure.

| Web | RN | Notes |
|---|---|---|
| `src/index.css` (~90 CSS vars) | `src/theme/` (`colors`, `spacing`, `shadows`, `glass`, `typography`, `fonts`) | CSS custom properties → JS theme object |
| `src/context/*` | `src/context/` | `LanguageContext`, `AuthContext` ported near-verbatim (localStorage → MMKV) |
| `src/data/*`, forecast engine | `src/data/`, `src/utils/forecastEngine.js` | **unchanged business data/logic** |
| `src/services/supabase.js` | `src/services/supabase.js` | graceful missing-env (no throw at import) — see §5 |
| `src/services/geminiService.js` | `src/services/aiService.js` | same API surface, Groq backend — see §6 |
| `src/components/*` (UI) | `src/components/ui/` (10 primitives) + `src/components/app/` (app-shell) | redesigned |
| `src/components/AiChatWidget.jsx` | `src/components/app/ChatWidget.jsx` | global FAB + bottom-sheet |
| `src/pages/customer/*` | `src/screens/customer/*` | 5 screens |
| `src/pages/worker/*` | `src/screens/worker/*` | 5 screens + `workerData.js` |
| `src/pages/admin/*` | `src/screens/admin/*` | 3 screens (DemandForecast deferred, §7) |
| `*Layout.jsx` (web layouts) | `src/navigation/*` (RootNavigator + stacks/tabs) | render-gates → conditional navigator trees |

---

## 3. Deliberate compromises (flagged, not silent)

1. **TypeScript stripped.** The scaffold is JS/JSX to keep the toolchain simple and the port
   fast. Types from the web app were dropped; JSDoc is used where a function's contract matters
   (e.g. `aiService.js`).

2. **Gradients flattened to solid colors.** The web app used CSS `linear-gradient` liberally
   (brand headers, FAB, buttons). RN has no gradient primitive without a native dependency
   (`react-native-linear-gradient`). Rather than add a native lib for cosmetics, gradients are
   rendered as the nearest solid brand color. Consistent since Phase 4.

3. **Glassmorphism flattened to translucent fills.** The web `--glass-*` blur backdrops need
   `@react-native-community/blur` (native). Flattened to semi-opaque fills (`src/theme/glass.js`).

4. **Shadows are approximate.** CSS `box-shadow` supports stacked multi-layer shadows; Android
   elevation gives one falloff curve. `src/theme/shadows.js` documents this — it's a visual
   approximation, not a pixel match. Android-only app, so `elevation` is the primary signal.

5. **In-content headers instead of chrome title bars.** Worker/admin screens render their own
   `PortalHeader` and the customer screens a `LocationBar`, with the navigator's
   `headerShown:false`. This is the modern app-native pattern (Zomato/UC), not a browser-style
   title bar.

6. **Desktop-only affordances dropped on mobile.** e.g. the admin dashboard's desktop `<table>`
   of recent bookings became a mobile card list.

7. **Typography scale.** Web used `clamp()`/`vw` fluid sizing; RN uses a
   `PixelRatio`/`Dimensions`-based scale function (`src/theme/typography.js`).

8. **Markdown in AI replies renders literally.** Groq returns Markdown (`**bold**`, `### head`);
   the plain `Text` components show the raw characters. Cosmetic only — slated for the Phase 13
   polish pass (strip or render markdown).

---

## 4. Native configuration you must know about

### 4.1 `android/local.properties` — the space-in-username trap (CRITICAL)

The Windows dev machine's SDK lives under `C:\Users\Aniket Paul\AppData\Local\Android\Sdk`, and
the **space** in `Aniket Paul` breaks the native (C++) build:

- CMake's Ninja generator passes the compiler as an 8.3 short path, mangling `clang++.exe` →
  `CLANG_~1.EXE`.
- The NDK also passes `-no-canonical-prefixes`, so clang never resolves the short name back, can't
  see the `++`, and silently falls back to the **C** driver.
- In C mode it doesn't link `libc++`, so every `std::` / `__cxa_*` symbol is undefined at link
  time (`ld.lld: undefined symbol: operator new`, etc.).

**Fix:** `local.properties` points at a space-free directory **junction**:
```
sdk.dir=C\:\\AndroidSdk
```
where `C:\AndroidSdk` is a junction to the real SDK. If Android Studio ever rewrites this line
back to the AppData path, the native build starts failing again with libc++ linker errors.

### 4.2 New Architecture

New Architecture (Fabric/TurboModules) is **ON**. RN shadow props are honored by Fabric on
Android but behave like single-layer elevation (see §3.4).

### 4.3 Fonts

11 fonts bundled as Android assets and linked via `react-native.config.js`: **Inter** (UI),
**Noto Sans Devanagari** (Hindi), **Noto Sans Bengali** (Bengali). Referenced by family name in
`src/theme/fonts.js`.

### 4.4 When a Gradle rebuild is required vs. Metro reload

- **Plain new/edited JS/JSX file** → Fast Refresh, no rebuild.
- **`babel.config.js` change** → restart Metro (cache).
- **`.env` change** → **full Gradle rebuild** (`react-native-config` bakes env at build time; a
  Metro reload will NOT pick up a new key — see §5).
- **New native dependency** → Gradle rebuild.

---

## 5. Environment variables (`react-native-config`)

Env is read via `Config.FOO` (NOT `process.env` / `import.meta.env`). Copy `.env.example` → `.env`
(gitignored) and fill real values. **`.env` is read at native build time**, so changing it
requires a rebuild.

| Key | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | `src/services/supabase.js` | project URL |
| `SUPABASE_ANON_KEY` | `src/services/supabase.js` | public anon key (safe client-side by design) |
| `GROQ_API_KEY` | `src/services/aiService.js` | AI diagnosis + chat — see §6 |
| `GOOGLE_MAPS_API_KEY` | LiveTrackingMap + AndroidManifest | needed for Phase 10c maps |
| `GEMINI_API_KEY` | **legacy, unused** | kept as a placeholder for web parity only |

**Graceful missing-key pattern** (both `supabase.js` and `aiService.js` follow it): on web, a
missing key throws at module import; in RN that kills the JS bundle before any error boundary can
mount. So instead each module:
- reads the key, computes an `isConfigured` boolean that **also rejects the `.env` placeholder**
  (`YOUR_SUPABASE_ANON_KEY` / `YOUR_GROQ_API_KEY`),
- `console.warn`s once,
- and short-circuits every export with the module's normal shape (`{ data, error }` for supabase,
  `{ text, error }` for aiService) rather than throwing.

Result: the app runs with **zero** keys configured. Demo accounts
(`demo.customer@sahakar.in` / `demo.worker@sahakar.in`, password `demo123`) bypass Supabase
entirely; AI surfaces show a friendly "not configured" message; the admin worker list shows demo
workers plus an error banner. Real Supabase auth and the admin real-data list require the two
Supabase keys.

---

## 6. AI: Gemini → Groq (Phase 9)

### Why the switch
The web app used Google Gemini, whose free tier caps at roughly 20 requests/day — the specific
pain point that triggered this migration. **Groq's** free developer tier is far more generous
(~1K RPM on `gpt-oss-20b`) and keeps both vision (image diagnosis) and strong Hindi/Bengali
support.

### What was preserved
`src/services/aiService.js` exposes the **exact same API surface** as the web
`geminiService.js`, so call sites are unchanged:
- `chatWithSahakarAI(messages, userRole)` → `{ text, error }` (text is a bilingual fallback string
  on error, never null)
- `getServiceDiagnosis(description, language, imageBase64)` → `{ text, error }` (text null on error)
- `getMaintenanceAdvice(serviceType, lastServiceDate, language)` → `{ text, error }`

The multilingual `SAHAKAR_SYSTEM_PROMPT` was ported verbatim.

### What changed
- **Transport:** Groq is OpenAI-compatible, called with plain `fetch`
  (`POST https://api.groq.com/openai/v1/chat/completions`, Bearer auth). No SDK, no native dep.
- **Models** (Groq lineup as of 2026 — the old `llama-3.1/3.3` IDs were deprecated Jun 2026):
  - text (chat + maintenance): `openai/gpt-oss-20b`
  - vision (image diagnosis): `qwen/qwen3.6-27b` (base64 `image_url`, ≤5 images / 20 MB). This is
    a Groq *preview* model, so `getServiceDiagnosis` **auto-falls-back to text-only** on
    `gpt-oss-20b` if the vision model errors, rather than failing outright.
- **i18n bug fix:** the web `BookingPage.jsx` hardcoded the diagnosis language to the literal
  `'English'`. The RN `BookingScreen.jsx` now passes the user's actually-selected language
  (`en`/`hi`/`bn` → English/Hindi/Bengali) through to `getServiceDiagnosis`.
- **Chat widget:** the global `AiChatWidget` became `src/components/app/ChatWidget.jsx` — a FAB +
  bottom-sheet `Modal` (a fixed-position div doesn't translate to RN), mounted globally in
  `RootNavigator` for authenticated portals. Message shape, trilingual welcome, per-role quick
  prompts, unread badge, and typing indicator are preserved.

### ⚠️ Security recommendation (important)
`GROQ_API_KEY` — like any `react-native-config` value — is **embedded in the shipped APK and is
extractable** by anyone who unpacks it. This is the same exposure the web app had with
`VITE_GEMINI_API_KEY`. For production you should **not** ship the raw key. Recommended:

1. Move Groq calls behind a **Supabase Edge Function** proxy. The client calls your function; the
   function holds the Groq key server-side and forwards to Groq. The key never leaves the server.
2. Optionally add response caching and a provider fallback chain (Groq → OpenRouter → Cerebras) in
   that same function.
3. `aiService.js` is written so a direct-mode client and a proxied-mode client are a small change
   (swap the `GROQ_URL`/auth header for your function endpoint).

Until then, treat the shipped key as low-value/rotatable: use a **free-tier** key, and rotate it
(console.groq.com/keys) if it leaks. The Supabase **anon** key is designed to be public and is
fine to ship (row-level security enforces access server-side).

---

## 7. Deferred work (nothing silently dropped — each has an in-UI stub)

| Feature | Status | Where |
|---|---|---|
| Photo upload → vision diagnosis | Done (Phase 10a) | BookingScreen describe step, camera/gallery → `getServiceDiagnosis` vision path |
| Voice / speech-to-text | Done (Phase 10b) | mic in BookingScreen + ChatWidget via `useSpeechToText` — see §6.1 |
| LiveTrackingMap (Google Maps) | Phase 10c | stack screen placeholder; needs `GOOGLE_MAPS_API_KEY` |
| DemandForecast chart | Done (Phase 12) | `DemandForecastScreen.jsx` — react-native-svg chart + staffing + zone heatmap |
| Bill receipt | Done (Phase 13) | `utils/receipt.js` — formatted invoice shared via native Share sheet (confirmation/tracker/history) |
| Video call | Done (Phase 13) | tracker connecting→connected modal (demo; no real WebRTC) |
| Certificate upload (worker register) | Done (Phase 13) | RegisterScreen uses react-native-image-picker to pick a real cert file |
| Markdown rendering in AI replies | Done (Phase 10a) | `stripMarkdown()` in `aiService.js` normalizes model output to plain text |

### 6.1 Voice / speech-to-text — library choice (Phase 10b)

Voice STT uses **`react-native-speech-recognition-kit`** (a TurboModule) via the shared
`src/hooks/useSpeechToText.js`. This was NOT the first choice, and the reason matters for anyone
maintaining this:

- The standard `@react-native-voice/voice` is **deprecated** and, more importantly, is a
  legacy bridge-era native module. Under our **New Architecture (bridgeless)** setup its JS looks
  up `NativeModules.Voice`, which resolves to `null` at runtime (`Cannot read property
  'startSpeech' of null`) — it compiles and even shows in the autolinking PackageList, but the
  module is never surfaced to JS in bridgeless mode. It also needed a `build.gradle` rewrite just
  to compile on AGP 9 (dead `jcenter()`, no `namespace`, pre-AndroidX deps).
- `react-native-speech-recognition-kit` is a proper **TurboModule**, so it links correctly under
  New Arch, is on-device (Android `SpeechRecognizer` / iOS `SFSpeechRecognizer`), needs no cloud,
  and is bare-RN (no Expo). Verified working on a physical device (Samsung SM-E236B, Android 14):
  live transcription appends to the field; the mic turns red while listening.
- The hook exposes a stable `{ listening, available, error, partial, start, stop }` surface, so
  BookingScreen and ChatWidget are decoupled from the underlying library — swapping it again later
  is a one-file change.

Android setup (already in `AndroidManifest.xml`): `RECORD_AUDIO` permission + the Android-11+
`<queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries>`
block (without the queries block, availability detection returns false even when Google Speech
Services is present). **Note:** speech recognition does NOT work on the Android emulator (no
speech engine) — it must be tested on a physical device.

### 6.2 LiveTrackingMap — maps (Phase 10c)

`src/screens/customer/LiveTrackingMapScreen.jsx` uses **`react-native-maps@1.29.0`** with the
Google provider (`PROVIDER_GOOGLE`). Reached from the dashboard "Track" card, the booking tracker,
and the booking-confirmation screen via `navigation.navigate('LiveTrackingMap', { bookingId })`.

- **What's real vs mock:** the worker's *movement* is a scripted showcase — it travels a hardcoded
  9-waypoint route (`CUSTOMER_ROUTE`) via a 130ms-tick timed simulation with 35-step interpolation
  (ported from the web Leaflet mockup; there is no real GPS/worker backend). BUT the
  worker↔customer **distance and ETA are computed for real** every tick with the **haversine
  formula** between the worker's live interpolated coordinate and the customer's home coordinate —
  not the web's fake `2400m × (1 − progress)` countdown. If real GPS coordinates ever replace the
  scripted route, the distance/ETA logic works unchanged.
- The screen renders a worker marker + home marker + full-route polyline + traveled-route polyline,
  a live distance pill, camera modes (Route/Worker/Home via `animateCamera`/`fitToCoordinates`),
  play/pause + replay, OTP 4892, and the worker call/message/share card. Web used Leaflet + OSM
  (no key); RN uses react-native-maps.

**API key plumbing:** `GOOGLE_MAPS_API_KEY` in `.env` → react-native-config's dotenv.gradle emits
it as a string resource → `AndroidManifest.xml` references it as
`<meta-data android:name="com.google.android.geo.API_KEY" android:value="@string/GOOGLE_MAPS_API_KEY"/>`.
It's a build-time value, so changing the key requires a rebuild.

**⚠️ Google Cloud setup required for tiles to render.** The app code is correct, but a blank/black
map means the key isn't authorized. In Google Cloud Console: (1) enable **"Maps SDK for Android"**,
(2) **enable billing** on the project (required even for the free tier), (3) if the key is
restricted to Android apps, add package `com.sahakarsevamobile` + the debug SHA-1
`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (add the release keystore SHA-1 for
production). Like all react-native-config values the key ships in the APK — keep it restricted.

---

## 8. Phase status (as of this writing)

- **Phase 1–7** — scaffold, theme layer, contexts + data, UI primitives, navigation shell,
  auth screens, customer portal (modern redesign). Done.
- **Phase 8** — worker + admin portals. Done, verified on emulator.
- **Phase 9** — Groq AI (`aiService.js`, live diagnosis, i18n fix) + global ChatWidget. Done,
  verified on emulator.
- **Phase 10** — native capabilities, all done + verified on a physical device. 10a (image-picker
  → vision diagnosis), 10b (voice/STT TurboModule), 10c (LiveTrackingMap via react-native-maps with
  real-time haversine distance/ETA). Map overlays/markers/route all render; Google map *tiles*
  require the Cloud Console setup in §6.2 (enable Maps SDK for Android + billing) — an app-external
  config step, not a code issue.
- **Phase 12** — DemandForecast. Done + verified on a physical device. The forecast engine
  (`forecastEngine.js`) was already ported; the screen (`DemandForecastScreen.jsx`) redraws the
  web's canvas line chart with react-native-svg (grid, confidence band, predicted line, festival
  points), plus the daily breakdown (mobile card list), AI staffing recommendations, and the
  zone-demand heatmap. Verified via a temporary admin override in RootNavigator (reverted after).
- **Phase 13** — polish. Done + verified on a physical device. Bill receipt now shares a
  formatted invoice via the native Share sheet (`utils/receipt.js`, wired into the booking
  confirmation, tracker, and history); the video-call button opens a connecting→connected modal
  (demo, no real WebRTC); worker certificate upload uses react-native-image-picker to select a
  real file; and `ScreenContainer` now applies the top safe-area inset so in-content headers
  (PortalHeader / LocationBar) clear the status bar. Remaining known cosmetic-only item: none
  outstanding.

---

## 9. Demo accounts (no backend required)

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@sahakar.in` | `demo123` |
| Worker | `demo.worker@sahakar.in` | `demo123` |
| Admin | *(none — admin requires real Supabase by design)* | — |

Demo accounts synthesize a profile with the right role in `AuthContext`, so a demo customer lands
in the customer portal and a demo worker in the worker portal with zero Supabase configuration.
An authenticated user with no recognized role lands on `AccessDeniedScreen`.

---

## 10. App icon & release build

### App icon
The launcher icon is the app's brand — the white Devanagari monogram **सस** (for सहकार सेवा) on
the indigo brand square (`#4f46e5`). It was generated programmatically (PowerShell + System.Drawing,
using the Windows `Nirmala UI` Devanagari font) as a full **adaptive-icon** set:
- `res/mipmap-*/ic_launcher.png` + `ic_launcher_round.png` — legacy (pre-Android-8) full-bleed icons, all densities.
- `res/mipmap-*/ic_launcher_foreground.png` + `ic_launcher_background.png` — adaptive layers (108dp canvas; the mark sits at ~34% inside the safe zone so launchers don't crop it).
- `res/mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml` — adaptive-icon descriptors.
- `ic_launcher_playstore.png` (512px, repo root) — for a store listing if ever needed.
To regenerate/restyle, re-run the generator (indigo bg + white monogram) and rebuild.

### Release build (standalone APK)
The `release` build type is signed with a dedicated **release keystore** at
`android/app/release.keystore` (NOT the debug key). Credentials live in `android/gradle.properties`
as `SAHAKAR_RELEASE_STORE_FILE / KEY_ALIAS / STORE_PASSWORD / KEY_PASSWORD`; `app/build.gradle`
reads them and falls back to debug signing if they're absent. Both the keystore (`*.keystore`) and
`android/gradle.properties` are gitignored so the key + passwords never get committed.

Build the installable APK:
```
cd android
./gradlew assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk (universal, all ABIs)
```
The release APK **bundles the JS** — it runs standalone with no Metro server. Install with
`adb install -r app-release.apk` (uninstall a debug build first — different signature).

**IMPORTANT — keep the keystore safe.** Publishing any future update REQUIRES signing with this
same `release.keystore` + passwords. Losing it means you can't ship updates under the same app.

**Maps on the release build:** the Google Maps key restriction (if enabled) must include the
release keystore's SHA-1 — the release key has a DIFFERENT fingerprint than debug. Add the release
SHA-1 (see below) to the key's Android-app restriction in Google Cloud Console, or map tiles will
be blank in the release APK.
- Debug SHA-1:   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- Release SHA-1: `99:30:9F:30:89:E1:3C:0A:B2:2E:F9:F3:7F:93:88:B5:5D:3D:2B:48`
