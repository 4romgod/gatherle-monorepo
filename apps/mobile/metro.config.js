const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const escapePathForRegex = (targetPath) => targetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(workspaceRoot, 'node_modules'), path.resolve(workspaceRoot, 'packages/commons')];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;
config.resolver.blockList = [
  new RegExp(`^${escapePathForRegex(path.resolve(workspaceRoot, 'apps/api'))}\\/.*$`),
  new RegExp(`^${escapePathForRegex(path.resolve(workspaceRoot, 'apps/webapp'))}\\/.*$`),
  new RegExp(`^${escapePathForRegex(path.resolve(workspaceRoot, 'apps/ops-cli'))}\\/.*$`),
  new RegExp(`^${escapePathForRegex(path.resolve(workspaceRoot, 'infrastructure'))}\\/.*$`),
];

module.exports = config;
