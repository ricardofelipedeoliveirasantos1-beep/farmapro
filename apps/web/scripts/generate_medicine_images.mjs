import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, '../public/medicamentos');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to generate SVG for a 3D box + bottle (drops) or box + blister (tablets)
function createMedicineSvg({
  tipo, // 'R' | 'S' | 'G'
  brandName,
  subName,
  concentration,
  volume,
  labName,
  labColor = '#0052cc',
  isDrops = false,
  accentColor = '#1d4ed8',
  stripeText = 'VENDA SOB PRESCRIÇÃO MÉDICA',
  stripeBg = '#dc2626'
}) {
  const width = 320;
  const height = 360;

  // Generic yellow band
  const genericBand = tipo === 'G' ? `
    <!-- Tarja Amarela ANVISA -->
    <rect x="52" y="150" width="118" height="52" fill="#facc15" stroke="#eab308" stroke-width="0.5"/>
    <!-- Letra G Grande -->
    <text x="64" y="188" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#0f172a">G</text>
    <text x="96" y="168" font-family="Arial, sans-serif" font-weight="800" font-size="8" fill="#0f172a" letter-spacing="0.5">MEDICAMENTO</text>
    <text x="96" y="179" font-family="Arial, sans-serif" font-weight="800" font-size="8" fill="#0f172a" letter-spacing="0.5">GENÉRICO</text>
    <text x="96" y="190" font-family="Arial, sans-serif" font-weight="600" font-size="6" fill="#334155">LEI Nº 9.787/99</text>
  ` : '';

  // Tarja Vermelha / Preta de Prescrição
  const tarjaPrescricao = `
    <rect x="52" y="${tipo === 'G' ? 202 : 185}" width="118" height="18" fill="${stripeBg}"/>
    <text x="111" y="${tipo === 'G' ? 214 : 197}" font-family="Arial, sans-serif" font-weight="800" font-size="6.5" fill="#ffffff" text-anchor="middle" letter-spacing="0.3">${stripeText}</text>
  `;

  // Item in front: Bottle (Drops) or Blister (Tablets)
  const itemInFront = isDrops ? `
    <!-- FRASCO CONTA-GOTAS 3D EM FRENTE -->
    <g transform="translate(130, 110)">
      <!-- Sombra do frasco -->
      <ellipse cx="45" cy="180" rx="34" ry="8" fill="#000000" opacity="0.3" filter="url(#shadowFilter)"/>
      
      <!-- Ombro do frasco de vidro âmbar -->
      <path d="M 28 80 Q 28 65 45 65 Q 62 65 62 80 L 68 95 L 22 95 Z" fill="url(#amberGlass)"/>
      
      <!-- Cilindro principal de vidro âmbar -->
      <rect x="20" y="90" width="50" height="85" rx="6" fill="url(#amberGlass)"/>
      <rect x="23" y="90" width="10" height="85" fill="url(#glassShine)"/>
      
      <!-- Rótulo do frasco -->
      <rect x="20.5" y="105" width="49" height="58" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.5"/>
      <!-- Faixa no rótulo -->
      ${tipo === 'G' ? '<rect x="20.5" y="130" width="49" height="12" fill="#facc15"/>' : `<rect x="20.5" y="130" width="49" height="8" fill="${accentColor}"/>`}
      
      <!-- Logo laboratório no rótulo -->
      <rect x="33" y="108" width="24" height="9" rx="4.5" fill="${labColor}"/>
      <text x="45" y="115" font-family="Arial, sans-serif" font-weight="900" font-size="5.5" fill="#ffffff" text-anchor="middle">${labName}</text>
      
      <!-- Texto do rótulo -->
      <text x="45" y="124" font-family="Arial, sans-serif" font-weight="900" font-size="5.5" fill="#0f172a" text-anchor="middle">${brandName.split(' ')[0]}</text>
      <text x="45" y="138" font-family="Arial, sans-serif" font-weight="800" font-size="4.5" fill="${tipo === 'G' ? '#000000' : '#ffffff'}" text-anchor="middle">${concentration}</text>
      <text x="45" y="154" font-family="Arial, sans-serif" font-weight="700" font-size="5" fill="#334155" text-anchor="middle">${volume}</text>
      
      <!-- Gargalo do frasco -->
      <rect x="38" y="52" width="14" height="15" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/>
      
      <!-- Rosca da tampa estriada -->
      <rect x="34" y="38" width="22" height="18" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.5"/>
      <line x1="38" y1="38" x2="38" y2="56" stroke="#cbd5e1" stroke-width="0.8"/>
      <line x1="42" y1="38" x2="42" y2="56" stroke="#cbd5e1" stroke-width="0.8"/>
      <line x1="46" y1="38" x2="46" y2="56" stroke="#cbd5e1" stroke-width="0.8"/>
      <line x1="50" y1="38" x2="50" y2="56" stroke="#cbd5e1" stroke-width="0.8"/>
      
      <!-- Bulbo de silicone do conta-gotas -->
      <path d="M 40 38 C 40 22 43 14 45 14 C 47 14 50 22 50 38 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
      <path d="M 42 35 C 42 24 44 18 45 18 C 46 18 48 24 48 35 Z" fill="#f8fafc"/>
    </g>
  ` : `
    <!-- CARTELA BLISTER DE COMPRIMIDOS 3D EM FRENTE -->
    <g transform="translate(130, 140)">
      <!-- Sombra do blister -->
      <rect x="15" y="65" width="85" height="95" rx="6" fill="#000000" opacity="0.25" filter="url(#shadowFilter)"/>
      
      <!-- Cartela prateada em perspectiva 3D -->
      <rect x="10" y="30" width="85" height="115" rx="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
      <rect x="12" y="32" width="81" height="111" rx="5" fill="#f8fafc"/>
      
      <!-- Topo da cartela com logo -->
      <rect x="10" y="30" width="85" height="24" rx="5" fill="${accentColor}"/>
      <text x="52" y="44" font-family="Arial, sans-serif" font-weight="900" font-size="8" fill="#ffffff" text-anchor="middle">${brandName.split(' ')[0]}</text>
      <text x="52" y="51" font-family="Arial, sans-serif" font-weight="700" font-size="6" fill="#e2e8f0" text-anchor="middle">${concentration}</text>
      
      <!-- 6 Alvéolos com Comprimidos Salientes 3D -->
      ${[0, 1, 2].map(row => [0, 1].map(col => `
        <circle cx="${28 + col * 48}" cy="${70 + row * 26}" r="14" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.8"/>
        <circle cx="${27 + col * 48}" cy="${69 + row * 26}" r="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.5"/>
        <circle cx="${25 + col * 48}" cy="${67 + row * 26}" r="10" fill="#f1f5f9"/>
        <ellipse cx="${24 + col * 48}" cy="${65 + row * 26}" rx="5" ry="3" fill="#ffffff" opacity="0.9"/>
      `).join('')).join('')}
      
      <!-- Selo de picote na borda -->
      <line x1="52" y1="54" x2="52" y2="145" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="0.8"/>
    </g>
  `;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="shadowFilter" x="-20%" y="-20%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="8" result="blur" />
    </filter>
    <linearGradient id="boxFront" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="90%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="boxSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="boxTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
    <linearGradient id="amberGlass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3d1805"/>
      <stop offset="20%" stop-color="#78350f"/>
      <stop offset="50%" stop-color="#b45309"/>
      <stop offset="75%" stop-color="#78350f"/>
      <stop offset="90%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#260f02"/>
    </linearGradient>
    <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="15%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Sombra no chão sob a caixa -->
  <ellipse cx="110" cy="285" rx="85" ry="14" fill="#000000" opacity="0.25" filter="url(#shadowFilter)"/>

  <!-- Topo da Caixa -->
  <polygon points="52,65 170,65 195,45 80,45" fill="url(#boxTop)" stroke="#cbd5e1" stroke-width="0.8"/>

  <!-- Lado Esquerdo / Lateral com Código de Barras -->
  <polygon points="28,85 52,65 52,260 28,275" fill="url(#boxSide)" stroke="#94a3b8" stroke-width="0.8"/>
  <!-- Código de barras na lateral -->
  <g transform="translate(32, 130) rotate(90)">
    <rect x="0" y="0" width="70" height="14" fill="#ffffff"/>
    ${[0,2,3,6,8,9,11,14,16,17,20,23,25,28,30,32,35,37,40,42,45,47,50,53,55,58,60,63,66].map(x => `<line x1="${x}" y1="1" x2="${x}" y2="13" stroke="#000000" stroke-width="1.2"/>`).join('')}
  </g>

  <!-- Face Frontal da Caixa -->
  <polygon points="52,65 170,65 170,250 52,260" fill="url(#boxFront)" stroke="#cbd5e1" stroke-width="0.8"/>

  <!-- Topo da Face: Logo do Laboratório -->
  <rect x="120" y="74" width="40" height="15" rx="7.5" fill="${labColor}"/>
  <text x="140" y="85" font-family="Arial, sans-serif" font-weight="900" font-size="8" fill="#ffffff" text-anchor="middle">${labName}</text>

  <!-- Nome do Medicamento / Marca -->
  <text x="62" y="112" font-family="Arial, sans-serif" font-weight="900" font-size="${brandName.length > 12 ? 13 : 16}" fill="#0f172a">${brandName}</text>
  <text x="62" y="126" font-family="Arial, sans-serif" font-weight="700" font-size="8.5" fill="#475569">${subName}</text>

  <!-- Badge de Dosagem / Forma -->
  <rect x="62" y="132" width="65" height="14" rx="2" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5"/>
  <text x="66" y="142" font-family="Arial, sans-serif" font-weight="800" font-size="7.5" fill="#0f172a">${concentration}</text>

  <!-- Elemento regulatório de Genérico (se G) ou Tarja Ética (se R/S) -->
  ${genericBand}
  ${tarjaPrescricao}

  <!-- Barra inferior com volume / quantidade -->
  <rect x="52" y="235" width="118" height="15" fill="${accentColor}"/>
  <text x="64" y="246" font-family="Arial, sans-serif" font-weight="900" font-size="8" fill="#ffffff">${volume}</text>

  <!-- ITEM NA FRENTE (Frasco ou Blister) -->
  ${itemInFront}
</svg>
  `;
}

// Medicamentos chave para gerar
const meds = [
  // 1. Dipirona EMS Genérico
  {
    filename: 'dipirona_ems_gen.png',
    tipo: 'G',
    brandName: 'Dipirona',
    subName: 'Monoidratada',
    concentration: '500 mg/ml Gotas',
    volume: '20 ml',
    labName: 'EMS',
    labColor: '#0052cc',
    isDrops: true,
    accentColor: '#1d4ed8'
  },
  // 2. Novalgina Sanofi Ético/Referência
  {
    filename: 'novalgina_sanofi_ref.png',
    tipo: 'R',
    brandName: 'Novalgina',
    subName: 'Dipirona Monoidratada',
    concentration: '500 mg/ml Gotas',
    volume: '20 ml',
    labName: 'SANOFI',
    labColor: '#00857c',
    isDrops: true,
    accentColor: '#00857c'
  },
  // 3. Lisador Dip Hypera Similar
  {
    filename: 'lisador_hypera_sim.png',
    tipo: 'S',
    brandName: 'Lisador Dip',
    subName: 'Dipirona Monoidratada',
    concentration: '500 mg/ml Gotas',
    volume: '20 ml',
    labName: 'HYPERA',
    labColor: '#f59e0b',
    isDrops: true,
    accentColor: '#d97706'
  },
  // 4. Novalgina 1G Comprimidos Ético
  {
    filename: 'novalgina_1g_cpr_ref.png',
    tipo: 'R',
    brandName: 'Novalgina',
    subName: 'Dipirona Monoidratada',
    concentration: '1g 10 Comprimidos',
    volume: '10 Comprimidos',
    labName: 'SANOFI',
    labColor: '#00857c',
    isDrops: false,
    accentColor: '#00857c'
  },
  // 5. Rivotril 2mg Roche Ético (Psicotrópico tarja preta)
  {
    filename: 'rivotril_roche_ref.png',
    tipo: 'R',
    brandName: 'Rivotril',
    subName: 'Clonazepam',
    concentration: '2mg 30 Comprimidos',
    volume: '30 Comprimidos',
    labName: 'ROCHE',
    labColor: '#0052cc',
    isDrops: false,
    accentColor: '#0284c7',
    stripeText: 'VENDA SOB PRESCRIÇÃO MÉDICA - RETENÇÃO',
    stripeBg: '#0f172a'
  },
  // 6. Dorflex Sanofi Ético
  {
    filename: 'dorflex_sanofi_ref.png',
    tipo: 'R',
    brandName: 'Dorflex',
    subName: 'Dipirona + Orfenadrina + Cafeína',
    concentration: '36 Comprimidos',
    volume: '3 Blisters',
    labName: 'SANOFI',
    labColor: '#00857c',
    isDrops: false,
    accentColor: '#1d4ed8'
  },
  // 7. Dorsay Cimed Similar
  {
    filename: 'dorsay_cimed_sim.png',
    tipo: 'S',
    brandName: 'Dorsay',
    subName: 'Relaxante Muscular',
    concentration: '30 Comprimidos',
    volume: '30 Comprimidos',
    labName: 'CIMED',
    labColor: '#ca8a04',
    isDrops: false,
    accentColor: '#ca8a04'
  },
  // 8. Losartana Medley Genérico
  {
    filename: 'losartana_medley_gen.png',
    tipo: 'G',
    brandName: 'Losartana',
    subName: 'Potássica',
    concentration: '50mg 30 Comprimidos',
    volume: '30 Comprimidos',
    labName: 'MEDLEY',
    labColor: '#dc2626',
    isDrops: false,
    accentColor: '#dc2626'
  },
  // 9. Amoxicilina Eurofarma Genérico
  {
    filename: 'amoxicilina_eurofarma_gen.png',
    tipo: 'G',
    brandName: 'Amoxicilina',
    subName: 'Tri-hidratada',
    concentration: '500mg 21 Cápsulas',
    volume: '21 Cápsulas',
    labName: 'EUROFARMA',
    labColor: '#0284c7',
    isDrops: false,
    accentColor: '#0284c7'
  },
  // 10. Omeprazol Cimed Genérico
  {
    filename: 'omeprazol_cimed_gen.png',
    tipo: 'G',
    brandName: 'Omeprazol',
    subName: '20mg Cápsulas',
    concentration: '20mg 28 Cápsulas',
    volume: '28 Cápsulas',
    labName: 'CIMED',
    labColor: '#eab308',
    isDrops: false,
    accentColor: '#ca8a04'
  }
];

async function run() {
  for (const m of meds) {
    const svg = createMedicineSvg(m);
    const dest = path.join(outputDir, m.filename);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(dest);
    console.log('Generated:', m.filename);
  }
  console.log('All medicine packaging images successfully generated!');
}

run().catch(console.error);
