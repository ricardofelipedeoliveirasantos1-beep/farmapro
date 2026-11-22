import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG com a identidade visual oficial do FarmaPro:
// Fundo azul com cantos arredondados, cruz da saúde branca estilizada com gradiente e detalhe em verde vida
const createSvg = (size, isMaskable = false) => {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const contentSize = size - padding * 2;
  const r = size * 0.22; // Squircle radius

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="60%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
      <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.03}" flood-color="#0f172a" flood-opacity="0.25" />
      </filter>
    </defs>
    
    <!-- Fundo Squircle Azul FarmaPro -->
    ${
      isMaskable
        ? `<rect width="${size}" height="${size}" fill="url(#bgGrad)" />`
        : `<rect x="${size * 0.03}" y="${size * 0.03}" width="${size * 0.94}" height="${size * 0.94}" rx="${r}" fill="url(#bgGrad)" filter="url(#shadow)" />`
    }

    <!-- Conteúdo Central: Cruz Farmacêutica Branca + Folha Verde FarmaPro -->
    <g transform="translate(${size / 2}, ${size / 2})">
      <!-- Cruz Branca -->
      <path d="
        M -${size * 0.11} -${size * 0.32}
        h ${size * 0.22}
        v ${size * 0.21}
        h ${size * 0.21}
        v ${size * 0.22}
        h -${size * 0.21}
        v ${size * 0.21}
        h -${size * 0.22}
        v -${size * 0.21}
        h -${size * 0.21}
        v -${size * 0.22}
        h ${size * 0.21}
        Z
      " fill="#ffffff" />

      <!-- Cruz Interna Estilizada / Graal da Saúde -->
      <!-- Detalhe Curvo da Folha da Saúde Verde (Marca FarmaPro) -->
      <path d="
        M ${size * 0.02} -${size * 0.08}
        C ${size * 0.25} -${size * 0.25}, ${size * 0.36} -${size * 0.04}, ${size * 0.26} ${size * 0.18}
        C ${size * 0.14} ${size * 0.28}, -${size * 0.05} ${size * 0.22}, ${size * 0.02} -${size * 0.08}
        Z
      " fill="url(#leafGrad)" />

      <!-- Almofariz Farmacêutico Branco Centralizado dentro da Folha -->
      <path d="
        M -${size * 0.04} -${size * 0.04}
        c ${size * 0.08} 0, ${size * 0.08} ${size * 0.08}, 0 ${size * 0.08}
        c -${size * 0.08} 0, -${size * 0.08} -${size * 0.08}, 0 -${size * 0.08}
        Z
      " fill="#ffffff" opacity="0.9" />
    </g>
  </svg>
  `;
};

async function generateAll() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'icon-32x32.png', size: 32, maskable: false },
    { name: 'icon-16x16.png', size: 16, maskable: false },
  ];

  for (const item of sizes) {
    const svg = createSvg(item.size, item.maskable);
    const dest = path.join(iconsDir, item.name);
    await sharp(Buffer.from(svg))
      .resize(item.size, item.size)
      .png()
      .toFile(dest);
    console.log(`Gerado: ${item.name} (${item.size}x${item.size})`);
  }

  // Favicon PNG
  const faviconSvg = createSvg(64, false);
  const faviconDest = path.resolve(__dirname, '../public/favicon.png');
  await sharp(Buffer.from(faviconSvg))
    .resize(64, 64)
    .png()
    .toFile(faviconDest);
  console.log('Gerado: public/favicon.png');
}

generateAll().catch(err => {
  console.error(err);
  process.exit(1);
});
