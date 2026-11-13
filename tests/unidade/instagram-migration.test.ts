import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trava da migration do módulo Instagram (comentário -> DM). O número seria 034,
 * mas a 034 já era `post_revisado_em`; esta é a 035.
 */
const sql = readFileSync(join(process.cwd(), "supabase", "migrations", "035_instagram_dm.sql"), "utf8").replace(
  /--.*$/gm,
  "",
);

const TABELAS = ["ig_conta", "ig_automacoes", "ig_contatos", "ig_participacoes", "ig_mensagens", "ig_envios", "ig_eventos", "ig_cliques"];
const FUNCOES = ["ig_reservar_envios", "ig_resumo_do_dia", "ig_apagar_inativos", "ig_limpar_eventos"];

describe("035: Instagram DM", () => {
  it.each(TABELAS)("%s tem RLS ligada", (t) =>
    expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`, "i")));
  it.each(TABELAS)("%s revoga tudo do anon", (t) =>
    expect(sql).toMatch(new RegExp(`revoke all on (table )?public\\.${t} from anon`, "i")));
  it("toda policy é to authenticated", () => {
    const policies = sql.match(/create policy[\s\S]*?;/gi)!;
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p).toMatch(/to authenticated/i);
  });
  it("token de ig_conta não recebe grant", () =>
    expect(sql).not.toMatch(/grant[^;]*\btoken\b[^;]*to authenticated/i));
  it.each(FUNCOES)("%s revoga execute de public", (f) =>
    expect(sql).toMatch(new RegExp(`revoke (all|execute)[^;]*function public\\.${f}[^;]*from public`, "i")));
  it("sem begin/commit", () => expect(sql).not.toMatch(/^\s*(begin|commit);/im));
  it("lembrete entre 1 e 23 horas", () => expect(sql).toMatch(/lembrete_horas between 1 and 23/i));
});

const sqlCron = readFileSync(join(process.cwd(), "supabase", "migrations", "036_instagram_dm_cron.sql"), "utf8").replace(
  /--.*$/gm,
  "",
);

describe("036: Instagram DM, disparador por minuto e limpezas", () => {
  it("habilita pg_net", () => expect(sqlCron).toMatch(/create extension if not exists pg_net/i));
  it("agenda o disparador a cada minuto", () =>
    expect(sqlCron).toMatch(/cron\.schedule\(\s*'ig-disparar',\s*'\* \* \* \* \*'/));
  it("agenda as limpezas diárias", () => {
    expect(sqlCron).toMatch(/'ig-apagar-inativos',\s*'15 6 \* \* \*'/);
    expect(sqlCron).toMatch(/'ig-limpar-eventos',\s*'30 6 \* \* \*'/);
  });
  it("reagenda sem duplicar (unschedule antes)", () => {
    expect(sqlCron).toMatch(
      /array\['ig-disparar', 'ig-apagar-inativos', 'ig-limpar-eventos'\][\s\S]*?jobname = v_job[\s\S]*?cron\.unschedule\(v_job\)/,
    );
  });
  it("segredos vêm do Vault, nunca literais", () => {
    expect(sqlCron).toContain("decrypted_secrets");
    expect(sqlCron).toContain("ig_disparar_url");
    expect(sqlCron).toContain("ig_cron_secret");
    expect(sqlCron).not.toMatch(/Bearer\s+[A-Za-z0-9]{8,}/);
    expect(sqlCron).not.toMatch(/https?:\/\//i);
  });
  it("ig_chamar_disparador revoga execute de todos", () =>
    expect(sqlCron).toMatch(/revoke execute on function public\.ig_chamar_disparador\(\)\s+from public, anon, authenticated/i));
  it("sem begin/commit", () => expect(sqlCron).not.toMatch(/^\s*(begin|commit);/im));
});
