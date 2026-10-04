#!/usr/bin/env bash
# Builds the Android app locally with Gradle (no EAS, no cloud).
#   npm run build:apk   → dist/fusion-office-<version>.apk   (install on any phone)
#   npm run build:aab   → dist/fusion-office-<version>.aab   (upload to Google Play)
# Needs: JDK 17 and the Android SDK (ANDROID_HOME). Signing: see plugins/with-release-signing.js.
set -euo pipefail
cd "$(dirname "$0")/.."

FORMAT="${1:-apk}"
case "$FORMAT" in
  apk) TASK=assembleRelease; OUT=android/app/build/outputs/apk/release/app-release.apk ;;
  aab) TASK=bundleRelease;   OUT=android/app/build/outputs/bundle/release/app-release.aab ;;
  *) echo "usage: build-android.sh [apk|aab]" >&2; exit 1 ;;
esac

: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export ANDROID_HOME
if [ -z "${JAVA_HOME:-}" ] && /usr/libexec/java_home -v 17 >/dev/null 2>&1; then export JAVA_HOME="$(/usr/libexec/java_home -v 17)"; fi
[ -d "$ANDROID_HOME" ] || { echo "Android SDK not found. Set ANDROID_HOME." >&2; exit 1; }

if ! grep -q '^FUSION_UPLOAD_STORE_FILE=' "$HOME/.gradle/gradle.properties" 2>/dev/null; then
  echo "Note: no upload key in ~/.gradle/gradle.properties, so this build is signed with the debug key (fine for testing, not for Google Play)."
fi

# Regenerate android/ from app.json and the config plugins (never edited by hand).
CI=1 npx expo prebuild --platform android --no-install

(cd android && ./gradlew "$TASK" --no-daemon)

VERSION="$(node -p "require('./app.json').expo.version")"
mkdir -p dist
cp "$OUT" "dist/fusion-office-$VERSION.$FORMAT"
echo
echo "Built dist/fusion-office-$VERSION.$FORMAT ($(du -h "dist/fusion-office-$VERSION.$FORMAT" | cut -f1))"
