import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Trava da 040: endurecimento do banco (search_path fixo, EXECUTE fechado,
 * privilégios de tabela mínimos, storage sem listagem pública, expurgo do rate
 * limit). Lê o .sql: o que importa é o texto que o `supabase db push` vai rodar.
 */
const PASTA = join(process.cwd(), "supabase", "migrations");
const bruto = readFileSync(join(PASTA, "040_banco_endurecimento.sql"), "utf8");
const sql = bruto.replace(/--.*$/gm, "");

/** Comando `alter function public.<nome>(...) ... ;` */
function alterFunction(nome: string): string {
  const m = sql.match(new RegExp(String.raw`alter function public\.${nome}\([^)]*\)[^;]*;`, "i"));
  expect(m, `alter function de ${nome} ausente`).not.toBeNull();
  return m![0];
}

describe("040: search_path fixo nas funções", () => {
  const FUNCOES = [
    "criar_lead_financiamento",
    "criar_lead_home_equity",
    "criar_lead_imovel",
    "registrar_tentativa_lead",
    "set_updated_at",
    "log_lead_status_change",
  ];
  test.each(FUNCOES)("%s fixa search_path = public, pg_temp", (nome) => {
    expect(alterFunction(nome)).toMatch(/set search_path\s*=\s*public,\s*pg_temp/i);
  });
});

describe("040: EXECUTE de funções", () => {
  function revoke(nome: string): string {
    const m = sql.match(new RegExp(String.raw`revoke execute on function public\.${nome}\([^)]*\)[^;]*;`, "i"));
    expect(m, `revoke de ${nome} ausente`).not.toBeNull();
    return m![0];
  }

  test.each(["criar_lead_imovel", "registrar_tentativa_lead"])(
    "%s: revogada de public, anon e authenticated (só service role)",
    (nome) => {
      const r = revoke(nome);
      expect(r).toMatch(/from\s+public\s*,\s*anon\s*,\s*authenticated/i);
    },
  );

  test.each([
    "salvar_imovel_diferenciais",
    "salvar_imovel_faqs",
    "salvar_imovel_imagens",
    "salvar_imovel_tipologias",
  ])("%s: sai de public e anon, authenticated continua", (nome) => {
    const r = revoke(nome);
    expect(r).toMatch(/from\s+public\s*,\s*anon/i);
    expect(r).not.toMatch(/authenticated/i);
  });

  test.each(["set_updated_at", "ig_set_atualizado_em"])("%s (trigger): revogada de todos os papéis expostos", (nome) => {
    expect(revoke(nome)).toMatch(/from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  });

  test("eh_admin(): sai de public e anon; authenticated mantém", () => {
    const r = revoke("eh_admin");
    expect(r).toMatch(/from\s+public\s*,\s*anon/i);
    expect(r).not.toMatch(/authenticated/i);
  });

  test("nunca revoga nada de service_role", () => {
    expect(sql).not.toMatch(/revoke[^;]*service_role/i);
  });
});

describe("040: privilégios de tabela", () => {
  test("nunca revoga SELECT de anon (as páginas públicas leem com anon)", () => {
    const revokes = sql.match(/revoke[^;]*;/gi) ?? [];
    for (const r of revokes) {
      expect(r, r).not.toMatch(/\bselect\b/i);
      expect(r, r).not.toMatch(/revoke\s+all\b(?![^;]*lead_rate_limit)/i);
    }
  });

  test("tabelas de conteúdo ficam sem escrita/TRUNCATE para anon", () => {
    for (const t of [
      "categories",
      "imoveis",
      "imovel_diferenciais",
      "imovel_faqs",
      "imovel_fases",
      "imovel_imagens",
      "imovel_tipologias",
      "imovel_tipos",
      "lead_tipos",
      "parametros_simulador",
      "posts",
    ]) {
      expect(sql, t).toMatch(new RegExp(String.raw`revoke insert, update, delete, truncate, references, trigger[\s\S]*?\bpublic\.${t}\b[\s\S]*?from anon`, "i"));
    }
  });

  test("profiles: anon perde tudo menos SELECT; UPDATE por coluna (020) intocado", () => {
    expect(sql).toMatch(/revoke insert, delete, truncate, references, trigger on table public\.profiles from anon/i);
    expect(sql).not.toMatch(/revoke[^;]*update[^;]*on table public\.profiles/i);
  });

  test("lead_rate_limit fechada para anon e authenticated", () => {
    expect(sql).toMatch(/revoke all on table public\.lead_rate_limit from anon, authenticated/i);
  });

  test("TRUNCATE/REFERENCES/TRIGGER saem de anon e authenticated em todas as tabelas", () => {
    expect(sql).toMatch(
      /revoke truncate, references, trigger on all tables in schema public from anon, authenticated/i,
    );
  });
});

describe("040: privilégios padrão (fail-closed para objetos novos)", () => {
  test("tabelas novas: anon sem escrita; authenticated sem truncate/references/trigger", () => {
    expect(sql).toMatch(
      /alter default privileges for role postgres in schema public\s+revoke insert, update, delete, truncate, references, trigger on tables from anon/i,
    );
    expect(sql).toMatch(
      /alter default privileges for role postgres in schema public\s+revoke truncate, references, trigger on tables from authenticated/i,
    );
  });
  test("funções novas: sem EXECUTE para public e anon", () => {
    expect(sql).toMatch(
      /alter default privileges for role postgres in schema public\s+revoke execute on functions from public, anon/i,
    );
  });
});

describe("040: storage sem listagem pública", () => {
  test.each(["blog_images_public_read", "imovel_images_public_read"])("dropa a policy ampla %s", (nome) => {
    expect(sql).toMatch(new RegExp(String.raw`drop policy if exists "${nome}" on storage\.objects`, "i"));
  });

  test.each([
    ["blog_images_admin_select", "blog-images"],
    ["imovel_images_admin_select", "imovel-images"],
  ])("cria %s só para admin autenticado em %s", (nome, bucket) => {
    const m = sql.match(new RegExp(String.raw`create policy "${nome}" on storage\.objects[\s\S]*?;`, "i"));
    expect(m, nome).not.toBeNull();
    expect(m![0]).toMatch(/for select/i);
    expect(m![0]).toMatch(/to authenticated/i);
    expect(m![0]).toContain(`bucket_id = '${bucket}'`);
    expect(m![0]).toMatch(/public\.eh_admin\(\)/);
  });
});

describe("040: expurgo do rate limit e índices", () => {
  test("job pg_cron leads-limpar-rate-limit, idempotente", () => {
    expect(sql).toMatch(/cron\.unschedule\('leads-limpar-rate-limit'\)/);
    const m = sql.match(/cron\.schedule\(\s*'leads-limpar-rate-limit'[\s\S]*?\);/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/delete from public\.lead_rate_limit where janela_inicio < now\(\) - interval '7 days'/i);
  });

  test("índices nas FKs usadas em join", () => {
    expect(sql).toMatch(/create index if not exists \w+\s+on public\.leads\s*\(imovel_id\)/i);
    expect(sql).toMatch(/create index if not exists \w+\s+on public\.crm_lembretes\s*\(interacao_id\)/i);
  });
});

describe("040: higiene do arquivo", () => {
  test("sem begin/commit (a CLI já abre a transação)", () => {
    expect(sql).not.toMatch(/\bbegin\s*;/i);
    expect(sql).not.toMatch(/\bcommit\s*;/i);
  });

  test("único SQL destrutivo é o expurgo do cron, e há a marca de aprovação", () => {
    expect(bruto).toMatch(/^-- destrutivo: aprovado\s*$/m);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).not.toMatch(/\btruncate\b(?!,)(?![^;]*\bon\b)/i);
    const deletes = sql.match(/delete\s+from/gi) ?? [];
    expect(deletes).toHaveLength(1);
    expect(sql).toMatch(/delete from public\.lead_rate_limit/i);
  });
});
