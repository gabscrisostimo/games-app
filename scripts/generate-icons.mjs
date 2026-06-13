import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0c1220"/>
  <rect x="96" y="120" width="240" height="160" rx="36" fill="#7dd3fc"/>
  <path d="M150 280 L150 340 L210 280 Z" fill="#7dd3fc"/>
  <rect x="210" y="232" width="200" height="140" rx="32" fill="#fca5a5"/>
  <path d="M360 372 L360 424 L308 372 Z" fill="#fca5a5"/>
</svg>
`;

async function build() {
  const buffer = Buffer.from(svg);
  await sharp(buffer).resize(512, 512).png().toFile(resolve(publicDir, 'pwa-512.png'));
  await sharp(buffer).resize(192, 192).png().toFile(resolve(publicDir, 'pwa-192.png'));
  console.log('Ícones gerados: pwa-192.png, pwa-512.png');
}

build();
