import { grafico } from "./grafico";
import type { BancoView, ConfigSimulacao, DadosCreditas, EtapaView, SimulacaoView } from "./tipos";

export interface OpcoesSimulacao {
  /** Nome do lead, SEMPRE lido do banco. */
  cliente?: string;
  /** Protocolo do lead (`leads.protocolo`). */
  referencia: string;
  /** Sobrepõe `dados.data` (ex.: hoje em SP quando o PDF não traz data). */
  data?: string;
  etapa?: number;
}

/**
 * Regras de negócio do documento (porta de `montar()` do gerar_simulacao.py).
 * Pura: recebe os dados lidos e devolve o que o HTML precisa, sem alterar a
 * entrada.
 */
export function montarSimulacao(
  dados: DadosCreditas,
  cfg: ConfigSimulacao,
  opcoes: OpcoesSimulacao,
): SimulacaoView {
  const excluidos = new Set(cfg.excluirBancos.map((x) => x.toLowerCase()));
  const comparaveis = cfg.indexadoresComparaveis.map((x) => x.toUpperCase());

  let bancos: BancoView[] = [];
  for (const original of dados.bancos) {
    const nome = cfg.nomesBancos[original.nome] ?? original.nome;
    if (excluidos.has(nome.toLowerCase())) continue;
    bancos.push({
      ...original,
      nome,
      parcelas: [...original.parcelas],
      comparavel: comparaveis.includes(original.indexador.toUpperCase()),
      melhor: false,
      cls: "",
      ast: "",
    });
  }
  if (bancos.length === 0) throw new Error("Nenhum banco restou para o comparativo.");

  let comp = bancos.filter((b) => b.comparavel);
  let fora = bancos.filter((b) => !b.comparavel);
  if (comp.length === 0) {
    // Nenhum banco no indexador comparável: compara todos.
    bancos = bancos.map((b) => ({ ...b, comparavel: true }));
    comp = bancos;
    fora = [];
  }

  // Empate fica com o primeiro, como min()/max() do Python.
  const melhor = comp.reduce((a, b) => (b.cet < a.cet ? b : a));
  const pior = comp.reduce((a, b) => (b.custo_total > a.custo_total ? b : a));
  const ordem: BancoView[] = [...comp, ...fora].map((b) => {
    const eMelhor = b === melhor;
    return { ...b, melhor: eMelhor, cls: eMelhor ? "best" : b.comparavel ? "" : "ip", ast: b.comparavel ? "" : "*" };
  });
  const melhorView = ordem.find((b) => b.melhor) as BancoView;
  const piorView = ordem.find((b) => b.nome === pior.nome && b.comparavel) as BancoView;
  const foraView = ordem.filter((b) => !b.comparavel);

  const { svg, legenda } = grafico(
    ordem.filter((b) => b.comparavel).sort((a, b) => a.cet - b.cet),
    dados.meses,
  );

  const etapaAtual = opcoes.etapa || cfg.etapaAtual;
  const etapas: EtapaView[] = cfg.etapas.map(([titulo, desc], k) => {
    const i = k + 1;
    return {
      i,
      titulo,
      desc,
      cls: i < etapaAtual ? "done" : i === etapaAtual ? "now" : "",
      tag: i === etapaAtual ? "Você está aqui" : i < etapaAtual ? "Concluída" : i === etapaAtual + 1 ? "Próximo passo" : "",
    };
  });

  const imovel = dados.valor_imovel;
  const fin = dados.valor_financiamento;
  const cliente = opcoes.cliente || cfg.clientePadrao;
  const compr = cfg.comprometimentoRenda;

  return {
    titulo: cfg.tituloCabecalho,
    saudacao: cfg.saudacao.replace("{cliente}", () => cliente),
    referencia: opcoes.referencia,
    data: opcoes.data ?? dados.data,
    contato: cfg.contato,
    valorImovel: imovel,
    valorFinanciamento: fin,
    entrada: imovel - fin,
    entradaPct: imovel ? Math.round(((imovel - fin) / imovel) * 100) : 0,
    rendaMedia: dados.renda_media,
    bancos: ordem,
    melhor: melhorView,
    pior: piorView,
    economia: pior.custo_total - melhor.custo_total,
    rendaMinima: melhor.primeira / compr,
    comprometimentoPct: Math.round(compr * 100),
    comparaveisTxt: comparaveis.join("/"),
    fora: foraView,
    foraTxt: foraView.map((b) => b.nome).join(", "),
    foraIdx: [...new Set(foraView.map((b) => b.indexador))].sort().join("/"),
    temPrice: ordem.some((b) => b.sistema.toLowerCase() === "price"),
    graficoSvg: svg,
    legenda,
    etapas,
    evolucao: dados.meses.map((mes, i) => ({
      mes,
      celulas: ordem.map((b) => ({ valor: b.parcelas[i] ?? null, cls: b.cls })),
    })),
  };
}
