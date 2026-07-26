import type { Metadata } from "next";
import { getImoveisPublicados } from "@/lib/queries/imoveis";
import { ImoveisFiltro } from "@/components/imoveis/ImoveisFiltro";

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
  const imoveis = await getImoveisPublicados();

  return (
    <>
      <header className="hero" id="topo">
        <div className="wrap">
          <div className="eyebrow reveal">Empreendimentos em lançamento</div>
          <h1 className="reveal d1">Imóveis novos em Vinhedo e região</h1>
          <p className="sub reveal d2">
            Apartamentos, vilas de casas e loteamentos com informação completa de fase de
            obra, plantas e condições de pagamento.
          </p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <ImoveisFiltro imoveis={imoveis} />
        </div>
      </section>
    </>
  );
}
