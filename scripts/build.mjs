import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { buildTemplates } from './templates.mjs';

await buildTemplates();
const metadata = await readFile(new URL('../src/userscript.meta.txt', import.meta.url), 'utf8');
const iconLicense = await readFile(new URL('../node_modules/lucide/LICENSE', import.meta.url), 'utf8');
const projectLicense = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  charset: 'utf8',
  minify: false,
  metafile: true,
  target: ['chrome110', 'firefox115'],
  outfile: 'dist/trash-fliter.user.js',
  banner: { js: `${metadata}\n/* Project license\n${projectLicense}\n*/\n/* Third-party icons: Lucide\n${iconLicense}\n*/` },
  loader: { '.css': 'text' },
  legalComments: 'inline',
});
if (Object.keys(result.metafile.inputs).some(path => /node_modules\/(?:htmlparser2|entities)\//.test(path))) {
  throw new Error('Runtime HTML parser data must not ship in the userscript');
}
console.log('Built dist/trash-fliter.user.js');
