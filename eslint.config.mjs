import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  // Global ignore patterns
  {
    ignores: ['coverage/**/*', 'dist/**/*', 'node_modules/**/*'],
  },

  // Base config for all files
  {
    files: ['**/*.{js,ts}'],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.browser,
        ...globals.es6,
        tapes: 'writable',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      'linebreak-style': ['error', 'unix'],
      'eqeqeq': ['error', 'smart'],
      'prefer-const': ['error'],
      'no-var': 'error',
      'no-use-before-define': 'off',
      'no-console': [
        'error',
        {
          allow: ['info', 'warn', 'error'],
        },
      ],
      'prettier/prettier': 'error',
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,
      ...jestPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: false,
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': ['error'],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
      // Jest configuration
      'jest/expect-expect': [
        'error',
        {
          assertFunctionNames: ['expect*', 'checkImageData', 'testCode'],
        },
      ],
    },
  },

  // UI elements
  {
    files: ['js/ui/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // JS Node configuration
  {
    files: ['bin/*', 'babel.config.js', 'webpack.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 0,
    },
  },

  // Test configuration
  {
    files: ['test/**/*'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.jasmine,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 0,
    },
  },

  // Entry point configuration
  {
    files: ['js/entry2.ts', 'js/entry2e.ts', 'jest.config.js'],
    languageOptions: {
      globals: {
        ...globals.commonjs,
      },
    },
  },

  // Worker configuration
  {
    files: ['workers/*'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'workers/tsconfig.json',
      },
    },
  },
];
