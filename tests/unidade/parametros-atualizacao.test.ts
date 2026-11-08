import { afterEach, describe, expect, test } from "vitest";
import { formatarAtualizacao } from "@/lib/parametros/atualizacao";

/**
 * Regressão do React #418 em /admin/parametros: o componente é renderizado no
 * servidor (Vercel, UTC) e hidratado no navegador (São Paulo). Sem `timeZone`
 * explícito os dois textos diferem em 3h. O teste força o fuso do processo
 * para UTC, como no servidor, e exige o horário de São Paulo.
 */
describe("formatarAtualizacao", () => {
  const TZ_ORIGINAL = process.env.TZ;
  afterEach(() => {
    if (TZ_ORIGINAL === undefined) delete process.env.TZ;
    else process.env.TZ = TZ_ORIGINAL;
  });

  test("usa o horário de São Paulo mesmo com o processo em UTC", () => {
    process.env.TZ = "UTC";
    expect(formatarAtualizacao("2026-11-08T00:03:00Z")).toBe("07/11/2026, 21:03");
  });

  test("dá o mesmo texto com o processo em qualquer fuso", () => {
    process.env.TZ = "UTC";
    const noServidor = formatarAtualizacao("2026-11-08T00:03:00Z");
    process.env.TZ = "America/Sao_Paulo";
    expect(formatarAtualizacao("2026-11-08T00:03:00Z")).toBe(noServidor);
  });

  test("sem data, avisa que nunca foi editado", () => {
    expect(formatarAtualizacao(null)).toBe("nunca editado — valor de fábrica");
  });
});
