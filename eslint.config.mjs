import js from '@eslint/js';
import tseslint from 'typescript-eslint';
// import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'node_modules/**',
      '**/prisma/**',
      '**/dist/**',
      'build/**',
      'coverage/**',
      '*.log',
      '.env',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  {
    files: ['**/*.{ts,tsx,js}'],
    plugins: {
      unicorn,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },

    rules: {
      'no-console': ['warn', { allow: ['error'] }],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          format: null,
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
        },
      ],
    },
  },

  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  prettierRecommended,
];
