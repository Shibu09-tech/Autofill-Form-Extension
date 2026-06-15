import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'popup/popup.js',
    output: {
      file: 'dist/popup.js',
      format: 'iife'
    },
    plugins: [resolve(), commonjs()]
  },
  {
    input: 'background.js',
    output: {
      file: 'dist/background.js',
      format: 'iife'
    },
    plugins: [resolve(), commonjs()]
  },
  {
    input: 'content/content.js',
    output: {
      file: 'dist/content.js',
      format: 'iife'
    },
    plugins: [resolve(), commonjs()]
  }
];
