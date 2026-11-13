"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirContato } from "@/app/actions/admin-instagram";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { useToast } from "@/lib/admin/toast";
import { dataCurta } from "@/lib/instagram/etiquetas";
import type { ItemCaixa, MensagemConversa } from "@/lib/queries/admin-instagram";
import { EtiquetaSituacao, iniciais, nomeDoContato } from "@/components/admin/instagram/ListaContatos";

const BALAO = "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed";

function Hora({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="tabular-nums">
      {dataCurta(iso)}
    </time>
  );
}

function Mensagem({ m }: { m: MensagemConversa }) {
  // Linhas do sistema: centradas, sem balão.
  if (m.tipo === "link_aberto" || m.tipo === "aviso" || m.direcao === "sistema") {
    const texto = m.tipo === "link_aberto" ? "abriu o link" : (m.texto ?? "aviso do sistema");
    return (
      <li className="self-center text-center text-xs text-neutral-600">
        {texto} · <Hora iso={m.criadoEm} />
      </li>
    );
  }

  if (m.direcao === "entrada") {
    return (
      <li className="flex flex-col items-start">
        <div className={`${BALAO} bg-neutral-100 text-[var(--tinta)]`}>
          {m.tipo === "comentario" ? (
            <>
              comentou: <strong>{m.texto}</strong>
            </>
          ) : m.tipo === "botao" ? (
            <>
              tocou em <strong>{m.texto}</strong>
            </>
          ) : (
            m.texto
          )}
        </div>
        <span className="mt-0.5 text-[11px] text-neutral-500">
          <Hora iso={m.criadoEm} />
        </span>
      </li>
    );
  }

  if (m.direcao === "dono") {
    return (
      <li className="flex flex-col items-end">
        <div className={`${BALAO} border border-[var(--areia)] bg-[var(--marfim)] text-[var(--tinta)]`}>{m.texto}</div>
        <span className="mt-0.5 text-[11px] text-neutral-500">
          você, pelo app · <Hora iso={m.criadoEm} />
        </span>
      </li>
    );
  }

  // saida: o que o sistema enviou.
  return (
    <li className="flex flex-col items-end">
      <div className={`${BALAO} bg-[#e3f0ea] text-[var(--tinta)]`}>
        {m.tipo === "resposta_publica" && (
          <span className="mb-0.5 block text-[11px] font-medium text-[var(--jade)]">resposta pública no comentário</span>
        )}
        {m.texto}
      </div>
      <span className="mt-0.5 text-[11px] text-neutral-500">
        <Hora iso={m.criadoEm} />
      </span>
    </li>
  );
}

export function ConversaContato({
  item,
  mensagens,
  hrefLista,
}: {
  /** null: o contato do link não existe (mais) na caixa. */
  item: ItemCaixa | null;
  mensagens: MensagemConversa[];
  hrefLista: string;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, executar] = useTransition();

  if (!item) {
    return (
      <div className="p-6 text-sm text-neutral-600">
        Esta pessoa não está mais na caixa de entrada.{" "}
        <Link href={hrefLista} className="font-medium text-[var(--jade)] underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  const c = item.contato;
  const nome = nomeDoContato(c);

  function excluir() {
    executar(async () => {
      const r = await excluirContato(c.id);
      setConfirmando(false);
      if (!r.sucesso) {
        mostrarToast("erro", r.erro ?? "Não foi possível excluir os dados.");
        return;
      }
      mostrarToast("sucesso", "Dados do contato excluídos.");
      router.push(hrefLista);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-200 px-4 py-3">
        <Link
          href={hrefLista}
          className="inline-flex min-h-11 w-full items-center text-sm font-medium text-[var(--jade)] underline md:hidden"
        >
          Voltar à lista
        </Link>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--marfim)] text-sm font-semibold text-[var(--bronze)]"
        >
          {iniciais(c)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-[var(--abissal)]">{nome}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
            {c.username && c.nome && <span>@{c.username}</span>}
            <EtiquetaSituacao item={item} />
            <span>{item.automacaoNome}</span>
          </p>
        </div>
        {c.username && (
          <a
            href={`https://ig.me/m/${encodeURIComponent(c.username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--jade)] underline"
          >
            Abrir no Instagram <span aria-hidden="true">&nbsp;↗</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {mensagens.length === 0 ? (
          <p className="text-sm text-neutral-600">Ainda não há mensagens registradas para esta pessoa.</p>
        ) : (
          <ol aria-label={`Conversa com ${nome}`} className="flex flex-col gap-3">
            {mensagens.map((m) => (
              <Mensagem key={m.id} m={m} />
            ))}
          </ol>
        )}
      </div>

      <footer className="border-t border-neutral-200 px-4 py-3">
        <p className="mb-1 text-xs text-neutral-600">Só leitura. Para responder, use o app do Instagram.</p>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-[var(--erro)] transition hover:bg-[#f6e4e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--erro)]"
        >
          Excluir dados deste contato
        </button>
      </footer>

      <ConfirmarAcao
        aberto={confirmando}
        titulo="Excluir dados deste contato?"
        descricao={`Apaga ${nome}, o histórico de conversa e a participação nas automações. Se a pessoa comentar de novo, entra como um contato novo. Não dá para desfazer.`}
        rotuloConfirmar="Excluir dados"
        variante="perigo"
        pendente={pendente}
        onConfirmar={excluir}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}
