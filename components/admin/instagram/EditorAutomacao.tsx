"use client";

import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAutomacao } from "@/app/actions/admin-instagram";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { useGuardaAlteracoes } from "@/components/admin/useGuardaAlteracoes";
import { useToast } from "@/lib/admin/toast";
import { formularioParaPayload, type FormularioAutomacao } from "@/lib/instagram/formulario";
import type { Publicacao } from "@/lib/instagram/graph";
import {
  LIMITE_RESPOSTA_PUBLICA,
  LIMITE_TEXTO_COM_BOTAO,
  LIMITE_TITULO_BOTAO,
  automacaoSchema,
} from "@/lib/validations/instagram";
import { PreviaCelular } from "./PreviaCelular";
import { SeletorPublicacao } from "./SeletorPublicacao";

type Erros = Partial<Record<string, string>>;

const INPUT =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[var(--tinta)] focus:border-[var(--jade)]";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-md border border-neutral-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-[var(--abissal)]">{titulo}</legend>
      <div className="mt-2 flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

type CampoProps = {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  limite?: number;
  multilinha?: boolean;
  ajuda?: string;
  tipo?: string;
};

function Campo({ rotulo, valor, onChange, erro, limite, multilinha, ajuda, tipo = "text" }: CampoProps) {
  const id = useId();
  const descId = `${id}-d`;
  const props = {
    id,
    value: valor,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value),
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descId,
    className: INPUT,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-800">
        {rotulo}
      </label>
      {multilinha ? <textarea rows={4} {...props} /> : <input type={tipo} {...props} />}
      <div id={descId} className="mt-1 flex justify-between gap-3 text-xs">
        <span className={erro ? "text-[var(--erro)]" : "text-neutral-600"}>{erro ?? ajuda ?? ""}</span>
        {limite !== undefined && (
          <span className={valor.length > limite ? "font-medium text-[var(--erro)]" : "text-neutral-600"}>
            {valor.length}/{limite}
          </span>
        )}
      </div>
    </div>
  );
}

function Interruptor({
  rotulo,
  marcado,
  onChange,
}: {
  rotulo: string;
  marcado: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-neutral-800">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[var(--jade)]"
      />
      {rotulo}
    </label>
  );
}

export function EditorAutomacao({ inicial }: { inicial: FormularioAutomacao }) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [form, setForm] = useState<FormularioAutomacao>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [resumo, setResumo] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [pendente, salvar] = useTransition();

  const inicialJson = useMemo(() => JSON.stringify(inicial), [inicial]);
  const sujo = !salvo && JSON.stringify(form) !== inicialJson;
  const { saidaPendente, confirmarSaida, cancelarSaida } = useGuardaAlteracoes(sujo);

  function set<K extends keyof FormularioAutomacao>(k: K, v: FormularioAutomacao[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function escolherPublicacao(p: Publicacao) {
    setForm((f) => ({ ...f, midiaId: p.id, midiaPermalink: p.permalink, midiaThumb: p.miniatura }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = automacaoSchema.safeParse(formularioParaPayload(form));
    if (!parsed.success) {
      const novos: Erros = {};
      for (const i of parsed.error.issues) {
        const chave = String(i.path[0] ?? "geral");
        if (!novos[chave]) novos[chave] = i.message;
      }
      setErros(novos);
      setResumo(Array.from(new Set(Object.values(novos) as string[])));
      return;
    }
    setErros({});
    setResumo([]);
    salvar(async () => {
      const r = await salvarAutomacao(formularioParaPayload(form));
      if (!r.sucesso) {
        mostrarToast("erro", r.erro ?? "Não foi possível salvar a automação.");
        return;
      }
      setSalvo(true);
      mostrarToast("sucesso", "Automação salva.");
      router.push("/admin/instagram/automacoes/");
    });
  }

  function setFrase(i: number, v: string) {
    set("frasesPublicas", form.frasesPublicas.map((f, j) => (j === i ? v : f)));
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        {resumo.length > 0 && (
          <div role="alert" className="rounded-md border border-[var(--erro)] bg-white px-4 py-3 text-sm text-[var(--erro)]">
            <p className="mb-1 font-medium">Corrija antes de salvar:</p>
            <ul className="list-disc pl-5">
              {resumo.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Campo rotulo="Nome da automação" valor={form.nome} onChange={(v) => set("nome", v)} erro={erros.nome} limite={80} />

        <Secao titulo="1. Quando alguém comenta em">
          {(
            [
              ["especifica", "Uma publicação ou reel específico"],
              ["qualquer", "Qualquer publicação"],
              ["proxima", "A próxima publicação"],
            ] as const
          ).map(([valor, texto]) => (
            <label key={valor} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-neutral-800">
              <input
                type="radio"
                name="alvo"
                checked={form.alvo === valor}
                onChange={() => set("alvo", valor)}
                className="h-5 w-5 accent-[var(--jade)]"
              />
              {texto}
            </label>
          ))}
          {form.alvo === "especifica" && (
            <div>
              <SeletorPublicacao midiaId={form.midiaId} miniaturaAtual={form.midiaThumb} onEscolher={escolherPublicacao} />
              {erros.midiaId && <p className="mt-1 text-xs text-[var(--erro)]">{erros.midiaId}</p>}
            </div>
          )}
        </Secao>

        <Secao titulo="2. E o comentário tem">
          <Interruptor
            rotulo="Qualquer palavra"
            marcado={form.qualquerPalavra}
            onChange={(v) => set("qualquerPalavra", v)}
          />
          {!form.qualquerPalavra && (
            <Campo
              rotulo="Palavras-chave"
              valor={form.palavrasTexto}
              onChange={(v) => set("palavrasTexto", v)}
              erro={erros.palavras}
              ajuda="Separe por vírgula. Maiúsculas e acentos são ignorados."
            />
          )}
        </Secao>

        <Secao titulo="3. Resposta pública no comentário">
          <Interruptor
            rotulo="Responder o comentário"
            marcado={form.responderPublico}
            onChange={(v) => set("responderPublico", v)}
          />
          {form.responderPublico && (
            <>
              {form.frasesPublicas.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Campo
                      rotulo={`Frase ${i + 1}`}
                      valor={f}
                      onChange={(v) => setFrase(i, v)}
                      limite={LIMITE_RESPOSTA_PUBLICA}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set("frasesPublicas", form.frasesPublicas.filter((_, j) => j !== i))}
                    aria-label={`Remover frase ${i + 1}`}
                    className="mt-6 inline-flex min-h-11 items-center rounded-md px-3 text-sm text-[var(--erro)] hover:bg-black/5"
                  >
                    Remover
                  </button>
                </div>
              ))}
              {erros.frasesPublicas && <p className="text-xs text-[var(--erro)]">{erros.frasesPublicas}</p>}
              <div>
                <button
                  type="button"
                  onClick={() => set("frasesPublicas", [...form.frasesPublicas, ""])}
                  className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-[var(--abissal)] hover:bg-neutral-50"
                >
                  Adicionar frase
                </button>
                <p className="mt-1 text-xs text-neutral-600">Uma das frases é sorteada a cada resposta.</p>
              </div>
            </>
          )}
        </Secao>

        <Secao titulo="4. Primeira mensagem (boas-vindas)">
          <Campo
            rotulo="Texto"
            valor={form.dm1Texto}
            onChange={(v) => set("dm1Texto", v)}
            erro={erros.dm1Texto}
            limite={LIMITE_TEXTO_COM_BOTAO}
            multilinha
          />
          <Campo
            rotulo="Texto do botão"
            valor={form.dm1Botao}
            onChange={(v) => set("dm1Botao", v)}
            erro={erros.dm1Botao}
            limite={LIMITE_TITULO_BOTAO}
          />
          <Interruptor
            rotulo="Exigir que a pessoa siga o perfil antes de receber o link"
            marcado={form.exigirSeguir}
            onChange={(v) => set("exigirSeguir", v)}
          />
          {form.exigirSeguir && (
            <div className="flex flex-col gap-4 rounded-md bg-neutral-50 p-4">
              <Campo
                rotulo="Mensagem pedindo para seguir"
                valor={form.seguirTexto}
                onChange={(v) => set("seguirTexto", v)}
                erro={erros.seguirTexto}
                limite={LIMITE_TEXTO_COM_BOTAO}
                multilinha
              />
              <Campo
                rotulo="Texto do botão"
                valor={form.seguirBotao}
                onChange={(v) => set("seguirBotao", v)}
                erro={erros.seguirBotao}
                limite={LIMITE_TITULO_BOTAO}
              />
              <Campo
                rotulo="Mensagem se ainda não seguir"
                valor={form.seguirInsisteTexto}
                onChange={(v) => set("seguirInsisteTexto", v)}
                erro={erros.seguirInsisteTexto}
                limite={LIMITE_TEXTO_COM_BOTAO}
                multilinha
              />
            </div>
          )}
        </Secao>

        <Secao titulo="5. Mensagem com o link">
          <Campo
            rotulo="Texto"
            valor={form.linkTexto}
            onChange={(v) => set("linkTexto", v)}
            erro={erros.linkTexto}
            limite={LIMITE_TEXTO_COM_BOTAO}
            multilinha
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Texto do botão"
              valor={form.linkBotao}
              onChange={(v) => set("linkBotao", v)}
              erro={erros.linkBotao}
              limite={LIMITE_TITULO_BOTAO}
            />
            <Campo
              rotulo="Link (https://)"
              valor={form.linkUrl}
              onChange={(v) => set("linkUrl", v)}
              erro={erros.linkUrl}
              tipo="url"
            />
          </div>
        </Secao>

        <Secao titulo="6. Lembrete para quem não abriu o link">
          <Interruptor
            rotulo="Enviar lembrete"
            marcado={form.lembreteAtivo}
            onChange={(v) => set("lembreteAtivo", v)}
          />
          {form.lembreteAtivo && (
            <>
              <div className="max-w-[10rem]">
                <Campo
                  rotulo="Horas depois (1 a 23)"
                  tipo="number"
                  valor={String(form.lembreteHoras)}
                  onChange={(v) => set("lembreteHoras", v === "" ? 0 : Number(v))}
                  erro={erros.lembreteHoras}
                  ajuda="A Meta só permite enviar em até 24 horas."
                />
              </div>
              <Campo
                rotulo="Texto do lembrete"
                valor={form.lembreteTexto}
                onChange={(v) => set("lembreteTexto", v)}
                erro={erros.lembreteTexto}
                limite={LIMITE_TEXTO_COM_BOTAO}
                multilinha
              />
            </>
          )}
        </Secao>

        <details className="rounded-md border border-neutral-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--abissal)]">
            Se a pessoa comentar de novo
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <Campo
              rotulo="Mensagem com botão"
              valor={form.retomadaBotaoTexto}
              onChange={(v) => set("retomadaBotaoTexto", v)}
              erro={erros.retomadaBotaoTexto}
              limite={LIMITE_TEXTO_COM_BOTAO}
              multilinha
            />
            <Campo
              rotulo="Mensagem pedindo para seguir"
              valor={form.retomadaSeguirTexto}
              onChange={(v) => set("retomadaSeguirTexto", v)}
              erro={erros.retomadaSeguirTexto}
              limite={LIMITE_TEXTO_COM_BOTAO}
              multilinha
            />
            <Campo
              rotulo="Mensagem com o link"
              valor={form.retomadaLinkTexto}
              onChange={(v) => set("retomadaLinkTexto", v)}
              erro={erros.retomadaLinkTexto}
              limite={LIMITE_TEXTO_COM_BOTAO}
              multilinha
            />
          </div>
        </details>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/instagram/automacoes/"
            className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-5 text-sm font-medium text-[var(--abissal)] hover:bg-neutral-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex min-h-11 items-center rounded-md bg-[var(--abissal)] px-5 text-sm font-medium text-[var(--branco)] transition hover:opacity-90 disabled:opacity-50"
          >
            {pendente ? "Salvando..." : "Salvar automação"}
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <PreviaCelular form={form} />
      </aside>

      <ConfirmarAcao
        aberto={saidaPendente}
        titulo="Descartar alterações?"
        descricao="Há alterações que ainda não foram salvas. Se sair agora, elas serão perdidas."
        rotuloConfirmar="Descartar"
        variante="perigo"
        onConfirmar={confirmarSaida}
        onCancelar={cancelarSaida}
      />
    </form>
  );
}
