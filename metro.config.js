// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Strictly block only the project's root Node.js / Express backend directories from being crawled or bundled by Metro
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rootServerDir = escapeRegex(path.resolve(__dirname, 'server'));
const rootBackendDir = escapeRegex(path.resolve(__dirname, 'backend'));

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  new RegExp(`^${rootServerDir}([\\\\/].*)?$`),
  new RegExp(`^${rootBackendDir}([\\\\/].*)?$`),
];

module.exports = config;
