import React from 'react';

// Tabela de padrões Code 128 (0 a 106)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

interface BarcodeProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeCode128: React.FC<BarcodeProps> = ({
  value,
  height = 45,
  showText = true,
  className = '',
}) => {
  if (!value) return null;

  // Codificação Code 128 Subset B
  const codes: number[] = [104]; // Start B
  let checksum = 104;

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i) - 32;
    const safeCode = code >= 0 && code <= 95 ? code : 0;
    codes.push(safeCode);
    checksum += (i + 1) * safeCode;
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop

  // Converter códigos em padrão binário de barras (1=barra preta, 0=espaço branco)
  let modules = '';
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c] || '212222';
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j]!, 10);
      const isBar = j % 2 === 0;
      modules += (isBar ? '1' : '0').repeat(width);
    }
  }

  const moduleWidth = 2;
  const totalWidth = modules.length * moduleWidth;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-[50px] overflow-visible"
        style={{ width: `${Math.min(totalWidth, 260)}px` }}
        preserveAspectRatio="none"
      >
        {modules.split('').map((m, idx) => {
          if (m === '1') {
            return (
              <rect
                key={idx}
                x={idx * moduleWidth}
                y={0}
                width={moduleWidth}
                height={height}
                fill="#111827"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-bold tracking-widest text-slate-700 mt-0.5">
          *{value}*
        </span>
      )}
    </div>
  );
};
