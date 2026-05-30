import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const dist = join(process.cwd(), 'dist');
const index = join(dist, 'index.html');
const dest = join(dist, '404.html');

if (existsSync(index)) {
  copyFileSync(index, dest);
  console.log('Copied index.html → 404.html for GitHub Pages SPA routing');
}
