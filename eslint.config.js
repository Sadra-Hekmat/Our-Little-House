import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const forbiddenRelativeBoundaries = [
  '../app/*',
  '../../app/*',
  '../../../app/*',
  '../game/*',
  '../../game/*',
  '../../../game/*',
  '../ui/*',
  '../../ui/*',
  '../../../ui/*',
  '../content/*',
  '../../content/*',
  '../../../content/*',
  '../map/*',
  '../../map/*',
  '../../../map/*',
  '../storage/*',
  '../../storage/*',
  '../../../storage/*',
];

const boundaryRule = (patterns) => [
  'error',
  {
    patterns: [...patterns, ...forbiddenRelativeBoundaries],
  },
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'upload/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Use textContent or safe DOM construction; never assign untrusted HTML.',
        },
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
          message: 'document.write is not allowed.',
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.ts'],
    rules: {
      'no-restricted-imports': boundaryRule([
        '@game/scenes/*',
        '@game/state/*',
        '@game/systems/*',
        '@map/*',
        '@storage/*',
      ]),
    },
  },
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': boundaryRule(['@app/*', '@ui/*', '@storage/*']),
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': boundaryRule([
        '@app/*',
        '@game/scenes/*',
        '@game/state/*',
        '@game/systems/*',
        '@map/*',
        '@storage/*',
      ]),
    },
  },
  {
    files: ['src/content/**/*.ts', 'src/map/**/*.ts', 'src/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': boundaryRule(['@app/*', '@game/*', '@ui/*']),
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/e2e/**/*.ts', '*.config.ts', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
