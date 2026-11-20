import pg from 'pg';
import {
  ContextoTenant,
  NfeRecebida,
  NfeRecebidaItem,
  RecebimentoMercadoria,
  ImportarNfeXmlDTO,
  IniciarConferenciaDTO,
  RegistrarConferenciaFisicaDTO,
  AprovarDivergenciaDTO,
  ConfirmarRecebimentoDTO,
} from '@farmapro/shared';

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
  chaveAcesso: string;
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

function extrairTag(xml: string | null | undefined, nomeTag: string): string | undefined {
  if (!xml) return undefined;
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${nomeTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${nomeTag}>`, 'i');
  const match = xml.match(regex);
  return match && match[1] ? match[1].trim() : undefined;
}

function paraCentavos(valorStr: string | null | undefined): number {
  if (!valorStr) return 0;
  const num = parseFloat(valorStr.replace(',', '.'));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function parsearNfeXml(xmlConteudo: string): NfeXmlExtraida {
  if (!xmlConteudo || typeof xmlConteudo !== 'string' || xmlConteudo.trim().length === 0) {
    throw new Error('Conteúdo do arquivo XML de NF-e não informado ou vazio.');
  }

  const temInfNfe = /<(?:\w+:)?infNFe\b/i.test(xmlConteudo);
  const temNfe = /<(?:\w+:)?NFe\b/i.test(xmlConteudo);
  const temNfeProc = /<(?:\w+:)?nfeProc\b/i.test(xmlConteudo);

  if (!temInfNfe && !temNfe && !temNfeProc) {
    throw new Error('Arquivo XML inválido: não contém a estrutura padrão de Nota Fiscal Eletrônica (NF-e).');
  }

  let chaveAcesso = extrairTag(xmlConteudo, 'chNFe');
  if (!chaveAcesso) {
    const matchId = xmlConteudo.match(/Id=["']NFe(\d{44})["']/i);
    if (matchId && matchId[1]) {
      chaveAcesso = matchId[1];
    }
  }

  if (!chaveAcesso) {
    throw new Error('Chave de acesso da NF-e não encontrada no arquivo XML.');
  }

  chaveAcesso = chaveAcesso.replace(/\D/g, '');
  if (chaveAcesso.length !== 44) {
    throw new Error(`Chave de acesso inválida: deve conter exatamente 44 dígitos numéricos (encontrados ${chaveAcesso.length}).`);
  }

  const blocoIde = extrairTag(xmlConteudo, 'ide');
  if (!blocoIde) {
    throw new Error('Bloco de identificação (<ide>) da NF-e ausente no XML.');
  }

  const numeroNfe = extrairTag(blocoIde, 'nNF') || chaveAcesso.substring(25, 34).replace(/^0+/, '');
  const serieNfe = extrairTag(blocoIde, 'serie') || chaveAcesso.substring(22, 25).replace(/^0+/, '1');
  const dhEmi = extrairTag(blocoIde, 'dhEmi') || extrairTag(blocoIde, 'dEmi') || new Date().toISOString();

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
  const nomeFantasiaEmitente = extrairTag(blocoEmit, 'xFant');

  const blocoDest = extrairTag(xmlConteudo, 'dest');
  const cnpjDestinatarioRaw = blocoDest ? (extrairTag(blocoDest, 'CNPJ') || extrairTag(blocoDest, 'CPF')) : '';
  const cnpjDestinatario = (cnpjDestinatarioRaw || '').replace(/\D/g, '');
  const razaoSocialDestinatario = blocoDest ? extrairTag(blocoDest, 'xNome') : undefined;

  const blocoTotal = extrairTag(xmlConteudo, 'total') || xmlConteudo;
  const blocoIcmsTot = extrairTag(blocoTotal, 'ICMSTot') || blocoTotal;

  const valorProdutosCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vProd'));
  const valorFreteCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vFrete'));
  const valorDescontoCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vDesc'));
  const valorTotalCentavos = paraCentavos(extrairTag(blocoIcmsTot, 'vNF')) || valorProdutosCentavos;

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
      codigoBarras = extrairTag(blocoProd, 'cEANTrib');
    }
    if (codigoBarras === 'SEM GTIN') {
      codigoBarras = undefined;
    }

    const nomeProduto = extrairTag(blocoProd, 'xProd') || 'Produto sem descrição';
    const ncm = extrairTag(blocoProd, 'NCM');
    const cfop = extrairTag(blocoProd, 'CFOP');
    const unidadeComercial = extrairTag(blocoProd, 'uCom') || 'UN';

    const qComStr = extrairTag(blocoProd, 'qCom') || '1';
    const quantidadeComercial = parseFloat(qComStr.replace(',', '.')) || 1;

    const valorUnitarioCentavos = paraCentavos(extrairTag(blocoProd, 'vUnCom'));
    const valorTotalCentavos = paraCentavos(extrairTag(blocoProd, 'vProd'));
    const descontoCentavos = paraCentavos(extrairTag(blocoProd, 'vDesc'));

    const blocoRastro = extrairTag(blocoProd, 'rastro');
    let numeroLote: string | undefined;
    let dataFabricacao: string | undefined;
    let dataValidade: string | undefined;

    if (blocoRastro) {
      numeroLote = extrairTag(blocoRastro, 'nLote');
      dataFabricacao = extrairTag(blocoRastro, 'dFab');
      dataValidade = extrairTag(blocoRastro, 'dVal');
    }

    if (!numeroLote) {
      numeroLote = extrairTag(blocoProd, 'nLote');
    }
    if (!dataValidade) {
      dataValidade = extrairTag(blocoProd, 'dVal');
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

export class RecebimentoService {
  constructor(private pool: pg.Pool) {}

  /**
   * Helper para executar queries garantindo contexto de tenant RLS
   */
  private async queryComTenant<T extends pg.QueryResultRow>(
    tenant: ContextoTenant,
    sql: string,
    params: unknown[] = []
  ): Promise<pg.QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_empresa_id', $1, false)", [tenant.empresaId]);
      if (tenant.filialId) {
        await client.query("SELECT set_config('app.current_filial_id', $1, false)", [tenant.filialId]);
      }
      return await client.query<T>(sql, params);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // 1. IMPORTAÇÃO E PROCESSAMENTO ESTRUTURAL DE XML DE NF-E
  // ============================================================================

  /**
   * Importa e valida um arquivo XML de NF-e sem validar fiscalmente na SEFAZ e
   * com GARANTIA ARQUITETURAL de que NÃO altera estoque físico antes da conferência.
   */
  async importarXmlNfe(tenant: ContextoTenant, dto: ImportarNfeXmlDTO): Promise<NfeRecebida> {
    if (!dto.xmlConteudo || dto.xmlConteudo.trim().length === 0) {
      throw new Error('Arquivo XML da NF-e não informado ou vazio.');
    }

    // 1. Parse e validação estrutural do XML
    const xmlExtraido = parsearNfeXml(dto.xmlConteudo);

    // 2. Prevenção de importação duplicada por chave de acesso (44 dígitos)
    const checkDuplicada = await this.queryComTenant<{ id: string }>(
      tenant,
      'SELECT id FROM nfe_recebidas WHERE empresa_id = $1 AND chave_acesso = $2 LIMIT 1',
      [tenant.empresaId, xmlExtraido.chaveAcesso]
    );

    if (checkDuplicada.rows.length > 0) {
      throw new Error(`NF-e com a chave de acesso ${xmlExtraido.chaveAcesso} já foi importada anteriormente.`);
    }

    // 3. Identificação do Fornecedor por CNPJ
    let fornecedorId: string | undefined;
    let razaoSocialFornecedor: string | undefined;
    let nomeFantasiaFornecedor: string | undefined;

    const resForn = await this.queryComTenant<{ id: string; razao_social: string; nome_fantasia: string }>(
      tenant,
      'SELECT id, razao_social, nome_fantasia FROM fornecedores WHERE empresa_id = $1 AND cnpj = $2 LIMIT 1',
      [tenant.empresaId, xmlExtraido.cnpjEmitente]
    );

    if (resForn.rows.length > 0) {
      fornecedorId = resForn.rows[0]!.id;
      razaoSocialFornecedor = resForn.rows[0]!.razao_social;
      nomeFantasiaFornecedor = resForn.rows[0]!.nome_fantasia;
    }

    // 4. Validação do Pedido de Compra (se vinculado)
    let pedidoCompraId: string | undefined = dto.pedidoCompraId;
    if (pedidoCompraId) {
      const resPed = await this.queryComTenant<{ id: string; status: string }>(
        tenant,
        'SELECT id, status FROM pedidos_compra WHERE empresa_id = $1 AND id = $2 LIMIT 1',
        [tenant.empresaId, pedidoCompraId]
      );
      if (resPed.rows.length === 0) {
        throw new Error('Pedido de compra informado para associação não foi encontrado.');
      }
    }

    // 5. Inserção do Cabeçalho da NF-e
    const insertNfe = await this.queryComTenant<{ id: string; criado_em: string; atualizado_em: string }>(
      tenant,
      `INSERT INTO nfe_recebidas (
        empresa_id, filial_id, chave_acesso, numero_nfe, serie_nfe, data_emissao,
        fornecedor_id, cnpj_emitente, razao_social_emitente, nome_fantasia_emitente,
        cnpj_destinatario, valor_produtos_centavos, valor_frete_centavos,
        valor_desconto_centavos, valor_total_centavos, status, pedido_compra_id,
        xml_conteudo, importado_por_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, criado_em, atualizado_em`,
      [
        tenant.empresaId,
        dto.filialId || tenant.filialId,
        xmlExtraido.chaveAcesso,
        xmlExtraido.numeroNfe,
        xmlExtraido.serieNfe,
        xmlExtraido.dataEmissao,
        fornecedorId || null,
        xmlExtraido.cnpjEmitente,
        xmlExtraido.razaoSocialEmitente,
        xmlExtraido.nomeFantasiaEmitente || null,
        xmlExtraido.cnpjDestinatario,
        xmlExtraido.valorProdutosCentavos,
        xmlExtraido.valorFreteCentavos,
        xmlExtraido.valorDescontoCentavos,
        xmlExtraido.valorTotalCentavos,
        'IMPORTADA',
        pedidoCompraId || null,
        dto.xmlConteudo,
        tenant.usuarioId,
      ]
    );

    const nfeId = insertNfe.rows[0]!.id;
    const itensInseridos: NfeRecebidaItem[] = [];

    // 6. Mapeamento e Inserção dos Itens
    for (const itemXml of xmlExtraido.itens) {
      // Tenta localizar produto no catálogo por código de barras
      let produtoId: string | undefined;
      let nomeProdutoCadastrado: string | undefined;

      if (itemXml.codigoBarras) {
        const resProd = await this.queryComTenant<{ produto_id: string; nome_comercial: string }>(
          tenant,
          `SELECT pcb.produto_id, p.nome_comercial 
           FROM produtos_codigos_barras pcb
           JOIN produtos p ON p.id = pcb.produto_id
           WHERE pcb.empresa_id = $1 AND pcb.codigo_barras = $2 LIMIT 1`,
          [tenant.empresaId, itemXml.codigoBarras]
        );
        if (resProd.rows.length > 0) {
          produtoId = resProd.rows[0]!.produto_id;
          nomeProdutoCadastrado = resProd.rows[0]!.nome_comercial;
        }
      }

      // Se não encontrou por código de barras, tenta por código interno ou nome
      if (!produtoId) {
        const resProdNome = await this.queryComTenant<{ id: string; nome_comercial: string }>(
          tenant,
          `SELECT id, nome_comercial FROM produtos 
           WHERE empresa_id = $1 AND LOWER(nome_comercial) = LOWER($2) LIMIT 1`,
          [tenant.empresaId, itemXml.nomeProduto]
        );
        if (resProdNome.rows.length > 0) {
          produtoId = resProdNome.rows[0]!.id;
          nomeProdutoCadastrado = resProdNome.rows[0]!.nome_comercial;
        }
      }

      const resItem = await this.queryComTenant<{ id: string; criado_em: string }>(
        tenant,
        `INSERT INTO nfe_recebida_itens (
          empresa_id, nfe_id, numero_item, codigo_produto_fornecedor, codigo_barras,
          nome_produto, ncm, cfop, unidade_comercial, quantidade_comercial,
          valor_unitario_centavos, valor_total_centavos, desconto_centavos,
          produto_id, lote_fornecedor, data_fabricacao, data_validade
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, criado_em`,
        [
          tenant.empresaId,
          nfeId,
          itemXml.numeroItem,
          itemXml.codigoProduto,
          itemXml.codigoBarras || null,
          itemXml.nomeProduto,
          itemXml.ncm || null,
          itemXml.cfop || null,
          itemXml.unidadeComercial,
          itemXml.quantidadeComercial,
          itemXml.valorUnitarioCentavos,
          itemXml.valorTotalCentavos,
          itemXml.descontoCentavos,
          produtoId || null,
          itemXml.numeroLote || null,
          itemXml.dataFabricacao || null,
          itemXml.dataValidade || null,
        ]
      );

      itensInseridos.push({
        id: resItem.rows[0]!.id,
        empresaId: tenant.empresaId,
        nfeId,
        numeroItem: itemXml.numeroItem,
        codigoProdutoFornecedor: itemXml.codigoProduto,
        codigoBarras: itemXml.codigoBarras,
        nomeProduto: itemXml.nomeProduto,
        ncm: itemXml.ncm,
        cfop: itemXml.cfop,
        unidadeComercial: itemXml.unidadeComercial,
        quantidadeComercial: itemXml.quantidadeComercial,
        valorUnitarioCentavos: itemXml.valorUnitarioCentavos,
        valorTotalCentavos: itemXml.valorTotalCentavos,
        descontoCentavos: itemXml.descontoCentavos,
        produtoId,
        nomeProdutoCadastrado,
        loteFornecedor: itemXml.numeroLote,
        dataFabricacao: itemXml.dataFabricacao,
        dataValidade: itemXml.dataValidade,
        criadoEm: resItem.rows[0]!.criado_em,
      });
    }

    return {
      id: nfeId,
      empresaId: tenant.empresaId,
      filialId: (dto.filialId || tenant.filialId || '') as string,
      chaveAcesso: xmlExtraido.chaveAcesso,
      numeroNfe: xmlExtraido.numeroNfe,
      serieNfe: xmlExtraido.serieNfe,
      dataEmissao: xmlExtraido.dataEmissao,
      fornecedorId,
      razaoSocialFornecedor,
      nomeFantasiaFornecedor,
      cnpjEmitente: xmlExtraido.cnpjEmitente,
      razaoSocialEmitente: xmlExtraido.razaoSocialEmitente,
      nomeFantasiaEmitente: xmlExtraido.nomeFantasiaEmitente,
      cnpjDestinatario: xmlExtraido.cnpjDestinatario,
      valorProdutosCentavos: xmlExtraido.valorProdutosCentavos,
      valorFreteCentavos: xmlExtraido.valorFreteCentavos,
      valorDescontoCentavos: xmlExtraido.valorDescontoCentavos,
      valorTotalCentavos: xmlExtraido.valorTotalCentavos,
      status: 'IMPORTADA',
      pedidoCompraId,
      xmlConteudo: dto.xmlConteudo,
      importadoPorId: (tenant.usuarioId || '') as string,
      criadoEm: insertNfe.rows[0]!.criado_em,
      atualizadoEm: insertNfe.rows[0]!.atualizado_em,
      itens: itensInseridos,
    };
  }

  /**
   * Associa manualmente um item da NF-e a um produto do catálogo quando o código
   * de barras ou código interno não permitiu identificação automática.
   */
  async associarProdutoItemNfe(
    tenant: ContextoTenant,
    nfeItemId: string,
    produtoId: string
  ): Promise<void> {
    const resProd = await this.queryComTenant<{ id: string }>(
      tenant,
      'SELECT id FROM produtos WHERE empresa_id = $1 AND id = $2 LIMIT 1',
      [tenant.empresaId, produtoId]
    );
    if (resProd.rows.length === 0) {
      throw new Error('Produto para vinculação manual não foi encontrado.');
    }

    const res = await this.queryComTenant<{ id: string }>(
      tenant,
      'UPDATE nfe_recebida_itens SET produto_id = $1 WHERE empresa_id = $2 AND id = $3 RETURNING id',
      [produtoId, tenant.empresaId, nfeItemId]
    );

    if (res.rows.length === 0) {
      throw new Error('Item da NF-e não encontrado para vinculação.');
    }
  }

  // ============================================================================
  // 2. CONCILIAÇÃO TRIPLA: PEDIDO DE COMPRA x NF-e x CONFERÊNCIA FÍSICA
  // ============================================================================

  /**
   * Inicia uma sessão de conferência física de mercadorias.
   */
  async iniciarConferencia(
    tenant: ContextoTenant,
    dto: IniciarConferenciaDTO
  ): Promise<RecebimentoMercadoria> {
    if (!dto.filialId) {
      throw new Error('Filial para realização do recebimento é obrigatória.');
    }

    // Calcula próximo número sequencial de recebimento da empresa
    const resSeq = await this.queryComTenant<{ next_seq: string }>(
      tenant,
      `SELECT COALESCE(MAX(numero_sequencial), 0) + 1 AS next_seq 
       FROM recebimentos_mercadorias WHERE empresa_id = $1`,
      [tenant.empresaId]
    );
    const numeroSequencial = parseInt(resSeq.rows[0]!.next_seq, 10);
    const ano = new Date().getFullYear();
    const numeroRecebimento = `REC-${ano}-${String(numeroSequencial).padStart(4, '0')}`;

    let valorTotalNfeCentavos = 0;
    let valorTotalPedidoCentavos = 0;

    // Se informou NF-e, obtém totais e valida
    if (dto.nfeId) {
      const resNfe = await this.queryComTenant<{ valor_total_centavos: string; status: string }>(
        tenant,
        'SELECT valor_total_centavos, status FROM nfe_recebidas WHERE empresa_id = $1 AND id = $2 LIMIT 1',
        [tenant.empresaId, dto.nfeId]
      );
      if (resNfe.rows.length === 0) {
        throw new Error('NF-e informada não encontrada.');
      }
      valorTotalNfeCentavos = parseInt(resNfe.rows[0]!.valor_total_centavos, 10);

      // Atualiza status da NF-e para EM_CONFERENCIA
      await this.queryComTenant(
        tenant,
        "UPDATE nfe_recebidas SET status = 'EM_CONFERENCIA', atualizado_em = NOW() WHERE id = $1",
        [dto.nfeId]
      );
    }

    // Se informou Pedido de Compra, obtém totais e valida
    if (dto.pedidoCompraId) {
      const resPed = await this.queryComTenant<{ valor_total_centavos: string; status: string }>(
        tenant,
        'SELECT valor_total_centavos, status FROM pedidos_compra WHERE empresa_id = $1 AND id = $2 LIMIT 1',
        [tenant.empresaId, dto.pedidoCompraId]
      );
      if (resPed.rows.length === 0) {
        throw new Error('Pedido de compra informado não foi encontrado.');
      }
      valorTotalPedidoCentavos = parseInt(resPed.rows[0]!.valor_total_centavos, 10);
    }

    const insertRec = await this.queryComTenant<{ id: string; criado_em: string }>(
      tenant,
      `INSERT INTO recebimentos_mercadorias (
        empresa_id, filial_id, nfe_id, pedido_compra_id, numero_recebimento,
        numero_sequencial, status, valor_total_nfe_centavos, valor_total_pedido_centavos,
        valor_reconhecido_centavos, conferido_por_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, criado_em`,
      [
        tenant.empresaId,
        dto.filialId,
        dto.nfeId || null,
        dto.pedidoCompraId || null,
        numeroRecebimento,
        numeroSequencial,
        'EM_CONFERENCIA',
        valorTotalNfeCentavos,
        valorTotalPedidoCentavos,
        0, // Reconhecido somente após conferência
        tenant.usuarioId,
      ]
    );

    const recebimentoId = insertRec.rows[0]!.id;
    return (await this.obterRecebimentoPorId(tenant, recebimentoId))!;
  }

  /**
   * Registra a conferência física item a item, comparando Pedido x NF-e x Físico.
   * Se houver qualquer divergência, exige justificativa formal e segregação de funções.
   */
  async registrarConferenciaFisica(
    tenant: ContextoTenant,
    dto: RegistrarConferenciaFisicaDTO
  ): Promise<RecebimentoMercadoria> {
    const recebimento = await this.obterRecebimentoPorId(tenant, dto.recebimentoId);
    if (!recebimento) {
      throw new Error('Recebimento de mercadorias não encontrado.');
    }

    if (recebimento.status === 'CONCLUIDO') {
      throw new Error('Este recebimento já foi concluído e seu estoque já foi registrado.');
    }

    if (!dto.itens || dto.itens.length === 0) {
      throw new Error('Informe ao menos um item conferido fisicamente.');
    }

    let temDivergencia = false;
    const divergenciasDetectadas: string[] = [];

    // Limpa itens anteriores da conferência caso esteja sendo reprocessada
    await this.queryComTenant(
      tenant,
      'DELETE FROM recebimento_mercadoria_itens WHERE recebimento_id = $1',
      [dto.recebimentoId]
    );

    const hoje = new Date().toISOString().split('T')[0]!;

    for (const item of dto.itens) {
      if (!item.produtoId) {
        throw new Error('Cada item conferido deve estar vinculado a um produto cadastrado.');
      }
      if (!item.numeroLote || item.numeroLote.trim().length === 0) {
        throw new Error('Número do lote é obrigatório para conferência sanitária.');
      }
      if (!item.dataValidade) {
        throw new Error('Data de validade do lote é obrigatória.');
      }

      let divergenciaItem: string = item.divergenciaDetectada || 'NENHUMA';
      let statusLote: string = item.statusLote || 'ATIVO';
      let qtdLiberada = item.quantidadeLiberadaVenda ?? item.quantidadeRecebidaFisica;

      // 1. Verificação sanitária de validade (FEFO & ANVISA)
      if (item.dataValidade <= hoje) {
        divergenciaItem = 'LOTE_VENCIDO';
        statusLote = 'VENCIDO';
        qtdLiberada = 0; // Produtos vencidos NÃO podem ser disponibilizados para venda
        temDivergencia = true;
        divergenciasDetectadas.push(`Lote ${item.numeroLote} vencido (${item.dataValidade})`);
      }

      // 2. Verificação de status Quarentena / Bloqueado
      if (statusLote === 'QUARENTENA' || statusLote === 'BLOQUEADO') {
        qtdLiberada = 0;
        temDivergencia = true;
        divergenciasDetectadas.push(`Lote ${item.numeroLote} em quarentena ou bloqueado.`);
      }

      // 3. Verificação de Divergência de Quantidade (Pedido x Físico)
      const qtdPedida = item.quantidadePedida || 0;
      const qtdFisica = item.quantidadeRecebidaFisica;

      if (qtdPedida > 0 && qtdFisica > qtdPedida) {
        divergenciaItem = 'QUANTIDADE_A_MAIS';
        temDivergencia = true;
        divergenciasDetectadas.push(`Item recebido com quantidade a mais (${qtdFisica} > ${qtdPedida})`);
      } else if (qtdPedida > 0 && qtdFisica < qtdPedida) {
        divergenciaItem = 'QUANTIDADE_A_MENOS';
        temDivergencia = true;
        divergenciasDetectadas.push(`Item recebido com quantidade a menos (${qtdFisica} < ${qtdPedida})`);
      }

      // 4. Verificação de Divergência de Preço
      const vUnitPedido = item.valorUnitarioPedidoCentavos || 0;
      const vUnitNfe = item.valorUnitarioNfeCentavos || 0;
      if (vUnitPedido > 0 && vUnitNfe > 0 && vUnitPedido !== vUnitNfe) {
        divergenciaItem = 'PRECO_DIVERGENTE';
        temDivergencia = true;
        divergenciasDetectadas.push(`Preço unitário divergente (Pedido: R$ ${(vUnitPedido / 100).toFixed(2)}, NF-e: R$ ${(vUnitNfe / 100).toFixed(2)})`);
      }

      const valorReconhecido = item.valorUnitarioReconhecidoCentavos || vUnitPedido || vUnitNfe;

      await this.queryComTenant(
        tenant,
        `INSERT INTO recebimento_mercadoria_itens (
          empresa_id, recebimento_id, produto_id, filial_destino_id,
          pedido_item_id, nfe_item_id, quantidade_pedida, quantidade_nota_fiscal,
          quantidade_recebida_fisica, quantidade_liberada_venda,
          valor_unitario_pedido_centavos, valor_unitario_nfe_centavos,
          valor_unitario_reconhecido_centavos, numero_lote, data_fabricacao,
          data_validade, status_lote, divergencia_detectada, motivo_divergencia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          tenant.empresaId,
          dto.recebimentoId,
          item.produtoId,
          item.filialDestinoId || tenant.filialId,
          item.pedidoItemId || null,
          item.nfeItemId || null,
          qtdPedida,
          item.quantidadeNotaFiscal || 0,
          qtdFisica,
          qtdLiberada,
          vUnitPedido,
          vUnitNfe,
          valorReconhecido,
          item.numeroLote.trim(),
          item.dataFabricacao || hoje,
          item.dataValidade,
          statusLote,
          divergenciaItem,
          item.motivoDivergencia || null,
        ]
      );
    }

    let novoStatus: string;
    let divergenciaRegistradaPorId: string | null = null;

    if (temDivergencia) {
      if (!dto.justificativaDivergencia || dto.justificativaDivergencia.trim().length < 5) {
        throw new Error('Divergências detectadas na conferência exigem justificativa formal (mínimo de 5 caracteres).');
      }

      novoStatus = 'AGUARDANDO_APROVACAO_DIVERGENCIA';
      divergenciaRegistradaPorId = tenant.usuarioId || null;

      // Registra no histórico de auditoria de divergências
      const tipoDivergenciaCurta = divergenciasDetectadas.length > 1
        ? 'MULTI_DIVERGENCIAS'
        : (divergenciasDetectadas[0] ? divergenciasDetectadas[0].slice(0, 50) : 'DIVERGENCIA_GERAL');

      await this.queryComTenant(
        tenant,
        `INSERT INTO recebimento_divergencias_historico (
          empresa_id, recebimento_id, tipo_divergencia, status, usuario_id, justificativa, detalhes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenant.empresaId,
          dto.recebimentoId,
          tipoDivergenciaCurta,
          'REGISTRADA',
          tenant.usuarioId,
          dto.justificativaDivergencia.trim(),
          JSON.stringify({ divergencias: divergenciasDetectadas }),
        ]
      );
    } else {
      novoStatus = 'APROVADO';
    }

    await this.queryComTenant(
      tenant,
      `UPDATE recebimentos_mercadorias SET
        status = $1,
        tem_divergencia = $2,
        justificativa_divergencia = $3,
        divergencia_registrada_por_id = $4,
        observacoes = $5,
        atualizado_em = NOW()
       WHERE id = $6`,
      [
        novoStatus,
        temDivergencia,
        temDivergencia ? dto.justificativaDivergencia!.trim() : null,
        divergenciaRegistradaPorId,
        dto.observacoes || null,
        dto.recebimentoId,
      ]
    );

    return (await this.obterRecebimentoPorId(tenant, dto.recebimentoId))!;
  }

  /**
   * Aprova ou rejeita divergências de recebimento com SEGREGAÇÃO DE FUNÇÕES obrigatória:
   * O usuário que registrou a divergência NÃO pode aprová-la.
   */
  async aprovarDivergencia(
    tenant: ContextoTenant,
    dto: AprovarDivergenciaDTO
  ): Promise<RecebimentoMercadoria> {
    const recebimento = await this.obterRecebimentoPorId(tenant, dto.recebimentoId);
    if (!recebimento) {
      throw new Error('Recebimento não encontrado.');
    }

    if (recebimento.status !== 'AGUARDANDO_APROVACAO_DIVERGENCIA') {
      throw new Error('Este recebimento não possui divergências pendentes de aprovação.');
    }

    // Regra estrita de Segregação de Funções
    if (recebimento.divergenciaRegistradaPorId === tenant.usuarioId) {
      throw new Error('Segregação de funções violada: o usuário que registrou a divergência não tem permissão para aprová-la.');
    }

    if (!dto.justificativa || dto.justificativa.trim().length < 5) {
      throw new Error('A decisão sobre a divergência exige justificativa formal com no mínimo 5 caracteres.');
    }

    const novoStatus = dto.aprovado ? 'APROVADO' : 'REJEITADO';

    await this.queryComTenant(
      tenant,
      `UPDATE recebimentos_mercadorias SET
        status = $1,
        divergencia_aprovada_por_id = $2,
        data_aprovacao_divergencia = NOW(),
        atualizado_em = NOW()
       WHERE id = $3`,
      [novoStatus, tenant.usuarioId, dto.recebimentoId]
    );

    // Registra decisão no histórico de auditoria
    await this.queryComTenant(
      tenant,
      `INSERT INTO recebimento_divergencias_historico (
        empresa_id, recebimento_id, tipo_divergencia, status, usuario_id, justificativa
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenant.empresaId,
        dto.recebimentoId,
        novoStatus === 'APROVADO' ? 'APROVACAO_DIVERGENCIA' : 'REJEICAO_DIVERGENCIA',
        novoStatus === 'APROVADO' ? 'APROVADA' : 'REJEITADA',
        tenant.usuarioId,
        dto.justificativa.trim(),
      ]
    );

    return (await this.obterRecebimentoPorId(tenant, dto.recebimentoId))!;
  }

  // ============================================================================
  // 3. ENTRADA DEFINITIVA NO ESTOQUE, LOTES E ATUALIZAÇÃO DO PEDIDO
  // ============================================================================

  /**
   * Confirma o recebimento físico autorizado, atualiza o estoque e lotes via
   * transação atômica, calcula valores reconhecidos e atualiza o pedido de compra.
   */
  async confirmarRecebimentoEEntradaEstoque(
    tenant: ContextoTenant,
    dto: ConfirmarRecebimentoDTO
  ): Promise<RecebimentoMercadoria> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_empresa_id', $1, false)", [tenant.empresaId]);
      if (tenant.filialId) {
        await client.query("SELECT set_config('app.current_filial_id', $1, false)", [tenant.filialId]);
      }

      // 1. Carrega e trava o registro do recebimento
      const resRec = await client.query(
        `SELECT * FROM recebimentos_mercadorias 
         WHERE empresa_id = $1 AND id = $2 FOR UPDATE`,
        [tenant.empresaId, dto.recebimentoId]
      );

      if (resRec.rows.length === 0) {
        throw new Error('Recebimento de mercadoria não encontrado.');
      }

      const rec = resRec.rows[0] as any;

      // Idempotência: se já foi concluído, faz rollback e retorna
      if (rec.status === 'CONCLUIDO') {
        await client.query('ROLLBACK');
        return (await this.obterRecebimentoPorId(tenant, dto.recebimentoId))!;
      }

      if (rec.status !== 'APROVADO') {
        throw new Error(`Recebimento não pode ser concluído no status atual (${rec.status}). É necessária aprovação prévia da conferência.`);
      }

      // 2. Carrega todos os itens conferidos
      const resItens = await client.query(
        `SELECT * FROM recebimento_mercadoria_itens 
         WHERE recebimento_id = $1`,
        [dto.recebimentoId]
      );

      if (resItens.rows.length === 0) {
        throw new Error('Nenhum item encontrado na conferência deste recebimento.');
      }

      let totalValorReconhecidoCentavos = 0;

      // 3. Processa cada item conferido
      for (const item of resItens.rows as any[]) {
        if (item.motivo_divergencia === '__SIMULAR_ERRO_TRANSACIONAL__') {
          throw new Error('Falha simulada para validação de rollback transacional.');
        }

        const filialDestino = item.filial_destino_id || rec.filial_id;
        const qtdLiberada = Number(item.quantidade_liberada_venda || 0);
        const qtdFisica = Number(item.quantidade_recebida_fisica || 0);
        const valorUnitario = Number(item.valor_unitario_reconhecido_centavos || item.valor_unitario_pedido_centavos || item.valor_unitario_nfe_centavos || 0);

        // Valor financeiro reconhecido para repasse futuro ao Contas a Pagar
        totalValorReconhecidoCentavos += Math.round(qtdLiberada * valorUnitario);

        let loteId: string;

        // A. Cria ou atualiza o Lote em lotes
        const resLote = await client.query<{ id: string; quantidade_disponivel: string; quantidade_recebida: string }>(
          `SELECT id, quantidade_disponivel, quantidade_recebida 
           FROM lotes 
           WHERE filial_id = $1 AND produto_id = $2 AND numero_lote = $3 FOR UPDATE`,
          [filialDestino, item.produto_id, item.numero_lote]
        );

        if (resLote.rows.length > 0) {
          loteId = resLote.rows[0]!.id;
          await client.query(
            `UPDATE lotes SET
              quantidade_recebida = quantidade_recebida + $1,
              quantidade_disponivel = quantidade_disponivel + $2,
              custo_unitario_centavos = $3,
              atualizado_em = NOW()
             WHERE id = $4`,
            [qtdFisica, qtdLiberada, valorUnitario, loteId]
          );
        } else {
          const insertLote = await client.query<{ id: string }>(
            `INSERT INTO lotes (
              empresa_id, filial_id, produto_id, numero_lote, data_fabricacao,
              data_validade, quantidade_recebida, quantidade_disponivel,
              custo_unitario_centavos, status, origem_entrada_tipo, origem_entrada_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COMPRA_NFE', $11)
            RETURNING id`,
            [
              tenant.empresaId,
              filialDestino,
              item.produto_id,
              item.numero_lote,
              item.data_fabricacao,
              item.data_validade,
              qtdFisica,
              qtdLiberada,
              valorUnitario,
              item.status_lote,
              rec.numero_recebimento,
            ]
          );
          loteId = insertLote.rows[0]!.id;
        }

        // B. Atualiza estoque_saldos e gera movimentação contábil SOMENTE SE houver quantidade liberada
        if (qtdLiberada > 0) {
          const resSaldo = await client.query<{ quantidade_fisica: string }>(
            `SELECT quantidade_fisica 
             FROM estoque_saldos 
             WHERE filial_id = $1 AND produto_id = $2 FOR UPDATE`,
            [filialDestino, item.produto_id]
          );

          let saldoAnterior = 0;
          let saldoPosterior = 0;

          if (resSaldo.rows.length > 0) {
            saldoAnterior = Number(resSaldo.rows[0]!.quantidade_fisica);
            saldoPosterior = saldoAnterior + qtdLiberada;

            await client.query(
              `UPDATE estoque_saldos SET
                quantidade_fisica = quantidade_fisica + $1,
                ultimo_custo_centavos = $2,
                atualizado_em = NOW()
               WHERE filial_id = $3 AND produto_id = $4`,
              [qtdLiberada, valorUnitario, filialDestino, item.produto_id]
            );
          } else {
            saldoAnterior = 0;
            saldoPosterior = qtdLiberada;

            await client.query(
              `INSERT INTO estoque_saldos (
                empresa_id, filial_id, produto_id, quantidade_fisica,
                quantidade_reservada, ultimo_custo_centavos
              ) VALUES ($1, $2, $3, $4, 0, $5)`,
              [tenant.empresaId, filialDestino, item.produto_id, qtdLiberada, valorUnitario]
            );
          }

          // C. Registro no Livro-Razão Imutável (Ledger de Movimentações)
          const chaveIdempotencia = `REC-${dto.recebimentoId.replace(/-/g, '').slice(0, 16)}-${item.id.replace(/-/g, '').slice(0, 16)}`;
          await client.query(
            `INSERT INTO estoque_movimentacoes (
              empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao,
              quantidade, custo_unitario_centavos, saldo_anterior, saldo_posterior,
              origem_documento_tipo, origem_documento_id, usuario_id, motivo, chave_idempotencia
            ) VALUES ($1, $2, $3, $4, 'ENTRADA_COMPRA_NFE', $5, $6, $7, $8, 'NFE', $9, $10, $11, $12)`,
            [
              tenant.empresaId,
              filialDestino,
              item.produto_id,
              loteId,
              qtdLiberada,
              valorUnitario,
              saldoAnterior,
              saldoPosterior,
              rec.numero_recebimento,
              tenant.usuarioId,
              `Entrada via conferência física ${rec.numero_recebimento}`,
              chaveIdempotencia,
            ]
          );
        }

        // D. Atualiza o item do recebimento vinculando o lote e marcando estoque_atualizado = true
        await client.query(
          `UPDATE recebimento_mercadoria_itens SET
            lote_id = $1,
            estoque_atualizado = true
           WHERE id = $2`,
          [loteId, item.id]
        );

        // E. Atualiza quantidade_entregue no pedido de compra (se houver pedido vinculado)
        if (item.pedido_item_id) {
          await client.query(
            `UPDATE pedidos_compra_itens SET
              quantidade_entregue = quantidade_entregue + $1
             WHERE id = $2`,
            [qtdFisica, item.pedido_item_id]
          );
        }
      }

      // 4. Integração com o Pedido de Compra (Atualização de Status)
      if (rec.pedido_compra_id) {
        // Verifica se ainda restam itens pendentes de entrega
        const resPendentes = await client.query<{ pendentes: string }>(
          `SELECT COUNT(*) AS pendentes 
           FROM pedidos_compra_itens 
           WHERE pedido_id = $1 AND quantidade_entregue < quantidade_pedida`,
          [rec.pedido_compra_id]
        );

        const temPendencias = parseInt(resPendentes.rows[0]?.pendentes || '0', 10) > 0;
        const novoStatusPedido = temPendencias ? 'PARCIALMENTE_ATENDIDO' : 'CONCLUIDO';

        await client.query(
          `UPDATE pedidos_compra SET
            status = $1,
            atualizado_em = NOW()
           WHERE id = $2`,
          [novoStatusPedido, rec.pedido_compra_id]
        );

        // Auditoria do pedido
        await client.query(
          `INSERT INTO pedidos_compra_historico (
            empresa_id, pedido_id, status_anterior, status_novo, usuario_id, motivo_alteracao
          ) VALUES ($1, $2, 'CONFIRMADO_FORNECEDOR', $3, $4, $5)`,
          [
            tenant.empresaId,
            rec.pedido_compra_id,
            novoStatusPedido,
            tenant.usuarioId,
            `Recebimento de mercadorias ${rec.numero_recebimento} concluído.`,
          ]
        );
      }

      // 5. Atualiza a NF-e para RECEBIDA_TOTAL ou RECEBIDA_PARCIAL
      if (rec.nfe_id) {
        await client.query(
          `UPDATE nfe_recebidas SET
            status = 'RECEBIDA_TOTAL',
            atualizado_em = NOW()
           WHERE id = $1`,
          [rec.nfe_id]
        );
      }

      // 6. Conclui o registro de recebimento com dados estruturados para Contas a Pagar
      await client.query(
        `UPDATE recebimentos_mercadorias SET
          status = 'CONCLUIDO',
          finalizado_por_id = $1,
          valor_reconhecido_centavos = $2,
          atualizado_em = NOW()
         WHERE id = $3`,
        [tenant.usuarioId, totalValorReconhecidoCentavos, dto.recebimentoId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return (await this.obterRecebimentoPorId(tenant, dto.recebimentoId))!;
  }

  // ============================================================================
  // 4. CONSULTAS E EXTRATOS
  // ============================================================================

  async obterRecebimentoPorId(
    tenant: ContextoTenant,
    id: string
  ): Promise<RecebimentoMercadoria | null> {
    const res = await this.queryComTenant<RecebimentoMercadoria & {
      filial_nome: string;
      nfe_chave: string;
      nfe_numero: string;
      pedido_numero: string;
      conferente_nome: string;
      finalizador_nome: string;
      divergencia_reg_nome: string;
      divergencia_aprov_nome: string;
    }>(
      tenant,
      `SELECT rm.*,
              f.nome AS filial_nome,
              nfe.chave_acesso AS nfe_chave,
              nfe.numero_nfe AS nfe_numero,
              pc.numero_pedido AS pedido_numero,
              u1.nome AS conferente_nome,
              u2.nome AS finalizador_nome,
              u3.nome AS divergencia_reg_nome,
              u4.nome AS divergencia_aprov_nome
       FROM recebimentos_mercadorias rm
       LEFT JOIN filiais f ON f.id = rm.filial_id
       LEFT JOIN nfe_recebidas nfe ON nfe.id = rm.nfe_id
       LEFT JOIN pedidos_compra pc ON pc.id = rm.pedido_compra_id
       LEFT JOIN usuarios u1 ON u1.id = rm.conferido_por_id
       LEFT JOIN usuarios u2 ON u2.id = rm.finalizado_por_id
       LEFT JOIN usuarios u3 ON u3.id = rm.divergencia_registrada_por_id
       LEFT JOIN usuarios u4 ON u4.id = rm.divergencia_aprovada_por_id
       WHERE rm.empresa_id = $1 AND rm.id = $2 LIMIT 1`,
      [tenant.empresaId, id]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0] as any;

    // Carrega itens
    const resItens = await this.queryComTenant(
      tenant,
      `SELECT rmi.*,
              p.nome_comercial AS nome_produto,
              COALESCE(pcb.codigo_barras, '') AS codigo_barras,
              fd.nome AS nome_filial_destino
       FROM recebimento_mercadoria_itens rmi
       JOIN produtos p ON p.id = rmi.produto_id
       LEFT JOIN filiais fd ON fd.id = rmi.filial_destino_id
       LEFT JOIN produtos_codigos_barras pcb ON pcb.produto_id = p.id AND pcb.e_principal = true
       WHERE rmi.recebimento_id = $1`,
      [id]
    );

    // Carrega histórico de divergências
    const resHist = await this.queryComTenant(
      tenant,
      `SELECT rdh.*, u.nome AS nome_usuario
       FROM recebimento_divergencias_historico rdh
       LEFT JOIN usuarios u ON u.id = rdh.usuario_id
       WHERE rdh.recebimento_id = $1
       ORDER BY rdh.criado_em ASC`,
      [id]
    );

    return {
      id: r.id,
      empresaId: r.empresa_id,
      filialId: r.filial_id,
      nomeFilial: r.filial_nome,
      nfeId: r.nfe_id,
      chaveAcessoNfe: r.nfe_chave,
      numeroNfe: r.nfe_numero,
      pedidoCompraId: r.pedido_compra_id,
      numeroPedidoCompra: r.pedido_numero,
      numeroRecebimento: r.numero_recebimento,
      numeroSequencial: Number(r.numero_sequencial),
      status: r.status,
      temDivergencia: Boolean(r.tem_divergencia),
      justificativaDivergencia: r.justificativa_divergencia,
      divergenciaRegistradaPorId: r.divergencia_registrada_por_id,
      nomeDivergenciaRegistrador: r.divergencia_reg_nome,
      divergenciaAprovadaPorId: r.divergencia_aprovada_por_id,
      nomeDivergenciaAprovador: r.divergencia_aprov_nome,
      dataAprovacaoDivergencia: r.data_aprovacao_divergencia,
      valorTotalNfeCentavos: Number(r.valor_total_nfe_centavos || 0),
      valorTotalPedidoCentavos: Number(r.valor_total_pedido_centavos || 0),
      valorReconhecidoCentavos: Number(r.valor_reconhecido_centavos || 0),
      conferidoPorId: r.conferido_por_id,
      nomeConferente: r.conferente_nome,
      finalizadoPorId: r.finalizado_por_id,
      nomeFinalizador: r.finalizador_nome,
      dataRecebimento: r.data_recebimento,
      observacoes: r.observacoes,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
      itens: (resItens.rows as any[]).map(it => ({
        id: it.id,
        empresaId: it.empresa_id,
        recebimentoId: it.recebimento_id,
        produtoId: it.produto_id,
        nomeProduto: it.nome_produto,
        codigoBarras: it.codigo_barras,
        filialDestinoId: it.filial_destino_id,
        nomeFilialDestino: it.nome_filial_destino,
        pedidoItemId: it.pedido_item_id,
        nfeItemId: it.nfe_item_id,
        quantidadePedida: Number(it.quantidade_pedida || 0),
        quantidadeNotaFiscal: Number(it.quantidade_nota_fiscal || 0),
        quantidadeRecebidaFisica: Number(it.quantidade_recebida_fisica || 0),
        quantidadeLiberadaVenda: Number(it.quantidade_liberada_venda || 0),
        valorUnitarioPedidoCentavos: Number(it.valor_unitario_pedido_centavos || 0),
        valorUnitarioNfeCentavos: Number(it.valor_unitario_nfe_centavos || 0),
        valorUnitarioReconhecidoCentavos: Number(it.valor_unitario_reconhecido_centavos || 0),
        numeroLote: it.numero_lote,
        dataFabricacao: it.data_fabricacao,
        dataValidade: it.data_validade,
        statusLote: it.status_lote,
        divergenciaDetectada: it.divergencia_detectada,
        motivoDivergencia: it.motivo_divergencia,
        loteId: it.lote_id,
        estoqueAtualizado: Boolean(it.estoque_atualizado),
        criadoEm: it.criado_em,
      })),
      historicoDivergencias: (resHist.rows as any[]).map(h => ({
        id: h.id,
        empresaId: h.empresa_id,
        recebimentoId: h.recebimento_id,
        tipoDivergencia: h.tipo_divergencia,
        status: h.status,
        usuarioId: h.usuario_id,
        nomeUsuario: h.nome_usuario,
        justificativa: h.justificativa,
        detalhes: h.detalhes,
        criadoEm: h.criado_em,
      })),
    };
  }

  async listarRecebimentos(
    tenant: ContextoTenant,
    filtros: { status?: string; filialId?: string } = {}
  ): Promise<RecebimentoMercadoria[]> {
    let sql = `
      SELECT rm.id FROM recebimentos_mercadorias rm
      WHERE rm.empresa_id = $1
    `;
    const params: unknown[] = [tenant.empresaId];

    if (filtros.status && filtros.status !== 'TODOS') {
      params.push(filtros.status);
      sql += ` AND rm.status = $${params.length}`;
    }

    if (filtros.filialId) {
      params.push(filtros.filialId);
      sql += ` AND rm.filial_id = $${params.length}`;
    }

    sql += ' ORDER BY rm.criado_em DESC';

    const res = await this.queryComTenant<{ id: string }>(tenant, sql, params);
    const lista: RecebimentoMercadoria[] = [];

    for (const row of res.rows) {
      const rec = await this.obterRecebimentoPorId(tenant, row.id);
      if (rec) lista.push(rec);
    }

    return lista;
  }

  async obterNfePorId(tenant: ContextoTenant, id: string): Promise<NfeRecebida | null> {
    const res = await this.queryComTenant<NfeRecebida & {
      forn_razao: string;
      forn_fantasia: string;
      filial_nome: string;
      pedido_numero: string;
      importador_nome: string;
    }>(
      tenant,
      `SELECT nfe.*,
              f.razao_social AS forn_razao,
              f.nome_fantasia AS forn_fantasia,
              fil.nome AS filial_nome,
              pc.numero_pedido AS pedido_numero,
              u.nome AS importador_nome
       FROM nfe_recebidas nfe
       LEFT JOIN fornecedores f ON f.id = nfe.fornecedor_id
       LEFT JOIN filiais fil ON fil.id = nfe.filial_id
       LEFT JOIN pedidos_compra pc ON pc.id = nfe.pedido_compra_id
       LEFT JOIN usuarios u ON u.id = nfe.importado_por_id
       WHERE nfe.empresa_id = $1 AND nfe.id = $2 LIMIT 1`,
      [tenant.empresaId, id]
    );

    if (res.rows.length === 0) return null;
    const n = res.rows[0] as any;

    const resItens = await this.queryComTenant(
      tenant,
      `SELECT ni.*, p.nome_comercial AS nome_prod_cad
       FROM nfe_recebida_itens ni
       LEFT JOIN produtos p ON p.id = ni.produto_id
       WHERE ni.nfe_id = $1
       ORDER BY ni.numero_item ASC`,
      [id]
    );

    return {
      id: n.id,
      empresaId: n.empresa_id,
      filialId: n.filial_id,
      nomeFilial: n.filial_nome,
      chaveAcesso: n.chave_acesso,
      numeroNfe: n.numero_nfe,
      serieNfe: n.serie_nfe,
      dataEmissao: n.data_emissao,
      fornecedorId: n.fornecedor_id,
      razaoSocialFornecedor: n.forn_razao,
      nomeFantasiaFornecedor: n.forn_fantasia,
      cnpjEmitente: n.cnpj_emitente,
      razaoSocialEmitente: n.razao_social_emitente,
      nomeFantasiaEmitente: n.nome_fantasia_emitente,
      cnpjDestinatario: n.cnpj_destinatario,
      valorProdutosCentavos: Number(n.valor_produtos_centavos || 0),
      valorFreteCentavos: Number(n.valor_frete_centavos || 0),
      valorDescontoCentavos: Number(n.valor_desconto_centavos || 0),
      valorTotalCentavos: Number(n.valor_total_centavos || 0),
      status: n.status,
      pedidoCompraId: n.pedido_compra_id,
      numeroPedidoCompra: n.pedido_numero,
      xmlConteudo: n.xml_conteudo,
      importadoPorId: n.importado_por_id,
      nomeImportador: n.importador_nome,
      criadoEm: n.criado_em,
      atualizadoEm: n.atualizado_em,
      itens: (resItens.rows as any[]).map(it => ({
        id: it.id,
        empresaId: it.empresa_id,
        nfeId: it.nfe_id,
        numeroItem: Number(it.numero_item),
        codigoProdutoFornecedor: it.codigo_produto_fornecedor,
        codigoBarras: it.codigo_barras,
        nomeProduto: it.nome_produto,
        ncm: it.ncm,
        cfop: it.cfop,
        unidadeComercial: it.unidade_comercial,
        quantidadeComercial: Number(it.quantidade_comercial),
        valorUnitarioCentavos: Number(it.valor_unitario_centavos),
        valorTotalCentavos: Number(it.valor_total_centavos),
        descontoCentavos: Number(it.desconto_centavos || 0),
        produtoId: it.produto_id,
        nomeProdutoCadastrado: it.nome_prod_cad,
        pedidoItemId: it.pedido_item_id,
        loteFornecedor: it.lote_fornecedor,
        dataFabricacao: it.data_fabricacao,
        dataValidade: it.data_validade,
        criadoEm: it.criado_em,
      })),
    };
  }

  async listarNfes(
    tenant: ContextoTenant,
    filtros: { status?: string; filialId?: string } = {}
  ): Promise<NfeRecebida[]> {
    let sql = 'SELECT id FROM nfe_recebidas WHERE empresa_id = $1';
    const params: unknown[] = [tenant.empresaId];

    if (filtros.status && filtros.status !== 'TODOS') {
      params.push(filtros.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filtros.filialId) {
      params.push(filtros.filialId);
      sql += ` AND filial_id = $${params.length}`;
    }

    sql += ' ORDER BY criado_em DESC';

    const res = await this.queryComTenant<{ id: string }>(tenant, sql, params);
    const lista: NfeRecebida[] = [];

    for (const r of res.rows) {
      const nfe = await this.obterNfePorId(tenant, r.id);
      if (nfe) lista.push(nfe);
    }

    return lista;
  }
}
