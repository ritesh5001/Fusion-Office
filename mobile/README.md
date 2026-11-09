# Fusion Office — mobile app

Expo (SDK 57) + React Native app with the same dark design and motion as the website's phone layout, plus app navigation: a bottom tab bar (Home, Tools, +, Recent, Settings).

## Run it

```sh
cd mobile
npm install
npx expo start          # then press i (iOS Simulator) or a (Android), or scan the QR code with Expo Go
```

If Metro fails with `EMFILE: too many open files`, install Watchman (`brew install watchman`).

## How tools work

- **Native, on the device:** Merge, Split, Rotate, Page numbers and Watermark PDF; JPG to PDF; Scan to PDF (camera → PDF); Compress, Resize, Convert and Rotate image. Nothing is uploaded.
- **Native, via the server:** Word, Excel and PowerPoint to PDF call the same `/api/convert/office` endpoint as the website (`fusion-office-i5x0.onrender.com`).
- **Everything else** opens the website's tool inside the app (WebView) with the site's header and footer hidden. Files the tool downloads are caught, saved to Recent and offered in the share sheet.

The tool list, categories and search come straight from `../client/src/lib/tools` (registry and search), so the app always shows the same 74 tools as the website.

## Opening files from other apps (Android)

Fusion Office is listed in Android's **Open with** and **Share** menus for PDF, Word, Excel, PowerPoint, OpenDocument, CSV, text, Markdown and images (`android.intentFilters` in `app.json`: `VIEW`, `SEND` and `SEND_MULTIPLE`).

- The local module `modules/fo-downloads` reads the incoming intent (`takeIncoming`, plus an `onIncoming` event when the app is already open), copies the file into the cache and hands it to JS once.
- `src/components/IncomingFiles.tsx` (in the root layout) receives it and opens `/open`: the file shows in the viewer straight away, is kept in Recent, and the tools that fit are listed below it.
- `src/app/+native-intent.tsx` stops the router from treating the `content://` address as a screen.
- The viewer shows PDFs, images and text on the device. Word, Excel, PowerPoint, CSV and Markdown are shown with the website's `/viewer` in a web view; the file is passed to the page directly, not uploaded.
- The **Document viewer** tool (Tools tab) picks any file and opens the same screen.

Intent filters and the native module only take effect in a new build (`npm run build:apk`), not in Expo Go.

## Structure

```
src/app/            routes (Expo Router): tabs, tool/[slug]
src/components/     DropStage (processing stage), GlowCard, TabBar, Sheet, Stage (progress / done), …
src/lib/            native tool engine, file picking & saving, recents, runner, motion preference
src/theme.ts        design tokens (colours, fonts, timings) matching the website
```

## Build the Android app locally (Gradle, no cloud)

```sh
cd mobile
npm run build:apk     # → dist/fusion-office-<version>.apk  (install on any Android phone)
npm run build:aab     # → dist/fusion-office-<version>.aab  (upload to Google Play)
```

Needs JDK 17 and the Android SDK (`ANDROID_HOME`). The script regenerates `android/` with
`npx expo prebuild` (never edit that folder by hand; it's gitignored) and runs Gradle.
The first build downloads Gradle and all dependencies and takes a while; later builds are faster.

**Signing.** Release builds are signed with the upload key named in `~/.gradle/gradle.properties`
(`FUSION_UPLOAD_STORE_FILE`, `…_STORE_PASSWORD`, `…_KEY_ALIAS`, `…_KEY_PASSWORD`), applied by
`plugins/with-release-signing.js`. Keep the `.jks` file and its password backed up somewhere safe:
Google Play needs the same key for every update. Without these settings, builds fall back to the debug key.

To install on a connected phone (USB debugging on): `adb install -r dist/fusion-office-<version>.apk`.

## Cloud builds (optional)

`npx eas-cli@latest build --platform ios|android` builds store binaries in the cloud. Bundle IDs are `in.nextgenfusion.fusionoffice` (set in `app.json`).
