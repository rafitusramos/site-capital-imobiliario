import type { Metadata } from "next";
import { garantirAdminOuRedirecionar } from "@/lib/admin/auth";
import { statusConexao } from "@/lib/queries/admin-instagram";
import { formatarData } from "@/lib/crm/tempo";
import { BotaoConectar } from "@/components/admin/instagram/StatusConexao";

export const metadata: Metadata = { title: "Conexão do Instagram · Admin" };
export const dynamic = "force-dynamic";

const MENSAGENS_ERRO: Record<string, string> = {
  state: "A confirmação de segurança não bateu (ou expirou). Clique em conectar de novo.",
  cancelado: "A conexão foi cancelada na Meta. Nada foi alterado.",
  troca: "A Meta não aceitou o código de acesso. Tente conectar novamente.",
  conta: "O login funcionou, mas nenhuma conta do Instagram veio atribuída. Confira a conta escolhida na Meta.",
  gravar: "A conta foi autorizada, mas não conseguimos salvar a conexão. Tente de novo.",
};

type Params = { ok?: string; erro?: string };

export default async function ConexaoInstagramPage({ searchParams }: { searchParams: Promise<Params> }) {
  await garantirAdminOuRedirecionar();
  const { ok, erro } = await searchParams;
  const s = await statusConexao();

  const mensagemErro = erro ? (MENSAGENS_ERRO[erro] ?? "Não foi possível concluir a conexão.") : null;

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-[var(--abissal)]">Conexão do Instagram</h1>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        A conta conectada responde aos comentários e envia as mensagens das automações. A conexão não
        expira; reconecte só se trocar de conta ou se a Meta pedir.
      </p>

      {ok === "1" && (
        <div role="status" className="mb-6 max-w-2xl rounded-md border border-[var(--jade)] bg-white px-4 py-3 text-sm text-[var(--jade)]">
          {s.conectada && !s.webhooksAssinados
            ? "Conta conectada, mas os avisos de comentários e mensagens não foram ativados. Reconecte para tentar de novo."
            : "Conta conectada."}
        </div>
      )}
      {mensagemErro && (
        <div role="alert" className="mb-6 max-w-2xl rounded-md border border-[var(--erro)] bg-white px-4 py-3 text-sm text-[var(--erro)]">
          {mensagemErro}
        </div>
      )}

      <section className="max-w-2xl rounded-md border border-neutral-200 bg-white p-5">
        {s.conectada ? (
          <div className="flex items-start gap-4">
            {s.fotoUrl ? (
              <img src={s.fotoUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-neutral-200" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--abissal)]">@{s.username ?? "sem-usuario"}</p>
              {s.nome && <p className="text-sm text-neutral-500">{s.nome}</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Nenhuma conta conectada. Conecte para ativar as automações.</p>
        )}

        {s.conectada && (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Conectada em</dt>
              <dd className="text-neutral-800">{s.conectadoEm ? formatarData(s.conectadoEm) : "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Webhooks</dt>
              <dd className={s.webhooksAssinados ? "text-[var(--jade)]" : "text-[var(--erro)]"}>
                {s.webhooksAssinados ? "Assinados" : "Não assinados"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Último evento recebido</dt>
              <dd className="text-neutral-800">{s.ultimoEventoEm ? formatarData(s.ultimoEventoEm) : "Nenhum ainda"}</dd>
            </div>
          </dl>
        )}

        <div className="mt-6">
          <BotaoConectar reconectar={s.conectada} />
        </div>
      </section>
    </div>
  );
}
