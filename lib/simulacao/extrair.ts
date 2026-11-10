import type { BancoCreditas, DadosCreditas } from "./tipos";

/**
 * Leitura do PDF multibanco da Creditas a partir de PALAVRAS COM POSIÇÃO
 * (porta de creditas_parser.py, que usava pdfplumber). Pura: quem lê o PDF de
 * verdade é `extrair-pdf.ts` (pdf.js, só no navegador); aqui o texto vira dado.
 *
 * Regra de ouro: nunca devolver dado parcial. Linha ou coluna faltando é erro,
 * porque o documento vai para o cliente.
 */

/** Palavra do PDF. `y` cresce para baixo (linha de base); unidades em pontos. */
export interface Palavra {
  texto: string;
  x: number;
  y: number;
  largura: number;
}

export interface ColunaBanco {
  nome: string;
  x0: number;
  x1: number;
  /** y da linha de base do nome do banco, na página 1. */
  y: number;
}

export class ErroExtracao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroExtracao";
  }
}

const DINHEIRO = "R\\$\\s?[\\d.]+,\\d{2}";
const PERCENTUAL = "[\\d.]+,\\d+\\s?%";
const TOLERANCIA_LINHA = 2;

function numero(s: string): number {
  return Number(s.replace(/[R$%\s]/g, "").replace(/\./g, "").replace(",", "."));
}

/** Agrupa palavras em linhas (mesmo y, com tolerância) e devolve o texto de cada uma, em ordem de x. */
function linhasDe(palavras: Palavra[]): string[] {
  const uteis = palavras.filter((p) => p.texto.trim() !== "").sort((a, b) => a.y - b.y);
  const grupos: Palavra[][] = [];
  let yBase = Number.NEGATIVE_INFINITY;
  for (const p of uteis) {
    if (grupos.length === 0 || p.y - yBase > TOLERANCIA_LINHA) {
      grupos.push([p]);
      yBase = p.y;
    } else {
      grupos[grupos.length - 1].push(p);
    }
  }
  return grupos.map((g) =>
    g
      .sort((a, b) => a.x - b.x)
      .map((p) => p.texto.trim())
      .join(" "),
  );
}

function acharLinha(linhas: string[], prefixo: string): string | undefined {
  const alvo = prefixo.toLowerCase();
  return linhas.find((l) => l.trim().toLowerCase().startsWith(alvo));
}

/** Nomes dos bancos (palavras próximas viram um nome só) e a posição de cada coluna. */
function colunasDoCabecalho(palavras: Palavra[]): ColunaBanco[] {
  const ancora = palavras.find((p) => p.texto.trim() === "Bancos");
  if (!ancora) {
    throw new ErroExtracao("O arquivo não parece ser uma simulação multibanco da Creditas (cabeçalho \"Bancos\" não encontrado).");
  }
  const linha = palavras
    .filter((p) => p.texto.trim() !== "" && p.y > ancora.y && p.y < ancora.y + 16 && p.x > ancora.x + ancora.largura + 40)
    .sort((a, b) => a.x - b.x);
  const colunas: ColunaBanco[] = [];
  for (const p of linha) {
    const ultimo = colunas[colunas.length - 1];
    if (ultimo && p.x - ultimo.x1 < 6) {
      ultimo.nome += ` ${p.texto.trim()}`;
      ultimo.x1 = p.x + p.largura;
    } else {
      colunas.push({ nome: p.texto.trim(), x0: p.x, x1: p.x + p.largura, y: p.y });
    }
  }
  if (colunas.length === 0) throw new ErroExtracao("Não encontrei os nomes dos bancos na tabela.");
  return colunas;
}

export interface ResultadoExtracao {
  dados: DadosCreditas;
  /** Para o recorte dos logos (extrair-pdf.ts). */
  colunas: ColunaBanco[];
}

export function extrairDadosCreditas(paginas: Palavra[][]): ResultadoExtracao {
  const p1 = paginas[0] ?? [];
  const colunas = colunasDoCabecalho(p1);
  const n = colunas.length;
  const nomes = colunas.map((c) => c.nome);
  const linhas1 = linhasDe(p1);

  const valores = (prefixo: string, regex: string): number[] => {
    const linha = acharLinha(linhas1, prefixo);
    const achados = (linha ?? "").match(new RegExp(regex, "g")) ?? [];
    if (achados.length !== n) {
      throw new ErroExtracao(`Linha "${prefixo}": esperava ${n} valores, encontrei ${achados.length}.`);
    }
    const nums = achados.map(numero);
    if (nums.some((v) => !Number.isFinite(v))) throw new ErroExtracao(`Linha "${prefixo}": valor ilegível.`);
    return nums;
  };
  const dinheiro = (prefixo: string) => valores(prefixo, DINHEIRO);
  const percentual = (prefixo: string) => valores(prefixo, PERCENTUAL);

  const valorImovel = dinheiro("Valor imóvel")[0];
  const valorFinanciamento = dinheiro("Valor financiamento")[0];
  const primeira = dinheiro("Primeira parcela");
  const ultima = dinheiro("Última parcela");
  const taxa = percentual("Taxa de juros");
  const custo = dinheiro("Custo Efetivo Total (R$)");
  const cet = percentual("Custo Efetivo Total (%)");

  const linhaPrazo = acharLinha(linhas1, "Prazo em meses") ?? "";
  const prazo = (linhaPrazo.match(/\b\d{2,3}\b/g) ?? []).map(Number);
  const linhaIndexador = (acharLinha(linhas1, "Indexador") ?? "").slice("Indexador".length);
  const indexador = linhaIndexador.split(/\s+/).filter(Boolean);
  if (prazo.length !== n || indexador.length !== n) {
    throw new ErroExtracao("Não consegui ler prazo ou indexador de todos os bancos.");
  }

  const linhaSistema = (acharLinha(linhas1, "Sistema de amortização") ?? "").slice("Sistema de amortização".length);
  let sistemas = (linhaSistema.match(/\b(SAC|PRICE|Price|SACRE)\b/g) ?? []).map((s) =>
    s.toUpperCase().replace("PRICE", "Price"),
  );
  if (sistemas.length !== n) {
    // A Creditas costuma deixar a linha em branco: deduz pela curva das parcelas.
    sistemas = primeira.map((p, i) => (ultima[i] / p >= 0.85 ? "Price" : "SAC"));
  }

  const texto1 = linhas1.join("\n");
  const mRenda = texto1.match(/renda média estimada[\s\S]*?R\$\s?([\d.]+,\d{2})/i);
  const rendaMedia = mRenda ? numero(mRenda[1]) : null;
  const mData = texto1.match(/Enviado por Creditas\s*•\s*(\d{2}\/\d{2}\/\d{4})/);
  const data = mData ? mData[1] : "";

  // Evolução das parcelas: "<mês> <valor|-> ..." com exatamente n colunas.
  const meses: number[] = [];
  const evolucao: (number | null)[][] = nomes.map(() => []);
  const linhaEvolucao = new RegExp(`^\\s*(\\d{1,3})\\s+((?:${DINHEIRO}|-)(?:\\s+(?:${DINHEIRO}|-))*)\\s*$`);
  for (const pagina of paginas.slice(1)) {
    for (const linha of linhasDe(pagina)) {
      const m = linha.match(linhaEvolucao);
      if (!m) continue;
      const fichas = m[2].match(new RegExp(`${DINHEIRO}|-`, "g")) ?? [];
      if (fichas.length !== n) {
        throw new ErroExtracao(`Tabela de evolução das parcelas: a linha ${m[1]} tem ${fichas.length} colunas e a simulação tem ${n} bancos.`);
      }
      meses.push(Number(m[1]));
      fichas.forEach((f, i) => evolucao[i].push(f === "-" ? null : numero(f)));
    }
  }
  if (meses.length === 0) {
    throw new ErroExtracao("Não encontrei a tabela de evolução das parcelas no arquivo.");
  }

  const bancos: BancoCreditas[] = nomes.map((nome, i) => ({
    nome,
    taxa: taxa[i],
    cet: cet[i],
    custo_total: custo[i],
    prazo: prazo[i],
    indexador: indexador[i],
    sistema: sistemas[i],
    primeira: primeira[i],
    ultima: ultima[i],
    parcelas: evolucao[i],
    logo: null,
  }));

  return {
    dados: {
      data,
      valor_imovel: valorImovel,
      valor_financiamento: valorFinanciamento,
      renda_media: rendaMedia,
      meses,
      bancos,
    },
    colunas,
  };
}
