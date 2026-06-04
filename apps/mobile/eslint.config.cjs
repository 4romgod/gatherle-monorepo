const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'dist/**',
      '.expo/**',
      'data/graphql/types/**',
      'test/**/coverage/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@gatherle/commons',
              message: 'Import browser-safe code from @gatherle/commons/client instead.',
            },
            {
              name: '@gatherle/commons/types',
              message: 'Do not import server model/schema code into mobile.',
            },
            {
              name: '@gatherle/commons/utils',
              message: 'Import browser-safe utilities from @gatherle/commons/client/utils instead.',
            },
            {
              name: '@gatherle/commons/validation',
              message: 'Import browser-safe validation primitives from @gatherle/commons/client/validation instead.',
            },
          ],
          patterns: [
            {
              group: ['@gatherle/commons/types/*', '@gatherle/commons/validation/*', '@gatherle/commons/utils/*'],
              message: 'Use the @gatherle/commons/client surface in mobile.',
            },
          ],
        },
      ],
    },
  },
];
