import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['**/dist/', '**/dev-dist/', '**/.wrangler/', '**/node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['app/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
    },
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['worker/src/**/*.ts'],
    languageOptions: { globals: globals.worker },
  },
  {
    files: ['app/public/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
);
