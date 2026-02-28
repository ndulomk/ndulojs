import { build } from 'bun';
import { $ } from 'bun';

await $`rm -rf dist`;

await build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
});

await $`tsc --emitDeclarationOnly --declaration --declarationDir dist`;

// eslint-disable-next-line no-console
console.log('✔ Build complete');
