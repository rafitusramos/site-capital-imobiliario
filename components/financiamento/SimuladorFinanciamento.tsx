"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import {
  digitos,
  brl,
  taxaMensal,
  parcelaInicialSAC,
  cpfValido,
  telefoneValido,
} from "@/lib/financeiro";
import { mascaraMoeda, mascaraTelefone, mascaraCpf, mascaraUf } from "@/lib/mascaras";
import {
  LeadFormShell,
  type LeadFormShellHandle,
  type ValoresFormulario,
} from "@/components/leads/LeadFormShell";

const TAXA_ANUAL = 0.115;
const COMPROMETIMENTO = 0.3;

function campoClasse(erros: Set<string>, id: string): string {
  return `campo${erros.has(id) ? " invalido" : ""}`;
}

function aoTeclarSegmentado(
  e: KeyboardEvent<HTMLDivElement>,
  valorAtual: boolean,
  definir: (valor: boolean) => void,
  refs: { simRef: RefObject<HTMLButtonElement | null>; naoRef: RefObject<HTMLButtonElement | null> },
) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const novo = !valorAtual;
  definir(novo);
  (novo ? refs.simRef : refs.naoRef).current?.focus();
}

function validarCampo(campo: string, valores: ValoresFormulario): boolean {
  switch (campo) {
    case "c-nome":
      return String(valores.nome ?? "").trim().length >= 3;
    case "c-cpf":
      return !valores.cpf || cpfValido(String(valores.cpf));
    case "c-tel":
      return telefoneValido(String(valores.telefone ?? ""));
    case "c-email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valores.email ?? ""));
    case "c-renda":
      return digitos(valores.renda) > 0;
    case "c-remun":
      return Boolean(valores.tipoRemuneracao);
    case "c-entrada":
      return digitos(valores.entradaDisponivel) > 0;
    case "c-valor":
      return digitos(valores.valorImovel) > 0;
    case "c-situacao":
      return Boolean(valores.momentoCompra);
    case "c-tipo":
      return Boolean(valores.tipoImovel);
    case "c-cidade":
      return String(valores.cidade ?? "").trim().length >= 2;
    case "c-estado":
      return String(valores.estado ?? "").trim().length === 2;
    default:
      return true;
  }
}

export function SimuladorFinanciamento() {
  const [valorImovelSim, setValorImovelSim] = useState("R$ 1.000.000");
  const [percentualEntrada, setPercentualEntrada] = useState(20);
  const [prazoMeses, setPrazoMeses] = useState(420);
  const modalRef = useRef<LeadFormShellHandle>(null);
  const refFgtsSim = useRef<HTMLButtonElement>(null);
  const refFgtsNao = useRef<HTMLButtonElement>(null);

  const { entradaNum, creditoNum, parcelaNum, rendaSugerida } = useMemo(() => {
    const valorNum = digitos(valorImovelSim);
    const entrada = Math.round((valorNum * percentualEntrada) / 100);
    const credito = Math.max(valorNum - entrada, 0);
    const parcela = Math.round(parcelaInicialSAC(credito, taxaMensal(TAXA_ANUAL), prazoMeses));
    const renda = Math.round(parcela / COMPROMETIMENTO / 100) * 100;
    return { entradaNum: entrada, creditoNum: credito, parcelaNum: parcela, rendaSugerida: renda };
  }, [valorImovelSim, percentualEntrada, prazoMeses]);

  const montarDados = (valores: ValoresFormulario) => {
    const valorImovel = digitos(valores.valorImovel);
    const entradaDisponivel = digitos(valores.entradaDisponivel);
    const valorCredito = Math.max(valorImovel - entradaDisponivel, 0);
    const percentual = valorImovel > 0 ? Math.round((entradaDisponivel / valorImovel) * 100) : 0;
    const parcelaEstimada = Math.round(parcelaInicialSAC(valorCredito, taxaMensal(TAXA_ANUAL), prazoMeses));

    return {
      nome: valores.nome,
      email: valores.email,
      telefone: valores.telefone,
      cpf: valores.cpf || undefined,
      renda: digitos(valores.renda),
      tipoRemuneracao: valores.tipoRemuneracao,
      entradaDisponivel,
      usaFgts: Boolean(valores.usaFgts),
      valorImovel,
      momentoCompra: valores.momentoCompra,
      tipoImovel: valores.tipoImovel,
      cidade: valores.cidade,
      estado: String(valores.estado ?? "").toUpperCase(),
      percentualEntrada: percentual,
      valorCredito,
      prazoMeses,
      parcelaEstimada,
    };
  };

  return (
    <>
      <section className="simulador" id="simulador">
        <div className="wrap">
          <div className="eyebrow reveal">Simulação</div>
          <h2 className="reveal">Monte seu financiamento</h2>
          <p className="intro reveal">
            Informe o valor do imóvel e ajuste a entrada e o prazo. Você vê na hora o valor
            financiado, a parcela inicial estimada e a renda familiar sugerida para a operação.
          </p>
          <div className="sim-card reveal">
            <div className="sim-grid">
              <div className="sim-entrada">
                <label htmlFor="sim-valor">Valor do imóvel</label>
                <input
                  id="sim-valor"
                  type="text"
                  inputMode="numeric"
                  value={valorImovelSim}
                  onChange={(e) => setValorImovelSim(mascaraMoeda(e.target.value))}
                  aria-label="Valor do imóvel"
                />
                <div className="sim-slider-wrap">
                  <div className="sim-slider-topo">
                    <label htmlFor="sim-entrada" style={{ margin: 0 }}>
                      Entrada
                    </label>
                    <span className="val">
                      {percentualEntrada}% · {brl(entradaNum)}
                    </span>
                  </div>
                  <input
                    id="sim-entrada"
                    type="range"
                    min={20}
                    max={80}
                    step={1}
                    value={percentualEntrada}
                    onChange={(e) => setPercentualEntrada(Number(e.target.value))}
                    aria-label="Percentual de entrada"
                  />
                  <div className="sim-faixa">
                    <span>20%</span>
                    <span>80%</span>
                  </div>
                </div>
                <div className="sim-slider-wrap">
                  <div className="sim-slider-topo">
                    <label htmlFor="sim-prazo" style={{ margin: 0 }}>
                      Prazo
                    </label>
                    <span className="val">{prazoMeses} meses</span>
                  </div>
                  <input
                    id="sim-prazo"
                    type="range"
                    min={120}
                    max={420}
                    step={6}
                    value={prazoMeses}
                    onChange={(e) => setPrazoMeses(Number(e.target.value))}
                    aria-label="Prazo em meses"
                  />
                  <div className="sim-faixa">
                    <span>10 anos</span>
                    <span>35 anos</span>
                  </div>
                </div>
              </div>
              <div className="sim-saida">
                <div className="sim-res">
                  <div className="rot">Valor financiado</div>
                  <div className="num">
                    {brl(creditoNum)}
                    <span className="lote" />
                  </div>
                  <div className="sub">
                    Com entrada de {brl(entradaNum)} ({percentualEntrada}%)
                  </div>
                </div>
                <div className="sim-res">
                  <div className="rot">Parcela inicial aproximada</div>
                  <div className="num">
                    {brl(parcelaNum)}
                    <span style={{ fontSize: ".5em" }}>/mês</span>
                  </div>
                  <div className="sub">
                    SAC em {prazoMeses} meses · renda familiar sugerida a partir de{" "}
                    {brl(rendaSugerida)}
                  </div>
                </div>
                <div className="sim-cta">
                  <button
                    type="button"
                    className="cta"
                    onClick={() =>
                      modalRef.current?.abrir({
                        valorImovel: valorImovelSim,
                        entradaDisponivel: mascaraMoeda(String(entradaNum)),
                      })
                    }
                  >
                    Solicitar pré-aprovação sem custo
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="sim-nota reveal">
            Estimativa automática para fins de orientação, sem valor de proposta. A parcela usa o
            sistema de amortização SAC (parcela inicial, decrescente ao longo do contrato) com
            taxa de referência de mercado para SBPE, sem TR, seguros obrigatórios e tarifas — o
            valor efetivo varia conforme instituição, prazo e análise de crédito. A renda sugerida
            considera comprometimento de até 30% com a parcela. Não constitui oferta de crédito.
            Crédito sujeito a aprovação.
          </p>
        </div>
      </section>

      <LeadFormShell
        ref={modalRef}
        tipo="financiamento"
        tituloModal="Pré-aprovação do seu financiamento"
        valoresIniciais={{ usaFgts: false }}
        validarCampo={validarCampo}
        montarDados={montarDados}
        textoSucesso={{
          titulo: "Solicitação recebida.",
          corpo:
            "Entraremos em contato em até 1 dia útil com a pré-análise do seu financiamento e as condições estimadas para o seu perfil.\n\nPara agilizar, tenha em mãos documentos pessoais, comprovantes de renda e, se houver, o extrato do FGTS.",
          whatsappHref:
            "https://wa.me/5519997834187?text=Ol%C3%A1%2C%20acabei%20de%20enviar%20minha%20solicita%C3%A7%C3%A3o%20de%20pr%C3%A9-aprova%C3%A7%C3%A3o%20de%20financiamento%20e%20gostaria%20de%20conversar%20agora.",
        }}
        etapas={[
          {
            nome: "Etapa 1 de 3 · Dados pessoais",
            camposObrigatorios: ["c-nome", "c-cpf", "c-tel", "c-email"],
            render: ({ valores, setValor, erros }) => (
              <>
                <div className={campoClasse(erros, "c-nome")} id="c-nome">
                  <label htmlFor="f-nome">Nome completo</label>
                  <input
                    id="f-nome"
                    name="nome"
                    type="text"
                    autoComplete="name"
                    value={String(valores.nome ?? "")}
                    onChange={(e) => setValor("nome", e.target.value)}
                    required
                  />
                  <span className="msg-erro">Informe seu nome completo.</span>
                </div>
                <div className={campoClasse(erros, "c-cpf")} id="c-cpf">
                  <label htmlFor="f-cpf">CPF</label>
                  <input
                    id="f-cpf"
                    name="cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={String(valores.cpf ?? "")}
                    onChange={(e) => setValor("cpf", mascaraCpf(e.target.value))}
                  />
                  <span className="msg-erro">Informe um CPF válido.</span>
                </div>
                <div className={campoClasse(erros, "c-tel")} id="c-tel">
                  <label htmlFor="f-tel">Telefone de contato</label>
                  <input
                    id="f-tel"
                    name="telefone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(19) 90000-0000"
                    value={String(valores.telefone ?? "")}
                    onChange={(e) => setValor("telefone", mascaraTelefone(e.target.value))}
                    required
                  />
                  <span className="msg-erro">Informe um telefone válido com DDD.</span>
                </div>
                <div className={campoClasse(erros, "c-email")} id="c-email">
                  <label htmlFor="f-email">E-mail</label>
                  <input
                    id="f-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={String(valores.email ?? "")}
                    onChange={(e) => setValor("email", e.target.value)}
                    required
                  />
                  <span className="msg-erro">Informe um e-mail válido.</span>
                </div>
              </>
            ),
          },
          {
            nome: "Etapa 2 de 3 · Renda e entrada",
            camposObrigatorios: ["c-renda", "c-remun", "c-entrada", "c-valor"],
            render: ({ valores, setValor, erros }) => (
              <>
                <div className={campoClasse(erros, "c-renda")} id="c-renda">
                  <label htmlFor="f-renda">
                    Renda bruta familiar mensal{" "}
                    <span className="dica">(soma de quem entra na operação)</span>
                  </label>
                  <input
                    id="f-renda"
                    name="renda"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 25.000"
                    value={String(valores.renda ?? "")}
                    onChange={(e) => setValor("renda", mascaraMoeda(e.target.value))}
                    required
                  />
                  <span className="msg-erro">Informe a renda bruta estimada.</span>
                </div>
                <div className="dupla">
                  <div className={campoClasse(erros, "c-remun")} id="c-remun">
                    <label htmlFor="f-remun">Tipo de remuneração</label>
                    <select
                      id="f-remun"
                      name="tipo_remuneracao"
                      value={String(valores.tipoRemuneracao ?? "")}
                      onChange={(e) => setValor("tipoRemuneracao", e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option>Assalariado</option>
                      <option>Empresário / Autônomo</option>
                    </select>
                    <span className="msg-erro">Selecione o tipo de remuneração.</span>
                  </div>
                  <div className="campo" id="c-fgts">
                    <label>Uso de FGTS</label>
                    <div
                      className="segmentado"
                      role="radiogroup"
                      aria-label="Uso de FGTS"
                      onKeyDown={(e) =>
                        aoTeclarSegmentado(e, Boolean(valores.usaFgts), (novo) => setValor("usaFgts", novo), {
                          simRef: refFgtsSim,
                          naoRef: refFgtsNao,
                        })
                      }
                    >
                      <span
                        className="segmentado-pill"
                        aria-hidden="true"
                        style={{ transform: valores.usaFgts ? "translateX(0%)" : "translateX(100%)" }}
                      />
                      <button
                        type="button"
                        ref={refFgtsSim}
                        role="radio"
                        aria-checked={Boolean(valores.usaFgts)}
                        tabIndex={valores.usaFgts ? 0 : -1}
                        className="segmentado-opcao"
                        onClick={() => setValor("usaFgts", true)}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        ref={refFgtsNao}
                        role="radio"
                        aria-checked={!valores.usaFgts}
                        tabIndex={!valores.usaFgts ? 0 : -1}
                        className="segmentado-opcao"
                        onClick={() => setValor("usaFgts", false)}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                </div>
                <div className={campoClasse(erros, "c-entrada")} id="c-entrada">
                  <label htmlFor="f-entrada">
                    Entrada disponível <span className="dica">(dinheiro + FGTS)</span>
                  </label>
                  <input
                    id="f-entrada"
                    name="entrada_disponivel"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 200.000"
                    value={String(valores.entradaDisponivel ?? "")}
                    onChange={(e) => setValor("entradaDisponivel", mascaraMoeda(e.target.value))}
                    required
                  />
                  <span className="msg-erro">Informe a entrada disponível.</span>
                </div>
                <div className={campoClasse(erros, "c-valor")} id="c-valor">
                  <label htmlFor="f-valor">Valor do imóvel</label>
                  <input
                    id="f-valor"
                    name="valor_imovel"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 1.000.000"
                    value={String(valores.valorImovel ?? "")}
                    onChange={(e) => setValor("valorImovel", mascaraMoeda(e.target.value))}
                    required
                  />
                  <span className="msg-erro">Informe o valor estimado.</span>
                </div>
              </>
            ),
          },
          {
            nome: "Etapa 3 de 3 · O imóvel",
            camposObrigatorios: ["c-situacao", "c-tipo", "c-cidade", "c-estado"],
            render: ({ valores, setValor, erros }) => (
              <>
                <div className={campoClasse(erros, "c-situacao")} id="c-situacao">
                  <label htmlFor="f-situacao">Momento da compra</label>
                  <select
                    id="f-situacao"
                    name="momento_compra"
                    value={String(valores.momentoCompra ?? "")}
                    onChange={(e) => setValor("momentoCompra", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    <option>Ainda procurando</option>
                    <option>Já escolhi o imóvel</option>
                    <option>Em negociação</option>
                  </select>
                  <span className="msg-erro">Selecione o momento da compra.</span>
                </div>
                <div className={campoClasse(erros, "c-tipo")} id="c-tipo">
                  <label htmlFor="f-tipo">Tipo de imóvel</label>
                  <select
                    id="f-tipo"
                    name="tipo_imovel"
                    value={String(valores.tipoImovel ?? "")}
                    onChange={(e) => setValor("tipoImovel", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    <option>Apartamento</option>
                    <option>Casa</option>
                    <option>Casa em condomínio</option>
                    <option>Terreno em condomínio</option>
                    <option>Sala Comercial</option>
                  </select>
                  <span className="msg-erro">Selecione o tipo de imóvel.</span>
                </div>
                <div className="dupla-7030">
                  <div className={campoClasse(erros, "c-cidade")} id="c-cidade">
                    <label htmlFor="f-cidade">Cidade do imóvel</label>
                    <input
                      id="f-cidade"
                      name="cidade"
                      type="text"
                      placeholder="Vinhedo"
                      value={String(valores.cidade ?? "")}
                      onChange={(e) => setValor("cidade", e.target.value)}
                      required
                    />
                    <span className="msg-erro">Informe a cidade.</span>
                  </div>
                  <div className={campoClasse(erros, "c-estado")} id="c-estado">
                    <label htmlFor="f-estado">UF</label>
                    <input
                      id="f-estado"
                      name="estado"
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      style={{ textTransform: "uppercase" }}
                      value={String(valores.estado ?? "")}
                      onChange={(e) => setValor("estado", mascaraUf(e.target.value))}
                      required
                    />
                    <span className="msg-erro">Informe o estado.</span>
                  </div>
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
