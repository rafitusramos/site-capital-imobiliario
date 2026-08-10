import { describe, expect, test } from "vitest";
import {
  disponibilidadeSchema,
  montarOfferSchema,
  type ImovelParaOffer,
} from "@/lib/imoveis/schema";

/**
 * `Product` sem `offers` é erro crítico no teste de resultados aprimorados —
 * foi o que o Search Console acusou no Gran VIC. Nada na página denuncia
 * quando isso quebra: o imóvel renderiza inteiro, só o JSON-LD sai inválido.
 * Daí estes testes.
 */
function imovelFalso(campos: Partial<ImovelParaOffer> = {}): ImovelParaOffer {
  return {
    slug: "um-imovel",
    status: "ativo",
    fase: { slug: "pronto" },
    valor_a_partir_de: 500000,
    valor_sob_consulta: false,
    tipologias: [],
    ...campos,
  };
}

describe("disponibilidadeSchema", () => {
  test("obra não entregue é venda antecipada (PreOrder)", () => {
    for (const fase of ["pre_lancamento", "lancamento", "em_construcao"]) {
      expect(disponibilidadeSchema("ativo", fase)).toBe("https://schema.org/PreOrder");
    }
  });

  test("pronto para morar é InStock", () => {
    expect(disponibilidadeSchema("ativo", "pronto")).toBe("https://schema.org/InStock");
  });

  test("status tem precedência sobre a fase", () => {
    expect(disponibilidadeSchema("vendido", "em_construcao")).toBe(
      "https://schema.org/SoldOut",
    );
    expect(disponibilidadeSchema("inativo", "pronto")).toBe("https://schema.org/SoldOut");
    expect(disponibilidadeSchema("reservado", "pronto")).toBe(
      "https://schema.org/LimitedAvailability",
    );
  });

  test("fase desconhecida não devolve vazio", () => {
    expect(disponibilidadeSchema("ativo", "fase-que-nao-existe")).toBeTruthy();
  });
});

describe("montarOfferSchema", () => {
  test("preço único vira Offer simples, não AggregateOffer", () => {
    const offer = montarOfferSchema(imovelFalso());
    expect(offer).toEqual({
      "@type": "Offer",
      price: 500000,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: "https://rtcapitalimobiliario.com.br/imoveis/um-imovel/",
    });
  });

  test("tipologia mais cara que o piso vira AggregateOffer com faixa", () => {
    const offer = montarOfferSchema(
      imovelFalso({
        valor_a_partir_de: 445000,
        tipologias: [{ valor_a_partir_de: 445000 }, { valor_a_partir_de: 490000 }],
      }),
    );
    expect(offer).toEqual({
      "@type": "AggregateOffer",
      lowPrice: 445000,
      highPrice: 490000,
      offerCount: 2,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: "https://rtcapitalimobiliario.com.br/imoveis/um-imovel/",
    });
  });

  test("tipologia com o mesmo preço do piso não inventa faixa", () => {
    const offer = montarOfferSchema(
      imovelFalso({ valor_a_partir_de: 1230000, tipologias: [{ valor_a_partir_de: 1230000 }] }),
    );
    expect(offer?.["@type"]).toBe("Offer");
    expect(offer).not.toHaveProperty("highPrice");
    expect(offer).not.toHaveProperty("lowPrice");
  });

  test("highPrice nunca sai abaixo do lowPrice", () => {
    const offer = montarOfferSchema(
      imovelFalso({ valor_a_partir_de: 900000, tipologias: [{ valor_a_partir_de: 400000 }] }),
    );
    expect(offer?.["@type"]).toBe("Offer");
    expect(offer).not.toHaveProperty("highPrice");
  });

  test("tipologia sem preço não entra na conta do teto", () => {
    const offer = montarOfferSchema(
      imovelFalso({
        valor_a_partir_de: 400000,
        tipologias: [{ valor_a_partir_de: null }, { valor_a_partir_de: 600000 }],
      }),
    );
    expect(offer?.highPrice).toBe(600000);
    expect(offer?.offerCount).toBe(2);
  });

  test("sob consulta não publica preço nenhum — nem o das tipologias", () => {
    const offer = montarOfferSchema(
      imovelFalso({
        valor_sob_consulta: true,
        valor_a_partir_de: 445000,
        tipologias: [{ valor_a_partir_de: 490000 }],
      }),
    );
    expect(offer).toBeNull();
    expect(JSON.stringify(offer)).not.toContain("445000");
    expect(JSON.stringify(offer)).not.toContain("490000");
  });

  test("sem valor cadastrado devolve null", () => {
    expect(montarOfferSchema(imovelFalso({ valor_a_partir_de: null }))).toBeNull();
  });

  test("a url do offer é a canônica da página, com barra final", () => {
    const offer = montarOfferSchema(imovelFalso({ slug: "gran-vic-niagara-vinhedo" }));
    expect(offer?.url).toBe(
      "https://rtcapitalimobiliario.com.br/imoveis/gran-vic-niagara-vinhedo/",
    );
  });

  test("priceValidUntil fica de fora — data vencida derruba o rich result", () => {
    expect(montarOfferSchema(imovelFalso())).not.toHaveProperty("priceValidUntil");
  });

  test("lançamento com faixa: availability acompanha a fase", () => {
    const offer = montarOfferSchema(
      imovelFalso({
        fase: { slug: "pre_lancamento" },
        valor_a_partir_de: 445000,
        tipologias: [{ valor_a_partir_de: 490000 }],
      }),
    );
    expect(offer?.availability).toBe("https://schema.org/PreOrder");
  });
});
