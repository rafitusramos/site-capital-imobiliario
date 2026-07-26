// Mesma lógica de tools/blog/slugify.js (pipeline legado, CommonJS), portada
// para TypeScript/ESM para uso no editor do admin.
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
