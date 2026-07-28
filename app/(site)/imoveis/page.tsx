import type { Metadata } from "next";
import { getImoveisPublicados, getTiposEFases } from "@/lib/queries/imoveis";
import { ImoveisFiltro } from "@/components/imoveis/ImoveisFiltro";
import { HeroVideo } from "@/components/imoveis/HeroVideo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Imóveis — Empreendimentos em Lançamento | RT Capital Imobiliário",
  description:
    "Lançamentos imobiliários em Vinhedo e região: apartamentos, vilas de casas e loteamentos. Conheça os empreendimentos e fale com Rafael Teixeira.",
  alternates: {
    canonical: "/imoveis/",
  },
};

export default async function ImoveisIndicePage() {
  const [imoveis, { tipos, fases }] = await Promise.all([
    getImoveisPublicados(),
    getTiposEFases(),
  ]);

  return (
    <>
      <header className="hero im-hero-home" id="topo">
        <HeroVideo />
        <div className="wrap">
          <h1 className="reveal d1">Lançamentos e imóveis prontos para morar</h1>
          <p className="sub reveal d2">
            Apartamentos, vilas de casas e loteamentos com informação completa de fase de
            obra, plantas e condições de pagamento.
          </p>
        </div>
      </header>

      <ImoveisFiltro imoveis={imoveis} tipos={tipos} fases={fases} />
    </>
  );
}
