# RT Capital Imobiliário

Site de intermediação imobiliária e crédito. Domínio: rtcapitalimobiliario.com.br
Praça principal: Vinhedo/SP e região (Valinhos, Louveira, Jundiaí, Campinas, Itatiba).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Deploy: Vercel

## Estado atual
Site estático. O blog é renderizado client-side a partir de `window.BLOG_POSTS`
em posts.js, gerado por `npm run blog:gerar` a partir de content/blog/*.md.
Estamos migrando o blog para Supabase com renderização no servidor.

## Design
Direção: "Minimalismo Exagerado". Paleta preto quente + bronze-dourado.
Tipografia: Cinzel (títulos) e Josefin Sans (interface).
Variáveis CSS existentes: --jade, --bronze, --abissal.

## Categorias do blog
Financiamento, Home Equity, Consórcio, Imóveis.

## Documentos de referência
- `docs/carousel-spec.md`: usar sempre que for criada uma página com galeria de imagens
  (ex.: futura página de imóveis).

## REGRAS INVIOLÁVEIS
1. Nenhum slug de URL pode mudar. As URLs atuais são a base do SEO.
2. Nenhum texto de artigo pode ser reescrito. Conteúdo migra idêntico.
3. SUPABASE_SERVICE_ROLE_KEY nunca pode aparecer em código de cliente.
4. Toda página indexável precisa de metadata (title, description, canonical).
5. Não crie páginas novas nem remova páginas existentes sem eu pedir.

## URLs que precisam continuar existindo
- /
- /financiamento/
- /home_equity/
- /sobre.html  (vira /sobre/ com redirect 301)
- /blog/
- /blog/home-equity-empresario-capital-de-giro/
- /blog/home-equity-o-que-e-como-funciona/
- /blog/melhor-taxa-financiamento-imobiliario-bancos/

Não faça mais nada além de criar este arquivo.
