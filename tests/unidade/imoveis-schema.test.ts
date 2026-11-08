import { describe, expect, test } from "vitest";
import {
  disponibilidadeSchema,
  montarOfferSchema,
  montarRealEstateListingSchema,
  montarVideoObjectSchema,
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

// ---------------------------------------------------------------------------
// Imóvel pronto (unidade única) — migration 026
// ---------------------------------------------------------------------------

describe("montarOfferSchema — imóvel pronto", () => {
  const pronto = (campos: Partial<ImovelParaOffer> = {}) =>
    imovelFalso({
      modalidade: "pronto",
      valor_a_partir_de: null,
      valor_venda: 1250000,
      fase: { slug: "pronto" },
      ...campos,
    });

  test("usa valor_venda como price de um Offer simples", () => {
    expect(montarOfferSchema(pronto())).toEqual({
      "@type": "Offer",
      price: 1250000,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: "https://rtcapitalimobiliario.com.br/imoveis/um-imovel/",
    });
  });

  test("ignora valor_a_partir_de e tipologias: unidade única nunca é faixa", () => {
    const offer = montarOfferSchema(
      pronto({ valor_a_partir_de: 100, tipologias: [{ valor_a_partir_de: 9000000 }] }),
    );
    expect(offer?.["@type"]).toBe("Offer");
    expect(offer?.price).toBe(1250000);
  });

  test("sem valor_venda não há offer", () => {
    expect(montarOfferSchema(pronto({ valor_venda: null }))).toBeNull();
  });

  test("valor_sob_consulta tem precedência sobre o valor", () => {
    expect(montarOfferSchema(pronto({ valor_sob_consulta: true }))).toBeNull();
  });

  test("vendido continua SoldOut", () => {
    expect(montarOfferSchema(pronto({ status: "vendido" }))?.availability).toBe(
      "https://schema.org/SoldOut",
    );
  });

  test("lançamento ignora valor_venda", () => {
    const offer = montarOfferSchema(imovelFalso({ modalidade: "lancamento", valor_venda: 1 }));
    expect(offer?.price).toBe(500000);
  });
});

describe("montarRealEstateListingSchema", () => {
  const base = {
    modalidade: "pronto" as const,
    slug: "casa-marambaia",
    titulo: "Casa no Marambaia",
    descricao: "Casa pronta para morar.",
    imagem: "https://exemplo.com/capa.webp",
    criadoEm: "2026-03-15T12:00:00+00:00",
  };

  test("é complementar: carrega o mesmo offer e a data de publicação em AAAA-MM-DD", () => {
    const offers = montarOfferSchema(
      imovelFalso({ modalidade: "pronto", valor_a_partir_de: null, valor_venda: 900000 }),
    );
    const no = montarRealEstateListingSchema({ ...base, offers });
    expect(no).toMatchObject({
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: "Casa no Marambaia",
      url: "https://rtcapitalimobiliario.com.br/imoveis/casa-marambaia/",
      datePosted: "2026-03-15",
      offers: { price: 900000 },
    });
  });

  test("sem offer (sob consulta ou sem preço) não emite o nó", () => {
    expect(montarRealEstateListingSchema({ ...base, offers: null })).toBeNull();
  });

  test("lançamento nunca emite RealEstateListing", () => {
    const offers = montarOfferSchema(imovelFalso());
    expect(montarRealEstateListingSchema({ ...base, modalidade: "lancamento", offers })).toBeNull();
  });
});

describe("montarVideoObjectSchema", () => {
  const completo = {
    titulo: "Casa no Marambaia",
    descricao: "Tour pela casa.",
    urlVideo: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    dataPublicacao: "2026-02-01",
  };

  test("com todos os campos obrigatórios, monta o VideoObject", () => {
    expect(montarVideoObjectSchema(completo)).toEqual({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Vídeo do Casa no Marambaia",
      description: "Tour pela casa.",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      uploadDate: "2026-02-01",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  test("sem uploadDate não emite (schema incompleto cria erro novo)", () => {
    expect(montarVideoObjectSchema({ ...completo, dataPublicacao: null })).toBeNull();
  });

  test("sem URL reconhecível não emite", () => {
    expect(montarVideoObjectSchema({ ...completo, urlVideo: "https://vimeo.com/123" })).toBeNull();
    expect(montarVideoObjectSchema({ ...completo, urlVideo: null })).toBeNull();
  });

  test("sem descrição não emite", () => {
    expect(montarVideoObjectSchema({ ...completo, descricao: "  " })).toBeNull();
  });
});
