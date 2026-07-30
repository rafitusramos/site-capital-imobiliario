"use client";

import { useMemo, useRef, useState } from "react";
import {
  digitos,
  brl,
  parcelaPrice,
  cpfValido,
  telefoneValido,
  parseDecimalBr,
} from "@/lib/financeiro";
import { mascaraMoeda, mascaraTelefone, mascaraCpf, mascaraCep, mascaraNumDec, mascaraNum } from "@/lib/mascaras";
import {
  LeadFormShell,
  type LeadFormShellHandle,
  type ValoresFormulario,
} from "@/components/leads/LeadFormShell";
import { TAXAS_PADRAO } from "@/lib/queries/parametros";
import { rastrear } from "@/lib/analytics/eventos";

const LTV = 0.6;

function campoClasse(erros: Set<string>, id: string): string {
  return `campo${erros.has(id) ? " invalido" : ""}`;
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
    case "c-objetivo":
      return Boolean(valores.objetivoCredito);
    case "c-tipo":
      return Boolean(valores.tipoImovel);
    case "c-cep":
      return digitos(valores.cep) > 0 && String(valores.cep ?? "").replace(/\D/g, "").length === 8;
    case "c-num":
      return String(valores.numero ?? "").trim().length >= 1;
    case "c-area":
      return parseDecimalBr(valores.areaM2) > 0;
    case "c-valor":
      return digitos(valores.valorImovel) > 0;
    case "c-saldo":
      return valores.imovelQuitado === true || digitos(valores.saldoDevedor) > 0;
    default:
      return true;
  }
}

// taxaMensal tem default de propósito: se a página esquecer de passar a
// prop (ou a leitura do banco falhar antes de chegar aqui), o simulador
// continua funcionando com a taxa de referência em vez de zerar a taxa e
// distorcer a parcela calculada.
export function SimuladorHomeEquity({
  taxaMensal = TAXAS_PADRAO.homeEquityTaxaMensal,
}: {
  taxaMensal?: number;
}) {
  const [valorImovelSim, setValorImovelSim] = useState("R$ 1.000.000");
  const [prazoMeses, setPrazoMeses] = useState(240);
  const modalRef = useRef<LeadFormShellHandle>(null);
  // "simulador_usado" dispara uma única vez por sessão de uso — não a cada
  // movimento de slider, o que inundaria a cota de eventos.
  const usoRastreadoRef = useRef(false);
  const marcarUsoDoSimulador = () => {
    if (usoRastreadoRef.current) return;
    usoRastreadoRef.current = true;
    rastrear({ nome: "simulador_usado", pagina: "home-equity" });
  };

  const { creditoNum, parcelaNum } = useMemo(() => {
    const valorNum = digitos(valorImovelSim);
    const credito = Math.round(valorNum * LTV);
    const parcela = Math.round(parcelaPrice(credito, taxaMensal, prazoMeses));
    return { creditoNum: credito, parcelaNum: parcela };
  }, [valorImovelSim, prazoMeses, taxaMensal]);

  const montarDados = (valores: ValoresFormulario) => {
    const valorImovel = digitos(valores.valorImovel);
    const imovelQuitado = Boolean(valores.imovelQuitado);
    const valorCreditoEstimado = Math.round(valorImovel * LTV);
    const parcelaEstimada = Math.round(parcelaPrice(valorCreditoEstimado, taxaMensal, prazoMeses));

    return {
      nome: valores.nome,
      email: valores.email,
      telefone: valores.telefone,
      cpf: valores.cpf || undefined,
      renda: digitos(valores.renda),
      tipoRemuneracao: valores.tipoRemuneracao,
      objetivoCredito: valores.objetivoCredito,
      tipoImovel: valores.tipoImovel,
      cep: valores.cep,
      numero: valores.numero,
      areaM2: parseDecimalBr(valores.areaM2),
      valorImovel,
      imovelQuitado,
      saldoDevedor: imovelQuitado ? undefined : digitos(valores.saldoDevedor),
      valorCreditoEstimado,
      prazoMeses,
      parcelaEstimada,
    };
  };

  return (
    <>
      <section className="simulador" id="simulador">
        <div className="wrap">
          <div className="eyebrow reveal">Simulação</div>
          <h2 className="reveal">Quanto seu imóvel pode liberar</h2>
          <p className="intro reveal">
            Informe o valor estimado do seu imóvel e veja, na hora, o crédito máximo e uma
            parcela aproximada. É uma estimativa para você ter uma ordem de grandeza — o número
            exato sai na análise.
          </p>
          <div className="sim-card reveal">
            <div className="sim-grid">
              <div className="sim-entrada">
                <label htmlFor="sim-valor">Valor estimado do imóvel</label>
                <input
                  id="sim-valor"
                  type="text"
                  inputMode="numeric"
                  value={valorImovelSim}
                  onChange={(e) => {
                    marcarUsoDoSimulador();
                    setValorImovelSim(mascaraMoeda(e.target.value));
                  }}
                  aria-label="Valor estimado do imóvel"
                />
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
                    min={60}
                    max={240}
                    step={6}
                    value={prazoMeses}
                    onChange={(e) => {
                      marcarUsoDoSimulador();
                      setPrazoMeses(Number(e.target.value));
                    }}
                    aria-label="Prazo em meses"
                  />
                  <div className="sim-faixa">
                    <span>5 anos</span>
                    <span>20 anos</span>
                  </div>
                </div>
              </div>
              <div className="sim-saida">
                <div className="sim-res">
                  <div className="rot">Crédito máximo estimado</div>
                  <div className="num">
                    {brl(creditoNum)}
                    <span className="lote" />
                  </div>
                  <div className="sub">Até 60% do valor do imóvel em garantia</div>
                </div>
                <div className="sim-res">
                  <div className="rot">Parcela aproximada</div>
                  <div className="num">
                    {brl(parcelaNum)}
                    <span style={{ fontSize: ".5em" }}>/mês</span>
                  </div>
                  <div className="sub">Estimativa em {prazoMeses} meses · taxa sujeita a análise</div>
                </div>
                <div className="sim-cta">
                  <button
                    type="button"
                    className="cta"
                    onClick={() => modalRef.current?.abrir({ valorImovel: valorImovelSim })}
                  >
                    Solicitar análise sem custo
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="sim-nota reveal">
            Estimativa automática para fins de orientação, sem valor de proposta. O crédito
            considera o teto usual de 60% do valor do imóvel; a parcela usa o sistema de
            amortização Price com taxa de referência de mercado para home equity, podendo variar
            conforme instituição, prazo, seguros, tarifas e análise de crédito. Não constitui
            oferta de crédito. Crédito sujeito a aprovação.
          </p>
        </div>
      </section>

      <LeadFormShell
        ref={modalRef}
        tipo="home-equity"
        tituloModal="Análise preliminar do seu imóvel"
        valoresIniciais={{ imovelQuitado: true }}
        validarCampo={validarCampo}
        montarDados={montarDados}
        textoSucesso={{
          titulo: "Solicitação recebida.",
          corpo:
            "Entraremos em contato em até 1 dia útil com a análise preliminar do seu caso e uma estimativa de valor para o seu imóvel.\n\nPara agilizar, tenha em mãos seus documentos pessoais, os do imóvel e os comprovantes de renda.",
          whatsappHref:
            "https://wa.me/5519997834187?text=Ol%C3%A1%2C%20acabei%20de%20enviar%20minha%20solicita%C3%A7%C3%A3o%20de%20an%C3%A1lise%20de%20home%20equity%20e%20gostaria%20de%20conversar%20agora.",
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
            nome: "Etapa 2 de 3 · Renda",
            camposObrigatorios: ["c-renda", "c-remun", "c-objetivo"],
            render: ({ valores, setValor, erros }) => (
              <>
                <div className={campoClasse(erros, "c-renda")} id="c-renda">
                  <label htmlFor="f-renda">
                    Renda bruta total mensal <span className="dica">(soma de todas as fontes)</span>
                  </label>
                  <input
                    id="f-renda"
                    name="renda"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 30.000"
                    value={String(valores.renda ?? "")}
                    onChange={(e) => setValor("renda", mascaraMoeda(e.target.value))}
                    required
                  />
                  <span className="msg-erro">Informe a renda bruta estimada.</span>
                </div>
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
                <div className={campoClasse(erros, "c-objetivo")} id="c-objetivo">
                  <label htmlFor="f-objetivo">Objetivo do crédito</label>
                  <select
                    id="f-objetivo"
                    name="objetivo_credito"
                    value={String(valores.objetivoCredito ?? "")}
                    onChange={(e) => setValor("objetivoCredito", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    <option>Investir no meu negócio</option>
                    <option>Quitação de dívidas caras</option>
                    <option>Reformas e construções</option>
                    <option>Planejamento sucessório</option>
                    <option>Consumo</option>
                  </select>
                  <span className="msg-erro">Selecione o objetivo do crédito.</span>
                </div>
              </>
            ),
          },
          {
            nome: "Etapa 3 de 3 · Imóvel",
            camposObrigatorios: ["c-tipo", "c-cep", "c-num", "c-area", "c-valor", "c-saldo"],
            render: ({ valores, setValor, erros }) => (
              <>
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
                    <option>Terreno em condomínio</option>
                    <option>Galpão</option>
                    <option>Sala Comercial</option>
                    <option>Loja</option>
                  </select>
                  <span className="msg-erro">Selecione o tipo de imóvel.</span>
                </div>
                <div className="dupla">
                  <div className={campoClasse(erros, "c-cep")} id="c-cep">
                    <label htmlFor="f-cep">CEP</label>
                    <input
                      id="f-cep"
                      name="cep"
                      type="text"
                      inputMode="numeric"
                      placeholder="13280-000"
                      autoComplete="postal-code"
                      value={String(valores.cep ?? "")}
                      onChange={(e) => setValor("cep", mascaraCep(e.target.value))}
                      required
                    />
                    <span className="msg-erro">CEP inválido.</span>
                  </div>
                  <div className={campoClasse(erros, "c-num")} id="c-num">
                    <label htmlFor="f-num">Número</label>
                    <input
                      id="f-num"
                      name="numero"
                      type="text"
                      inputMode="numeric"
                      placeholder="123"
                      value={String(valores.numero ?? "")}
                      onChange={(e) => setValor("numero", mascaraNum(e.target.value))}
                      required
                    />
                    <span className="msg-erro">Informe o número.</span>
                  </div>
                </div>
                <div className="dupla">
                  <div className={campoClasse(erros, "c-area")} id="c-area">
                    <label htmlFor="f-area">
                      Área construída <span className="dica">(m²)</span>
                    </label>
                    <input
                      id="f-area"
                      name="area_m2"
                      type="text"
                      inputMode="numeric"
                      placeholder="180"
                      value={String(valores.areaM2 ?? "")}
                      onChange={(e) => setValor("areaM2", mascaraNumDec(e.target.value))}
                      required
                    />
                    <span className="msg-erro">Informe a área construída.</span>
                  </div>
                  <div className={campoClasse(erros, "c-valor")} id="c-valor">
                    <label htmlFor="f-valor">Valor estimado</label>
                    <input
                      id="f-valor"
                      name="valor_imovel"
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 1.500.000"
                      value={String(valores.valorImovel ?? "")}
                      onChange={(e) => setValor("valorImovel", mascaraMoeda(e.target.value))}
                      required
                    />
                    <span className="msg-erro">Informe o valor estimado.</span>
                  </div>
                </div>
                <div className="quitado-linha">
                  <div className="flag-linha" id="c-quitado">
                    <span className="flag-label">Imóvel quitado</span>
                    <button
                      type="button"
                      id="f-quitado"
                      className="switch"
                      role="switch"
                      aria-checked={Boolean(valores.imovelQuitado)}
                      aria-label="Imóvel quitado"
                      onClick={() => {
                        const novoQuitado = !valores.imovelQuitado;
                        setValor("imovelQuitado", novoQuitado);
                        if (novoQuitado) setValor("saldoDevedor", "");
                      }}
                    >
                      <span className="switch-track">
                        <span className="switch-thumb" />
                      </span>
                      <span className="switch-txt">{valores.imovelQuitado ? "Sim" : "Não"}</span>
                    </button>
                  </div>
                  {!valores.imovelQuitado && (
                    <div className={`campo campo-saldo${erros.has("c-saldo") ? " invalido" : ""}`} id="c-saldo">
                      <input
                        id="f-saldo"
                        name="saldo_devedor"
                        type="text"
                        inputMode="numeric"
                        placeholder="Saldo devedor"
                        aria-label="Saldo devedor do imóvel"
                        value={String(valores.saldoDevedor ?? "")}
                        onChange={(e) => setValor("saldoDevedor", mascaraMoeda(e.target.value))}
                      />
                      <span className="msg-erro">Informe o saldo devedor.</span>
                    </div>
                  )}
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
