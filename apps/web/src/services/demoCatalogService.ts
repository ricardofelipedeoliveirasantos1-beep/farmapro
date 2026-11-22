import { MEDICAMENTOS_DEMONSTRATIVOS, MedicamentoDemonstrativo } from './demoCatalogData.js';
import { SearchMode } from '../types/balcao.js';

export class DemoCatalogService {
  /**
   * Normaliza texto para busca (remove acentos, pontuações e converte para minúsculas).
   */
  static normalizeText(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Verifica se alguma palavra em targetText começa com o token (ou se contém o token).
   */
  static matchesWordPrefix(targetText: string, token: string): boolean {
    const normTarget = this.normalizeText(targetText);
    const normToken = this.normalizeText(token);
    if (!normToken) return true;
    if (normTarget.includes(normToken)) return true;

    const words = normTarget.split(/\s+/);
    return words.some(w => w.startsWith(normToken));
  }

  /**
   * Extrai multiplicador de quantidade como no painel original (ex: "3*ome" -> mult: 3, query: "ome").
   */
  static extractMultiplier(rawTerm: string): { multiplier: number; query: string } {
    const trimmed = rawTerm.trim();
    const multMatch = trimmed.match(/^(\d{1,3})\s*\*\s*(.*)$/);
    if (multMatch) {
      const mult = parseInt(multMatch[1] || '1', 10);
      return {
        multiplier: mult > 0 && mult <= 999 ? mult : 1,
        query: multMatch[2]?.trim() || '',
      };
    }
    return {
      multiplier: 1,
      query: trimmed,
    };
  }

  /**
   * Filtra os 56 medicamentos da base demonstrativa conforme o modo e parâmetros de busca.
   */
  static filterMedications(
    rawTerm: string,
    mode: SearchMode = 'NAME',
    onlyWithStock = false,
  ): MedicamentoDemonstrativo[] {
    const { query } = this.extractMultiplier(rawTerm);
    const normQuery = this.normalizeText(query);

    const matches = MEDICAMENTOS_DEMONSTRATIVOS.filter(med => {
      // Filtro de saldo
      if (onlyWithStock && med.saldo <= 0) {
        return false;
      }

      if (!normQuery) {
        return true;
      }

      switch (mode) {
        case 'NAME':
          return (
            this.matchesWordPrefix(med.descricao, normQuery) ||
            this.matchesWordPrefix(med.principioAtivo, normQuery) ||
            med.codigoInterno.includes(normQuery) ||
            med.ean.includes(normQuery)
          );
        case 'PRINCIPIO':
          return this.matchesWordPrefix(med.principioAtivo, normQuery);
        case 'EAN':
          return med.ean.includes(normQuery);
        case 'CODE':
          return med.codigoInterno.includes(normQuery);
        default:
          return this.matchesWordPrefix(med.descricao, normQuery);
      }
    });

    if (!normQuery) {
      return matches;
    }

    // Ordenação Inteligente solicitada pelo proprietário:
    // Se a pesquisa for por um medicamento genérico ou princípio ativo (ex: "dipirona", "losartana", "omeprazol"):
    // Os GENÉRICOS (G) aparecem primeiro, seguidos por SIMILARES (S) e por último ÉTICOS / REFERÊNCIA (R).
    // Se for por uma marca de referência específica (ex: "dorflex"):
    // Os produtos que iniciam pela marca pesquisada aparecem no topo.
    const isGenericOrPrincipleSearch =
      MEDICAMENTOS_DEMONSTRATIVOS.some(
        m => m.tipo === 'G' && this.normalizeText(m.descricao).startsWith(normQuery),
      ) ||
      MEDICAMENTOS_DEMONSTRATIVOS.some(
        m => this.normalizeText(m.principioAtivo).startsWith(normQuery),
      );

    return matches.sort((a, b) => {
      if (isGenericOrPrincipleSearch) {
        // Hierarquia solicitada: Genéricos (G: 1) -> Similares (S: 2) -> Éticos/Referência (R: 3)
        const tipoPriority: Record<'G' | 'S' | 'R', number> = { G: 1, S: 2, R: 3 };
        const diffTipo = tipoPriority[a.tipo] - tipoPriority[b.tipo];
        if (diffTipo !== 0) return diffTipo;

        // Se ambos forem do mesmo tipo, quem tem descrição iniciando pela query fica à frente
        const aStarts = this.normalizeText(a.descricao).startsWith(normQuery);
        const bStarts = this.normalizeText(b.descricao).startsWith(normQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.descricao.localeCompare(b.descricao);
      }

      // Se a pesquisa iniciou pelo nome comercial de referência (ex: Dorflex):
      const aStarts = this.normalizeText(a.descricao).startsWith(normQuery);
      const bStarts = this.normalizeText(b.descricao).startsWith(normQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.descricao.localeCompare(b.descricao);
    });
  }

  /**
   * Constrói até 3 sugestões intercambiáveis ordenadas na ordem canônica da ANVISA:
   * 1º Referência (R) -> 2º Similar (S) -> 3º Genérico (G)
   */
  static buildOrderedThreeSuggestions(
    pinnedMed: MedicamentoDemonstrativo,
  ): MedicamentoDemonstrativo[] {
    const normPrincipio = this.normalizeText(pinnedMed.principioAtivo);

    // Encontra medicamentos com o mesmo princípio ativo, exceto o fixado
    const candidados = MEDICAMENTOS_DEMONSTRATIVOS.filter(
      m => m.id !== pinnedMed.id && this.normalizeText(m.principioAtivo) === normPrincipio,
    );

    const ref = candidados.find(m => m.tipo === 'R');
    const sim = candidados.find(m => m.tipo === 'S');
    const gen = candidados.find(m => m.tipo === 'G');

    const result: MedicamentoDemonstrativo[] = [];
    if (ref) result.push(ref);
    if (sim) result.push(sim);
    if (gen) result.push(gen);

    // Se faltou algum tipo específico do mesmo princípio, completa com outros do mesmo princípio
    for (const c of candidados) {
      if (result.length >= 3) break;
      if (!result.some(r => r.id === c.id)) {
        result.push(c);
      }
    }

    return result;
  }

  /**
   * Busca medicamento por ID.
   */
  static getMedicationById(id: number): MedicamentoDemonstrativo | undefined {
    return MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.id === id);
  }
}
