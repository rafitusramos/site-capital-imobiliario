# RT Capital Imobiliário

Site de intermediação imobiliária e crédito. Domínio: rtcapitalimobiliario.com.br
Praça principal: Vinhedo/SP e região (Valinhos, Louveira, Jundiaí, Campinas, Itatiba).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Deploy: Vercel

## Estado atual
Migração concluída: o site roda em Next.js com renderização no servidor, e blog
e imóveis vêm do Supabase. O admin em `/admin` faz o CRUD dos dois. O pipeline
estático antigo (`dist/`, `window.BLOG_POSTS`, `tools/blog/*`, scripts `blog:*`)
não existe mais. Os markdowns em `content/blog/` ficaram como referência
histórica do texto migrado — não são mais fonte de renderização.

Suíte de testes em Vitest: `npm test`. Ver README.md para a organização.

## Design
Direção: "Minimalismo Exagerado". Paleta preto quente + bronze-dourado.
Tipografia: Cinzel (títulos) e Josefin Sans (interface).
Variáveis CSS existentes: --jade, --bronze, --abissal.

## Categorias do blog
Financiamento, Home Equity, Consórcio, Imóveis.

## Documentos de referência
- `docs/carousel-spec.md`: usar sempre que for criada uma página com galeria de imagens.
- `docs/modelo-artigo.md`: formato de frontmatter aceito pela importação de `.md`
  no admin. É contrato de código (`lib/blog/frontmatter.ts`), não doc solta.

## Como trabalhar comigo neste projeto

Toda melhoria ou ajuste segue três etapas, cada uma com seu modelo:

1. **Planejar — Opus 5.** Levantamento, decisões de arquitetura, especificação.
2. **Desenvolver — Sonnet 5.** A implementação derivada do plano roda em subagente Sonnet 5.
3. **Validar — Opus 5.** Revisar o que o subagente entregou antes de dar como pronto.

Para qualquer diretiva de design, carregar **sempre** as duas skills: `frontend-design`
(web design) e `ui-ux-pro-max`.

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
