import type { Palavra } from "@/lib/simulacao/extrair";

/**
 * Monta, com valores FICTÍCIOS, as palavras de um PDF multibanco no mesmo
 * layout (colunas centradas, rótulos em x=24) do PDF real da Creditas.
 * Nunca use dado de cliente aqui: o repositório é público.
 */
export interface BancoFicticio {
  nome: string;
  taxa: number;
  cet: number;
  custo: number;
  prazo: number;
  indexador: string;
  primeira: number;
  ultima: number;
  /** Um por mês de `meses`; null vira "-". */
  parcelas: (number | null)[];
}

export const MESES_FICTICIOS = [1, 12, 24];

export function bancosFicticios(): BancoFicticio[] {
  return [
    { nome: "Banco Alfa", taxa: 12.5, cet: 13.1, custo: 800000.5, prazo: 420, indexador: "TR", primeira: 3000, ultima: 650, parcelas: [3000, 2950.25, 2900] },
    { nome: "Banco Beta", taxa: 14, cet: 14.9, custo: 900000, prazo: 420, indexador: "TR", primeira: 3500, ultima: 700, parcelas: [3500, 3400, 3300.1] },
    { nome: "Banco Gama", taxa: 9.99, cet: 10.5, custo: 650000, prazo: 360, indexador: "IPCA", primeira: 2800, ultima: 750, parcelas: [2800, 2700, 2600] },
    { nome: "Volpi", taxa: 10.5, cet: 11.2, custo: 640000.25, prazo: 240, indexador: "IPCA", primeira: 2700, ultima: 2650, parcelas: [2700, 2690, null] },
  ];
}

const brl = (v: number) => "R$ " + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "X").replace(".", ",").replace(/X/g, ".");
const pct = (v: number) => v.toFixed(2).replace(".", ",") + " %";

function p(texto: string, x: number, y: number, largura = texto.length * 3): Palavra {
  return { texto, x, y, largura };
}

export function paginasFicticias(opcoes: { bancos?: BancoFicticio[]; meses?: number[]; comSistema?: boolean; data?: string | null; renda?: number | null } = {}) {
  const bancos = opcoes.bancos ?? bancosFicticios();
  const meses = opcoes.meses ?? MESES_FICTICIOS;
  const cx = (i: number) => 141 + i * 67;
  const col = (texto: string, i: number, y: number) => {
    const w = texto.length * 3;
    return p(texto, cx(i) - w / 2, y, w);
  };
  const linha = (rotulo: string, y: number, f: (b: BancoFicticio) => string) => [
    p(rotulo, 24, y),
    ...bancos.map((b, i) => col(f(b), i, y)),
  ];
  const pg1: Palavra[] = [
    p("Olá! Somos a assessoria de crédito (texto fictício)", 18, 64.5),
    p("Bancos", 24, 264.4, 21.7),
    ...bancos.map((b, i) => {
      // nomes com mais de uma palavra chegam como itens separados, a menos de 6pt um do outro
      const partes = b.nome.split(" ");
      let x = cx(i) - (b.nome.length * 3) / 2;
      return partes.map((parte) => {
        const w = parte.length * 3;
        const it = p(parte, x, 271.3, w);
        x += w + 3;
        return it;
      });
    }).flat(),
    p("Sistema de amortização", 24, 289.4),
    ...(opcoes.comSistema ? bancos.map((_, i) => col("SAC", i, 289.4)) : []),
    ...linha("Valor imóvel", 305.5, () => brl(400000)),
    ...linha("Valor financiamento", 321.6, () => brl(260000)),
    ...linha("Primeira parcela", 336.8, (b) => brl(b.primeira)),
    ...linha("Última parcela", 351.9, (b) => brl(b.ultima)),
    ...linha("Taxa de juros", 367.1, (b) => pct(b.taxa)),
    ...linha("Indexador", 382.2, (b) => b.indexador),
    ...linha("Custo Efetivo Total (R$)", 397.4, (b) => brl(b.custo)),
    ...linha("Custo Efetivo Total (%)", 412.6, (b) => pct(b.cet)),
    ...linha("Prazo em meses", 427.7, (b) => String(b.prazo)),
  ];
  if (opcoes.renda !== null) {
    pg1.push(
      p("A renda média estimada para comportar o financiamento é de", 48, 471.1),
      p(brl(opcoes.renda ?? 9000), 256, 471.1),
      p(", podendo haver mudanças", 296.9, 471.1),
    );
  }
  if (opcoes.data !== null) {
    pg1.push(p("Enviado por Creditas •", 75.8, 804.7), p(`${opcoes.data ?? "06/11/2026"} às 08:34`, 158, 804.7));
  }
  const pg2: Palavra[] = [
    p("Número da parcela", 24, 105.9),
    ...bancos.map((b, i) => col(b.nome, i, 105.8)),
    ...meses.flatMap((m, r) => [
      p(String(m).padStart(2, "0"), 24, 127.8 + r * 16.5),
      ...bancos.map((b, i) => col(b.parcelas[r] === null ? "-" : brl(b.parcelas[r] as number), i, 127.8 + r * 16.5)),
    ]),
  ];
  return [pg1, pg2];
}
