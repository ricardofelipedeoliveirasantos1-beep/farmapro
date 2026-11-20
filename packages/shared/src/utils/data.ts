/**
 * Utilitários para formatação e manipulação de datas no padrão pt-BR.
 */

export function formatarDataBR(dataIso: string | Date | undefined | null): string {
  if (!dataIso) return '-';
  const data = typeof dataIso === 'string' ? new Date(dataIso) : dataIso;
  if (isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

export function formatarDataHoraBR(dataIso: string | Date | undefined | null): string {
  if (!dataIso) return '-';
  const data = typeof dataIso === 'string' ? new Date(dataIso) : dataIso;
  if (isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(data);
}

