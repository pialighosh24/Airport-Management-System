// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Strictly block the Node.js / Express backend directory and its dependencies from being crawled or bundled by Metro
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  new RegExp(`^${__dirname.replace(/\\/g, '\\\\')}[\\\\/]server[\\\\/].*`),
  /[\\/]server[\\/].*/,
  new RegExp(`^${__dirname.replace(/\\/g, '\\\\')}[\\\\/]backend[\\\\/].*`),
  /[\\/]backend[\\/].*/,
];

module.exports = config;
