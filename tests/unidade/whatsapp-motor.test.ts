import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarMotorWa, type AvisoDonoWa, type MotorWa } from "@/lib/whatsapp/motor";
import { chaveGravadaWa, type EventoWa } from "@/lib/whatsapp/eventos";
import { ATRASO_EMAIL_LEAD_MS } from "@/lib/email/notificar";
import { CloudFalso, leadFalso, RepositorioWaFalso } from "../apoio/whatsapp-falsos";

vi.mock("server-only", () => ({}));

const AGORA = new Date("2026-11-13T15:00:00.000Z");
let agora = AGORA;

let repo: RepositorioWaFalso;
let cloud: CloudFalso;
let avisos: AvisoDonoWa[];
let motor: MotorWa;

function mensagem(extra: Partial<Extract<EventoWa, { tipo: "mensagem" }>> = {}): EventoWa {
  return {
    tipo: "mensagem",
    chave: "m:1",
    waId: "5519999991234",
    nomePerfil: "Maria",
    metaId: "wamid.in1",
    conteudo: "texto",
    texto: "Oi, tenho uma dúvida",
    em: AGORA.toISOString(),
    ...extra,
  };
}

beforeEach(() => {
  agora = AGORA;
  repo = new RepositorioWaFalso();
  cloud = new CloudFalso();
  avisos = [];
  motor = criarMotorWa({
    repo,
    cloud,
    avisarDono: async (a) => {
      avisos.push(a);
    },
    agora: () => agora,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("confirmação", () => {
  it("confirmação só com consentimento", async () => {
    await motor.agendarConfirmacao(leadFalso({ consentimentoWhatsappEm: null }));
    expect(repo.envios).toHaveLength(0);
    await motor.agendarConfirmacao(leadFalso());
    expect(repo.envios).toHaveLength(1);
    expect(repo.envios[0]).toMatchObject({ chave: "conf:lead-1", motivo: "confirmacao", enviarApos: AGORA });
  });

  it("confirmação usa wa_id normalizado", async () => {
    await motor.agendarConfirmacao(leadFalso({ telefone: "(19) 99999-1234" }));
    expect(repo.contatos[0].waId).toBe("5519999991234");
    expect(repo.envios[0].waId).toBe("5519999991234");
    const t = (
      repo.envios[0].payload as { template: { name: string; components: { parameters: { text: string }[] }[] } }
    ).template;
    expect(t.name).toBe("rt_confirmacao_credito");
    expect(t.components[0].parameters.map((p) => p.text)).toEqual(["Maria", "RT-2026-0001"]);
  });

  it("telefone inválido não enfileira", async () => {
    await motor.agendarConfirmacao(leadFalso({ telefone: "123" }));
    expect(repo.envios).toHaveLength(0);
  });
});

describe("aviso de etapa", () => {
  it("aviso de etapa agenda +10 min e cancela o anterior", async () => {
    await motor.agendarAvisoEtapa(leadFalso(), "simulacao");
    agora = new Date(AGORA.getTime() + 1000);
    await motor.agendarAvisoEtapa(leadFalso(), "vistoria");
    expect(repo.cancelamentos).toHaveLength(2);
    expect(repo.envios).toHaveLength(2);
    expect(repo.envios[0].estado).toBe("cancelado");
    expect(repo.envios[1].estado).toBe("pendente");
    expect(repo.envios[0].enviarApos.getTime()).toBe(AGORA.getTime() + ATRASO_EMAIL_LEAD_MS);
    expect(repo.envios[0].enviarApos.getTime()).toBe(AGORA.getTime() + 600000);
    expect(repo.envios[0].chave).toBe(`etapa:lead-1:simulacao:${AGORA.getTime()}`);
  });

  it("etapa sem template só cancela", async () => {
    await motor.agendarAvisoEtapa(leadFalso(), "criado");
    expect(repo.cancelamentos).toHaveLength(1);
    expect(repo.envios).toHaveLength(0);
  });

  it("lead antigo nunca recebe template, mas recebe resposta fixa quando escreve", async () => {
    const antigo = leadFalso({ consentimentoWhatsappEm: null });
    repo.leads.push(antigo);
    await motor.agendarConfirmacao(antigo);
    await motor.agendarAvisoEtapa(antigo, "simulacao");
    expect(repo.envios).toHaveLength(0);
    await motor.processarEvento(mensagem());
    expect(repo.envios).toHaveLength(1);
    expect(repo.envios[0].motivo).toBe("resposta_fixa");
  });

  it("cancelarAvisosEtapa cancela os pendentes", async () => {
    await motor.cancelarAvisosEtapa("lead-1");
    expect(repo.cancelamentos).toEqual([{ leadId: "lead-1", motivo: "etapa" }]);
  });
});

describe("mensagem recebida", () => {
  it("resposta fixa no máximo 1 a cada 12 h", async () => {
    repo.leads.push(leadFalso());
    for (let i = 1; i <= 3; i++) {
      agora = new Date(AGORA.getTime() + i * 20 * 60_000);
      await motor.processarEvento(mensagem({ chave: `m:${i}`, metaId: `wamid.in${i}` }));
    }
    expect(repo.envios.filter((e) => e.motivo === "resposta_fixa")).toHaveLength(1);
    expect(repo.interacoes).toHaveLength(3);
    expect(avisos).toHaveLength(3);
    agora = new Date(AGORA.getTime() + 13 * 3600_000);
    await motor.processarEvento(mensagem({ chave: "m:9", metaId: "wamid.in9" }));
    expect(repo.envios.filter((e) => e.motivo === "resposta_fixa")).toHaveLength(2);
  });

  it("a resposta fixa leva o link do número oficial e é texto livre", async () => {
    await motor.processarEvento(mensagem());
    const corpo = repo.envios[0].payload as { type: string; text: { body: string } };
    expect(corpo.type).toBe("text");
    expect(corpo.text.body).toContain("https://wa.me/5519999990000");
    expect(repo.envios[0].chave).toBe("fixa:wamid.in1");
  });

  it("mensagem de wa_id sem o 9º dígito casa com lead cadastrado com 9", async () => {
    repo.leads.push(leadFalso({ telefone: "19999991234" }));
    await motor.processarEvento(mensagem({ waId: "551999991234" }));
    expect(repo.interacoes).toEqual([{ leadId: "lead-1", texto: "Mensagem no WhatsApp: Oi, tenho uma dúvida" }]);
    expect(repo.contatos[0].leadId).toBe("lead-1");
    expect(avisos[0]).toMatchObject({ leadId: "lead-1", nome: "Maria Souza", protocolo: "RT-2026-0001" });
  });

  it("desconhecido: resposta fixa e aviso ao dono, sem interação", async () => {
    await motor.processarEvento(mensagem({ nomePerfil: "Fulano" }));
    expect(repo.interacoes).toHaveLength(0);
    expect(repo.envios).toHaveLength(1);
    expect(avisos).toEqual([
      { nome: "Fulano", telefone: "5519999991234", protocolo: null, texto: "Oi, tenho uma dúvida" },
    ]);
    expect(repo.mensagens[0]).toMatchObject({ direcao: "entrada", tipo: "texto", metaId: "wamid.in1" });
    expect(repo.contatos[0].ultimaEntradaEm).toBe(AGORA.toISOString());
  });

  it("conteúdo sem texto vira rótulo genérico", async () => {
    repo.leads.push(leadFalso());
    await motor.processarEvento(mensagem({ conteudo: "outro", texto: null }));
    expect(repo.interacoes[0].texto).toBe("Mensagem no WhatsApp: [áudio/imagem/outro]");
  });
});

describe("status", () => {
  it("status não regride: o motor repassa todo status ao repositório", async () => {
    await motor.processarEvento({ tipo: "status", chave: "s:1:read", metaId: "w1", status: "lido", erro: null });
    await motor.processarEvento({
      tipo: "status",
      chave: "s:1:delivered",
      metaId: "w1",
      status: "entregue",
      erro: null,
    });
    expect(repo.statusRecebidos.map((s) => s.status)).toEqual(["lido", "entregue"]);
  });

  it("falhou com erro grava o motivo legível", async () => {
    await motor.processarEvento({
      tipo: "status",
      chave: "s:1:failed",
      metaId: "w1",
      status: "falhou",
      erro: { codigo: 131047, mensagem: "x" },
    });
    expect(repo.statusRecebidos[0]).toEqual({ metaId: "w1", status: "falhou", erro: "Janela de 24 h fechada" });
  });
});

describe("dispararFila", () => {
  beforeEach(async () => {
    await motor.agendarConfirmacao(leadFalso());
  });

  it("envia e registra a mensagem de saída", async () => {
    const r = await motor.dispararFila(10);
    expect(r).toEqual({ enviados: 1, falhas: 0 });
    expect(repo.envios[0]).toMatchObject({ estado: "enviado", metaId: "wamid.1" });
    expect(repo.mensagens[0]).toMatchObject({
      direcao: "saida",
      tipo: "template",
      metaId: "wamid.1",
      status: "enviado",
    });
    expect(repo.mensagens[0].texto).toContain("Olá, Maria!");
    expect(repo.mensagens[0].texto).toContain("RT-2026-0001");
  });

  it("erro temporário volta para pendente; 131047 vira falhou com motivo", async () => {
    cloud.falharCom({ status: 429, mensagem: "limite" });
    const r1 = await motor.dispararFila(10);
    expect(r1.falhas).toBe(1);
    expect(repo.envios[0]).toMatchObject({ estado: "pendente", tentativas: 1 });
    expect(repo.envios[0].enviarApos.getTime()).toBe(AGORA.getTime() + 60_000);

    repo.envios[0].estado = "pendente";
    cloud.falharCom({ status: 400, codigo: 131047, mensagem: "janela" });
    await motor.dispararFila(10);
    expect(repo.envios[0]).toMatchObject({ estado: "falhou", erro: "Janela de 24 h fechada" });
  });

  it("200 sem id de mensagem é falha definitiva, nunca reenvia", async () => {
    cloud.falharCom({ status: 200, mensagem: "resposta sem id de mensagem" });
    await motor.dispararFila(10);
    expect(repo.envios[0].estado).toBe("falhou");
    expect(repo.mensagens).toHaveLength(0);
  });

  it("esgotadas as tentativas, falha", async () => {
    for (let i = 0; i < 4; i++) {
      repo.envios[0].estado = "pendente";
      cloud.falharCom({ status: 500, mensagem: "x" });
      await motor.dispararFila(10);
    }
    expect(repo.envios[0].estado).toBe("falhou");
  });

  it("exceção do cloud não escapa de dispararFila", async () => {
    cloud.resultados.push(new Error("boom"));
    await expect(motor.dispararFila(10)).resolves.toEqual({ enviados: 0, falhas: 1 });
    expect(repo.envios[0].estado).toBe("pendente");
  });
});

describe("envio aceito nunca volta para a fila", () => {
  it("concluir(enviado) lançando depois do envio ok: um único cloud.enviar", async () => {
    await motor.agendarConfirmacao(leadFalso());
    repo.falharConcluir = "enviado";
    const r = await motor.dispararFila(10);
    expect(r).toEqual({ enviados: 1, falhas: 0 });
    expect(cloud.chamadas).toHaveLength(1);
    expect(repo.envios[0].estado).not.toBe("pendente");
    await motor.dispararFila(10);
    expect(cloud.chamadas).toHaveLength(1);
  });
});

describe("resposta fixa atômica", () => {
  it("mensagens concorrentes do mesmo contato geram uma só resposta", async () => {
    await Promise.all([
      motor.processarEvento(mensagem({ chave: "m:1", metaId: "wamid.a" })),
      motor.processarEvento(mensagem({ chave: "m:2", metaId: "wamid.b" })),
      motor.processarEvento(mensagem({ chave: "m:3", metaId: "wamid.c" })),
    ]);
    expect(repo.envios.filter((e) => e.motivo === "resposta_fixa")).toHaveLength(1);
  });
});

describe("reprocesso de eventos", () => {
  const evento = (): EventoWa => ({ tipo: "status", chave: "s:1:read", metaId: "w1", status: "lido", erro: null });
  function gravar(e: EventoWa, recebidoEm = new Date(AGORA.getTime() - 5 * 60_000)) {
    repo.eventosGravados.push({ chave: `wa:${e.chave}`, payload: e, recebidoEm, processado: false, tentativas: 0 });
  }

  it("falha no processamento grava o erro e não relança", async () => {
    const e = evento();
    gravar(e);
    repo.falharStatus = 1;
    await expect(motor.processarEvento(e)).resolves.toBeUndefined();
    expect(repo.eventosGravados[0]).toMatchObject({ processado: false, tentativas: 1, erro: "banco fora do ar" });
  });

  it("sucesso marca o evento como processado", async () => {
    const e = evento();
    gravar(e);
    await motor.processarEvento(e);
    expect(repo.eventosGravados[0].processado).toBe(true);
  });

  it("reprocessarPendentes tenta de novo e marca processado", async () => {
    const e = evento();
    gravar(e);
    repo.falharStatus = 1;
    await motor.processarEvento(e);
    await motor.reprocessarPendentes(10);
    expect(repo.statusRecebidos).toHaveLength(1);
    expect(repo.eventosGravados[0].processado).toBe(true);
  });

  it("3 falhas param o reprocesso", async () => {
    const e = evento();
    gravar(e);
    repo.falharStatus = 99;
    await motor.processarEvento(e);
    await motor.reprocessarPendentes(10);
    await motor.reprocessarPendentes(10);
    expect(repo.eventosGravados[0]).toMatchObject({ processado: false, tentativas: 3 });
    repo.falharStatus = 0;
    await motor.reprocessarPendentes(10);
    expect(repo.statusRecebidos).toHaveLength(0);
  });

  it("evento recente (menos de 1 min) não é reprocessado; payload inválido é marcado com erro", async () => {
    repo.eventosGravados.push({
      chave: "wa:x",
      payload: { lixo: 1 },
      recebidoEm: new Date(AGORA.getTime() - 5 * 60_000),
      processado: false,
      tentativas: 0,
    });
    gravar(evento(), AGORA);
    await motor.reprocessarPendentes(10);
    expect(repo.eventosGravados[0].erro).toBe("payload inválido");
    expect(repo.statusRecebidos).toHaveLength(0);
  });
});

describe("chave do evento e liberação da resposta fixa", () => {
  it("chaveGravadaWa prefixa com wa:", () => {
    expect(chaveGravadaWa(mensagem({ chave: "m:wamid.X" }))).toBe("wa:m:wamid.X");
  });

  it("enfileirar falha: libera a janela, grava o erro e o reprocesso envia uma única resposta", async () => {
    const e = mensagem({ chave: "m:wamid.X", metaId: "wamid.X" });
    repo.eventosGravados.push({
      chave: chaveGravadaWa(e),
      payload: e,
      recebidoEm: new Date(AGORA.getTime() - 5 * 60_000),
      processado: false,
      tentativas: 0,
    });
    repo.falharEnfileirar = 1;
    await motor.processarEvento(e);
    expect(repo.contatos[0].respostaFixaEm).toBeNull();
    expect(repo.envios).toHaveLength(0);
    expect(repo.eventosGravados[0]).toMatchObject({ processado: false, tentativas: 1 });
    await motor.reprocessarPendentes(10);
    expect(repo.envios.filter((x) => x.motivo === "resposta_fixa")).toHaveLength(1);
    expect(repo.eventosGravados[0].processado).toBe(true);
  });
});
