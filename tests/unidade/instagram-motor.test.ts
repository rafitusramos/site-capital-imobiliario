import { describe, expect, it, vi } from "vitest";
import {
  automacaoFalsa,
  CONTA_ID,
  GraphFalso,
  PESSOA_ID,
  RepositorioFalso,
  UUID_A,
} from "../apoio/instagram-falsos";
import type { EventoIg } from "@/lib/instagram/eventos";
import { chaveDoEvento, criarMotor } from "@/lib/instagram/motor";
import { payloadBotao } from "@/lib/instagram/mensagens";
import type { Automacao } from "@/lib/instagram/tipos";

const T0 = new Date("2026-11-12T15:00:00.000Z");
const MIN = 60_000;
const HORA = 60 * MIN;

function montar(opcoes: { automacao?: Partial<Automacao>; semGraph?: boolean } = {}) {
  const relogio = { agora: new Date(T0) };
  const repo = new RepositorioFalso(() => relogio.agora);
  const graph = new GraphFalso();
  repo.automacoes.push(automacaoFalsa(opcoes.automacao));
  const motor = criarMotor({
    repo,
    graph: opcoes.semGraph ? null : graph,
    agora: () => relogio.agora,
    sortear: () => 0,
  });
  return { relogio, repo, graph, motor };
}

function comentario(extra: Partial<Extract<EventoIg, { tipo: "comentario" }>> = {}): EventoIg {
  return {
    tipo: "comentario",
    chave: "com1",
    comentarioId: "com1",
    midiaId: "m1",
    deId: PESSOA_ID,
    deUsername: "maria",
    texto: "quero saber mais",
    ...extra,
  };
}

function toque(
  participacaoId: string,
  mid: string,
  acao: "b1" | "seguir" = "b1",
): EventoIg {
  return {
    tipo: "botao",
    chave: mid,
    deId: PESSOA_ID,
    payload: payloadBotao(acao, participacaoId),
    titulo: "Me envie o link",
  };
}

function eco(mid: string): EventoIg {
  return {
    tipo: "texto",
    chave: mid,
    deId: CONTA_ID,
    paraId: PESSOA_ID,
    texto: "oi",
    eco: true,
    mid,
  };
}

/** Pessoa já na sequência (contato + participação semeados). */
async function pessoaNaSequencia(
  repo: RepositorioFalso,
  p: Partial<Parameters<RepositorioFalso["semear"]>[0]> = {},
) {
  const c = await repo.salvarContato({ igsid: PESSOA_ID });
  return repo.semear({ contatoId: c.id, situacao: "aguardando_botao", ...p });
}

describe("comentário", () => {
  it("1º comentário com palavra: resposta pública + privada na fila, privada enviada uma vez, aguardando_botao", async () => {
    const { repo, graph, motor } = montar();
    await motor.processarEvento(comentario());

    expect(repo.envios.map((e) => e.chave).sort()).toEqual([
      "c:com1:privada",
      "c:com1:publica",
    ]);
    expect(graph.respostasPrivadas).toHaveLength(1);
    expect(graph.respostasPrivadas[0].comentarioId).toBe("com1");
    expect(graph.respostasPublicas).toEqual([{ comentarioId: "com1", texto: "f0" }]);
    expect(repo.participacoes).toHaveLength(1);
    expect(repo.participacoes[0].situacao).toBe("aguardando_botao");
    expect(repo.participacoes[0].comentarios).toBe(1);
    expect(repo.envios.every((e) => e.estado === "enviado")).toBe(true);
  });

  it("registra a mensagem de entrada e as de saída com o id devolvido pela Graph", async () => {
    const { repo, motor } = montar();
    await motor.processarEvento(comentario());

    const entrada = repo.mensagens.find((m) => m.direcao === "entrada");
    expect(entrada).toMatchObject({ tipo: "comentario", texto: "quero saber mais" });
    const saidas = repo.mensagens.filter((m) => m.direcao === "saida");
    expect(saidas).toHaveLength(2);
    expect(saidas.map((m) => m.tipo).sort()).toEqual(["resposta_publica", "texto"]);
    expect(saidas.every((m) => m.metaId?.startsWith("mid-saida-"))).toBe(true);
  });

  it("Review Focus 2: comentário da própria conta não escreve nada", async () => {
    const { repo, graph, motor } = montar();
    await motor.processarEvento(comentario({ deId: CONTA_ID }));

    expect(repo.contatos).toHaveLength(0);
    expect(repo.participacoes).toHaveLength(0);
    expect(repo.mensagens).toHaveLength(0);
    expect(repo.envios).toHaveLength(0);
    expect(graph.totalEnvios()).toBe(0);
  });

  it("Review Focus 3: o mesmo comentário processado duas vezes gera uma resposta privada", async () => {
    const { repo, graph, motor } = montar();
    await motor.processarEvento(comentario());
    await motor.processarEvento(comentario());

    expect(graph.respostasPrivadas).toHaveLength(1);
    expect(graph.respostasPublicas).toHaveLength(1);
    expect(repo.participacoes[0].comentarios).toBe(1);
  });

  it("sem automação que case: nada é gravado", async () => {
    const { repo, graph, motor } = montar({ automacao: { palavras: ["casa"] } });
    await motor.processarEvento(comentario({ texto: "oi" }));

    expect(repo.contatos).toHaveLength(0);
    expect(repo.mensagens).toHaveLength(0);
    expect(graph.totalEnvios()).toBe(0);
  });

  it("automação pausada não inicia nada para comentário novo", async () => {
    const { repo, graph, motor } = montar({ automacao: { ativa: false } });
    await motor.processarEvento(comentario());

    expect(repo.participacoes).toHaveLength(0);
    expect(graph.totalEnvios()).toBe(0);
  });

  it("3º comentário vira aviso de sistema e não envia nada", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo, { comentarios: 2 });
    await motor.processarEvento(comentario());

    expect(repo.participacoes[0].comentarios).toBe(3);
    expect(repo.participacoes[0].id).toBe(p.id);
    expect(repo.mensagens.find((m) => m.direcao === "sistema")).toMatchObject({
      tipo: "aviso",
      texto: "comentou 3+ vezes",
    });
    expect(graph.totalEnvios()).toBe(0);
  });

  it("2º comentário em aguardando_seguir consulta se a pessoa segue", async () => {
    const { repo, graph, motor } = montar();
    await pessoaNaSequencia(repo, { situacao: "aguardando_seguir", comentarios: 1 });
    graph.segueValor = false;
    await motor.processarEvento(comentario({ chave: "com2", comentarioId: "com2" }));

    expect(graph.consultasSegue).toEqual([PESSOA_ID]);
    expect(graph.respostasPrivadas).toHaveLength(1);
    expect(graph.respostasPrivadas[0].m.botao.tipo).toBe("postback");
    expect(repo.participacoes[0].situacao).toBe("aguardando_seguir");
  });

  it("'próxima publicação' só busca a data da mídia quando há automação sem vínculo, e vincula", async () => {
    const semProxima = montar();
    await semProxima.motor.processarEvento(comentario());
    expect(semProxima.graph.consultasMidia).toEqual([]);

    const { repo, graph, motor } = montar({
      automacao: { alvo: "proxima", proximaDesde: "2026-11-10T00:00:00.000Z" },
    });
    graph.midiaCriada = "2026-11-11T00:00:00.000Z";
    await motor.processarEvento(comentario());

    expect(graph.consultasMidia).toEqual(["m1"]);
    expect(repo.vinculos).toEqual([{ automacaoId: UUID_A, midiaId: "m1" }]);
    expect(graph.respostasPrivadas).toHaveLength(1);
  });

  it("sem conta conectada ou sem Graph nada sai, mas o comentário fica registrado", async () => {
    const a = montar({ semGraph: true });
    await a.motor.processarEvento(comentario());
    expect(a.repo.envios.every((e) => e.estado === "pendente")).toBe(true);

    const b = montar();
    b.repo.contaConectada = null;
    await b.motor.processarEvento(comentario({ chave: "com9", comentarioId: "com9" }));
    expect(b.graph.totalEnvios()).toBe(0);
  });
});

describe("toque no botão", () => {
  it("b1: entrega o link, agenda o lembrete e só então muda a situação", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(graph.mensagens).toHaveLength(1);
    expect(graph.mensagens[0].igsid).toBe(PESSOA_ID);
    expect(graph.mensagens[0].m.botao.tipo).toBe("link");
    const atual = repo.participacoes[0];
    expect(atual.situacao).toBe("link_enviado");
    expect(atual.linkEnviadoEm).toBe(T0.toISOString());
    expect(atual.janelaAte).toBe(new Date(T0.getTime() + 24 * HORA).toISOString());

    const lembretes = repo.envios.filter((e) => e.tipo === "lembrete");
    expect(lembretes).toHaveLength(1);
    expect(lembretes[0].chave).toBe("l:mid1");
    expect(lembretes[0].enviarApos.toISOString()).toBe(new Date(T0.getTime() + 2 * HORA).toISOString());
    expect(lembretes[0].estado).toBe("pendente");
  });

  it("mesmo mid duas vezes: uma mensagem só", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(graph.mensagens).toHaveLength(1);
    expect(repo.envios.filter((e) => e.tipo === "lembrete")).toHaveLength(1);
  });

  it("mid diferente: a 2ª vira mensagem do fluxo, sem lembrete duplicado", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));
    await motor.processarEvento(toque(p.id, "mid2"));

    expect(graph.mensagens).toHaveLength(2);
    const pendentes = repo.envios.filter((e) => e.tipo === "lembrete" && e.estado === "pendente");
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].chave).toBe("l:mid2");
  });

  it("payload que não é nosso ou participação inexistente é ignorado", async () => {
    const { repo, graph, motor } = montar();
    await motor.processarEvento({
      tipo: "botao",
      chave: "x1",
      deId: PESSOA_ID,
      payload: "outra-ferramenta:abc",
      titulo: "",
    });
    await motor.processarEvento(toque("00000000-0000-4000-8000-000000000099", "x2"));

    expect(repo.mensagens).toHaveLength(0);
    expect(graph.totalEnvios()).toBe(0);
  });

  it("toque de outra pessoa na participação alheia é ignorado", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento({ ...toque(p.id, "mid1"), deId: "999" });

    expect(graph.totalEnvios()).toBe(0);
    expect(repo.participacoes[0].situacao).toBe("aguardando_botao");
  });

  it("exigir seguir e não segue: pede para seguir e a situação só muda no envio", async () => {
    const { repo, graph, motor } = montar({ automacao: { exigirSeguir: true } });
    const p = await pessoaNaSequencia(repo);
    graph.segueValor = false;
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(graph.consultasSegue).toEqual([PESSOA_ID]);
    expect(graph.mensagens[0].m.botao.tipo).toBe("postback");
    expect(repo.participacoes[0].situacao).toBe("aguardando_seguir");
    expect(repo.participacoes[0].linkEnviadoEm).toBeUndefined();
  });

  it("automação pausada: quem já estava na sequência ainda recebe o link", async () => {
    const { repo, graph, motor } = montar({ automacao: { ativa: false } });
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(graph.mensagens).toHaveLength(1);
    expect(repo.participacoes[0].situacao).toBe("link_enviado");
  });
});

describe("mensagens de texto e eco", () => {
  it("Review Focus 1: eco com o mid de uma mensagem que o sistema enviou não cancela o lembrete", async () => {
    const { repo, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));
    const enviada = repo.envios.find((e) => e.tipo === "mensagem");
    expect(enviada?.metaId).toBeTruthy();

    await motor.processarEvento(eco(enviada!.metaId!));

    expect(repo.mensagens.some((m) => m.direcao === "dono")).toBe(false);
    const lembrete = repo.envios.find((e) => e.tipo === "lembrete");
    expect(lembrete?.estado).toBe("pendente");
  });

  it("eco com mid desconhecido (o dono escreveu): grava 'dono' e cancela o lembrete", async () => {
    const { repo, relogio, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));
    relogio.agora = new Date(T0.getTime() + 2 * MIN); // fora da janela de 60 s do nosso envio

    await motor.processarEvento(eco("mid-do-dono"));

    expect(repo.mensagens.find((m) => m.direcao === "dono")).toMatchObject({
      tipo: "texto",
      metaId: "mid-do-dono",
    });
    expect(repo.envios.find((e) => e.tipo === "lembrete")?.estado).toBe("cancelado");
  });

  it("Review Focus 1 (corrida): eco que chega com o envio ainda 'processando' é nosso, não do dono", async () => {
    const { repo, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await repo.enfileirar({
      chave: "l:x",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "lembrete",
      enviarApos: new Date(T0.getTime() + 2 * HORA),
    });
    await repo.enfileirar({
      chave: "b:x",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "mensagem",
      enviarApos: T0,
    });
    repo.envios.find((e) => e.chave === "b:x")!.estado = "processando";

    await motor.processarEvento(eco("mid-ainda-nao-gravado"));

    expect(repo.mensagens.some((m) => m.direcao === "dono")).toBe(false);
    expect(repo.envios.find((e) => e.tipo === "lembrete")?.estado).toBe("pendente");
  });

  it("eco para quem não participa de nada: descarta o conteúdo", async () => {
    const { repo, motor } = montar();
    await motor.processarEvento(eco("mid-solto"));

    expect(repo.descartados).toEqual(["texto:mid-solto"]);
    expect(repo.mensagens).toHaveLength(0);
  });

  it("texto livre de quem não participa: descarta o conteúdo e não grava mensagem", async () => {
    const { repo, motor } = montar();
    await motor.processarEvento({
      tipo: "texto",
      chave: "mid5",
      deId: PESSOA_ID,
      paraId: CONTA_ID,
      texto: "oi, tudo bem?",
      eco: false,
      mid: "mid5",
    });

    expect(repo.descartados).toEqual(["texto:mid5"]);
    expect(repo.mensagens).toHaveLength(0);
    expect(repo.contatos).toHaveLength(0);
  });

  it("texto livre de quem participa: grava, renova a janela e cancela o lembrete", async () => {
    const { repo, relogio, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await motor.processarEvento(toque(p.id, "mid1"));
    relogio.agora = new Date(T0.getTime() + 3 * HORA);

    await motor.processarEvento({
      tipo: "texto",
      chave: "mid6",
      deId: PESSOA_ID,
      paraId: CONTA_ID,
      texto: "vou ver",
      eco: false,
      mid: "mid6",
    });

    expect(repo.mensagens.find((m) => m.direcao === "entrada" && m.tipo === "texto")).toMatchObject({
      texto: "vou ver",
      metaId: "mid6",
    });
    expect(repo.participacoes[0].janelaAte).toBe(
      new Date(T0.getTime() + 27 * HORA).toISOString(),
    );
    expect(repo.envios.find((e) => e.tipo === "lembrete")?.estado).toBe("cancelado");
    expect(repo.descartados).toHaveLength(0);
  });
});

describe("fila: lembrete e falhas", () => {
  async function comLembrete(situacao: "link_aberto" | "link_enviado", janelaAte: Date | null) {
    const ctx = montar();
    const p = await pessoaNaSequencia(ctx.repo, {
      situacao,
      janelaAte: janelaAte ? janelaAte.toISOString() : null,
    });
    await ctx.repo.enfileirar({
      chave: "l:vencido",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "lembrete",
      enviarApos: new Date(T0.getTime() - MIN),
    });
    return { ...ctx, p };
  }

  it("Review Focus 4: lembrete vencido com a pessoa que já abriu o link é cancelado sem chamar a Graph", async () => {
    const { repo, graph, motor } = await comLembrete("link_aberto", new Date(T0.getTime() + HORA));
    const r = await motor.dispararFila();

    expect(repo.envios[0].estado).toBe("cancelado");
    expect(graph.totalEnvios()).toBe(0);
    expect(r).toEqual({ enviados: 0, falhas: 0 });
  });

  it("Review Focus 4: lembrete com a janela de 24 h fechada é cancelado", async () => {
    const { repo, graph, motor } = await comLembrete("link_enviado", new Date(T0.getTime() - MIN));
    await motor.dispararFila();

    expect(repo.envios[0].estado).toBe("cancelado");
    expect(graph.totalEnvios()).toBe(0);
  });

  it("lembrete válido é recalculado, enviado e registrado; automação pausada não impede", async () => {
    const ctx = await comLembrete("link_enviado", new Date(T0.getTime() + HORA));
    ctx.repo.automacoes[0].ativa = false;
    const r = await ctx.motor.dispararFila();

    expect(r).toEqual({ enviados: 1, falhas: 0 });
    expect(ctx.graph.mensagens).toHaveLength(1);
    expect(ctx.graph.mensagens[0].m.botao.tipo).toBe("link");
    expect(ctx.repo.envios[0].estado).toBe("enviado");
    expect(ctx.repo.mensagens.find((m) => m.direcao === "saida")).toBeTruthy();
  });

  it("erro 500 da Graph: volta a pendente com +1 min; na quarta falha vira 'falhou' com motivo", async () => {
    const { repo, graph, relogio, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    graph.falhas.push(
      { status: 500, mensagem: "boom" },
      { status: 500, mensagem: "boom" },
      { status: 500, mensagem: "boom" },
      { status: 500, mensagem: "boom" },
    );
    await motor.processarEvento(toque(p.id, "mid1"));

    const envio = repo.envios.find((e) => e.tipo === "mensagem")!;
    expect(envio.estado).toBe("pendente");
    expect(envio.enviarApos.toISOString()).toBe(new Date(T0.getTime() + MIN).toISOString());
    expect(envio.tentativas).toBe(1);
    expect(repo.participacoes[0].situacao).toBe("aguardando_botao");

    for (let i = 0; i < 3; i++) {
      relogio.agora = new Date(relogio.agora.getTime() + 10 * MIN);
      await motor.dispararFila();
    }

    expect(graph.mensagens).toHaveLength(4);
    expect(envio.estado).toBe("falhou");
    expect(repo.participacoes[0].falhaMotivo).toContain("500");
    expect(repo.participacoes[0].falhaEm).toBeTruthy();
    expect(repo.participacoes[0].situacao).toBe("aguardando_botao");
  });

  it("depois que a Graph entregou, falha no registro não devolve o envio à fila (sem DM duplicada)", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    const original = repo.registrarMensagem.bind(repo);
    repo.registrarMensagem = async (m) => {
      if (m.direcao === "saida") throw new Error("banco fora");
      return original(m);
    };
    await motor.processarEvento(toque(p.id, "mid1"));
    await motor.dispararFila();

    expect(graph.totalEnvios()).toBe(1);
    expect(repo.envios.find((e) => e.tipo === "mensagem")?.estado).toBe("enviado");
  });

  it("envio sem conteúdo falha direto, sem repetir", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    await repo.enfileirar({
      chave: "b:vazio",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "mensagem",
      enviarApos: T0,
    });
    await motor.dispararFila();

    expect(repo.envios[0].estado).toBe("falhou");
    expect(graph.totalEnvios()).toBe(0);
  });

  it("falha de rede (status 0) é temporária", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    graph.falhas.push({ status: 0, mensagem: "rede" });
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(repo.envios.find((e) => e.tipo === "mensagem")?.estado).toBe("pendente");
  });

  it("erro definitivo (janela fechada) falha de uma vez com o motivo legível", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    graph.falhas.push({ status: 400, codigo: 10, mensagem: "outside of allowed window" });
    await motor.processarEvento(toque(p.id, "mid1"));

    expect(repo.envios.find((e) => e.tipo === "mensagem")?.estado).toBe("falhou");
    expect(repo.participacoes[0].falhaMotivo).toBe("Janela de 24 h fechada");
  });

  it("sem conta conectada ou sem Graph: não reserva nada", async () => {
    const a = montar({ semGraph: true });
    const pa = await pessoaNaSequencia(a.repo);
    await a.motor.processarEvento(toque(pa.id, "mid1"));
    expect(await a.motor.dispararFila()).toEqual({ enviados: 0, falhas: 0 });
    expect(a.repo.envios.every((e) => e.estado === "pendente")).toBe(true);

    const b = montar();
    const pb = await pessoaNaSequencia(b.repo);
    await b.motor.processarEvento(toque(pb.id, "mid1"));
    b.repo.contaConectada = null;
    b.repo.envios.forEach((e) => (e.estado = "pendente"));
    expect(await b.motor.dispararFila()).toEqual({ enviados: 0, falhas: 0 });
    expect(b.repo.envios.every((e) => e.estado === "pendente")).toBe(true);
  });
});

describe("clique no link curto", () => {
  const UA_INSTAGRAM =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 300.0.0.0 (iPhone14,2)";

  async function comLink() {
    const ctx = montar({ automacao: { linkUrl: "https://rtcapitalimobiliario.com.br/financiamento/" } });
    const p = await pessoaNaSequencia(ctx.repo, { situacao: "link_enviado", codigo: "abc1234567" });
    await ctx.repo.enfileirar({
      chave: "l:x",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "lembrete",
      enviarApos: new Date(T0.getTime() + HORA),
    });
    return { ...ctx, p };
  }

  it("código inexistente devolve null", async () => {
    const { motor } = montar();
    expect(await motor.registrarClique("nao-existe", UA_INSTAGRAM)).toBeNull();
  });

  it("pessoa (navegador do Instagram): registra, vira link_aberto e cancela o lembrete", async () => {
    const { repo, motor } = await comLink();
    const destino = await motor.registrarClique("abc1234567", UA_INSTAGRAM);

    expect(destino).toContain("utm_source=instagram");
    expect(destino).toContain("utm_campaign=teste");
    expect(repo.cliques).toHaveLength(1);
    expect(repo.participacoes[0].situacao).toBe("link_aberto");
    expect(repo.participacoes[0].linkAbertoEm).toBe(T0.toISOString());
    expect(repo.mensagens.find((m) => m.direcao === "sistema")).toMatchObject({ tipo: "link_aberto" });
    expect(repo.envios[0].estado).toBe("cancelado");
  });

  it("robô de prévia (facebookexternalhit): devolve o destino e não mexe em nada", async () => {
    const { repo, motor } = await comLink();
    const destino = await motor.registrarClique("abc1234567", "facebookexternalhit/1.1");

    expect(destino).toContain("utm_source=instagram");
    expect(repo.cliques).toHaveLength(0);
    expect(repo.participacoes[0].situacao).toBe("link_enviado");
    expect(repo.envios[0].estado).toBe("pendente");
  });

  it("segundo clique não regrava a mensagem de sistema nem a data", async () => {
    const { repo, relogio, motor } = await comLink();
    await motor.registrarClique("abc1234567", UA_INSTAGRAM);
    relogio.agora = new Date(T0.getTime() + HORA);
    await motor.registrarClique("abc1234567", UA_INSTAGRAM);

    expect(repo.cliques).toHaveLength(2);
    expect(repo.participacoes[0].linkAbertoEm).toBe(T0.toISOString());
    expect(repo.mensagens.filter((m) => m.tipo === "link_aberto")).toHaveLength(1);
  });
});

describe("robustez", () => {
  it("chaveDoEvento compõe tipo e chave", () => {
    expect(chaveDoEvento(comentario())).toBe("comentario:com1");
    expect(chaveDoEvento(toque(UUID_A, "m9"))).toBe("botao:m9");
  });

  it("marca o evento como processado, e com erro quando algo lança", async () => {
    const ok = montar();
    await ok.motor.processarEvento(comentario());
    expect(ok.repo.eventosMarcados).toEqual([{ chave: "comentario:com1", erro: undefined }]);

    const ruim = montar();
    ruim.repo.salvarContato = async () => {
      throw new Error("banco fora");
    };
    await expect(ruim.motor.processarEvento(comentario())).resolves.toBeUndefined();
    expect(ruim.repo.eventosMarcados).toEqual([{ chave: "comentario:com1", erro: "banco fora" }]);
  });
});

describe("falha na participação (revisão final, item 1)", () => {
  it("falha de lembrete seguida de envio ok limpa a etiqueta de falha", async () => {
    const { repo, graph, relogio, motor } = montar();
    const p = await pessoaNaSequencia(repo, {
      situacao: "link_enviado",
      janelaAte: new Date(T0.getTime() + 20 * HORA).toISOString(),
    });
    await repo.enfileirar({
      chave: "l:1",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "lembrete",
      enviarApos: new Date(T0.getTime() - MIN),
    });
    graph.falhas.push({ status: 400, codigo: 10, mensagem: "outside of allowed window" });
    await motor.dispararFila();
    expect(repo.participacoes[0].falhaMotivo).toBe("Janela de 24 h fechada");

    relogio.agora = new Date(T0.getTime() + MIN);
    await repo.enfileirar({
      chave: "l:2",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "lembrete",
      enviarApos: new Date(T0.getTime()),
    });
    await motor.dispararFila();
    expect(graph.mensagens).toHaveLength(2);
    expect(repo.participacoes[0].falhaMotivo).toBeNull();
    expect(repo.participacoes[0].falhaEm).toBeNull();
  });

  it("DM sem mudança de situação (retomada) também limpa a falha", async () => {
    const { repo, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    repo.participacoes[0].falhaMotivo = "antiga";
    repo.participacoes[0].falhaEm = "2026-11-12T10:00:00.000Z";
    await repo.enfileirar({
      chave: "c:x:privada",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "resposta_privada",
      comentarioId: "x",
      payload: { mensagem: { texto: "oi", botao: { tipo: "link", titulo: "Abrir", url: "https://a/" } } },
      enviarApos: T0,
    });
    await motor.dispararFila();
    expect(repo.participacoes[0].falhaMotivo).toBeNull();
  });

  it("resposta pública recusada não grava falha na participação (fica só no envio)", async () => {
    const { repo, graph, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    graph.falhas.push({ status: 400, codigo: 100, mensagem: "comentário apagado" });
    await repo.enfileirar({
      chave: "c:x:publica",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "resposta_publica",
      comentarioId: "x",
      payload: { texto: "oi" },
      enviarApos: T0,
    });
    await motor.dispararFila();
    expect(repo.envios[0].estado).toBe("falhou");
    expect(repo.envios[0].erro).toBeTruthy();
    expect(repo.participacoes[0].falhaMotivo).toBeUndefined();
  });

  it("resposta pública enviada com sucesso não apaga falha de DM", async () => {
    const { repo, motor } = montar();
    const p = await pessoaNaSequencia(repo);
    repo.participacoes[0].falhaMotivo = "DM falhou";
    repo.participacoes[0].falhaEm = "2026-11-12T10:00:00.000Z";
    await repo.enfileirar({
      chave: "c:y:publica",
      contatoId: p.contatoId,
      participacaoId: p.id,
      tipo: "resposta_publica",
      comentarioId: "y",
      payload: { texto: "oi" },
      enviarApos: T0,
    });
    await motor.dispararFila();
    expect(repo.participacoes[0].falhaMotivo).toBe("DM falhou");
  });
});

describe("eventos pendentes (revisão final, item 4)", () => {
  async function gravar(repo: RepositorioFalso, e: EventoIg, recebidoHaMin: number, relogio: { agora: Date }) {
    const antes = relogio.agora;
    relogio.agora = new Date(T0.getTime() - recebidoHaMin * MIN);
    await repo.registrarEventos([{ chave: chaveDoEvento(e), payload: e }]);
    relogio.agora = antes;
  }

  it("reprocessa evento antigo sem processado_em e o marca", async () => {
    const { repo, relogio, motor } = montar();
    await gravar(repo, comentario(), 5, relogio);
    expect(await motor.reprocessarPendentes()).toBe(1);
    expect(repo.participacoes).toHaveLength(1);
    expect(repo.eventosGravados[0].processado).toBe(true);
    expect(await motor.reprocessarPendentes()).toBe(0);
  });

  it("ignora evento recente (< 2 min), com mais de 1 dia, ou com 3 tentativas", async () => {
    const { repo, relogio, motor } = montar();
    await gravar(repo, comentario({ chave: "a", comentarioId: "a" }), 1, relogio);
    await gravar(repo, comentario({ chave: "b", comentarioId: "b" }), 25 * 60, relogio);
    await gravar(repo, comentario({ chave: "c", comentarioId: "c" }), 10, relogio);
    repo.eventosGravados.find((e) => e.chave === "comentario:c")!.tentativas = 3;
    expect(await motor.reprocessarPendentes()).toBe(0);
    expect(repo.participacoes).toHaveLength(0);
  });

  it("falha no reprocesso conta tentativa e não marca processado", async () => {
    const { repo, relogio, motor } = montar();
    await gravar(repo, comentario(), 5, relogio);
    repo.salvarContato = async () => {
      throw new Error("banco fora");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await motor.reprocessarPendentes();
    expect(repo.eventosGravados[0].processado).toBe(false);
    expect(repo.eventosGravados[0].tentativas).toBe(1);
  });

  it("payload com forma inválida não derruba o lote e conta tentativa", async () => {
    const { repo, relogio, motor } = montar();
    const antes = relogio.agora;
    relogio.agora = new Date(T0.getTime() - 5 * MIN);
    await repo.registrarEventos([{ chave: "comentario:ruim", payload: { tipo: "comentario" } }]);
    relogio.agora = antes;
    await gravar(repo, comentario(), 5, relogio);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await motor.reprocessarPendentes()).toBe(1);
    expect(repo.eventosGravados[0].tentativas).toBe(1);
    expect(repo.participacoes).toHaveLength(1);
  });
});

describe("perfil do contato novo (revisão final, item 5)", () => {
  it("contato novo: consulta o perfil e salva nome, @ e foto", async () => {
    const { repo, graph, motor } = montar();
    graph.perfilValor = { username: "maria_real", nome: "Maria Souza", fotoUrl: "https://f/x.jpg" };
    await motor.processarEvento(comentario());
    expect(graph.consultasPerfil).toEqual([PESSOA_ID]);
    expect(repo.contatos[0]).toMatchObject({ username: "maria_real", nome: "Maria Souza", fotoUrl: "https://f/x.jpg" });
  });

  it("contato já existente: não consulta de novo", async () => {
    const { repo, graph, motor } = montar();
    await repo.salvarContato({ igsid: PESSOA_ID });
    await motor.processarEvento(comentario());
    expect(graph.consultasPerfil).toEqual([]);
  });

  it("perfil nulo ou lançando: segue sem, com o @ do comentário", async () => {
    const a = montar();
    await a.motor.processarEvento(comentario());
    expect(a.repo.participacoes).toHaveLength(1);
    expect(a.repo.contatos[0].username).toBe("maria");
    expect(a.repo.contatos[0].nome).toBeUndefined();

    const b = montar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    b.graph.perfil = async () => {
      throw new Error("rede");
    };
    await b.motor.processarEvento(comentario());
    expect(b.repo.participacoes).toHaveLength(1);
  });
});
