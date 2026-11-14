import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Trava da migration 038: base do atendimento por WhatsApp (tabelas, RLS, fila, limpezas). */
const sql = readFileSync(join(process.cwd(), "supabase", "migrations", "038_whatsapp_base.sql"), "utf8").replace(
  /--.*$/gm,
  "",
);

const TABELAS = ["wa_config", "wa_contatos", "wa_mensagens", "wa_envios", "wa_eventos"];

describe("038: WhatsApp base", () => {
  it("não tem begin/commit", () => expect(sql).not.toMatch(/^\s*(begin|commit)\s*;/im));

  it.each(TABELAS)("%s tem RLS e revoke de anon e authenticated", (t) => {
    expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`, "i"));
    expect(sql).toMatch(new RegExp(`revoke all on table public\\.${t} from anon`, "i"));
    expect(sql).toMatch(new RegExp(`revoke all on table public\\.${t} from authenticated`, "i"));
  });

  it("toda policy é to authenticated com eh_admin", () => {
    const policies = sql.match(/create policy[\s\S]*?;/gi)!;
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p).toMatch(/to authenticated[\s\S]*eh_admin\(\)/i);
  });

  it("wa_eventos não tem policy (só service role)", () =>
    expect(sql).not.toMatch(/create policy \w+ on public\.wa_eventos/i));

  it("wa_config: authenticated só atualiza numero_oficial", () =>
    expect(sql).toMatch(/grant update \(numero_oficial\) on public\.wa_config to authenticated/i));

  it("funções sem execute para public", () => {
    expect(sql).toMatch(
      /revoke execute on function public\.wa_reservar_envios\(int\) from public, anon, authenticated/i,
    );
    expect(sql).toMatch(/revoke execute on function public\.wa_apagar_inativos\(\) from public, anon, authenticated/i);
    expect(sql).toMatch(/revoke execute on function public\.wa_limpar_eventos\(\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.wa_reservar_envios\(int\) to service_role/i);
  });

  it("reserva respeita 6 s por contato", () => {
    const f = sql.match(/function public\.wa_reservar_envios[\s\S]*?\$\$;/i)![0];
    expect(f).toMatch(/security definer/i);
    expect(f).toMatch(/distinct on \(contato_id\)/i);
    expect(f).toMatch(/interval '6 seconds'/i);
    expect(f).toMatch(/for update (of \w+ )?skip locked/i);
  });

  it("reserva confere o estado de novo dentro do lock e no update final", () => {
    const f = sql.match(/function public\.wa_reservar_envios[\s\S]*?\$\$;/i)![0];
    const escolhidos = f.match(/escolhidos as \([\s\S]*?\)\s*update/i)![0];
    expect(escolhidos).toMatch(/e\.estado = 'pendente' and e\.enviar_apos <= now\(\)/i);
    expect(escolhidos).toMatch(/e\.estado = 'processando' and e\.reservado_em < now\(\) - interval '5 minutes'/i);
    expect(escolhidos.indexOf("e.estado")).toBeLessThan(escolhidos.search(/for update/i));
    const final = f.slice(f.search(/update public\.wa_envios u/i));
    expect(final).toMatch(/u\.estado = 'pendente' and u\.enviar_apos <= now\(\)/i);
    expect(final).toMatch(/u\.estado = 'processando' and u\.reservado_em < now\(\) - interval '5 minutes'/i);
  });

  it("limpezas: inativos sem lead e eventos antigos, agendadas de forma idempotente", () => {
    expect(sql).toMatch(/lead_id is null[\s\S]*?interval '12 months'/i);
    expect(sql).toMatch(/interval '30 days'/i);
    expect(sql).toMatch(/'wa-apagar-inativos',\s*'45 6 \* \* \*'/);
    expect(sql).toMatch(/'wa-limpar-eventos',\s*'50 6 \* \* \*'/);
    expect(sql).toMatch(/array\['wa-apagar-inativos', 'wa-limpar-eventos'\][\s\S]*?cron\.unschedule\(v_job\)/);
  });

  it("consentimento_whatsapp_em em leads", () =>
    expect(sql).toMatch(/alter table public\.leads\s+add column if not exists consentimento_whatsapp_em timestamptz/i));

  it("crm_emails aceita whatsapp-admin e mantém os tipos anteriores", () => {
    expect(sql).toMatch(/'whatsapp-admin'/);
    for (const t of ["novo-lead-admin", "novo-lead-lead", "etapa-admin", "etapa-lead", "simulacao"])
      expect(sql).toContain(`'${t}'`);
  });
});
