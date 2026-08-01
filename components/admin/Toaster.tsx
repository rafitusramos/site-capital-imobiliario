"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext, type Toast, type TipoToast } from "@/lib/admin/toast";

const DURACAO_MS = 5000;

/**
 * Provider do toast do admin (docs/crm-spec.md §3.1/§4). Duas regiões
 * `aria-live` separadas — sucesso em `role="status"`/`polite`, erro em
 * `role="alert"` — para o toast de erro (que merece interromper o que o
 * leitor de tela está anunciando) nunca ficar na fila atrás de um de sucesso.
 * `motion-reduce:` desliga a transição de entrada/saída sem tirar o toast
 * (docs/crm-spec.md §4: prefers-reduced-motion mantém só a mudança de estado).
 */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remover = useCallback((id: string) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const mostrarToast = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const id = `toast-${proximoId.current++}`;
      setToasts((atual) => [...atual, { id, tipo, mensagem }]);
      timers.current.set(
        id,
        setTimeout(() => remover(id), DURACAO_MS),
      );
    },
    [remover],
  );

  const valor = useMemo(() => ({ mostrarToast }), [mostrarToast]);

  const sucessos = toasts.filter((t) => t.tipo === "sucesso");
  const erros = toasts.filter((t) => t.tipo === "erro");

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
          {sucessos.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto max-w-md rounded-md bg-[var(--abissal)] px-4 py-2.5 text-sm text-[var(--branco)] shadow-lg transition motion-reduce:transition-none"
            >
              {t.mensagem}
            </div>
          ))}
        </div>
        <div role="alert" className="flex flex-col items-center gap-2">
          {erros.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto max-w-md rounded-md bg-[var(--erro)] px-4 py-2.5 text-sm text-white shadow-lg transition motion-reduce:transition-none"
            >
              {t.mensagem}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
