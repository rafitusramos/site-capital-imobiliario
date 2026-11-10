import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Trava da 031 (hot-fix): toda tabela/view do CRM sem privilégio para `anon`
 * e toda policy do CRM restrita a `authenticated`. Policy criada sem `to` vale
 * para `public`, que inclui o anônimo — foi assim que a chave pública do site
 * passou a ler leads sem responsável.
 */
const PASTA = join(process.cwd(), "supabase", "migrations");
const sql = readFileSync(join(PASTA, "031_crm_sem_acesso_anonimo.sql"), "utf8");
const semComentarios = sql.replace(/--.*$/gm, "");

const TABELAS_CRM = [
  "leads",
  "lead_financiamento",
  "lead_home_equity",
  "lead_imovel",
  "lead_consorcio",
  "lead_status_historico",
  "lead_interacoes",
  "lead_tags",
  "crm_lembretes",
  "crm_simulacoes",
  "crm_emails",
  "crm_exclusoes",
  "crm_etapas",
  "crm_interacao_tipos",
  "crm_motivos_perda",
  "crm_tags",
  "vw_leads_crm",
  "vw_crm_timeline",
];

describe("031: CRM sem acesso anônimo", () => {
  const blocoRevoke = semComentarios.match(/revoke all on table([\s\S]*?)from anon;/)?.[1] ?? "";

  test.each(TABELAS_CRM)("revoga do anon: %s", (tabela) => {
    expect(blocoRevoke).toMatch(new RegExp(`public\\.${tabela}\\b`));
  });

  test("toda policy criada nas migrations de CRM (014 em diante) é restrita a authenticated na 031", () => {
    const arquivos = readdirSync(PASTA)
      .filter((nome) => /^\d+/.test(nome) && Number(nome.match(/^\d+/)![0]) >= 14 && Number(nome.match(/^\d+/)![0]) < 31)
      .sort();
    const policiesCrm = new Set<string>();
    for (const arquivo of arquivos) {
      const texto = readFileSync(join(PASTA, arquivo), "utf8").replace(/--.*$/gm, "");
      for (const m of texto.matchAll(/create policy\s+"([^"]+)"\s+on\s+public\.(\w+)/gi)) {
        if (TABELAS_CRM.includes(m[2])) policiesCrm.add(m[1]);
      }
    }
    // Policies apagadas por migrations posteriores não existem mais no banco.
    for (const arquivo of arquivos) {
      const texto = readFileSync(join(PASTA, arquivo), "utf8").replace(/--.*$/gm, "");
      for (const m of texto.matchAll(/drop policy(?: if exists)?\s+"([^"]+)"/gi)) policiesCrm.delete(m[1]);
    }

    expect(policiesCrm.size).toBeGreaterThan(0);
    for (const policy of policiesCrm) {
      expect(semComentarios, `policy ${policy} sem "to authenticated" na 031`).toMatch(
        new RegExp(`alter policy\\s+"${policy}"\\s+on\\s+public\\.\\w+\\s+to authenticated;`),
      );
    }
  });
});

describe("032: funções do CRM sem execute para PUBLIC", () => {
  // Revogar só do anon (031) não basta: o grant padrão de função é para PUBLIC.
  const sql032 = readFileSync(join(PASTA, "032_crm_simulacoes_anexo.sql"), "utf8").replace(/--.*$/gm, "");

  test.each(["mover_lead_crm", "registrar_interacao_crm", "definir_tags_lead"])("%s", (funcao) => {
    expect(sql032).toMatch(new RegExp(`revoke execute on function public\\.${funcao}\\([^)]*\\) from public;`));
  });
});
