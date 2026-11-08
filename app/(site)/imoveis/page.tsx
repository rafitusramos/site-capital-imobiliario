import type { Metadata } from "next";
import { getImoveisPublicados, getTiposEFases } from "@/lib/queries/imoveis";
import { ImoveisFiltro } from "@/components/imoveis/ImoveisFiltro";
import { HeroVideo } from "@/components/imoveis/HeroVideo";
import { montarItemList } from "@/lib/seo/lista";
import { montarBreadcrumb } from "@/lib/seo/breadcrumb";
import { IMAGEM_OG_PADRAO, OG_IMAGEM_PADRAO, SITE_NOME } from "@/lib/og";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Imóveis — Lançamentos e Imóveis Prontos | RT Capital Imobiliário",
  description:
    "Lançamentos e imóveis prontos em Vinhedo e região: apartamentos, casas e loteamentos. Conheça as opções e fale com Rafael Teixeira.",
  alternates: {
    canonical: "/imoveis/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NOME,
    title: "Lançamentos e imóveis prontos em Vinhedo e região",
    description:
      "Apartamentos, casas e loteamentos, em lançamento ou prontos para morar, em Vinhedo e região. Fale com Rafael Teixeira.",
    url: "/imoveis/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Imóveis em lançamento em Vinhedo e região",
    description:
      "Apartamentos, casas e loteamentos, em lançamento ou prontos para morar, em Vinhedo e região.",
    images: [OG_IMAGEM_PADRAO],
  },
};

export default async function ImoveisIndicePage() {
  const [imoveis, { tipos, fases }] = await Promise.all([
    getImoveisPublicados(),
    getTiposEFases(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      montarBreadcrumb([{ nome: "Imóveis" }]),
      montarItemList(imoveis.map((imovel) => ({ caminho: `/imoveis/${imovel.slug}/` }))),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="hero im-hero-home" id="topo">
        <HeroVideo />
        <div className="wrap">
          <h1 className="reveal d1">Lançamentos e imóveis prontos para morar</h1>
          <p className="sub reveal d2">
            Empreendimentos em lançamento, com fase de obra, plantas e condições de
            pagamento, e imóveis prontos, com a ficha completa da unidade.
          </p>
        </div>
      </header>

      <ImoveisFiltro imoveis={imoveis} tipos={tipos} fases={fases} />
    </>
  );
}
