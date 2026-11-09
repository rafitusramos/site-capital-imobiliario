import { describe, expect, test } from "vitest";
import { rotuloStatusSimulacao } from "@/lib/simulacao/historico";

const CRIADA = "2026-11-09T12:00:00+00:00";
const ENVIADA = "2026-11-10T15:30:00+00:00";

describe("rotuloStatusSimulacao", () => {
  test("anexada: só o PDF está guardado, nenhum e-mail saiu", () => {
    expect(rotuloStatusSimulacao({ email_status: "anexado", enviado_em: null, created_at: CRIADA })).toEqual({
      texto: "Anexada",
      problema: false,
    });
  });
  test("enviada: mostra quando o e-mail saiu (enviado_em)", () => {
    const r = rotuloStatusSimulacao({ email_status: "enviado", enviado_em: ENVIADA, created_at: CRIADA });
    expect(r.texto).toBe("Enviada em 10/11/2026, 12:30");
    expect(r.problema).toBe(false);
  });
  test("enviada antes da coluna existir (enviado_em nulo): cai para a data de criação", () => {
    const r = rotuloStatusSimulacao({ email_status: "enviado", enviado_em: null, created_at: CRIADA });
    expect(r.texto).toMatch(/^Enviada em 09\/11\/2026/);
  });
  test("falha no envio é destacada como problema", () => {
    expect(rotuloStatusSimulacao({ email_status: "falhou", enviado_em: null, created_at: CRIADA })).toEqual({
      texto: "Falhou",
      problema: true,
    });
  });
  test("sem chave do Resend também é problema, com texto próprio", () => {
    const r = rotuloStatusSimulacao({ email_status: "sem-chave", enviado_em: null, created_at: CRIADA });
    expect(r.problema).toBe(true);
    expect(r.texto).toMatch(/não configurado/i);
  });
});
