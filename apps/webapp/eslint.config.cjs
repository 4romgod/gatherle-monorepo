const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'build/**', '.vercel/**', 'test/**/coverage/**'],
  },
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
    },
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
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
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
              message: 'Do not import server model/schema code into the webapp.',
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
              message: 'Use the @gatherle/commons/client surface in the webapp.',
            },
          ],
        },
      ],
    },
  },
];
