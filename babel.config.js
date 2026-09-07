module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.js', '.jsx', '.json'],
        alias: {
          // Mirrors the web app's src/ directory structure 1:1 (see
          // e:\sahakar-seva-progress\src) so ported files need minimal import-path changes.
          '@components': './src/components',
          '@context': './src/context',
          '@data': './src/data',
          '@services': './src/services',
          '@utils': './src/utils',
          '@theme': './src/theme',
          '@storage': './src/storage',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@assets': './src/assets',
          '@hooks': './src/hooks',
        },
      },
    ],
  ],
};
