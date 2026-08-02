import Link from "next/link";
import { corCategoria } from "@/lib/blog/blog";

type PostCardProps = {
  slug: string;
  imagem: string | null;
  titulo: string;
  resumo?: string | null;
  data: string;
  rotulo: string | null;
  categoriaNome: string | null;
  categoriaSlug: string | null;
  mostrarResumo?: boolean;
};

function metaTexto(categoriaNome: string | null, data: string) {
  return categoriaNome ? `${categoriaNome} · ${data}` : data;
}

function badgeRotulo(rotulo: string | null, categoriaSlug: string | null) {
  if (!rotulo) return null;
  return (
    <span
      className="post-cat"
      style={{ "--c": corCategoria(categoriaSlug) } as React.CSSProperties}
    >
      {rotulo}
    </span>
  );
}

export function PostCard({
  slug,
  imagem,
  titulo,
  resumo,
  data,
  rotulo,
  categoriaNome,
  categoriaSlug,
  mostrarResumo = true,
}: PostCardProps) {
  return (
    <Link
      className="post-card reveal"
      data-cat={categoriaNome ?? undefined}
      href={`/blog/${slug}/`}
    >
      <div className="post-card-img">
        {imagem ? <img src={imagem} alt="" /> : null}
        {badgeRotulo(rotulo, categoriaSlug)}
        <span className="post-seta" aria-hidden="true">
          →
        </span>
      </div>
      <div className="post-card-corpo">
        <span className="post-data">{metaTexto(categoriaNome, data)}</span>
        <h3>{titulo}</h3>
        {mostrarResumo && resumo ? <p>{resumo}</p> : null}
        <span className="post-leiamais">Saiba mais →</span>
      </div>
    </Link>
  );
}

export function PostCardDestaque({
  slug,
  imagem,
  titulo,
  resumo,
  data,
  rotulo,
  categoriaNome,
  categoriaSlug,
}: PostCardProps) {
  return (
    <Link className="post-destaque reveal" href={`/blog/${slug}/`}>
      <div className="post-card-img">
        {imagem ? <img src={imagem} alt="" /> : null}
        {badgeRotulo(rotulo, categoriaSlug)}
      </div>
      <div className="post-card-corpo">
        <span className="selo-novo">Última publicação</span>
        <h2>{titulo}</h2>
        {resumo ? <p>{resumo}</p> : null}
        <span className="post-data">{metaTexto(categoriaNome, data)}</span>
        <span className="post-leiamais">Saiba mais →</span>
      </div>
    </Link>
  );
}
