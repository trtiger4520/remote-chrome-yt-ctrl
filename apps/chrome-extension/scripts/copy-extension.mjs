import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '../../artifacts/chrome-extension');
await mkdir(resolve(output, 'icons'), { recursive: true });
await cp(resolve(root, 'manifest.json'), resolve(output, 'manifest.json'));
for (const icon of ['icon.svg', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png']) {
  await cp(resolve(root, `icons/${icon}`), resolve(output, `icons/${icon}`));
}
