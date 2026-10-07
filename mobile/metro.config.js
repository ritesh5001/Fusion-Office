// The app shares the website's tool registry and search (client/src/lib/tools)
// and its pure image size math (client/src/lib/image), so neither drifts.
// Metro needs to watch those folders.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../client/src/lib/tools"), path.resolve(__dirname, "../client/src/lib/image")];

// tslib's "import" entry (modules/index.js) default-imports its UMD build, which
// has no default export on web ("Cannot destructure '__extends' of tslib.default").
// pdf-lib pulls in tslib, so point every tslib import at its plain ES module build,
// which exports the helpers by name. Resolved from the importer, so pdf-lib keeps
// its own nested tslib 1.x.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib") {
    // tslib's main file (tslib.js) sits next to tslib.es6.js in every version.
    const main = require.resolve("tslib", { paths: [path.dirname(context.originModulePath)] });
    return { type: "sourceFile", filePath: path.join(path.dirname(main), "tslib.es6.js") };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
