/* Converte texto em slug válido (kebab-case). */

function slugify(texto) {
  return texto
    .normalize('NFD')                           // decomposição de acentos
    .replace(/[̀-ͯ]/g, '')            // remove acentos
    .toLowerCase()                              // minúsculas
    .trim()
    .replace(/[^\w\s-]/g, '')                   // remove não-alfanumérico (exceto hífen)
    .replace(/\s+/g, '-')                       // espaços → hífens
    .replace(/-+/g, '-')                        // múltiplos hífens → um único
    .replace(/^-|-$/g, '');                     // remove hífens nas extremidades
}

module.exports = { slugify };
