# Relatório de testes funcionais

- **Branch:** `feature/seo-autor` (PR #84)
- **Commit (SHA) testado:** `b71bb7463a5f83fc9f2629bd2335263a553b6c64` (mais o spec novo `tests/e2e/blog-autor.spec.ts`, não commitado)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-fe5fc6-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-11
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (specs de admin rodaram)

## Resumo

| Rodada | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| Spec novo `blog-autor.spec.ts`, 1a tentativa (desktop + mobile) | 16 | 2 | 1 |
| Spec novo, 2a (teste de layout corrigido) | 19 | 0 | 0 |
| Spec novo, rodada final (desktop + mobile) | 18 | 0 | 1 |
| Suíte completa, 6 workers (inclui `blog-autor`) | 198 | 0 | 3 |

Suíte completa por spec e projeto (passou/falhou/pulou): `blog-autor` desktop 9/0/0, mobile 8/0/1; `robos-ia` 13/0/0 em cada projeto; `seo` 20/0/0 em cada; `landings` 24/0/0 em cada; `imovel-pagina` 5/0/0 em cada; `imoveis-listagem` e `imoveis-redirect` 2/0/0 em cada; `legal` 5/0/0 em cada; `admin-listas` 11/0/0; `admin-editor` 5/0/0; `admin-parametros` 2/0/0; `admin-simulacao-rota` 3/0/0; `admin-crm` 10/0/1; `admin-crm-simulacao` 7/0/1; `setup` 1/0/0. Nenhuma falha de flakiness desta vez (CRM e `imovel-pagina` mobile passaram em 6 workers).

`npx tsc --noEmit`: exit 0. `npx eslint .`: exit 0, zero erro e zero aviso.

## Cobertura das mudanças do PR (`tests/e2e/blog-autor.spec.ts`, somente leitura)

Slug real tirado da listagem `/blog/` (primeiro artigo; hoje `investir-em-imovel-em-2026-a-conta-inteira-contra-a-selic-a-14`).

- Assinatura: `.artigo-meta` começa com "Por", link "Rafael Teixeira" com `href="/sobre/"` e `rel="author"`; `<time>` com `dateTime` parseável.
- Caixa de autor: `aside.caixa-autor[aria-label="Sobre o autor"]` visível; ordem no DOM `.artigo-texto` < `.caixa-autor` < `.artigo-cta`; nome "Rafael Teixeira"; função contém "CRECI-SP 283020-F"; texto começa por "Corretor de imóveis" e NÃO repete "Rafael Teixeira"; link "Conheça o Rafael" para `/sobre/`; `img.caixa-autor-foto` com `alt=""` e `naturalWidth > 0`.
- Sem `.artigo-revisado` nos 3 primeiros artigos (migration 034 ainda não aplicada).
- JSON-LD `BlogPosting`: `dateModified` existe e é do mesmo dia que `datePublished`.
- Meta `article:modified_time` presente e data válida.
- `/sobre/`: meta description idêntica à string anterior (passou).
- Sitemap: `lastmod` de até 6 posts bate com o dia do `datePublished` do JSON-LD (mínimo exigido 3).
- Layout 360x740: caixa dentro de 0..360 px; `scrollWidth <= 360` (ver Observações sobre tabela).
- Admin (desktop): `/admin/posts/` > primeiro "Editar artigo" > campo "Revisado em" visível, placeholder `dd/mm/aaaa`, `aria-describedby="revisado_em_ajuda"` e texto de ajuda "Preencha só quando o conteúdo for revisado...". Nada foi salvo; a fixture `acoesServidor` aborta Server Actions nessas telas.

TDD: o deploy já continha a mudança, então os testes passaram de primeira, salvo o de layout (abaixo), que falhou por motivo do teste e foi corrigido.

## Capturas (revisão visual)

Em `C:\Repos-GIT\site-capital-imobiliario\tests\functional-tests\.artefatos\pr84\`:

- `caixa-autor-desktop.png` (viewport 1280)
- `caixa-autor-360.png` (viewport 360x740)
- `caixa-autor-mobile.png` (Pixel 7, 412 px)
- `assinatura-desktop.png`, `assinatura-360.png`, `assinatura-mobile.png` (linha `.artigo-meta`)
- `admin-revisado-em.png` (campo e texto de ajuda)

Atenção: `.artefatos/` é apagado pelo Playwright a cada execução; as capturas são regeneradas pelo spec (última rodada: o spec isolado). Em `caixa-autor-360.png` o banner de cookies (fixo no rodapé) aparece sobreposto à base da caixa; é artefato da captura, não do layout. Revisado visualmente: no desktop foto circular à esquerda, nome em Caslon, CRECI em mono, texto e link "Conheça o Rafael"; em 360 px a foto empilha acima do texto e nada vaza na largura.

## Falhas

Nenhuma na rodada final. Na 1a tentativa do spec novo, o teste de layout falhou (`scrollWidth` 429 > 360, desktop e mobile). Diagnóstico por sonda: o excedente vem de um `<table>` dentro do corpo do artigo `investir-em-imovel-em-2026-...`, e o mesmo 429 ocorre em produção (`rtcapitalimobiliario.com.br`), logo é anterior ao PR e não causado por ele; `/sobre/` e `/blog/` medem 360. Defeito do teste (escolheu justamente um artigo com tabela): o spec passou a medir a rolagem horizontal no primeiro artigo sem tabela e a medir a caixa de autor em qualquer artigo.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| blog-autor: editor de post tem o campo e o texto de ajuda | mobile | Admin só roda no projeto desktop (decisão do spec, igual aos `admin-*`) |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' | desktop | Nenhum lead de home equity visível ao QA |
| admin-crm: contorno de lembrete atrasado | desktop | Nenhum lead com lembrete atrasado na aba |

## Observações

- Pré-existente (fora do PR): artigos com tabela larga (ex.: "Investir em imóvel em 2026...") geram rolagem horizontal de página em 360 px (`scrollWidth` 429, também em produção). Vale um `overflow-x: auto` em tabelas do `.artigo-texto` em outra branch.
- O "Revisado em" não aparece em nenhum artigo, como esperado antes da migration 034. O ramo com data de revisão (`p.artigo-revisado`) NÃO foi exercitado; precisa de checagem manual após a migration e de um post com `revisado_em` posterior à publicação.
- A coluna `revisado_em` não existe no banco hoje; o editor abre normalmente (a leitura do post não quebra). Salvar não foi testado (proibido e falharia sem a coluna): conferir o salvamento depois da migration.
- Resposta do preview traz `X-Robots-Tag: noindex` (padrão de preview da Vercel).
- Ruído de terceiros no console (GA/Meta) segue como nos outros relatórios.
- Nenhum spec existente quebrou por causa da mudança de `.artigo-meta`; nenhum foi editado.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação, salvamento ou formulário enviado.
- [x] O spec novo faz GET de `/blog/`, artigos, `/sobre/`, `/sitemap.xml` e apenas abre o editor de post no admin, sem salvar.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (a suíte passou sem acusar).

## Veredito

**APROVADO** — tudo o que o PR prometeu confere no deploy (assinatura, caixa de autor, ausência de "Revisado em", `dateModified`/`lastmod` = publicação, `/sobre/` inalterado, campo no admin); suíte completa 198 passou, 0 falhou, 3 pulos condicionais; tsc e eslint limpos. Pendência pós-merge: validar o ramo "Revisado em" e o salvamento depois da migration 034.

## Validação (Opus)

- Revisão visual das capturas: caixa de autor certa em desktop e 360px; campo "Revisado em" do admin com texto de ajuda.
- Defeito achado na captura de 360px: a data da assinatura partia ao meio ("26-" / "08-2026"). Corrigido em `styles/blog.css`. A primeira correção (`nowrap`) empurrava a data para fora da tela (scrollWidth 375 a 426), porque o JSX não tem espaço entre o separador e o `<time>`; a versão final usa `display:flex; flex-wrap:wrap` em `.artigo-meta`, com `nowrap` só na assinatura e na data.
- Medição em 360px nos 8 artigos mais recentes, depois da correção: sem estouro fora das tabelas. Os três artigos com tabela larga (`investir-em-imovel-em-2026...`, `tabela-sac-ou-price...`, `os-condominios-de-vinhedo...`) continuam com rolagem horizontal, como já acontece em produção; fica para um hot-fix próprio.
- `blog-autor.spec.ts` rerodado no deploy final: 18 passaram, 0 falharam, 1 pulou (admin no mobile).

**Veredito: APROVADO.**
