const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// @expo/metro-config sets unstable_serverRoot to the monorepo root for web
// monorepo support, but this breaks Android entry file resolution. Force it
// back to the mobile project root so Metro resolves ./index.ts correctly.
config.server = {
  ...config.server,
  unstable_serverRoot: workspaceRoot,
};

module.exports = config;
