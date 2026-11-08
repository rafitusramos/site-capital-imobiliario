import { beforeEach, describe, expect, it, vi } from "vitest";

// Imóvel removido ou despublicado (ex.: vendido): a URL antiga faz redirect
// permanente (308) para a listagem, nunca 404 — links e ranking não se perdem.

const permanentRedirect = vi.fn((destino: string) => {
  throw new Error(`NEXT_REDIRECT:${destino}`);
});
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ permanentRedirect, notFound }));

const getImovelBySlug = vi.fn();
vi.mock("@/lib/queries/imoveis", () => ({
  getImovelBySlug,
  getImoveisPublicados: vi.fn(async () => []),
  getImoveisRelacionados: vi.fn(async () => []),
  getTiposEFases: vi.fn(async () => ({ fases: [], tipos: [] })),
}));

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("/imoveis/<slug>/ de imóvel ausente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getImovelBySlug.mockResolvedValue(null);
  });

  it("a página faz permanentRedirect para /imoveis/ e nunca notFound", async () => {
    const { default: Pagina } = await import("@/app/(site)/imoveis/[slug]/page");
    await expect(Pagina(params("vendido"))).rejects.toThrow("NEXT_REDIRECT:/imoveis/");
    expect(permanentRedirect).toHaveBeenCalledWith("/imoveis/");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("generateMetadata também redireciona, para o redirect não virar 404 antes", async () => {
    const { generateMetadata } = await import("@/app/(site)/imoveis/[slug]/page");
    await expect(generateMetadata(params("vendido"))).rejects.toThrow("NEXT_REDIRECT:/imoveis/");
    expect(permanentRedirect).toHaveBeenCalledWith("/imoveis/");
  });

  it("slug malformado cai no mesmo redirect", async () => {
    const { default: Pagina } = await import("@/app/(site)/imoveis/[slug]/page");
    await expect(Pagina(params("%%%/..;"))).rejects.toThrow("NEXT_REDIRECT:/imoveis/");
  });
});
