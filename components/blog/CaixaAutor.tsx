import Image from "next/image";
import { AUTOR, resumoDoAutor } from "@/lib/autor";

/**
 * Caixa de autor do fim do artigo. Fica FORA de `.artigo-texto` (o corpo do
 * artigo não é tocado). Texto vem de `lib/autor.ts`, o mesmo de /sobre/.
 *
 * Semântica: `<aside aria-label>` e não `<section>` com `<h2>`: um h2 entraria
 * no sumário de títulos do artigo e competiria com os h2 do conteúdo. O nome é
 * um `<p>`; o rótulo do landmark diz o que a região é.
 *
 * A foto tem `alt=""` porque o nome está ao lado (alt que só duplica o vizinho
 * não entra). Sai por `next/image` porque servir o JPG original (213 KB) num
 * avatar de 88px seria desperdício. Sem `sizes`: o 1x/2x de um avatar fixo cai
 * numa largura que o projeto já tem em `imageSizes`, sem acrescentar tamanho.
 */
export function CaixaAutor() {
  return (
    <aside className="caixa-autor" aria-label="Sobre o autor">
      <Image
        className="caixa-autor-foto"
        src={AUTOR.foto}
        alt=""
        width={88}
        height={88}
      />
      <div className="caixa-autor-corpo">
        <p className="caixa-autor-nome">{AUTOR.nome}</p>
        <p className="caixa-autor-funcao">{AUTOR.funcao}</p>
        <p className="caixa-autor-texto">{resumoDoAutor()}</p>
        <a className="caixa-autor-link" href={AUTOR.url} rel="author">
          Conheça o Rafael
        </a>
      </div>
    </aside>
  );
}
