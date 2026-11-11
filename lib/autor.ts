/**
 * Fonte única dos dados do autor exibidos no site (caixa de autor dos artigos
 * e meta description de /sobre/). O texto não é reescrito em lugar nenhum:
 * a caixa mostra a mesma descrição de /sobre/, sem o nome do início.
 */
export const DESCRICAO_SOBRE =
  "Rafael Teixeira: corretor de imóveis (CRECI-SP) e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio. Certificação FEBRABAN CA-600.";

export const AUTOR = {
  nome: "Rafael Teixeira",
  registro: "CRECI-SP 283020-F",
  // Só o registro: o resumo logo abaixo já diz "Corretor de imóveis (CRECI-SP)
  // e correspondente bancário"; repetir a frase na linha de cima seria eco.
  funcao: "CRECI-SP 283020-F",
  foto: "/images/rafael-teixeira.jpg",
  // Retrato 1122x1402: proporção usada para reservar a caixa e evitar CLS.
  fotoLargura: 1122,
  fotoAltura: 1402,
  url: "/sobre/",
} as const;

/**
 * Descrição sem o prefixo "Nome:" (o nome já está logo acima na caixa), com a
 * primeira letra maiúscula. Sem dois-pontos, devolve o texto como está.
 */
export function resumoDoAutor(descricao: string = DESCRICAO_SOBRE): string {
  const i = descricao.indexOf(":");
  if (i === -1) return descricao;
  const resto = descricao.slice(i + 1).trim();
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}
