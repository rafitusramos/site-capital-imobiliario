import Link from "next/link";
import type { ImovelComCapa } from "@/lib/queries/imoveis";
import {
  formatarFaixaArea,
  formatarFaixaDormitorios,
  formatarFaixaVagas,
  formatarFase,
  formatarPrecoAPartir,
} from "@/lib/imoveis/formato";
import { obterIcone } from "@/components/imoveis/icones";

type ImovelCardProps = {
  imovel: ImovelComCapa;
};

export function ImovelCard({ imovel }: ImovelCardProps) {
  const IconeArea = obterIcone("area");
  const IconeDormitorio = obterIcone("dormitorio");
  const IconeVaga = obterIcone("vaga");

  const area = formatarFaixaArea(imovel.area_min, imovel.area_max);
  const dormitorios = formatarFaixaDormitorios(imovel.dormitorios_min, imovel.dormitorios_max);
  const vagas = formatarFaixaVagas(imovel.vagas_min, imovel.vagas_max);
  const preco = formatarPrecoAPartir(imovel.valor_a_partir_de);

  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");

  return (
    <Link className="im-card" href={`/imoveis/${imovel.slug}/`}>
      <div className="im-card-capa">
        {imovel.capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imovel.capa} alt="" loading="lazy" />
        ) : null}
        <span className="im-badge-fase" data-fase={imovel.fase}>
          {formatarFase(imovel.fase)}
        </span>
      </div>
      <div className="im-card-corpo">
        {local ? (
          <span className="im-card-local">
            {formatarFase(imovel.fase)} em {local}
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

        {preco ? (
          <div className="im-preco">
            <small>A partir de</small>
            {preco}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
