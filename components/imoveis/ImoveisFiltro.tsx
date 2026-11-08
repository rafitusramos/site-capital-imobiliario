"use client";

import { useMemo, useState } from "react";
import type { ImovelComCapa, ImovelFaseOpcao, ImovelTipoOpcao } from "@/lib/queries/imoveis";
import { ImovelCard } from "@/components/imoveis/ImovelCard";
import { dormitoriosParaFiltro, rotuloModalidade, valorParaFiltro } from "@/lib/imoveis/ficha";
import type { ImovelModalidade } from "@/types/database";

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
  tipos: ImovelTipoOpcao[];
  fases: ImovelFaseOpcao[];
};

type OpcaoCidade = {
  valor: string;
  rotulo: string;
};

export function ImoveisFiltro({ imoveis, tipos, fases }: ImoveisFiltroProps) {
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroQuartos, setFiltroQuartos] = useState("");
  const [filtroValor, setFiltroValor] = useState("");
  const [filtroFase, setFiltroFase] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroModalidade, setFiltroModalidade] = useState<ImovelModalidade | null>(null);

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

  // Só entram nos chips os valores em uso entre os imóveis publicados — evita
  // poluir o filtro com fases/tipos cadastrados no domínio mas sem nenhum
  // imóvel ativo. A ordem vinda do banco (props já ordenadas por `ordem`) é
  // preservada pelo `.filter`.
  const fasesEmUso = useMemo(() => {
    const slugsEmUso = new Set(imoveis.map((imovel) => imovel.fase?.slug).filter(Boolean));
    return fases.filter((fase) => slugsEmUso.has(fase.slug));
  }, [imoveis, fases]);

  const tiposEmUso = useMemo(() => {
    const slugsEmUso = new Set(imoveis.map((imovel) => imovel.tipo?.slug).filter(Boolean));
    return tipos.filter((tipo) => slugsEmUso.has(tipo.slug));
  }, [imoveis, tipos]);

  // "Lançamento / Pronto" só aparece quando as duas modalidades existem no
  // acervo publicado - com uma só, o chip filtraria para o mesmo conjunto.
  const modalidadesEmUso = useMemo(() => {
    const emUso = new Set(imoveis.map((imovel) => imovel.modalidade));
    return (["lancamento", "pronto"] as const).filter((m) => emUso.has(m));
  }, [imoveis]);

  const filtrados = useMemo(() => {
    return imoveis.filter((imovel) => {
      if (filtroModalidade && imovel.modalidade !== filtroModalidade) return false;
      if (filtroFase && imovel.fase?.slug !== filtroFase) return false;
      if (filtroTipo && imovel.tipo?.slug !== filtroTipo) return false;

      if (filtroCidade) {
        const chave = `${imovel.cidade ?? ""}|${imovel.estado ?? ""}`;
        if (chave !== filtroCidade) return false;
      }

      if (filtroQuartos) {
        const faixa = dormitoriosParaFiltro(imovel);
        // Sem dado cadastrado não casa com nenhum filtro.
        if (faixa === null) return false;
        const [min, max] = faixa;
        if (filtroQuartos === "4+") {
          if (max < 4) return false;
        } else if (!(min <= Number(filtroQuartos) && Number(filtroQuartos) <= max)) {
          return false;
        }
      }

      if (filtroValor) {
        // Sem preço definido (sob consulta ou valor_a_partir_de nulo) fica de
        // fora sempre que algum filtro de valor está ativo: não há valor para comparar.
        const valorImovel = valorParaFiltro(imovel);
        if (valorImovel === null) return false;
        const opcao = OPCOES_VALOR.find((item) => item.valor === filtroValor);
        if (opcao) {
          const dentroDoTeto =
            opcao.teto === null
              ? valorImovel > 3_000_000
              : valorImovel <= opcao.teto;
          if (!dentroDoTeto) return false;
        }
      }

      return true;
    });
  }, [imoveis, filtroModalidade, filtroFase, filtroTipo, filtroCidade, filtroQuartos, filtroValor]);

  const algumFiltroAtivo = Boolean(
    filtroModalidade || filtroFase || filtroTipo || filtroCidade || filtroQuartos || filtroValor,
  );

  function mensagemVazio(): string {
    if (algumFiltroAtivo) {
      return "Nenhum imóvel encontrado com esses filtros.";
    }
    return "Nenhum imóvel disponível no momento.";
  }

  function limparFiltros() {
    setFiltroCidade("");
    setFiltroQuartos("");
    setFiltroValor("");
    setFiltroFase(null);
    setFiltroTipo(null);
    setFiltroModalidade(null);
  }

  return (
    <>
      <section className="im-filtros-secao">
        <div className="wrap">
          {modalidadesEmUso.length > 1 ? (
            <div className="im-filtros">
              <div className="blog-filtro" role="group" aria-label="Filtrar por lançamento ou imóvel pronto">
                <button
                  type="button"
                  className={filtroModalidade === null ? "ativo" : undefined}
                  aria-pressed={filtroModalidade === null}
                  onClick={() => setFiltroModalidade(null)}
                >
                  Lançamento e pronto
                </button>
                {modalidadesEmUso.map((modalidade) => (
                  <button
                    key={modalidade}
                    type="button"
                    className={filtroModalidade === modalidade ? "ativo" : undefined}
                    aria-pressed={filtroModalidade === modalidade}
                    onClick={() => setFiltroModalidade(modalidade)}
                  >
                    {rotuloModalidade(modalidade)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Só a fileira some quando não há nenhuma fase em uso (acervo vazio).
              Com só um valor publicado, a fileira continua — sumir por completo
              nesse caso foi bug relatado antes. */}
          {fasesEmUso.length > 0 ? (
            <div className="im-filtros">
              <div className="blog-filtro" role="group" aria-label="Filtrar por fase da obra">
                <button
                  type="button"
                  className={filtroFase === null ? "ativo" : undefined}
                  onClick={() => setFiltroFase(null)}
                >
                  Todos os tipos
                </button>
                {fasesEmUso.map((fase) => (
                  <button
                    key={fase.id}
                    type="button"
                    className={filtroFase === fase.slug ? "ativo" : undefined}
                    onClick={() => setFiltroFase(fase.slug)}
                  >
                    {fase.nome}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tiposEmUso.length > 0 ? (
            <div className="im-filtros">
              <div className="blog-filtro" role="group" aria-label="Filtrar por tipo de empreendimento">
                <button
                  type="button"
                  className={filtroTipo === null ? "ativo" : undefined}
                  onClick={() => setFiltroTipo(null)}
                >
                  Todos os imóveis
                </button>
                {tiposEmUso.map((tipo) => (
                  <button
                    key={tipo.id}
                    type="button"
                    className={filtroTipo === tipo.slug ? "ativo" : undefined}
                    onClick={() => setFiltroTipo(tipo.slug)}
                  >
                    {tipo.nome}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
        </div>
      </section>

      <section className="im-lista-secao">
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
