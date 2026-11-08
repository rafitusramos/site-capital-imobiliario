import type { Metadata } from "next";
import Link from "next/link";
import { getTiposEFases } from "@/lib/queries/imoveis";
import { ImovelEditor } from "@/components/admin/ImovelEditor";

export const metadata: Metadata = { title: "Novo imóvel · Admin" };

type NovoImovelProps = {
  searchParams: Promise<{ modalidade?: string }>;
};

const OPCOES = [
  {
    valor: "lancamento",
    titulo: "Lançamento",
    descricao:
      "Empreendimento com várias unidades: faixas de área e valor, fase de obra, tipologias e plantas.",
  },
  {
    valor: "pronto",
    titulo: "Imóvel pronto",
    descricao: "Unidade única à venda: ficha com área, quartos, vagas, valor, condomínio e IPTU.",
  },
] as const;

export default async function NovoImovelPage({ searchParams }: NovoImovelProps) {
  const { modalidade } = await searchParams;

  // A modalidade define quais campos existem, então é a primeira pergunta.
  if (modalidade !== "lancamento" && modalidade !== "pronto") {
    return (
      <div>
        <h1 className="mb-2 text-lg font-semibold text-[var(--abissal)]">Novo imóvel</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Que tipo de cadastro é este? Não dá para trocar depois.
        </p>
        <ul role="list" className="grid max-w-2xl gap-4 sm:grid-cols-2">
          {OPCOES.map((opcao) => (
            <li key={opcao.valor}>
              <Link
                href={`/admin/imoveis/novo?modalidade=${opcao.valor}`}
                className="block h-full rounded-lg border border-black/10 bg-white p-5 transition hover:border-[var(--jade)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
              >
                <span className="block text-base font-semibold text-[var(--abissal)]">{opcao.titulo}</span>
                <span className="mt-2 block text-sm text-neutral-600">{opcao.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { tipos, fases } = await getTiposEFases();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">
        {modalidade === "pronto" ? "Novo imóvel pronto" : "Novo lançamento"}
      </h1>
      <ImovelEditor imovel={null} modalidade={modalidade} tipos={tipos} fases={fases} />
    </div>
  );
}
