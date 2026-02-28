/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-param-reassign': 'error',
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      files: ['packages/core/src/**/*.ts'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/core/tsconfig.eslint.json'],
      },
      extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        'no-throw-literal': 'error',
      },
    },
    {
      files: ['packages/core/test/**/*.ts'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/core/tsconfig.eslint.json'],
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },

    {
      files: ['packages/cli/src/**/*.ts'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/cli/tsconfig.eslint.json'],
      },
      extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        'no-throw-literal': 'error',
      },
    },
    {
      files: ['packages/cli/test/**/*.ts'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/cli/tsconfig.eslint.json'],
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.cjs', '*.mjs'],
};
