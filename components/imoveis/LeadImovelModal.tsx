"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { criarLead } from "@/app/actions/leads";
import { capturarUtm } from "@/lib/utm";
import { mascaraTelefone } from "@/lib/mascaras";
import { telefoneValido } from "@/lib/financeiro";
import { TEXTO_CONSENTIMENTO } from "@/lib/legal";
import { rastrear } from "@/lib/analytics/eventos";

export interface LeadImovelModalHandle {
  abrir: (rotuloCta: string) => void;
}

type LeadImovelModalProps = {
  imovelId: string;
  imovelTitulo: string;
};

type Valores = {
  nome: string;
  telefone: string;
  email: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

function campoValido(campo: keyof Valores, valores: Valores): boolean {
  if (campo === "nome") return valores.nome.trim().length >= 3;
  if (campo === "email") return EMAIL_REGEX.test(valores.email.trim());
  if (campo === "telefone") return telefoneValido(valores.telefone);
  return true;
}

/**
 * Modal de lead da vertical de Imóveis: etapa única (nome, telefone,
 * e-mail), diferente do LeadFormShell (que exige uma tupla fixa de 3
 * etapas). Reaproveita exatamente as mesmas classes CSS do modal
 * multi-step (.scrim/.painel/.campo/.form-nav/.sucesso) e a mesma server
 * action `criarLead` — zero mudança de backend.
 */
export const LeadImovelModal = forwardRef<LeadImovelModalHandle, LeadImovelModalProps>(
  function LeadImovelModal({ imovelId, imovelTitulo }, ref) {
    const [aberto, setAberto] = useState(false);
    const [rotuloCta, setRotuloCta] = useState("Solicite informações");
    const [valores, setValores] = useState<Valores>({ nome: "", telefone: "", email: "" });
    const [erros, setErros] = useState<Set<keyof Valores>>(new Set());
    const [honeypot, setHoneypot] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [erroEnvio, setErroEnvio] = useState<string | null>(null);
    const [consentimento, setConsentimento] = useState(false);
    const [erroConsentimento, setErroConsentimento] = useState(false);

    const painelRef = useRef<HTMLDivElement>(null);
    const ultimoFocoRef = useRef<HTMLElement | null>(null);

    function setValor(campo: keyof Valores, valor: string) {
      setValores((atual) => ({ ...atual, [campo]: valor }));
    }

    const abrirModal = useCallback((rotulo: string, gatilho?: HTMLElement | null) => {
      ultimoFocoRef.current = gatilho ?? (document.activeElement as HTMLElement | null);
      setRotuloCta(rotulo);
      setValores({ nome: "", telefone: "", email: "" });
      setErros(new Set());
      setEnviado(false);
      setErroEnvio(null);
      setHoneypot("");
      // Consentimento é manifestação livre e inequívoca a cada envio — nunca
      // vem pré-marcado nem sobrevive de uma abertura anterior do modal.
      setConsentimento(false);
      setErroConsentimento(false);
      setAberto(true);
      rastrear({ nome: "formulario_iniciado", tipo: "imoveis" });
    }, []);

    useImperativeHandle(ref, () => ({
      abrir: (rotulo: string) => abrirModal(rotulo),
    }));

    // Delegação de clique: qualquer botão/link renderizado no servidor com
    // `data-abrir-lead="Rótulo do CTA"` abre este modal, sem precisar de um
    // componente cliente adicional segurando um ref — a página da LP
    // (app/(site)/imoveis/[slug]/page.tsx) continua um Server Component com
    // vários CTAs espalhados pelas 13 seções.
    useEffect(() => {
      const aoClicarNoDocumento = (e: MouseEvent) => {
        const alvo = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-abrir-lead]");
        if (!alvo) return;
        e.preventDefault();
        abrirModal(alvo.getAttribute("data-abrir-lead") || "Solicite informações", alvo);
      };
      document.addEventListener("click", aoClicarNoDocumento);
      return () => document.removeEventListener("click", aoClicarNoDocumento);
    }, [abrirModal]);

    const fechar = () => {
      setAberto(false);
      ultimoFocoRef.current?.focus();
    };

    useEffect(() => {
      if (!aberto) return;
      const primeiro = painelRef.current?.querySelector<HTMLElement>("input");
      primeiro?.focus();

      const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          fechar();
          return;
        }
        if (e.key !== "Tab" || !painelRef.current) return;
        const focaveis = elementosFocaveis(painelRef.current);
        if (focaveis.length === 0) return;
        const primeiroEl = focaveis[0];
        const ultimoEl = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiroEl) {
          e.preventDefault();
          ultimoEl.focus();
        } else if (!e.shiftKey && document.activeElement === ultimoEl) {
          e.preventDefault();
          primeiroEl.focus();
        }
      };
      document.addEventListener("keydown", aoTeclar);
      return () => document.removeEventListener("keydown", aoTeclar);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aberto]);

    function validar(): boolean {
      const campos: (keyof Valores)[] = ["nome", "telefone", "email"];
      const novosErros = new Set<keyof Valores>();
      let primeiroInvalido: keyof Valores | null = null;

      for (const campo of campos) {
        if (!campoValido(campo, valores)) {
          novosErros.add(campo);
          if (!primeiroInvalido) primeiroInvalido = campo;
        }
      }

      setErros(novosErros);
      if (primeiroInvalido) {
        document.getElementById(`li-${primeiroInvalido}`)?.focus();
      }
      return novosErros.size === 0;
    }

    async function aoEnviar(e: React.FormEvent) {
      e.preventDefault();
      if (!validar()) return;
      if (!consentimento) {
        setErroConsentimento(true);
        return;
      }
      setErroConsentimento(false);

      setEnviando(true);
      setErroEnvio(null);
      try {
        const resultado = await criarLead({
          tipo: "imoveis",
          dados: {
            nome: valores.nome,
            email: valores.email,
            telefone: valores.telefone,
            imovelId,
            observacoes: rotuloCta,
          },
          paginaUrl: window.location.href,
          utm: capturarUtm(),
          honeypot,
          consentimentoLgpd: consentimento,
        });

        if (resultado.sucesso) {
          setEnviado(true);
          rastrear({ nome: "lead_enviado", tipo: "imoveis" });
        } else {
          setErroEnvio(resultado.erro ?? "Não foi possível enviar. Tente novamente.");
        }
      } catch {
        setErroEnvio("Não foi possível enviar. Tente novamente em instantes.");
      } finally {
        setEnviando(false);
      }
    }

    return (
      <div
        className={`scrim${aberto ? " aberto" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leadImovelTitulo"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) fechar();
        }}
      >
        <div className={`painel${enviado ? " enviado" : ""}`} ref={painelRef}>
          <button className="fechar" type="button" onClick={fechar} aria-label="Fechar formulário">
            ×
          </button>
          <div className="form-head">
            <div className="etapa-nome">{imovelTitulo}</div>
            <h3 id="leadImovelTitulo">{rotuloCta}</h3>
          </div>
          <form onSubmit={aoEnviar} noValidate>
            <div className="im-lead-bloco">
              <div className={`campo${erros.has("nome") ? " invalido" : ""}`} id="li-campo-nome">
                <label htmlFor="li-nome">Nome completo</label>
                <input
                  id="li-nome"
                  type="text"
                  autoComplete="name"
                  value={valores.nome}
                  onChange={(e) => setValor("nome", e.target.value)}
                />
                <span className="msg-erro">Informe seu nome completo.</span>
              </div>

              <div className={`campo${erros.has("telefone") ? " invalido" : ""}`} id="li-campo-telefone">
                <label htmlFor="li-telefone">Telefone (WhatsApp)</label>
                <input
                  id="li-telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={valores.telefone}
                  onChange={(e) => setValor("telefone", mascaraTelefone(e.target.value))}
                />
                <span className="msg-erro">Informe um telefone válido com DDD.</span>
              </div>

              <div className={`campo${erros.has("email") ? " invalido" : ""}`} id="li-campo-email">
                <label htmlFor="li-email">E-mail</label>
                <input
                  id="li-email"
                  type="email"
                  autoComplete="email"
                  value={valores.email}
                  onChange={(e) => setValor("email", e.target.value)}
                />
                <span className="msg-erro">Informe um e-mail válido.</span>
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
                  aria-describedby={erroConsentimento ? "consentimentoErroImovel" : undefined}
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
                <p
                  className="msg-erro"
                  id="consentimentoErroImovel"
                  role="alert"
                  style={{ display: "block" }}
                >
                  Marque a autorização para enviar sua solicitação.
                </p>
              )}
            </div>

            <div className="form-nav">
              <button className="cta" type="submit" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar solicitação"}
              </button>
            </div>
          </form>
          <div className="sucesso">
            <div className="lote-ok" aria-hidden="true" />
            <h3>Recebemos sua solicitação</h3>
            <p>
              Em breve um de nossos corretores entra em contato para falar sobre o{" "}
              {imovelTitulo}.
            </p>
            <div className="sucesso-acoes">
              <button type="button" className="btn-sucesso-voltar" onClick={fechar}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
