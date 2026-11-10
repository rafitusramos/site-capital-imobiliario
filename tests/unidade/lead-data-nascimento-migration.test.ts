import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Trava da 033: os RPCs de lead recriados não podem voltar a ser chamáveis pela
 * chave pública. Função recriada ganha o execute padrão de PUBLIC (e os default
 * privileges do Supabase para anon/authenticated); só a service_role os chama.
 */
const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "033_lead_data_nascimento.sql"),
  "utf8",
).replace(/--.*$/gm, "");

describe("033: data de nascimento", () => {
  test.each(["criar_lead_financiamento", "criar_lead_home_equity"])(
    "%s recriado com p_data_nascimento e sem execute para public/anon/authenticated",
    (funcao) => {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${funcao}\\([^;]*p_data_nascimento date default null`));
      expect(sql).toMatch(
        new RegExp(`revoke execute on function public\\.${funcao}\\([^)]*\\bdate\\s*\\)\\s*from public, anon, authenticated;`),
      );
    },
  );
});
