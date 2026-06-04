const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: ['node_modules/**', 'cdk.out/**', 'dist/**'],
  },
  {
    files: ['lib/**/*.{ts,tsx,cjs,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@gatherle/commons',
              message: 'Import infrastructure-safe code from @gatherle/commons/server instead.',
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
              message: 'Use the @gatherle/commons/server surface in CDK code.',
            },
          ],
        },
      ],
    },
  },
];
