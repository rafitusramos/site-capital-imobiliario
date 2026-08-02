"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { criarLead } from "@/app/actions/leads";
import type { LeadTipo } from "@/lib/validations/lead";
import { capturarUtm } from "@/lib/utm";
import { TEXTO_CONSENTIMENTO } from "@/lib/legal";
import { rastrear } from "@/lib/analytics/eventos";

export type ValoresFormulario = Record<string, string | boolean>;

export interface EtapaRenderProps {
  valores: ValoresFormulario;
  setValor: (campo: string, valor: string | boolean) => void;
  erros: Set<string>;
}

export interface EtapaConfig {
  nome: string;
  /** ids dos .campo (wrapper) que precisam validar antes de avançar desta etapa. */
  camposObrigatorios: string[];
  render: (props: EtapaRenderProps) => ReactNode;
}

export interface LeadFormShellProps {
  tipo: LeadTipo;
  tituloModal: string;
  etapas: [EtapaConfig, EtapaConfig, EtapaConfig];
  /** valida um .campo específico (id em camposObrigatorios) dado o estado atual. */
  validarCampo: (campo: string, valores: ValoresFormulario) => boolean;
  /** monta o objeto `dados` no formato esperado pelo schema Zod do tipo. */
  montarDados: (valores: ValoresFormulario) => Record<string, unknown>;
  valoresIniciais?: ValoresFormulario;
  textoSucesso: {
    titulo: string;
    corpo: string;
    whatsappHref: string;
  };
}

export interface LeadFormShellHandle {
  abrir: (prefill?: ValoresFormulario) => void;
}

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

export const LeadFormShell = forwardRef<LeadFormShellHandle, LeadFormShellProps>(
  function LeadFormShell(
    { tipo, tituloModal, etapas, validarCampo, montarDados, valoresIniciais, textoSucesso },
    ref,
  ) {
    const [aberto, setAberto] = useState(false);
    const [passo, setPasso] = useState(0);
    const [valores, setValores] = useState<ValoresFormulario>(valoresIniciais ?? {});
    const [erros, setErros] = useState<Set<string>>(new Set());
    const [honeypot, setHoneypot] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [erroEnvio, setErroEnvio] = useState<string | null>(null);
    const [consentimento, setConsentimento] = useState(false);
    const [erroConsentimento, setErroConsentimento] = useState(false);

    const painelRef = useRef<HTMLDivElement>(null);
    const ultimoFocoRef = useRef<HTMLElement | null>(null);

    const setValor = (campo: string, valor: string | boolean) => {
      setValores((atual) => ({ ...atual, [campo]: valor }));
    };

    useImperativeHandle(ref, () => ({
      abrir(prefill) {
        ultimoFocoRef.current = document.activeElement as HTMLElement | null;
        setValores((atual) => ({ ...(valoresIniciais ?? {}), ...atual, ...(prefill ?? {}) }));
        setPasso(0);
        setErros(new Set());
        setEnviado(false);
        setErroEnvio(null);
        // Consentimento é manifestação livre e inequívoca a cada envio — nunca
        // vem pré-marcado nem sobrevive de uma abertura anterior do modal.
        setConsentimento(false);
        setErroConsentimento(false);
        setAberto(true);
        rastrear({ nome: "formulario_iniciado", tipo });
      },
    }));

    const fechar = () => {
      setAberto(false);
      ultimoFocoRef.current?.focus();
    };

    useEffect(() => {
      if (!aberto) return;
      const primeiro = painelRef.current?.querySelector<HTMLElement>("input, select");
      primeiro?.focus();
      const trilhoWrap = painelRef.current?.querySelector<HTMLElement>(".trilho-wrap");
      if (trilhoWrap) trilhoWrap.scrollLeft = 0;

      const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          fechar();
          return;
        }
        if (e.key !== "Tab" || !painelRef.current) return;
        const focaveis = elementosFocaveis(painelRef.current);
        if (focaveis.length === 0) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      };
      document.addEventListener("keydown", aoTeclar);
      return () => document.removeEventListener("keydown", aoTeclar);
    }, [aberto]);

    const validarEtapa = (indice: number): boolean => {
      const campos = etapas[indice].camposObrigatorios;
      const novosErros = new Set(erros);
      let primeiraInvalida: string | null = null;
      let ok = true;

      for (const campo of campos) {
        const valido = validarCampo(campo, valores);
        if (valido) {
          novosErros.delete(campo);
        } else {
          novosErros.add(campo);
          ok = false;
          if (!primeiraInvalida) primeiraInvalida = campo;
        }
      }

      setErros(novosErros);
      if (primeiraInvalida) {
        const el = document.getElementById(primeiraInvalida);
        el?.querySelector<HTMLElement>("input, select")?.focus();
      }
      return ok;
    };

    const irPara = (indice: number) => {
      setPasso(indice);
      requestAnimationFrame(() => {
        const bloco = painelRef.current?.querySelectorAll(".bloco")[indice];
        bloco?.querySelector<HTMLElement>("input, select")?.focus();
        // O transform do .trilho não conta para o cálculo de "visível" do
        // browser — focar um campo do bloco ativo pode acionar auto-scroll
        // horizontal do .trilho-wrap. Zera para não desalinhar o passo atual.
        const trilhoWrap = painelRef.current?.querySelector<HTMLElement>(".trilho-wrap");
        if (trilhoWrap) trilhoWrap.scrollLeft = 0;
      });
    };

    const proximo = () => {
      if (!validarEtapa(passo)) return;
      irPara(Math.min(passo + 1, etapas.length - 1));
    };

    const voltar = () => {
      if (passo > 0) irPara(passo - 1);
    };

    const aoEnviar = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validarEtapa(passo)) return;
      if (!consentimento) {
        setErroConsentimento(true);
        return;
      }
      setErroConsentimento(false);

      setEnviando(true);
      setErroEnvio(null);
      try {
        const resultado = await criarLead({
          tipo,
          dados: montarDados(valores),
          paginaUrl: window.location.href,
          utm: capturarUtm(),
          honeypot,
          consentimentoLgpd: consentimento,
        });

        if (resultado.sucesso) {
          setEnviado(true);
          rastrear({ nome: "lead_enviado", tipo });
        } else {
          setErroEnvio(resultado.erro ?? "Não foi possível enviar. Tente novamente.");
        }
      } catch {
        setErroEnvio("Não foi possível enviar. Tente novamente em instantes.");
      } finally {
        setEnviando(false);
      }
    };

    return (
      <div
        className={`scrim${aberto ? " aberto" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="formTitulo"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) fechar();
        }}
      >
        <div className={`painel${enviado ? " enviado" : ""}`} ref={painelRef}>
          <button className="fechar" type="button" onClick={fechar} aria-label="Fechar formulário">
            ×
          </button>
          <div className="form-head">
            <div className="etapa-nome">{etapas[passo].nome}</div>
            <h3 id="formTitulo">{tituloModal}</h3>
            <div className="progresso" aria-hidden="true">
              {etapas.map((_, i) => (
                <span
                  key={i}
                  className={`terco${i === passo ? " atual" : ""}${i < passo ? " feito" : ""}`}
                  data-t={i}
                />
              ))}
            </div>
          </div>
          <form onSubmit={aoEnviar} noValidate>
            <div
              className="trilho-wrap"
              onScroll={(e) => {
                // A navegação entre etapas é 100% via transform no .trilho —
                // este wrapper nunca deve ser scrollável de verdade. Blindagem
                // contra auto-scroll do browser (ex.: foco saindo de um botão
                // desabilitado), que usa a posição em LAYOUT (pré-transform)
                // do elemento focado e pode "revelar" horizontalmente um bloco
                // que já está posicionado fora da tela pelo transform.
                e.currentTarget.scrollLeft = 0;
              }}
            >
              <div
                className="trilho"
                style={{ transform: `translateX(-${passo * 33.3333}%)` }}
              >
                {etapas.map((etapa, i) => (
                  <div className="bloco" data-bloco={i} key={i} aria-hidden={i !== passo} inert={i !== passo}>
                    {etapa.render({ valores, setValor, erros })}
                  </div>
                ))}
              </div>
            </div>

            {/* honeypot anti-bot — invisível para humanos, bots que preenchem tudo caem aqui */}
            <input
              type="text"
              name="empresa_site"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
            />

            {erroEnvio && (
              <p className="msg-erro" style={{ display: "block", textAlign: "center" }}>
                {erroEnvio}
              </p>
            )}

            <div className="consentimento">
              <label>
                <input
                  type="checkbox"
                  checked={consentimento}
                  onChange={(e) => {
                    setConsentimento(e.target.checked);
                    if (e.target.checked) setErroConsentimento(false);
                  }}
                  aria-describedby={erroConsentimento ? "consentimentoErro" : undefined}
                />
                <span>
                  {TEXTO_CONSENTIMENTO} Li e concordo com os{" "}
                  <a href="/termos-de-uso/" target="_blank" rel="noopener">
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a href="/politica-de-privacidade/" target="_blank" rel="noopener">
                    Política de Privacidade
                  </a>
                  .
                </span>
              </label>
              {erroConsentimento && (
                <p className="msg-erro" id="consentimentoErro" role="alert" style={{ display: "block" }}>
                  Marque a autorização para enviar sua solicitação.
                </p>
              )}
            </div>

            <div className="form-nav">
              <button
                className={`btn-voltar${passo > 0 ? " visivel" : ""}`}
                type="button"
                onClick={voltar}
              >
                Voltar
              </button>
              {passo < etapas.length - 1 ? (
                <button className="cta" type="button" onClick={proximo}>
                  Próximo
                </button>
              ) : (
                <button className="cta" type="submit" disabled={enviando}>
                  {enviando ? "Enviando…" : "Enviar solicitação"}
                </button>
              )}
            </div>
          </form>
          <div className="sucesso">
            <div className="lote-ok" aria-hidden="true" />
            <h3>{textoSucesso.titulo}</h3>
            {textoSucesso.corpo.split("\n\n").map((paragrafo, i) => (
              <p key={i}>{paragrafo}</p>
            ))}
            <div className="sucesso-acoes">
              <button type="button" className="btn-sucesso-voltar" onClick={fechar}>
                Voltar
              </button>
              <a
                className="cta"
                href={textoSucesso.whatsappHref}
                onClick={() => rastrear({ nome: "whatsapp_clicado", contexto: `sucesso-${tipo}` })}
              >
                Entrar em contato agora
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
