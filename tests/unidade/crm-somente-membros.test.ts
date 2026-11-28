import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Trava da 039: o CRM só serve a quem tem linha em `profiles` (eh_membro_crm())
 * e só admin apaga lead. Policy nova de CRM: `to authenticated` + eh_membro_crm().
 */
const PASTA = join(process.cwd(), "supabase", "migrations");
const sql = readFileSync(join(PASTA, "039_crm_somente_membros.sql"), "utf8").replace(/--.*$/gm, "");

/** Corpo de `create policy "nome" on ... ;` (até o ponto e vírgula que fecha o comando). */
function policy(nome: string): string {
  const m = sql.match(new RegExp(String.raw`create policy "${nome}"[\s\S]*?;`, "i"));
  expect(m, `policy ${nome} não recriada na 039`).not.toBeNull();
  return m![0];
}

// Mesmos nomes de policy que a 031 restringiu a authenticated, menos as só-admin
// (crm_emails/crm_exclusoes/*_admin_write), que a 039 não mexe.
const POLICIES_DE_MEMBRO = [
  "lead_financiamento_crud",
  "lead_home_equity_crud",
  "lead_imovel_crud",
  "lead_consorcio_crud",
  "lead_status_historico_select",
  "lead_interacoes_select",
  "lead_interacoes_insert",
  "lead_interacoes_update_autor_ou_admin",
  "lead_interacoes_delete_autor_ou_admin",
  "lead_tags_crud",
  "crm_lembretes_crud",
  "crm_simulacoes_select",
  "crm_etapas_read",
  "crm_interacao_tipos_read",
  "crm_motivos_perda_read",
  "crm_tags_read",
  "leads_membros_select",
  "leads_membros_insert",
  "leads_membros_update",
  "profiles_read_authenticated",
];

describe("039: eh_membro_crm()", () => {
  const funcao = sql.match(/create or replace function public\.eh_membro_crm\(\)[\s\S]*?\$\$;/)?.[0] ?? "";

  test("security definer com search_path fixo, lendo profiles pelo auth.uid()", () => {
    expect(funcao).toMatch(/security definer/);
    expect(funcao).toMatch(/set search_path = public, pg_temp/);
    expect(funcao).toMatch(/from public\.profiles/);
    expect(funcao).toMatch(/auth\.uid\(\)/);
  });

  test("execute revogado de public e anon, concedido só a authenticated", () => {
    expect(sql).toMatch(/revoke execute on function public\.eh_membro_crm\(\) from public, anon;/);
    expect(sql).toMatch(/grant execute on function public\.eh_membro_crm\(\) to authenticated;/);
  });
});

describe("039: policies do CRM exigem membro", () => {
  test.each(POLICIES_DE_MEMBRO)("%s: to authenticated + eh_membro_crm()", (nome) => {
    const p = policy(nome);
    expect(p).toMatch(/to authenticated/);
    expect(p).toMatch(/public\.eh_membro_crm\(\)/);
  });

  test.each(POLICIES_DE_MEMBRO)("%s é precedida de drop policy if exists (idempotente)", (nome) => {
    expect(sql).toMatch(new RegExp(`drop policy if exists "${nome}"`));
  });

  test("leads_visiveis (for all) é removida", () => {
    expect(sql).toMatch(/drop policy if exists "leads_visiveis" on public\.leads;/);
    expect(sql).not.toMatch(/create policy "leads_visiveis"/);
  });
});

describe("039: exclusão de lead é só de admin", () => {
  const p = policy("leads_admin_delete");

  test("DELETE em leads usa eh_admin() e nada mais", () => {
    expect(p).toMatch(/for delete to authenticated/);
    expect(p).toMatch(/using \(public\.eh_admin\(\)\)/);
    expect(p).not.toMatch(/corretor_id/);
  });

  test("nenhuma outra policy de leads cobre delete", () => {
    const todas = [...sql.matchAll(/create policy "([^"]+)" on public\.leads for (\w+)/g)];
    expect(todas.filter((m) => m[2] === "delete" || m[2] === "all").map((m) => m[1])).toEqual(["leads_admin_delete"]);
  });
});

describe("039: profiles", () => {
  test("leitura geral só para membro; as próprias policies passam a authenticated", () => {
    expect(policy("profiles_read_authenticated")).toMatch(/using \(public\.eh_membro_crm\(\)\)/);
    expect(policy("profiles_select_own")).toMatch(/to authenticated/);
    expect(policy("profiles_update_own")).toMatch(/to authenticated/);
  });

  test("não mexe nos grants de coluna da 020", () => {
    expect(sql).not.toMatch(/grant update/i);
    expect(sql).not.toMatch(/revoke update/i);
  });
});

describe("039: nada de auth.role() = 'authenticated'", () => {
  test("a checagem de papel de sessão não volta", () => {
    expect(sql).not.toMatch(/auth\.role\(\)/);
  });

  test("sem begin/commit (a CLI já abre transação)", () => {
    expect(sql).not.toMatch(/^\s*(begin|commit);/im);
  });
});
