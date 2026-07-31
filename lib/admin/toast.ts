import { createContext, useContext } from "react";

/**
 * Sistema de toast mínimo do admin (usado pelo CRM e, dali em diante, por
 * qualquer outra tela do painel — por isso mora fora de components/admin/crm).
 * Sem dependência nova: só Context + estado local, no mesmo espírito do
 * restante do admin (ver components/admin/ParametrosForm.tsx para o padrão de
 * feedback de erro que este sistema generaliza para toda a área logada).
 *
 * Sucesso usa `role="status"`/`aria-live="polite"`; erro usa `role="alert"`
 * (docs/crm-spec.md §4) — os dois vivem em regiões separadas em
 * components/admin/Toaster.tsx, para o leitor de tela nunca precisar
 * adivinhar qual delas anunciar primeiro.
 */

export type TipoToast = "sucesso" | "erro";

export type Toast = {
  id: string;
  tipo: TipoToast;
  mensagem: string;
};

export type ToastContextValor = {
  mostrarToast: (tipo: TipoToast, mensagem: string) => void;
};

export const ToastContext = createContext<ToastContextValor | null>(null);

/** Só pode ser usado dentro de <ToasterProvider> (montado em app/admin/(protected)/layout.tsx). */
export function useToast(): ToastContextValor {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error("useToast precisa ser usado dentro de <ToasterProvider>.");
  }
  return contexto;
}
