import { describe, expect, test } from "vitest";
import { exigeSimulacao, nomeArquivoSimulacao, toastDoDesfecho } from "@/lib/simulacao/gatilho";

describe("exigeSimulacao", () => {
  test("só financiamento, de criado para simulacao", () => {
    expect(exigeSimulacao("financiamento", "criado", "simulacao")).toBe(true);
  });
  test("home equity segue como hoje", () => {
    expect(exigeSimulacao("home-equity", "criado", "simulacao")).toBe(false);
  });
  test("outras origens e outros trajetos não pedem simulação", () => {
    expect(exigeSimulacao("consorcio", "criado", "simulacao")).toBe(false);
    expect(exigeSimulacao("financiamento", "simulacao", "pre-aprovacao")).toBe(false);
    expect(exigeSimulacao("financiamento", "pre-aprovacao", "simulacao")).toBe(false);
    expect(exigeSimulacao("financiamento", "criado", "perdido")).toBe(false);
  });
});

describe("nomeArquivoSimulacao", () => {
  test("usa o protocolo", () => {
    expect(nomeArquivoSimulacao("RT-2026-0042")).toBe("Simulacao-RT-RT-2026-0042.pdf");
  });
  test("protocolo com caracteres estranhos não vaza para o nome do arquivo", () => {
    expect(nomeArquivoSimulacao('a/b "c"\n')).toBe("Simulacao-RT-a-b-c.pdf");
  });
  test("protocolo vazio cai num nome genérico", () => {
    expect(nomeArquivoSimulacao("")).toBe("Simulacao-RT.pdf");
  });
});

describe("toastDoDesfecho", () => {
  test("cancelar não diz nada", () => {
    expect(toastDoDesfecho("cancelado", "Simulação")).toBeNull();
  });
  test("mover e enviar confirma os dois", () => {
    expect(toastDoDesfecho("movido-e-enviado", "Simulação")).toEqual({
      tipo: "sucesso",
      texto: "Lead movido para Simulação e simulação enviada por e-mail.",
    });
  });
  test("envio que falhou depois de mover é erro, diz que a etapa mudou e que a simulação segue anexada", () => {
    const t = toastDoDesfecho("movido-envio-falhou", "Simulação")!;
    expect(t.tipo).toBe("erro");
    expect(t.texto).toMatch(/etapa mudou/);
    expect(t.texto).toMatch(/NÃO foi enviada/);
    expect(t.texto).toMatch(/anexada/);
    expect(t.texto).not.toMatch(/Enviar simulação/); // não existe mais envio fora do movimento
  });
  test("anexar só confirma o anexo: nenhum e-mail é prometido", () => {
    const t = toastDoDesfecho("anexado", "")!;
    expect(t.tipo).toBe("sucesso");
    expect(t.texto).toMatch(/anexada/i);
    expect(t.texto).not.toMatch(/e-mail/i);
  });
  test("mover sem enviar é só o movimento", () => {
    expect(toastDoDesfecho("movido-sem-envio", "Simulação")?.texto).toBe("Lead movido para Simulação.");
  });
});
