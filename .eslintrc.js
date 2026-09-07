module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  rules: {
    // Path aliases (module-resolver) are not real files, so ESLint's import-resolver would
    // flag them as unresolved without extra config. Not adding eslint-plugin-import here
    // since @react-native/eslint-config doesn't ship it either — keep the ESLint setup as
    // close to the template default as possible.
    'react-native/no-inline-styles': 'off', // web app's port keeps a lot of computed inline styles (ProtectedRoute, WorkerManagement) — revisit once those are ported
  },
  overrides: [
    {
      // React Navigation's documented API for tab icons is an inline
      // `tabBarIcon: ({ color, size }) => <Icon />` render callback in screenOptions/options.
      // The no-unstable-nested-components rule flags these, but they are navigator OPTIONS,
      // not JSX children re-created on every parent render, so the rule's concern doesn't
      // apply. Disabled for the navigation layer only rather than fighting the framework idiom.
      files: ['src/navigation/**/*.jsx'],
      rules: {
        'react/no-unstable-nested-components': 'off',
      },
    },
  ],
};
