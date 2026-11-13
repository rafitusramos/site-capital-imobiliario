import type { FormularioAutomacao } from "@/lib/instagram/formulario";

function Balao({ texto, vazio }: { texto: string; vazio: string }) {
  const t = texto.trim();
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-neutral-800 px-3 py-2 text-[13px] leading-snug ${
        t ? "text-neutral-100" : "italic text-neutral-400"
      }`}
    >
      {t || vazio}
    </div>
  );
}

function Botao({ texto, vazio }: { texto: string; vazio: string }) {
  const t = texto.trim();
  return (
    <div className="mt-1 max-w-[85%] rounded-xl border border-neutral-600 px-3 py-2 text-center text-[13px] font-medium text-sky-300">
      {t || <span className="italic text-neutral-400">{vazio}</span>}
    </div>
  );
}

function Resposta({ texto }: { texto: string }) {
  return (
    <div className="flex justify-end">
      <span className="rounded-2xl bg-indigo-600 px-3 py-2 text-[13px] text-white">{texto.trim() || "..."}</span>
    </div>
  );
}

/** Simula a conversa no celular com o que está no formulário agora. */
export function PreviaCelular({ form }: { form: FormularioAutomacao }) {
  return (
    <section aria-label="Prévia da conversa no celular" className="rounded-[28px] bg-neutral-900 p-4 shadow-sm">
      <p className="mb-3 text-center text-xs text-neutral-400">Prévia da conversa</p>
      <div className="flex flex-col gap-2">
        <Balao texto={form.dm1Texto} vazio="Mensagem de boas-vindas" />
        <Botao texto={form.dm1Botao} vazio="Botão" />
        <Resposta texto={form.dm1Botao} />
        {form.exigirSeguir && (
          <>
            <Balao texto={form.seguirTexto} vazio="Mensagem pedindo para seguir" />
            <Botao texto={form.seguirBotao} vazio="Botão" />
            <Resposta texto={form.seguirBotao} />
          </>
        )}
        <Balao texto={form.linkTexto} vazio="Mensagem com o link" />
        <Botao texto={form.linkBotao} vazio="Botão do link" />
        {form.lembreteAtivo && (
          <>
            <p className="my-2 text-center text-[11px] text-neutral-400">
              {form.lembreteHoras} {form.lembreteHoras === 1 ? "hora" : "horas"} depois, se não abriu
            </p>
            <Balao texto={form.lembreteTexto} vazio="Mensagem de lembrete" />
          </>
        )}
      </div>
    </section>
  );
}
