import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    // Pure logic modules — Node/test environment (no DOM)
    files: ['src/app.js', 'src/pipeline.js', 'src/controls.js', 'src/challenges.js',
            'src/scoring.js', 'src/lab-engine.js', 'src/labs.js'],
    languageOptions: {
      globals: {
        ...globals.browser,   // crypto, btoa, TextEncoder, etc.
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-eval': 'error',
      'no-console': 'warn',
    },
  },
  {
    // Browser entry point — full browser environment
    files: ['src/main.js', 'src/interactive/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-eval': 'error',
      'no-console': 'warn',
    },
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'no-unused-vars': 'error',
      'no-eval': 'error',
      'no-console': 'warn',
    },
  },
];
