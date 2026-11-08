import Link from "next/link";
import type { ImovelComCapa } from "@/lib/queries/imoveis";
import { fatosDoImovel, precoDoImovel } from "@/lib/imoveis/ficha";
import { obterIcone } from "@/components/imoveis/icones";
import { altDoImovel } from "@/lib/imoveis/seo";

type ImovelCardProps = {
  imovel: ImovelComCapa;
};

export function ImovelCard({ imovel }: ImovelCardProps) {
  const IconeArea = obterIcone("area");
  const IconeDormitorio = obterIcone("dormitorio");
  const IconeVaga = obterIcone("vaga");

  // Lançamento mostra faixas; imóvel pronto, os valores da unidade.
  const { area, dormitorios, vagas } = fatosDoImovel(imovel);
  const preco = precoDoImovel(imovel);

  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");

  return (
    <Link className="im-card reveal" href={`/imoveis/${imovel.slug}/`}>
      <div className="im-card-capa">
        {imovel.capa ? (
          <img src={imovel.capa} alt={altDoImovel(imovel)} loading="lazy" />
        ) : null}
        <span className="im-badge-fase" data-fase={imovel.fase?.slug}>
          {imovel.fase?.nome}
        </span>
      </div>
      <div className="im-card-corpo">
        {local ? (
          <span className="im-card-local">
            {imovel.fase?.nome} em {local}
          </span>
        ) : null}
        <h3>{imovel.titulo}</h3>
        {imovel.descricao_breve ? <p className="im-card-resumo">{imovel.descricao_breve}</p> : null}

        <div className="im-fatos">
          {area ? (
            <span className="im-fato">
              <IconeArea aria-hidden="true" /> {area}
            </span>
          ) : null}
          {dormitorios ? (
            <span className="im-fato">
              <IconeDormitorio aria-hidden="true" /> {dormitorios}
            </span>
          ) : null}
          {vagas ? (
            <span className="im-fato">
              <IconeVaga aria-hidden="true" /> {vagas}
            </span>
          ) : null}
        </div>

        {imovel.valor_sob_consulta ? (
          <div className="im-preco">Preço: Sob consulta</div>
        ) : preco ? (
          <div className="im-preco">
            {preco.rotulo ? <small>{preco.rotulo}</small> : null}
            {preco.valor}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
