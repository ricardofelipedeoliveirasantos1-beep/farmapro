// ==============================================================================
// FarmaPro — Utilitário de Leitura e Validação Estrutural de XML de NF-e
// Extração estrita de dados fiscais fictícios/reais sem emissão e sem SEFAZ
// ==============================================================================

export interface NfeItemXmlExtraido {
  numeroItem: number;
  codigoProduto: string;
  codigoBarras?: string;
  nomeProduto: string;
  ncm?: string;
  cfop?: string;
  unidadeComercial: string;
  quantidadeComercial: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
  descontoCentavos: number;
  numeroLote?: string;
  dataFabricacao?: string;
  dataValidade?: string;
}

export interface NfeXmlExtraida {
  chaveAcesso: string; // 44 dígitos estritos
  numeroNfe: string;
  serieNfe: string;
  dataEmissao: string;
  cnpjEmitente: string;
  razaoSocialEmitente: string;
  nomeFantasiaEmitente?: string;
  cnpjDestinatario: string;
  razaoSocialDestinatario?: string;
  valorProdutosCentavos: number;
  valorFreteCentavos: number;
  valorDescontoCentavos: number;
  valorTotalCentavos: number;
  itens: NfeItemXmlExtraido[];
}

/**
 * Extrai o conteúdo em texto de uma tag XML, tolerando namespaces (ex: <nfe:tag> ou <tag>).
 */
function extrairTag(xml: string | null | undefined, nomeTag: string): string | undefined {
  if (!xml) return undefined;
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${nomeTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${nomeTag}>`, 'i');
  const match = xml.match(regex);
  return match && match[1] ? match[1].trim() : undefined;
}

/**
 * Converte valor em formato string com ponto (ex: "12.50") para centavos inteiros (1250).
 */
function paraCentavos(valorStr: string | null | undefined): number {
  if (!valorStr) return 0;
  const num = parseFloat(valorStr.replace(',', '.'));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Lê e valida estruturalmente um XML de NF-e de entrada.
 * Lança erro descritivo caso o XML seja inválido, corrompido ou não cumpra a estrutura mínima.
 */
export function parsearNfeXml(xmlConteudo: string): NfeXmlExtraida {
  if (!xmlConteudo || typeof xmlConteudo !== 'string' || xmlConteudo.trim().length === 0) {
    throw new Error('Conteúdo do arquivo XML de NF-e não informado ou vazio.');
  }

  // 1. Validação de raiz estrutural
  const temInfNfe = /<(?:\w+:)?infNFe\b/i.test(xmlConteudo);
  const temNfe = /<(?:\w+:)?NFe\b/i.test(xmlConteudo);
  const temNfeProc = /<(?:\w+:)?nfeProc\b/i.test(xmlConteudo);

  if (!temInfNfe && !temNfe && !temNfeProc) {
    throw new Error('Arquivo XML inválido: não contém a estrutura padrão de Nota Fiscal Eletrônica (NF-e).');
  }

  // 2. Extração da Chave de Acesso (44 dígitos numéricos)
  let chaveAcesso = extrairTag(xmlConteudo, 'chNFe');

  if (!chaveAcesso) {
    // Tenta extrair do atributo Id="NFe3526..."
    const matchId = xmlConteudo.match(/Id=["']NFe(\d{44})["']/i);
    if (matchId && matchId[1]) {
      chaveAcesso = matchId[1];
    }
  }

  if (!chaveAcesso) {
    throw new Error('Chave de acesso da NF-e não encontrada no arquivo XML.');
  }

  // Limpa caracteres não numéricos
  chaveAcesso = chaveAcesso.replace(/\D/g, '');

  if (chaveAcesso.length !== 44) {
    throw new Error(`Chave de acesso inválida: deve conter exatamente 44 dígitos numéricos (encontrados ${chaveAcesso.length}).`);
  }

  // 3. Extração dos Dados de Identificação (ide)
  const blocoIde = extrairTag(xmlConteudo, 'ide');
  if (!blocoIde) {
    throw new Error('Bloco de identificação (<ide>) da NF-e ausente no XML.');
  }

  const numeroNfe = extrairTag(blocoIde, 'nNF') || chaveAcesso.substring(25, 34).replace(/^0+/, '');
  const serieNfe = extrairTag(blocoIde, 'serie') || chaveAcesso.substring(22, 25).replace(/^0+/, '1');
  const dhEmi = extrairTag(blocoIde, 'dhEmi') || extrairTag(blocoIde, 'dEmi') || new Date().toISOString();

  // 4. Extração do Emitente (Fornecedor)
  const blocoEmit = extrairTag(xmlConteudo, 'emit');
  if (!blocoEmit) {
    throw new Error('Bloco do emitente (<emit>) da NF-e ausente no XML.');
  }

  const cnpjEmitenteRaw = extrairTag(blocoEmit, 'CNPJ') || extrairTag(blocoEmit, 'CPF');
  if (!cnpjEmitenteRaw) {
    throw new Error('CNPJ/CPF do emitente não encontrado no XML da NF-e.');
  }
  const cnpjEmitente = cnpjEmitenteRaw.replace(/\D/g, '');

  const razaoSocialEmitente = extrairTag(blocoEmit, 'xNome') || 'Fornecedor Desconhecido';
  const nomeFantasiaEmitente = extrairTag(blocoEmit, 'xFant') || undefined;

  // 5. Extração do Destinatário
  const blocoDest = extrairTag(xmlConteudo, 'dest');
  const cnpjDestinatarioRaw = blocoDest ? (extrairTag(blocoDest, 'CNPJ') || extrairTag(blocoDest, 'CPF')) : '';
  const cnpjDestinatario = (cnpjDestinatarioRaw || '').replace(/\D/g, '');
  const razaoSocialDestinatario = blocoDest ? extrairTag(blocoDest, 'xNome') || undefined : undefined;

  // 6. Extração dos Totais
  const blocoTotal = extrairTag(xmlConteudo, 'total') || xmlConteudo;
  const blocoIcmsTot = extrairTag(blocoTotal, 'ICMSTot') || blocoTotal;

  const valorProdutosCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vProd'));
  const valorFreteCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vFrete'));
  const valorDescontoCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vDesc'));
  const valorTotalCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vNF')) || valorProdutosCentavos;

  // 7. Extração dos Itens (<det nItem="X">)
  const regexDet = /<(?:[a-zA-Z0-9_]+:)?det\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?det>/gi;
  const matchesDet = [...xmlConteudo.matchAll(regexDet)];

  if (matchesDet.length === 0) {
    throw new Error('A NF-e não contém nenhum item de mercadoria (<det>) informado.');
  }

  const itens: NfeItemXmlExtraido[] = matchesDet.map((match, index) => {
    const blocoDet = match[1];
    const blocoProd = extrairTag(blocoDet, 'prod') || blocoDet;

    const codigoProduto = extrairTag(blocoProd, 'cProd') || `ITEM-${index + 1}`;
    let codigoBarras = extrairTag(blocoProd, 'cEAN');
    if (codigoBarras === 'SEM GTIN' || !codigoBarras) {
      codigoBarras = extrairTag(blocoProd, 'cEANTrib') || undefined;
    }
    if (codigoBarras === 'SEM GTIN') {
      codigoBarras = undefined;
    }

    const nomeProduto = extrairTag(blocoProd, 'xProd') || 'Produto sem descrição';
    const ncm = extrairTag(blocoProd, 'NCM') || undefined;
    const cfop = extrairTag(blocoProd, 'CFOP') || undefined;
    const unidadeComercial = extrairTag(blocoProd, 'uCom') || 'UN';

    const qComStr = extrairTag(blocoProd, 'qCom') || '1';
    const quantidadeComercial = parseFloat(qComStr.replace(',', '.')) || 1;

    const valorUnitarioCentavos = paraCentavos(extrairTag(blocoProd, 'vUnCom'));
    const valorTotalCentavos = paraCentavos(extrairTag(blocoProd, 'vProd'));
    const descontoCentavos = paraCentavos(extrairTag(blocoProd, 'vDesc'));

    // Rastreabilidade de Lotes (<rastro>)
    const blocoRastro = extrairTag(blocoProd, 'rastro');
    let numeroLote: string | undefined;
    let dataFabricacao: string | undefined;
    let dataValidade: string | undefined;

    if (blocoRastro) {
      numeroLote = extrairTag(blocoRastro, 'nLote') || undefined;
      dataFabricacao = extrairTag(blocoRastro, 'dFab') || undefined;
      dataValidade = extrairTag(blocoRastro, 'dVal') || undefined;
    }

    // Se não encontrou no bloco rastro, tenta extrair de tags diretas caso existam
    if (!numeroLote) {
      numeroLote = extrairTag(blocoProd, 'nLote') || undefined;
    }
    if (!dataValidade) {
      dataValidade = extrairTag(blocoProd, 'dVal') || undefined;
    }

    return {
      numeroItem: index + 1,
      codigoProduto,
      codigoBarras,
      nomeProduto,
      ncm,
      cfop,
      unidadeComercial,
      quantidadeComercial,
      valorUnitarioCentavos,
      valorTotalCentavos,
      descontoCentavos,
      numeroLote,
      dataFabricacao,
      dataValidade,
    };
  });

  return {
    chaveAcesso,
    numeroNfe,
    serieNfe,
    dataEmissao: dhEmi,
    cnpjEmitente,
    razaoSocialEmitente,
    nomeFantasiaEmitente,
    cnpjDestinatario,
    razaoSocialDestinatario,
    valorProdutosCentavos,
    valorFreteCentavos,
    valorDescontoCentavos,
    valorTotalCentavos,
    itens,
  };
}
