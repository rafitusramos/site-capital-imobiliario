"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { excluirLead, restaurarLead } from "@/app/actions/admin-crm";
import { useToast } from "@/lib/admin/toast";
import { mascaraTelefone } from "@/lib/mascaras";
import { ConfirmarAcao } from "@/components/admin/crm/ConfirmarAcao";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";
import type { LeadArquivado } from "@/lib/queries/admin-crm";

const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-[var(--abissal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";
const BOTAO_PERIGO =
  "rounded-md border border-[var(--erro)] px-3 py-1.5 text-xs font-medium text-[var(--erro)] transition hover:bg-[var(--erro)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--erro)] disabled:opacity-50";
const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export type PainelArquivadosProps = {
  arquivados: LeadArquivado[];
  /** A ação de excluir definitivamente só existe para admin (docs/crm-spec.md §3.5) — corretor nem vê o botão. */
  souAdmin: boolean;
};

/**
 * Tela de arquivados (docs/crm-spec.md §1.4/§3.5): restaurar devolve o lead
 * ao quadro; excluir é irreversível e apaga histórico em cascata, por isso
 * exige digitar o protocolo dentro do MESMO ConfirmarAcao usado pelo
 * "arquivar" do quadro (ConfirmarAcao.tsx ganhou um slot `children` e
 * `confirmarDesabilitado` para isso — ver o comentário lá).
 */
export function PainelArquivados({ arquivados, souAdmin }: PainelArquivadosProps) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<LeadArquivado | null>(null);
  const [protocoloDigitado, setProtocoloDigitado] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function restaurar(id: string) {
    setRestaurandoId(id);
    const resultado = await restaurarLead(id);
    setRestaurandoId(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível restaurar o lead.");
      return;
    }
    mostrarToast("sucesso", "Lead restaurado — já está de volta no quadro.");
    router.refresh();
  }

  function abrirExclusao(lead: LeadArquivado) {
    setAlvoExclusao(lead);
    setProtocoloDigitado("");
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    setExcluindo(true);
    const resultado = await excluirLead(alvoExclusao.id);
    setExcluindo(false);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível excluir o lead.");
      return;
    }
    mostrarToast("sucesso", "Lead excluído definitivamente.");
    setAlvoExclusao(null);
    router.refresh();
  }

  if (arquivados.length === 0) {
    return <EstadoVazio variante="quadro" mensagem="Nenhum lead arquivado." />;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-black/5">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Responsável</th>
              <th className="px-3 py-2 font-medium">Arquivado em</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {arquivados.map((lead) => (
              <tr key={lead.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-[var(--abissal)]">{lead.nome}</p>
                  <p className="text-xs text-neutral-500 [font-family:var(--mono),monospace]">{lead.protocolo}</p>
                  <p className="text-xs text-neutral-500">{mascaraTelefone(lead.telefone)} · {lead.email}</p>
                </td>
                <td className="px-3 py-2 text-neutral-600">{lead.tipoInfo?.label ?? lead.tipo}</td>
                <td className="px-3 py-2 text-neutral-600">{lead.corretor?.full_name ?? "Sem responsável"}</td>
                <td className="px-3 py-2 text-neutral-600">{lead.arquivado_em ? formatarData(lead.arquivado_em) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={restaurandoId === lead.id}
                      onClick={() => restaurar(lead.id)}
                      className={BOTAO_SECUNDARIO}
                    >
                      {restaurandoId === lead.id ? "Restaurando…" : "Restaurar"}
                    </button>
                    {souAdmin ? (
                      <button type="button" onClick={() => abrirExclusao(lead)} className={BOTAO_PERIGO}>
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmarAcao
        aberto={alvoExclusao !== null}
        titulo="Excluir lead definitivamente"
        descricao={`Isso apaga "${alvoExclusao?.nome}" e todo o histórico (interações, lembretes, transições de etapa) para sempre — não é possível desfazer. Para confirmar, digite o protocolo ${alvoExclusao?.protocolo ?? ""}.`}
        rotuloConfirmar="Excluir definitivamente"
        variante="perigo"
        pendente={excluindo}
        confirmarDesabilitado={protocoloDigitado.trim() !== alvoExclusao?.protocolo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAlvoExclusao(null)}
      >
        <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="confirmar-protocolo">
          Protocolo
        </label>
        <input
          id="confirmar-protocolo"
          type="text"
          value={protocoloDigitado}
          onChange={(e) => setProtocoloDigitado(e.target.value)}
          placeholder={alvoExclusao?.protocolo}
          className={`${CAMPO} [font-family:var(--mono),monospace]`}
        />
      </ConfirmarAcao>
    </div>
  );
}
