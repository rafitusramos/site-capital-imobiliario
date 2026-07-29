// Deriva o slug do título no editor do admin. O slug é a base do SEO do blog:
// uma vez publicado, ele não muda mais (ver CLAUDE.md).
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove não-alfanumérico (exceto hífen)
    .replace(/\s+/g, "-") // espaços → hífens
    .replace(/-+/g, "-") // múltiplos hífens → um único
    .replace(/^-|-$/g, ""); // remove hífens nas extremidades
}
