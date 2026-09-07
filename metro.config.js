const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Several deps (e.g. zustand's ./middleware subpath) ship an "exports" map whose
// "import" condition points to a real-ESM build containing raw `import.meta`
// (Vite/webpack-only syntax). Metro bundles everything as CommonJS-wrapped
// scripts, never a true `type="module"` context, so `import.meta` there is a
// parse-time SyntaxError that crashes the whole bundle. Disabling package-exports
// resolution makes Metro fall back to classic mainFields/path resolution
// (resolverMainFields below), which lands on each package's safe CJS build.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
