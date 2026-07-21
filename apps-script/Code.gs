/**
 * Recebe leads das LPs (financiamento, home equity) via POST e grava na aba
 * correta da planilha, com os campos certos para cada funil.
 *
 * O front-end (assets/js/modal-form.js + financiamento.js/home-equity.js)
 * envia um JSON com um campo "aba" indicando o destino:
 *   - "Financiamento" -> lead da LP de financiamento SBPE
 *   - "Home Equity"   -> lead da LP de home equity
 * Se "aba" vier vazio (ex.: uma versão antiga do front-end), cai em "Leads"
 * para não quebrar nada que já dependia do comportamento anterior.
 *
 * CONFIGURAÇÃO NECESSÁRIA:
 * 1. Abra este script a partir de Extensões > Apps Script na sua planilha
 *    (assim SpreadsheetApp.getActiveSpreadsheet() já aponta para ela).
 * 2. Publique como Web App (Implantar > Nova implantação > Aplicativo da Web),
 *    execução "Eu", acesso "Qualquer pessoa" — a URL gerada é o LEAD_ENDPOINT
 *    já configurado em assets/js/modal-form.js.
 */

// aba usada quando o payload não informa "aba" (compatibilidade com versões antigas)
var ABA_PADRAO = 'Leads';

/**
 * Mapa de campos por aba: define, para cada aba, QUAIS colunas existem e em
 * que ordem. A chave é o nome da coluna (cabeçalho); o valor é a chave do
 * campo correspondente no JSON enviado pelo front-end.
 *
 * Para adicionar uma aba nova (ex.: "Consórcio"), basta acrescentar uma
 * entrada aqui — não é preciso tocar no resto do código.
 */
var CONFIG_ABAS = {
  'Financiamento': {
    'Data':                 'data',
    'Nome':                 'nome',
    'CPF':                  'cpf',
    'Telefone':             'telefone',
    'E-mail':               'email',
    'Renda':                'renda',
    'Tipo de remuneração':  'tipo_remuneracao',
    'Entrada disponível':   'entrada_disponivel',
    'Usa FGTS':             'usa_fgts',
    'Valor do imóvel':      'valor_imovel',
    'Momento da compra':    'momento_compra',
    'Tipo de imóvel':       'tipo_imovel',
    'Cidade':               'cidade',
    'Estado':               'estado',
    'Origem':               'origem'
  },
  'Home Equity': {
    'Data':                 'data',
    'Nome':                 'nome',
    'CPF':                  'cpf',
    'Telefone':             'telefone',
    'E-mail':               'email',
    'Renda':                'renda',
    'Tipo de remuneração':  'tipo_remuneracao',
    'Objetivo do crédito':  'objetivo_credito',
    'Tipo de imóvel':       'tipo_imovel',
    'CEP':                  'cep',
    'Número':               'numero',
    'Área (m²)':            'area_m2',
    'Valor do imóvel':      'valor_imovel',
    'Imóvel quitado':       'imovel_quitado',
    'Saldo devedor':        'saldo_devedor',
    'Origem':               'origem'
  },
  // fallback genérico: grava tudo que vier, sem mapeamento fixo de colunas
  'Leads': null
};

function doPost(e) {
  try {
    var lead = JSON.parse(e.postData.contents);
    var nomeAba = (lead.aba && String(lead.aba).trim()) || ABA_PADRAO;
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(nomeAba);
    var mapa = CONFIG_ABAS.hasOwnProperty(nomeAba) ? CONFIG_ABAS[nomeAba] : null;

    if (!aba) {
      aba = planilha.insertSheet(nomeAba);
      var cabecalho = mapa ? Object.keys(mapa) : Object.keys(lead);
      aba.appendRow(cabecalho);
      aba.setFrozenRows(1);
    }

    var linha;
    if (mapa) {
      // grava só os campos definidos no mapa dessa aba, na ordem do cabeçalho
      linha = Object.keys(mapa).map(function (coluna) {
        var chave = mapa[coluna];
        return lead[chave] !== undefined ? lead[chave] : '';
      });
    } else {
      // aba sem mapa definido (ex.: "Leads" legado): grava tudo que veio
      linha = Object.keys(lead).map(function (chave) { return lead[chave]; });
    }

    aba.appendRow(linha);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, aba: nomeAba }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
