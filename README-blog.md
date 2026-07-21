# Blog — como adicionar uma matéria (fase estática)

O blog é renderizado a partir de `dist/assets/js/posts.js` (fonte única de dados).
Quando o admin panel dinâmico entrar, ele servirá esse mesmo formato — a apresentação não muda.

## Publicar uma matéria nova
1. **Imagem**: suba a imagem principal em `dist/images/blog/<slug>.jpg` (proporção ~16:10).
   Sem ela, o card usa um degradê de fallback.
2. **Dados**: adicione um objeto no TOPO do array `window.BLOG_POSTS` em `posts.js`
   (a mais recente primeiro). Campos: slug, titulo, categoria, rotulo, data (dd-mm-yyyy),
   resumo, imagem, destaque. Só a matéria mais nova deve ter `destaque:true`.
3. **Página do artigo**: crie `dist/blog/<slug>/index.html` a partir do template de um
   artigo existente, trocando: título, meta, canonical, slug, categoria (no `<body data-artigo-*>`),
   imagem, corpo e a LP do CTA (`/financiamento/`, `/home_equity/`, etc.).
4. **Sitemap**: acrescente a URL `/blog/<slug>/` em `sitemap.xml`.
5. **Cache**: suba o número `?v=N` nos assets se tiver alterado CSS/JS.

## Categorias válidas
Financiamento · Home Equity · Consórcio · Imóveis
(a cor do rótulo e a LP de destino do CTA ficam em `BLOG_CATEGORIAS` no `posts.js`)

## Grade do índice
- Destaque (última publicação) em linha única + grade 3×3 (9) = 10 visíveis.
- "Carregar mais" revela +6 por vez.
- Filtro por categoria no topo.
