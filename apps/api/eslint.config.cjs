const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'test/**/coverage/**'],
  },
  {
    files: ['lib/**/*.{ts,tsx}', 'test/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
        es2022: true,
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
              message: 'Import backend code from @gatherle/commons/server instead.',
            },
            {
              name: '@gatherle/commons/types',
              message: 'Import backend model/schema code from @gatherle/commons/server/types instead.',
            },
            {
              name: '@gatherle/commons/constants',
              message: 'Import backend constants from @gatherle/commons/server/constants instead.',
            },
            {
              name: '@gatherle/commons/utils',
              message: 'Import backend utilities from @gatherle/commons/server/utils instead.',
            },
            {
              name: '@gatherle/commons/validation',
              message: 'Import backend validation from @gatherle/commons/server/validation instead.',
            },
          ],
          patterns: [
            {
              group: [
                '@gatherle/commons/types/*',
                '@gatherle/commons/constants/*',
                '@gatherle/commons/utils/*',
                '@gatherle/commons/validation/*',
              ],
              message: 'Use the @gatherle/commons/server surface in the API.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
