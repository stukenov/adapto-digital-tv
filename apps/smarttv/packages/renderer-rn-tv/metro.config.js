const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../app-core'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'adapto-app-core': path.resolve(__dirname, '../app-core/src'),
    },
    platforms: ['ios', 'android', 'native', 'web', 'tvos'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);
