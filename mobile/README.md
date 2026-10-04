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
- **Native, via the server:** Word, Excel and PowerPoint to PDF call the same `/api/convert/office` endpoint as the website (`fusion-office.onrender.com`).
- **Everything else** opens the website's tool inside the app (WebView) with the site's header and footer hidden. Files the tool downloads are caught, saved to Recent and offered in the share sheet.

The tool list, categories and search come straight from `../client/src/lib/tools` (registry and search), so the app always shows the same 74 tools as the website.

## Structure

```
src/app/            routes (Expo Router): tabs, tool/[slug]
src/components/     DropStage (processing stage), GlowCard, TabBar, Sheet, Stage (progress / done), …
src/lib/            native tool engine, file picking & saving, recents, runner, motion preference
src/theme.ts        design tokens (colours, fonts, timings) matching the website
```

## Builds

`npx eas-cli@latest build --platform ios|android` builds store binaries in the cloud. Bundle IDs are `in.nextgenfusion.fusionoffice` (set in `app.json`).
