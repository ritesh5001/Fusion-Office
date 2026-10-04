// Signs Android release builds with your own upload key, kept outside the repo.
//
// The android/ folder is generated (npx expo prebuild), so this plugin adds the
// signing config on every prebuild instead of editing build.gradle by hand.
// Set these in ~/.gradle/gradle.properties (never commit them):
//   FUSION_UPLOAD_STORE_FILE=/absolute/path/to/upload-key.jks
//   FUSION_UPLOAD_STORE_PASSWORD=…
//   FUSION_UPLOAD_KEY_ALIAS=…
//   FUSION_UPLOAD_KEY_PASSWORD=…
// Without them, release builds fall back to the debug key (fine for testing,
// not accepted by Google Play).
const { withAppBuildGradle } = require("expo/config-plugins");

const MARK = "// fusion-office: release signing";

const RELEASE_CONFIG = `
        ${MARK}
        release {
            if (project.hasProperty('FUSION_UPLOAD_STORE_FILE')) {
                storeFile file(FUSION_UPLOAD_STORE_FILE)
                storePassword FUSION_UPLOAD_STORE_PASSWORD
                keyAlias FUSION_UPLOAD_KEY_ALIAS
                keyPassword FUSION_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;

    // Add a release signing config next to the debug one.
    gradle = gradle.replace(/signingConfigs\s*\{\s*debug\s*\{[^}]*\}/, (m) => m + RELEASE_CONFIG);

    // Release builds use it when the key is configured, otherwise the debug key.
    gradle = gradle.replace(
      /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('FUSION_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );

    if (!gradle.includes(MARK) || !gradle.includes("signingConfigs.release : signingConfigs.debug")) {
      throw new Error("with-release-signing: android/app/build.gradle has an unexpected shape; update the plugin.");
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
