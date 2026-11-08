import { describe, expect, test } from "vitest";
import {
  altDaImagem,
  altDoImovel,
  contextoDoImovel,
  descricaoDoImovel,
  normalizarTexto,
  tituloDoImovel,
  type ImovelParaDescricao,
  type ImovelParaTitulo,
} from "@/lib/imoveis/seo";

type ImovelFalso = ImovelParaDescricao & ImovelParaTitulo;

function imovelFalso(campos: Partial<ImovelFalso> = {}): ImovelFalso {
  return {
    titulo: "Gran VIC Niágara",
    tipo: { nome: "Apartamento" },
    fase: { nome: "Lançamento" },
    bairro: "Marambaia",
    cidade: "Vinhedo",
    seo_title: null,
    seo_description: null,
    descricao_breve: null,
    area_min: 54,
    area_max: 69,
    dormitorios_min: 2,
    dormitorios_max: 2,
    ...campos,
  };
}

describe("altDoImovel", () => {
  test("monta tipo, nome e local", () => {
    expect(altDoImovel(imovelFalso())).toBe(
      "Apartamento Gran VIC Niágara — Marambaia, Vinhedo",
    );
  });

  test("sem bairro, fica só a cidade — sem vírgula órfã", () => {
    expect(altDoImovel(imovelFalso({ bairro: null }))).toBe(
      "Apartamento Gran VIC Niágara — Vinhedo",
    );
  });

  test("sem local nenhum, não sobra travessão solto", () => {
    const alt = altDoImovel(imovelFalso({ bairro: null, cidade: null }));
    expect(alt).toBe("Apartamento Gran VIC Niágara");
    expect(alt).not.toMatch(/[—,]\s*$/);
  });

  test("nunca devolve vazio — imagem de conteúdo sem alt não existe pro Google", () => {
    expect(altDoImovel(imovelFalso({ bairro: null, cidade: null }))).toBeTruthy();
  });

  test("título que já nomeia a cidade não a repete no fim", () => {
    expect(altDoImovel(imovelFalso({ titulo: "Gran VIC Niágara Vinhedo" }))).toBe(
      "Apartamento Gran VIC Niágara Vinhedo — Marambaia",
    );
  });
});

describe("altDaImagem", () => {
  test("ambiente entra na frente do contexto", () => {
    expect(altDaImagem("Sala de estar", "Gran VIC Niágara, Vinhedo")).toBe(
      "Sala de estar — Gran VIC Niágara, Vinhedo",
    );
  });

  test("sem ambiente, sobra o contexto em vez de string vazia", () => {
    expect(altDaImagem(null, "Gran VIC Niágara, Vinhedo")).toBe(
      "Gran VIC Niágara, Vinhedo",
    );
  });
});

describe("contextoDoImovel", () => {
  test("nome e cidade, sem o tipo", () => {
    expect(contextoDoImovel(imovelFalso())).toBe("Gran VIC Niágara, Vinhedo");
  });

  test("sem cidade, fica só o nome", () => {
    expect(contextoDoImovel(imovelFalso({ cidade: null }))).toBe("Gran VIC Niágara");
  });

  test("título que já nomeia a cidade não a repete", () => {
    expect(contextoDoImovel(imovelFalso({ titulo: "Gran VIC Niágara Vinhedo" }))).toBe(
      "Gran VIC Niágara Vinhedo",
    );
  });

  test("a comparação ignora caixa", () => {
    expect(contextoDoImovel(imovelFalso({ titulo: "Residencial VINHEDO Park" }))).toBe(
      "Residencial VINHEDO Park",
    );
  });
});

describe("normalizarTexto", () => {
  test("quebra de linha vira espaço — o defeito do Jabô Studio", () => {
    expect(normalizarTexto("Lançamento de Studios\nStudios Duplex 36m²")).toBe(
      "Lançamento de Studios Studios Duplex 36m²",
    );
  });

  test("espaços repetidos colapsam e as pontas ficam limpas", () => {
    expect(normalizarTexto("  a   b \n\n c  ")).toBe("a b c");
  });
});

describe("tituloDoImovel", () => {
  test("seo_title do admin manda — o template não reescreve copy", () => {
    const titulo = tituloDoImovel(
      imovelFalso({ seo_title: "Gran VIC Niágara — Apartamentos no Marambaia" }),
    );
    expect(titulo).toBe("Gran VIC Niágara — Apartamentos no Marambaia");
  });

  test("sem seo_title, a derivada traz tipo, cidade e marca", () => {
    const titulo = tituloDoImovel(imovelFalso({ seo_title: null }));
    expect(titulo).toBe(
      "Gran VIC Niágara — Apartamento à venda em Vinhedo | RT Capital Imobiliário",
    );
  });

  test("seo_title com quebra de linha é normalizado", () => {
    const titulo = tituloDoImovel(imovelFalso({ seo_title: "Jabô\nStudios" }));
    expect(titulo).toBe("Jabô Studios");
  });

  test("sem cidade, a derivada não inventa localização", () => {
    const titulo = tituloDoImovel(
      imovelFalso({ seo_title: null, cidade: null }),
    );
    expect(titulo).toContain("à venda |");
    expect(titulo).not.toContain("em null");
  });
});

describe("descricaoDoImovel", () => {
  test("seo_description manda, já normalizada", () => {
    expect(
      descricaoDoImovel(
        imovelFalso({ seo_description: "Lançamento no Marambaia.\nEntrega Set/2029." }),
      ),
    ).toBe("Lançamento no Marambaia. Entrega Set/2029.");
  });

  test("sem seo_description, cai em descricao_breve", () => {
    expect(
      descricaoDoImovel(
        imovelFalso({ descricao_breve: "Casas isoladas em condomínio." }),
      ),
    ).toBe("Casas isoladas em condomínio.");
  });

  test("sem as duas, monta do cadastro em vez de ficar sem description", () => {
    expect(descricaoDoImovel(imovelFalso())).toBe(
      "Apartamento Lançamento em Marambaia, Vinhedo: 54 a 69 m², 2 dorms. Fale com Rafael Teixeira.",
    );
  });

  test("cadastro sem área nem dormitórios ainda produz frase válida", () => {
    const descricao = descricaoDoImovel(
      imovelFalso({
        area_min: null,
        area_max: null,
        dormitorios_min: null,
        dormitorios_max: null,
      }),
    );
    expect(descricao).toBe(
      "Apartamento Lançamento em Marambaia, Vinhedo. Fale com Rafael Teixeira.",
    );
    expect(descricao).not.toContain(":");
  });

  test("nunca devolve vazio — sem description quem escreve o resumo é o Google", () => {
    expect(
      descricaoDoImovel(
        imovelFalso({
          bairro: null,
          cidade: null,
          area_min: null,
          area_max: null,
          dormitorios_min: null,
          dormitorios_max: null,
        }),
      ),
    ).toBeTruthy();
  });

  test("string só com espaços não conta como description preenchida", () => {
    expect(descricaoDoImovel(imovelFalso({ seo_description: "   " }))).toBe(
      "Apartamento Lançamento em Marambaia, Vinhedo: 54 a 69 m², 2 dorms. Fale com Rafael Teixeira.",
    );
  });
});

describe("imóvel pronto: texto com valores únicos", () => {
  const casa = (campos: Partial<ImovelFalso> = {}) =>
    imovelFalso({
      titulo: "Casa no Marambaia",
      tipo: { nome: "Casa" },
      modalidade: "pronto",
      area_min: null,
      area_max: null,
      dormitorios_min: null,
      dormitorios_max: null,
      area_util: 180,
      dormitorios: 3,
      vagas: 2,
      ...campos,
    });

  test("description montada usa os valores únicos, não faixas", () => {
    expect(descricaoDoImovel(casa())).toBe(
      "Casa à venda em Marambaia, Vinhedo: 180 m², 3 dorms, 2 vagas. Fale com Rafael Teixeira.",
    );
  });

  test("sem ficha, sobra a abertura", () => {
    expect(descricaoDoImovel(casa({ area_util: null, dormitorios: null, vagas: null }))).toBe(
      "Casa à venda em Marambaia, Vinhedo. Fale com Rafael Teixeira.",
    );
  });

  test("seo_description continua mandando", () => {
    expect(descricaoDoImovel(casa({ seo_description: "Texto  editorial\ncurado." }))).toBe(
      "Texto editorial curado.",
    );
  });

  test("lançamento sem modalidade mantém o texto de sempre", () => {
    expect(descricaoDoImovel(imovelFalso())).toContain("Apartamento Lançamento em Marambaia, Vinhedo");
  });

  test("title e alt seguem a mesma regra dos demais", () => {
    expect(tituloDoImovel(casa())).toBe(
      "Casa no Marambaia — Casa à venda em Vinhedo | RT Capital Imobiliário",
    );
    expect(altDoImovel(casa())).toBe("Casa Casa no Marambaia — Marambaia, Vinhedo");
  });
});
