"use client";

import { useMemo, useState } from "react";
import type { ImovelComCapa } from "@/lib/queries/imoveis";
import { ImovelCard } from "@/components/imoveis/ImovelCard";
import { ORDEM_FASES, formatarFase, formatarTipo } from "@/lib/imoveis/formato";

const ORDEM_TIPOS = ["apartamento", "vila", "loteamento"] as const;

const OPCOES_QUARTOS = ["1", "2", "3", "4+"] as const;

// "mais3m" não tem teto (null) — é o único filtro que compara com ">" em vez de "<=".
const OPCOES_VALOR = [
  { valor: "300000", rotulo: "Até R$ 300 mil", teto: 300_000 },
  { valor: "500000", rotulo: "Até R$ 500 mil", teto: 500_000 },
  { valor: "1000000", rotulo: "Até R$ 1 milhão", teto: 1_000_000 },
  { valor: "2000000", rotulo: "Até R$ 2 milhões", teto: 2_000_000 },
  { valor: "3000000", rotulo: "Até R$ 3 milhões", teto: 3_000_000 },
  { valor: "mais3m", rotulo: "Mais de R$ 3 milhões", teto: null as number | null },
] as const;

type ImoveisFiltroProps = {
  imoveis: ImovelComCapa[];
};

type OpcaoCidade = {
  valor: string;
  rotulo: string;
};

export function ImoveisFiltro({ imoveis }: ImoveisFiltroProps) {
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroQuartos, setFiltroQuartos] = useState("");
  const [filtroValor, setFiltroValor] = useState("");
  const [filtroFase, setFiltroFase] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  const tipos = useMemo(() => {
    const vistos = new Set(imoveis.map((imovel) => imovel.tipo));
    return ORDEM_TIPOS.filter((tipo) => vistos.has(tipo));
  }, [imoveis]);

  // Combinações distintas de cidade+estado entre os imóveis publicados
  // (ignorando os sem cidade), ordenadas alfabeticamente pelo rótulo. O
  // valor do <option> concatena cidade+estado para casar exatamente o imóvel
  // certo na filtragem — evita colisão entre cidades homônimas de UFs diferentes.
  const cidades = useMemo<OpcaoCidade[]>(() => {
    const vistas = new Map<string, OpcaoCidade>();
    for (const imovel of imoveis) {
      if (!imovel.cidade) continue;
      const chave = `${imovel.cidade}|${imovel.estado ?? ""}`;
      if (vistas.has(chave)) continue;
      const rotulo = imovel.estado ? `${imovel.cidade} — ${imovel.estado}` : imovel.cidade;
      vistas.set(chave, { valor: chave, rotulo });
    }
    return [...vistas.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  }, [imoveis]);

  const filtrados = useMemo(() => {
    return imoveis.filter((imovel) => {
      if (filtroFase && imovel.fase !== filtroFase) return false;
      if (filtroTipo && imovel.tipo !== filtroTipo) return false;

      if (filtroCidade) {
        const chave = `${imovel.cidade ?? ""}|${imovel.estado ?? ""}`;
        if (chave !== filtroCidade) return false;
      }

      if (filtroQuartos) {
        const min = imovel.dormitorios_min ?? imovel.dormitorios_max;
        const max = imovel.dormitorios_max ?? imovel.dormitorios_min;
        // Sem faixa cadastrada (as duas colunas null) não casa com nenhum filtro.
        if (min === null || max === null) return false;
        if (filtroQuartos === "4+") {
          if (max < 4) return false;
        } else if (!(min <= Number(filtroQuartos) && Number(filtroQuartos) <= max)) {
          return false;
        }
      }

      if (filtroValor) {
        // Sem preço definido (sob consulta ou valor_a_partir_de nulo) fica de
        // fora sempre que algum filtro de valor está ativo: não há valor para comparar.
        if (imovel.valor_sob_consulta || imovel.valor_a_partir_de === null) return false;
        const opcao = OPCOES_VALOR.find((item) => item.valor === filtroValor);
        if (opcao) {
          const dentroDoTeto =
            opcao.teto === null
              ? imovel.valor_a_partir_de > 3_000_000
              : imovel.valor_a_partir_de <= opcao.teto;
          if (!dentroDoTeto) return false;
        }
      }

      return true;
    });
  }, [imoveis, filtroFase, filtroTipo, filtroCidade, filtroQuartos, filtroValor]);

  const algumFiltroAtivo = Boolean(
    filtroFase || filtroTipo || filtroCidade || filtroQuartos || filtroValor,
  );

  function mensagemVazio(): string {
    if (algumFiltroAtivo) {
      return "Nenhum empreendimento encontrado com esses filtros.";
    }
    return "Nenhum empreendimento em lançamento no momento.";
  }

  function limparFiltros() {
    setFiltroCidade("");
    setFiltroQuartos("");
    setFiltroValor("");
    setFiltroFase(null);
    setFiltroTipo(null);
  }

  return (
    <>
      <section className="im-filtros-secao">
        <div className="wrap">
          <div className="im-filtros">
            {/* Sempre mostra as 4 fases, independentemente das existentes nos
                imóveis publicados — o corretor pode cadastrar um lançamento
                em qualquer fase a qualquer momento. */}
            <div className="blog-filtro" role="group" aria-label="Filtrar por fase da obra">
              <button
                type="button"
                className={filtroFase === null ? "ativo" : undefined}
                onClick={() => setFiltroFase(null)}
              >
                Todos os tipos
              </button>
              {ORDEM_FASES.map((fase) => (
                <button
                  key={fase}
                  type="button"
                  className={filtroFase === fase ? "ativo" : undefined}
                  onClick={() => setFiltroFase(fase)}
                >
                  {formatarFase(fase)}
                </button>
              ))}
            </div>
          </div>

          <div className="im-filtros-selects">
            <div className="im-filtro-campo">
              <label htmlFor="filtro-cidade">Cidade</label>
              <select
                id="filtro-cidade"
                value={filtroCidade}
                onChange={(evento) => setFiltroCidade(evento.target.value)}
              >
                <option value="">Todas as cidades</option>
                {cidades.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="im-filtro-campo">
              <label htmlFor="filtro-quartos">Quartos</label>
              <select
                id="filtro-quartos"
                value={filtroQuartos}
                onChange={(evento) => setFiltroQuartos(evento.target.value)}
              >
                <option value="">Todos os quartos</option>
                {OPCOES_QUARTOS.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>

            <div className="im-filtro-campo">
              <label htmlFor="filtro-valor">Valor</label>
              <select
                id="filtro-valor"
                value={filtroValor}
                onChange={(evento) => setFiltroValor(evento.target.value)}
              >
                <option value="">Todos os valores</option>
                {OPCOES_VALOR.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="im-limpar-filtros"
              onClick={limparFiltros}
              disabled={!algumFiltroAtivo}
            >
              Limpar filtros
            </button>
          </div>

          <div className="im-filtros">
            {tipos.length > 1 ? (
              <div className="blog-filtro" role="group" aria-label="Filtrar por tipo de empreendimento">
                <button
                  type="button"
                  className={filtroTipo === null ? "ativo" : undefined}
                  onClick={() => setFiltroTipo(null)}
                >
                  Todos os tipos
                </button>
                {tipos.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className={filtroTipo === tipo ? "ativo" : undefined}
                    onClick={() => setFiltroTipo(tipo)}
                  >
                    {formatarTipo(tipo)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          {filtrados.length > 0 ? (
            <div className="im-grid">
              {filtrados.map((imovel) => (
                <ImovelCard key={imovel.id} imovel={imovel} />
              ))}
            </div>
          ) : (
            <div className="im-vazio">{mensagemVazio()}</div>
          )}
        </div>
      </section>
    </>
  );
}
