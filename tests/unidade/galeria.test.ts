import { describe, expect, test } from "vitest";
import {
  GRUPOS_GALERIA,
  agruparImagens,
  achatarGaleria,
  moverDentroDoGrupo,
  moverEntreGrupos,
  adicionarAoGrupo,
  removerDoGrupo,
  type GaleriaAgrupada,
} from "@/lib/imoveis/galeria";
import { imagensFormSchema, type ImagemInput } from "@/lib/validations/imovel";

function imagem(parcial: Partial<ImagemInput> & Pick<ImagemInput, "url" | "grupo">): ImagemInput {
  return {
    // "" e não null — é o que a UI produz e o único valor vazio que
    // imagemSchema aceita. Ver o bloco "contrato com imagensFormSchema".
    ambiente: "",
    ordem: 0,
    destaque: false,
    ...parcial,
  };
}

function grupoVazio(): GaleriaAgrupada {
  return { empreendimento: [], decorado: [], planta: [], implantacao: [] };
}

describe("agruparImagens", () => {
  test("distribui as imagens nos 4 grupos", () => {
    const fachada = imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0 });
    const sala = imagem({ url: "sala.jpg", grupo: "decorado", ordem: 0 });
    const planta1 = imagem({ url: "planta1.jpg", grupo: "planta", ordem: 0 });
    const aerea = imagem({ url: "aerea.jpg", grupo: "implantacao", ordem: 0 });

    const grupos = agruparImagens([fachada, sala, planta1, aerea]);

    expect(grupos.empreendimento).toEqual([fachada]);
    expect(grupos.decorado).toEqual([sala]);
    expect(grupos.planta).toEqual([planta1]);
    expect(grupos.implantacao).toEqual([aerea]);
  });

  test("respeita a ordem informada mesmo com a lista de entrada embaralhada", () => {
    const terceira = imagem({ url: "c.jpg", grupo: "decorado", ordem: 2 });
    const primeira = imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 });
    const segunda = imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 });

    // entrada embaralhada de propósito: terceira, primeira, segunda
    const grupos = agruparImagens([terceira, primeira, segunda]);

    expect(grupos.decorado.map((i) => i.url)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  test("grupos sem nenhuma imagem existem vazios na saída", () => {
    const grupos = agruparImagens([imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0 })]);

    expect(grupos.decorado).toEqual([]);
    expect(grupos.planta).toEqual([]);
    expect(grupos.implantacao).toEqual([]);
  });

  test("lista vazia devolve os 4 grupos vazios", () => {
    expect(agruparImagens([])).toEqual({
      empreendimento: [],
      decorado: [],
      planta: [],
      implantacao: [],
    });
  });
});

describe("achatarGaleria", () => {
  test("ordem é reatribuída como índice dentro do grupo", () => {
    const grupos = grupoVazio();
    grupos.decorado = [
      imagem({ url: "a.jpg", grupo: "decorado", ordem: 7 }),
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 9 }),
      imagem({ url: "c.jpg", grupo: "decorado", ordem: 42 }),
    ];

    const achatada = achatarGaleria(grupos);

    expect(achatada.map((i) => ({ url: i.url, ordem: i.ordem }))).toEqual([
      { url: "a.jpg", ordem: 0 },
      { url: "b.jpg", ordem: 1 },
      { url: "c.jpg", ordem: 2 },
    ]);
  });

  test("só a primeira imagem de empreendimento tem destaque true", () => {
    const grupos = grupoVazio();
    grupos.empreendimento = [
      imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0 }),
      imagem({ url: "lazer.jpg", grupo: "empreendimento", ordem: 1 }),
    ];

    const achatada = achatarGaleria(grupos);

    expect(achatada.map((i) => ({ url: i.url, destaque: i.destaque }))).toEqual([
      { url: "fachada.jpg", destaque: true },
      { url: "lazer.jpg", destaque: false },
    ]);
  });

  test("empreendimento vazio: nenhuma imagem tem destaque", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "sala.jpg", grupo: "decorado", ordem: 0 })];

    const achatada = achatarGaleria(grupos);

    expect(achatada.every((i) => i.destaque === false)).toBe(true);
  });

  test("imagem de outro grupo que vinha com destaque true sai com false", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "sala.jpg", grupo: "decorado", ordem: 0, destaque: true })];

    const achatada = achatarGaleria(grupos);

    expect(achatada[0].destaque).toBe(false);
  });
});

describe("moverDentroDoGrupo", () => {
  test("move do fim para o começo", () => {
    const grupos = grupoVazio();
    grupos.decorado = [
      imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 }),
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 }),
      imagem({ url: "c.jpg", grupo: "decorado", ordem: 2 }),
    ];

    const movido = moverDentroDoGrupo(grupos, "decorado", 2, 0);

    expect(movido.decorado.map((i) => i.url)).toEqual(["c.jpg", "a.jpg", "b.jpg"]);
  });

  test("move do começo para o fim", () => {
    const grupos = grupoVazio();
    grupos.decorado = [
      imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 }),
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 }),
      imagem({ url: "c.jpg", grupo: "decorado", ordem: 2 }),
    ];

    const movido = moverDentroDoGrupo(grupos, "decorado", 0, 2);

    expect(movido.decorado.map((i) => i.url)).toEqual(["b.jpg", "c.jpg", "a.jpg"]);
  });

  test("mover a posição 1 para a 0 no empreendimento troca quem é a capa", () => {
    const grupos = grupoVazio();
    grupos.empreendimento = [
      imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0 }),
      imagem({ url: "lazer.jpg", grupo: "empreendimento", ordem: 1 }),
    ];

    const movido = moverDentroDoGrupo(grupos, "empreendimento", 1, 0);
    const achatada = achatarGaleria(movido);

    expect(achatada.map((i) => ({ url: i.url, ordem: i.ordem, destaque: i.destaque }))).toEqual([
      { url: "lazer.jpg", ordem: 0, destaque: true },
      { url: "fachada.jpg", ordem: 1, destaque: false },
    ]);
  });

  test("não muta a entrada", () => {
    const grupos = grupoVazio();
    grupos.decorado = [
      imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 }),
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 }),
    ];
    const copiaOriginal = grupos.decorado.map((i) => i.url);

    moverDentroDoGrupo(grupos, "decorado", 0, 1);

    expect(grupos.decorado.map((i) => i.url)).toEqual(copiaOriginal);
  });
});

describe("moverEntreGrupos", () => {
  test("sai de um grupo e entra no outro na posição pedida", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "sala.jpg", grupo: "decorado", ordem: 0 })];
    grupos.planta = [
      imagem({ url: "planta1.jpg", grupo: "planta", ordem: 0 }),
      imagem({ url: "planta2.jpg", grupo: "planta", ordem: 1 }),
    ];

    const movido = moverEntreGrupos(grupos, "decorado", 0, "planta", 1);

    expect(movido.planta.map((i) => i.url)).toEqual(["planta1.jpg", "sala.jpg", "planta2.jpg"]);
  });

  test("o grupo de origem encolhe e o destino cresce", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "sala.jpg", grupo: "decorado", ordem: 0 })];
    grupos.planta = [imagem({ url: "planta1.jpg", grupo: "planta", ordem: 0 })];

    const movido = moverEntreGrupos(grupos, "decorado", 0, "planta", 0);

    expect(movido.decorado).toHaveLength(0);
    expect(movido.planta).toHaveLength(2);
  });

  test("mover a capa para outro grupo faz a segunda imagem de empreendimento virar capa", () => {
    const grupos = grupoVazio();
    grupos.empreendimento = [
      imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0, destaque: true }),
      imagem({ url: "lazer.jpg", grupo: "empreendimento", ordem: 1 }),
    ];
    grupos.decorado = [];

    const movido = moverEntreGrupos(grupos, "empreendimento", 0, "decorado", 0);
    const achatada = achatarGaleria(movido);

    const fachada = achatada.find((i) => i.url === "fachada.jpg");
    const lazer = achatada.find((i) => i.url === "lazer.jpg");
    expect(fachada?.destaque).toBe(false);
    expect(lazer?.destaque).toBe(true);
  });
});

describe("adicionarAoGrupo", () => {
  test("acrescenta ao fim do grupo", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 })];

    const resultado = adicionarAoGrupo(grupos, "decorado", [
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 }),
    ]);

    expect(resultado.decorado.map((i) => i.url)).toEqual(["a.jpg", "b.jpg"]);
  });

  test("não muta a entrada", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 })];

    adicionarAoGrupo(grupos, "decorado", [imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 })]);

    expect(grupos.decorado).toHaveLength(1);
  });
});

describe("removerDoGrupo", () => {
  test("remove a imagem no índice indicado", () => {
    const grupos = grupoVazio();
    grupos.decorado = [
      imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 }),
      imagem({ url: "b.jpg", grupo: "decorado", ordem: 1 }),
    ];

    const resultado = removerDoGrupo(grupos, "decorado", 0);

    expect(resultado.decorado.map((i) => i.url)).toEqual(["b.jpg"]);
  });

  test("não muta a entrada", () => {
    const grupos = grupoVazio();
    grupos.decorado = [imagem({ url: "a.jpg", grupo: "decorado", ordem: 0 })];

    removerDoGrupo(grupos, "decorado", 0);

    expect(grupos.decorado).toHaveLength(1);
  });

  test("remover a capa promove a próxima a capa depois de achatar", () => {
    const grupos = grupoVazio();
    grupos.empreendimento = [
      imagem({ url: "fachada.jpg", grupo: "empreendimento", ordem: 0, destaque: true }),
      imagem({ url: "lazer.jpg", grupo: "empreendimento", ordem: 1 }),
    ];

    const resultado = removerDoGrupo(grupos, "empreendimento", 0);
    const achatada = achatarGaleria(resultado);

    expect(achatada).toEqual([
      { url: "lazer.jpg", grupo: "empreendimento", ambiente: "", ordem: 0, destaque: true },
    ]);
  });
});

/**
 * O teste que faltava: não basta a galeria produzir a estrutura certa — o que
 * ela produz precisa passar por `imagensFormSchema`, que é o schema que
 * `salvarImagens` roda de verdade. Sem isto, uma imagem recém-enviada saía com
 * `ambiente: null` e o "Salvar galeria" morria em "Dados inválidos.", porque o
 * helper `opcional` aceita string, "" e undefined, mas reprova null.
 */
describe("contrato com imagensFormSchema", () => {
  test("a saída de achatarGaleria é aceita pelo schema que salvarImagens usa", () => {
    const grupos = grupoVazio();
    grupos.empreendimento = [
      imagem({ url: "fachada.jpg", grupo: "empreendimento" }),
      imagem({ url: "hall.jpg", grupo: "empreendimento", ambiente: "Hall" }),
    ];
    grupos.decorado = [imagem({ url: "sala.jpg", grupo: "decorado", ambiente: "Sala" })];

    const parsed = imagensFormSchema.safeParse(achatarGaleria(grupos));

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data[0].destaque).toBe(true);
      expect(parsed.data[0].ambiente).toBeNull();
      expect(parsed.data[1].ambiente).toBe("Hall");
    }
  });

  test("ambiente vazio precisa ser \"\" — null reprova no schema", () => {
    const comNull = [{ url: "a.jpg", ambiente: null, grupo: "empreendimento", ordem: 0, destaque: true }];
    expect(imagensFormSchema.safeParse(comNull).success).toBe(false);

    const comVazio = [{ url: "a.jpg", ambiente: "", grupo: "empreendimento", ordem: 0, destaque: true }];
    expect(imagensFormSchema.safeParse(comVazio).success).toBe(true);
  });
});

describe("grupo fora de GRUPOS_GALERIA", () => {
  test("implantacao não tem mais seção na tela", () => {
    expect(GRUPOS_GALERIA.map((g) => g.id)).toEqual(["empreendimento", "decorado", "planta"]);
  });

  test("mas uma imagem em implantacao sobrevive ao achatarGaleria", () => {
    // salvarImagens reconcilia a coleção inteira: o que não sai daqui é
    // APAGADO do banco. Se achatarGaleria pulasse os grupos sem seção, o
    // primeiro "Salvar galeria" destruiria a imagem sem avisar ninguém.
    const grupos = grupoVazio();
    grupos.empreendimento = [imagem({ url: "fachada.jpg", grupo: "empreendimento" })];
    grupos.implantacao = [imagem({ url: "aerea.jpg", grupo: "implantacao", ambiente: "Implantação" })];

    const achatada = achatarGaleria(grupos);

    expect(achatada.map((i) => i.url)).toEqual(["fachada.jpg", "aerea.jpg"]);
    expect(achatada.find((i) => i.url === "aerea.jpg")).toMatchObject({
      grupo: "implantacao",
      ambiente: "Implantação",
      ordem: 0,
      destaque: false,
    });
  });
});
