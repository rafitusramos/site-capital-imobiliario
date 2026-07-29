import { describe, expect, test } from "vitest";
import { imagemOg, OG_ALTURA, OG_LARGURA } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

describe("SITE_URL", () => {
  test("é o domínio de produção", () => {
    expect(SITE_URL).toBe("https://rtcapitalimobiliario.com.br");
  });
});

describe("imagemOg", () => {
  test("sem url devolve a imagem padrão com dimensões e repassa o alt", () => {
    expect(imagemOg(null, "Capital Imobiliário")).toEqual({
      url: "/images/og-default.jpg",
      width: 1200,
      height: 630,
      alt: "Capital Imobiliário",
    });
    expect(OG_LARGURA).toBe(1200);
    expect(OG_ALTURA).toBe(630);
  });

  test("caminho local vira absoluto com o SITE_URL e sem width/height", () => {
    const resultado = imagemOg("/images/foo.jpg", "Foto explicativa");
    expect(resultado).toEqual({
      url: "https://rtcapitalimobiliario.com.br/images/foo.jpg",
      alt: "Foto explicativa",
    });
    expect(resultado.width).toBeUndefined();
    expect(resultado.height).toBeUndefined();
  });

  test("URL do Supabase Storage é reescrita para o endpoint de render com dimensões", () => {
    const resultado = imagemOg(
      "https://abcxyz.supabase.co/storage/v1/object/public/imoveis/foto.jpg",
      "Fachada do empreendimento",
    );
    expect(resultado).toEqual({
      url: "https://abcxyz.supabase.co/storage/v1/render/image/public/imoveis/foto.jpg?width=1200&height=630&resize=cover&quality=80",
      width: 1200,
      height: 630,
      alt: "Fachada do empreendimento",
    });
  });

  test("URL absoluta http que não é do Storage passa inalterada e sem dimensões", () => {
    const resultado = imagemOg("https://cdn.example.com/banner.jpg", "Banner externo");
    expect(resultado).toEqual({
      url: "https://cdn.example.com/banner.jpg",
      alt: "Banner externo",
    });
    expect(resultado.width).toBeUndefined();
    expect(resultado.height).toBeUndefined();
  });
});
