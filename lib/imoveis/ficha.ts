import { brl } from "@/lib/financeiro";
import {
  formatarFaixaArea,
  formatarFaixaDormitorios,
  formatarFaixaVagas,
} from "@/lib/imoveis/formato";
import type { ImovelModalidade } from "@/types/database";

// Apresentação das duas modalidades de imóvel (migration 026). Puro e testável:
// o card, o hero e a página de detalhe leem daqui em vez de cada um decidir
// sozinho entre "faixa" (lançamento) e "valor único" (pronto).

export function rotuloModalidade(modalidade: ImovelModalidade): string {
  return modalidade === "pronto" ? "Pronto" : "Lançamento";
}

type FichaPronto = {
  area_util: number | null;
  area_total: number | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  mobiliado: boolean | null;
  ano_construcao: number | null;
  valor_condominio: number | null;
  valor_iptu: number | null;
};

export type ItemFicha = { rotulo: string; valor: string };

/** Ficha técnica da unidade: só o que está preenchido, na ordem de leitura. */
export function fichaDoPronto(imovel: FichaPronto): ItemFicha[] {
  const itens: (ItemFicha | null)[] = [
    imovel.area_util !== null ? { rotulo: "Área útil", valor: `${imovel.area_util} m²` } : null,
    imovel.area_total !== null ? { rotulo: "Área total", valor: `${imovel.area_total} m²` } : null,
    imovel.dormitorios !== null ? { rotulo: "Dormitórios", valor: `${imovel.dormitorios}` } : null,
    imovel.suites !== null ? { rotulo: "Suítes", valor: `${imovel.suites}` } : null,
    imovel.banheiros !== null ? { rotulo: "Banheiros", valor: `${imovel.banheiros}` } : null,
    imovel.vagas !== null ? { rotulo: "Vagas", valor: `${imovel.vagas}` } : null,
    imovel.andar !== null
      ? { rotulo: "Andar", valor: imovel.andar === 0 ? "Térreo" : `${imovel.andar}º` }
      : null,
    imovel.mobiliado !== null
      ? { rotulo: "Mobiliado", valor: imovel.mobiliado ? "Sim" : "Não" }
      : null,
    imovel.ano_construcao !== null
      ? { rotulo: "Ano de construção", valor: `${imovel.ano_construcao}` }
      : null,
    imovel.valor_condominio !== null
      ? { rotulo: "Condomínio", valor: brl(imovel.valor_condominio) }
      : null,
    imovel.valor_iptu !== null ? { rotulo: "IPTU", valor: brl(imovel.valor_iptu) } : null,
  ];
  return itens.filter((item): item is ItemFicha => item !== null);
}

/**
 * Custos mensais que acompanham o preço no hero do imóvel pronto. Não são o
 * preço: continuam visíveis quando o valor de venda está "sob consulta".
 */
export function custosMensaisDoPronto(imovel: {
  valor_condominio: number | null;
  valor_iptu: number | null;
}): ItemFicha[] {
  const itens: (ItemFicha | null)[] = [
    imovel.valor_condominio !== null
      ? { rotulo: "Condomínio", valor: `${brl(imovel.valor_condominio)}/mês` }
      : null,
    imovel.valor_iptu !== null ? { rotulo: "IPTU", valor: `${brl(imovel.valor_iptu)}/mês` } : null,
  ];
  return itens.filter((item): item is ItemFicha => item !== null);
}

type FatosEntrada =
  | ({ modalidade: "pronto" } & Pick<FichaPronto, "area_util" | "dormitorios" | "vagas">)
  | {
      modalidade?: "lancamento";
      area_min: number | null;
      area_max: number | null;
      dormitorios_min: number | null;
      dormitorios_max: number | null;
      vagas_min: number | null;
      vagas_max: number | null;
    };

/** Os três fatos do card e do hero: área, dormitórios, vagas. */
export function fatosDoImovel(imovel: FatosEntrada) {
  if (imovel.modalidade === "pronto") {
    return {
      area: formatarFaixaArea(imovel.area_util, imovel.area_util),
      dormitorios: formatarFaixaDormitorios(imovel.dormitorios, imovel.dormitorios),
      vagas: formatarFaixaVagas(imovel.vagas, imovel.vagas),
    };
  }
  return {
    area: formatarFaixaArea(imovel.area_min, imovel.area_max),
    dormitorios: formatarFaixaDormitorios(imovel.dormitorios_min, imovel.dormitorios_max),
    vagas: formatarFaixaVagas(imovel.vagas_min, imovel.vagas_max),
  };
}

/**
 * Preço visível, ou `null`. "Sob consulta" tem precedência (igual ao JSON-LD).
 * `rotulo` é o "A partir de" do lançamento e o "Valor de venda" da unidade única.
 */
export function precoDoImovel(imovel: {
  modalidade?: ImovelModalidade;
  valor_sob_consulta: boolean;
  valor_venda: number | null;
  valor_a_partir_de: number | null;
}): { rotulo: string | null; valor: string } | null {
  if (imovel.valor_sob_consulta) return null;
  if (imovel.modalidade === "pronto") {
    return imovel.valor_venda ? { rotulo: "Valor de venda", valor: brl(imovel.valor_venda) } : null;
  }
  return imovel.valor_a_partir_de
    ? { rotulo: "A partir de", valor: brl(imovel.valor_a_partir_de) }
    : null;
}

/** Faixa [min, max] de dormitórios para o filtro "Quartos"; `null` sem dado. */
export function dormitoriosParaFiltro(
  imovel:
    | { modalidade: "pronto"; dormitorios: number | null }
    | {
        modalidade?: "lancamento";
        dormitorios_min: number | null;
        dormitorios_max: number | null;
      },
): [number, number] | null {
  if (imovel.modalidade === "pronto") {
    return imovel.dormitorios === null ? null : [imovel.dormitorios, imovel.dormitorios];
  }
  const min = imovel.dormitorios_min ?? imovel.dormitorios_max;
  const max = imovel.dormitorios_max ?? imovel.dormitorios_min;
  return min === null || max === null ? null : [min, max];
}

/** Valor que o filtro "Valor" compara. `null` = sob consulta ou sem preço. */
export function valorParaFiltro(imovel: {
  modalidade?: ImovelModalidade;
  valor_sob_consulta: boolean;
  valor_venda: number | null;
  valor_a_partir_de: number | null;
}): number | null {
  if (imovel.valor_sob_consulta) return null;
  return imovel.modalidade === "pronto" ? imovel.valor_venda : imovel.valor_a_partir_de;
}
