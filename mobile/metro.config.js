// The app shares the website's tool registry and search (client/src/lib/tools),
// so the tool list never drifts. Metro needs to watch that folder.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../client/src/lib/tools")];

module.exports = config;
