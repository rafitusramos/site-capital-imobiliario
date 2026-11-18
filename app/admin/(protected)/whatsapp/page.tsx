import type { Metadata } from "next";
import { statusWhatsApp, type EnvioRecente } from "@/lib/queries/admin-whatsapp";
import { formatarData } from "@/lib/crm/tempo";
import { BotaoAssinarWebhooks, FormNumeroOficial } from "@/components/admin/whatsapp/ConfigWhatsApp";

export const metadata: Metadata = { title: "WhatsApp · Admin" };
export const dynamic = "force-dynamic";

const MOTIVOS: Record<EnvioRecente["motivo"], string> = {
  confirmacao: "Confirmação do pedido",
  etapa: "Mudança de etapa",
  resposta_fixa: "Resposta automática",
};

const ESTADOS: Record<EnvioRecente["estado"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Na fila", cor: "text-neutral-600" },
  processando: { rotulo: "Enviando", cor: "text-neutral-600" },
  enviado: { rotulo: "Enviado", cor: "text-[var(--jade)]" },
  falhou: { rotulo: "Falhou", cor: "text-[var(--erro)]" },
  cancelado: { rotulo: "Cancelado", cor: "text-neutral-500" },
};

/** Formata o número do display da Meta como veio, ou traço. */
function exibir(v: string | null | undefined) {
  return v && v.trim() ? v : "—";
}

export default async function WhatsAppPage() {
  const s = await statusWhatsApp();

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-[var(--abissal)]">WhatsApp</h1>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Número conectado à Cloud API, recebimento de eventos e os últimos envios automáticos aos clientes.
      </p>

      <section aria-labelledby="titulo-conexao" className="mb-6 max-w-2xl rounded-md border border-neutral-200 bg-white p-5">
        <h2 id="titulo-conexao" className="mb-3 text-base font-semibold text-[var(--abissal)]">
          Conexão
        </h2>

        {!s.configurado ? (
          <p className="text-sm text-neutral-600">
            Não configurado neste ambiente. Faltam as variáveis do WhatsApp (token, número, conta e segredo do app).
          </p>
        ) : s.info ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Número</dt>
              <dd className="text-neutral-800">{exibir(s.info.numero)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Nome de exibição</dt>
              <dd className="text-neutral-800">{exibir(s.info.nomeExibicao)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Qualidade</dt>
              <dd className="text-neutral-800">{exibir(s.info.qualidade)}</dd>
            </div>
          </dl>
        ) : (
          <p role="status" className="text-sm text-[var(--erro)]">
            Não foi possível consultar o número na Meta agora. Confira o token e tente recarregar a página.
          </p>
        )}

        <dl className="mt-4 text-sm">
          <dt className="text-neutral-500">Último evento recebido</dt>
          <dd className="text-neutral-800">{s.ultimoEventoEm ? formatarData(s.ultimoEventoEm) : "Nenhum ainda"}</dd>
        </dl>

        {s.configurado && (
          <div className="mt-5">
            <BotaoAssinarWebhooks />
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-numero" className="mb-6 max-w-2xl rounded-md border border-neutral-200 bg-white p-5">
        <h2 id="titulo-numero" className="sr-only">
          Número oficial
        </h2>
        <FormNumeroOficial inicial={s.numeroOficial ?? ""} />
      </section>

      <section aria-labelledby="titulo-envios" className="max-w-4xl rounded-md border border-neutral-200 bg-white p-5">
        <h2 id="titulo-envios" className="mb-3 text-base font-semibold text-[var(--abissal)]">
          Últimos envios
        </h2>
        {s.envios.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhum envio ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Quando</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Destino</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Motivo</th>
                  <th scope="col" className="py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {s.envios.map((e) => {
                  const est = ESTADOS[e.estado] ?? { rotulo: e.estado, cor: "text-neutral-600" };
                  return (
                    <tr key={e.id} className="border-b border-neutral-100 align-top last:border-0">
                      <td className="py-2 pr-4 text-neutral-800">{formatarData(e.enviadoEm ?? e.criadoEm)}</td>
                      <td className="py-2 pr-4 tabular-nums text-neutral-800">{e.destino}</td>
                      <td className="py-2 pr-4 text-neutral-800">{MOTIVOS[e.motivo] ?? e.motivo}</td>
                      <td className="py-2">
                        <span className={est.cor}>{est.rotulo}</span>
                        {e.erro && <span className="block text-xs text-neutral-500">{e.erro}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
