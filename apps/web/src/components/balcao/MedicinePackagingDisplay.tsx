import React, { useState } from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';

interface MedicinePackagingDisplayProps {
  medicamento: MedicamentoDemonstrativo;
}

export const MedicinePackagingDisplay: React.FC<MedicinePackagingDisplayProps> = ({
  medicamento,
}) => {
  const [imgError, setImgError] = useState(false);

  // Mapeamento de imagens dedicadas de alta definição
  const obterImagemDedicada = (): string | null => {
    const desc = medicamento.descricao.toUpperCase();
    const lab = medicamento.laboratorio.toUpperCase();

    // 1. Dipirona EMS Genérico (Exato à foto enviada na Imagem 2 pelo usuário)
    if (desc.includes('DIPIRONA') && lab.includes('EMS') && medicamento.tipo === 'G') {
      return '/medicamentos/dipirona_ems_photo.png';
    }

    // 2. Novalgina Sanofi Ético / Referência (Gotas)
    if (desc.includes('NOVALGINA') && desc.includes('GTS') && medicamento.tipo === 'R') {
      return '/medicamentos/novalgina_sanofi_ref.png';
    }

    // 3. Novalgina Sanofi Ético / Referência (Comprimidos)
    if (desc.includes('NOVALGINA') && desc.includes('CPR') && medicamento.tipo === 'R') {
      return '/medicamentos/novalgina_1g_cpr_ref.png';
    }

    // 4. Lisador Dip Hypera Similar (Gotas)
    if (desc.includes('LISADOR') && medicamento.tipo === 'S') {
      return '/medicamentos/lisador_hypera_sim.png';
    }

    // 5. Rivotril Roche Ético / Referência (Psicotrópico)
    if (desc.includes('RIVOTRIL') && medicamento.tipo === 'R') {
      return '/medicamentos/rivotril_roche_ref.png';
    }

    // 6. Dorflex Sanofi Ético / Referência
    if (desc.includes('DORFLEX') && medicamento.tipo === 'R') {
      return '/medicamentos/dorflex_sanofi_ref.png';
    }

    // 7. Dorsay Cimed Similar
    if (desc.includes('DORSAY') && medicamento.tipo === 'S') {
      return '/medicamentos/dorsay_cimed_sim.png';
    }

    // 8. Losartana Medley Genérico
    if (desc.includes('LOSARTANA') && lab.includes('MEDLEY') && medicamento.tipo === 'G') {
      return '/medicamentos/losartana_medley_gen.png';
    }

    // 9. Amoxicilina Eurofarma Genérico
    if (desc.includes('AMOXICILINA') && lab.includes('EUROFARMA') && medicamento.tipo === 'G') {
      return '/medicamentos/amoxicilina_eurofarma_gen.png';
    }

    // 10. Omeprazol Cimed Genérico
    if (desc.includes('OMEPRAZOL') && lab.includes('CIMED') && medicamento.tipo === 'G') {
      return '/medicamentos/omeprazol_cimed_gen.png';
    }

    return null;
  };

  const imagemUrl = obterImagemDedicada();

  const isGotas = () => {
    const upper = medicamento.descricao.toUpperCase();
    return upper.includes('GTS') || upper.includes('GOTAS') || upper.includes('SOLUÇÃO');
  };

  const getLabColor = () => {
    const lab = medicamento.laboratorio.toUpperCase();
    if (lab.includes('EMS')) return '#0052cc';
    if (lab.includes('SANOFI')) return '#00857c';
    if (lab.includes('HYPERA')) return '#f59e0b';
    if (lab.includes('ROCHE')) return '#0284c7';
    if (lab.includes('MEDLEY')) return '#dc2626';
    if (lab.includes('CIMED')) return '#eab308';
    if (lab.includes('EUROFARMA')) return '#0284c7';
    if (lab.includes('ACHE') || lab.includes('ACHÉ')) return '#0d9488';
    if (lab.includes('BIOLAB')) return '#2563eb';
    return '#1d4ed8';
  };

  const getFormatoBadge = () => {
    const upper = medicamento.descricao.toUpperCase();
    if (upper.includes('GTS') || upper.includes('GOTAS')) return 'FRASCO CONTA-GOTAS';
    if (upper.includes('CPR') || upper.includes('COMP')) return 'BLISTER COMPRIMIDOS';
    if (upper.includes('CAPS') || upper.includes('CAP')) return 'BLISTER CÁPSULAS';
    if (upper.includes('XPE') || upper.includes('XAROPE')) return 'FRASCO XAROPE 120ML';
    return 'EMBALAGEM ORIGINAL';
  };

  // Se tiver imagem dedicada gerada e sem erro de carregamento
  if (imagemUrl && !imgError) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-1">
        <div className="relative w-full max-w-[170px] aspect-[4/5] flex items-center justify-center">
          <img
            src={imagemUrl}
            alt={medicamento.descricao}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow-md select-none transition-transform duration-200 hover:scale-102"
          />
        </div>
        <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-wider block text-center">
          {getFormatoBadge()}
        </span>
      </div>
    );
  }

  // Renderizador Vetorial Procedural 3D para qualquer outro medicamento do catálogo
  const drops = isGotas();
  const labColor = getLabColor();
  const brandFirst = medicamento.descricao.split(' ')[0] || 'MEDICAMENTO';
  const principioFirst = (medicamento.principioAtivo.split('+')[0] || '').trim().slice(0, 18);

  return (
    <div className="w-full flex flex-col items-center justify-center p-1">
      <div className="relative w-full max-w-[170px] aspect-[4/5] flex items-center justify-center">
        <svg
          viewBox="0 0 320 360"
          className="w-full h-full object-contain filter drop-shadow-md select-none"
        >
          <defs>
            <filter id="procShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="8" result="blur" />
            </filter>
            <linearGradient id="procBoxFront" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="90%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="procBoxSide" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="procBoxTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            <linearGradient id="procAmberGlass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3d1805" />
              <stop offset="20%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="75%" stopColor="#78350f" />
              <stop offset="90%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#260f02" />
            </linearGradient>
            <linearGradient id="procGlassShine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="15%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Sombra no chão */}
          <ellipse cx="110" cy="285" rx="85" ry="14" fill="#000000" opacity="0.25" filter="url(#procShadow)" />

          {/* Topo da Caixa */}
          <polygon points="52,65 170,65 195,45 80,45" fill="url(#procBoxTop)" stroke="#cbd5e1" strokeWidth="0.8" />

          {/* Lado Lateral com Código de Barras */}
          <polygon points="28,85 52,65 52,260 28,275" fill="url(#procBoxSide)" stroke="#94a3b8" strokeWidth="0.8" />
          <g transform="translate(32, 130) rotate(90)">
            <rect x="0" y="0" width="70" height="14" fill="#ffffff" />
            {[0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36, 38, 41, 43, 46, 48, 51, 53, 56, 58, 61, 64].map(x => (
              <line key={x} x1={x} y1="1" x2={x} y2="13" stroke="#000000" strokeWidth="1.2" />
            ))}
          </g>

          {/* Face Frontal da Caixa */}
          <polygon points="52,65 170,65 170,250 52,260" fill="url(#procBoxFront)" stroke="#cbd5e1" strokeWidth="0.8" />

          {/* Logo do Laboratório */}
          <rect x="115" y="74" width="45" height="15" rx="7.5" fill={labColor} />
          <text x="137" y="85" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7.5" fill="#ffffff" textAnchor="middle">
            {medicamento.laboratorio.split(' ')[0]}
          </text>

          {/* Nome e Apresentação */}
          <text x="62" y="112" fontFamily="Arial, sans-serif" fontWeight="900" fontSize={brandFirst.length > 10 ? 12 : 15} fill="#0f172a">
            {brandFirst}
          </text>
          <text x="62" y="126" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7.5" fill="#475569">
            {principioFirst}
          </text>

          {/* Badge de Dosagem */}
          <rect x="62" y="132" width="65" height="14" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
          <text x="66" y="142" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="7" fill="#0f172a">
            {medicamento.descricao.split(' ')[1] || 'Uso Oral'}
          </text>

          {/* SE FOR GENÉRICO: Tarja Amarela ANVISA Oficial */}
          {medicamento.tipo === 'G' && (
            <g>
              <rect x="52" y="150" width="118" height="52" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />
              <text x="64" y="188" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" fill="#0f172a">G</text>
              <text x="96" y="168" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="8" fill="#0f172a" letterSpacing="0.5">MEDICAMENTO</text>
              <text x="96" y="179" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="8" fill="#0f172a" letterSpacing="0.5">GENÉRICO</text>
              <text x="96" y="190" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="6" fill="#334155">LEI Nº 9.787/99</text>
            </g>
          )}

          {/* Tarja de Prescrição */}
          <rect x="52" y={medicamento.tipo === 'G' ? 202 : 185} width="118" height="18" fill="#dc2626" />
          <text x="111" y={medicamento.tipo === 'G' ? 214 : 197} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="6.5" fill="#ffffff" textAnchor="middle" letterSpacing="0.3">
            VENDA SOB PRESCRIÇÃO MÉDICA
          </text>

          {/* Barra inferior */}
          <rect x="52" y="235" width="118" height="15" fill={labColor} />
          <text x="64" y="246" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="8" fill="#ffffff">
            {drops ? 'Solução Gotas' : 'Comprimidos'}
          </text>

          {/* ITEM NA FRENTE: Frasco de Gotas OU Blister de Comprimidos */}
          {drops ? (
            <g transform="translate(130, 110)">
              <ellipse cx="45" cy="180" rx="34" ry="8" fill="#000000" opacity="0.3" filter="url(#procShadow)" />
              <path d="M 28 80 Q 28 65 45 65 Q 62 65 62 80 L 68 95 L 22 95 Z" fill="url(#procAmberGlass)" />
              <rect x="20" y="90" width="50" height="85" rx="6" fill="url(#procAmberGlass)" />
              <rect x="23" y="90" width="10" height="85" fill="url(#procGlassShine)" />
              <rect x="20.5" y="105" width="49" height="58" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
              {medicamento.tipo === 'G' ? (
                <rect x="20.5" y="130" width="49" height="12" fill="#facc15" />
              ) : (
                <rect x="20.5" y="130" width="49" height="8" fill={labColor} />
              )}
              <rect x="33" y="108" width="24" height="9" rx="4.5" fill={labColor} />
              <text x="45" y="115" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="5.5" fill="#ffffff" textAnchor="middle">
                {medicamento.laboratorio.split(' ')[0]}
              </text>
              <text x="45" y="124" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="5.5" fill="#0f172a" textAnchor="middle">
                {brandFirst}
              </text>
              <text x="45" y="138" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="4.5" fill={medicamento.tipo === 'G' ? '#000000' : '#ffffff'} textAnchor="middle">
                Gotas
              </text>
              <rect x="38" y="52" width="14" height="15" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
              <rect x="34" y="38" width="22" height="18" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.5" />
              <path d="M 40 38 C 40 22 43 14 45 14 C 47 14 50 22 50 38 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            </g>
          ) : (
            <g transform="translate(130, 140)">
              <rect x="15" y="65" width="85" height="95" rx="6" fill="#000000" opacity="0.25" filter="url(#procShadow)" />
              <rect x="10" y="30" width="85" height="115" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <rect x="12" y="32" width="81" height="111" rx="5" fill="#f8fafc" />
              <rect x="10" y="30" width="85" height="24" rx="5" fill={labColor} />
              <text x="52" y="45" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7.5" fill="#ffffff" textAnchor="middle">
                {brandFirst}
              </text>
              {[0, 1, 2].map(row => [0, 1].map(col => (
                <g key={`${row}-${col}`}>
                  <circle cx={28 + col * 48} cy={70 + row * 26} r={14} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
                  <circle cx={27 + col * 48} cy={69 + row * 26} r={12} fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
                  <ellipse cx={24 + col * 48} cy={65 + row * 26} rx={5} ry={3} fill="#ffffff" opacity="0.9" />
                </g>
              )))}
            </g>
          )}
        </svg>
      </div>
      <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-wider block text-center">
        {getFormatoBadge()}
      </span>
    </div>
  );
};
