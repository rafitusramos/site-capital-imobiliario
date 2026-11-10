# Relatório de testes funcionais

- **Branch:** `feature/seo-robos-ia` (PR #81)
- **Commit (SHA) testado:** `cbdd3a1ad5b5b70edea6819d8cca9efadbcd299e` (mais o spec novo `tests/e2e/robos-ia.spec.ts`, não commitado)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-b4d788-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-10
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (specs de admin rodaram)

## Resumo

| Rodada | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| Spec novo `robos-ia.spec.ts` isolado (`--project=desktop`) | 13 (12 + setup) | 0 | 0 |
| Suíte completa, 6 workers (inclui `robos-ia`, 13 testes) | 154 | 1 | 2 |
| Repetição de `imovel-pagina.spec.ts`, `--workers=1`, todos os projetos | 10 | 1 | 0 |
| Repetição de `imovel-pagina.spec.ts`, `--project=mobile --workers=1` | 4 | 1 | 0 |
| Repetição só do teste "orçamento de imagens" (mobile, `--workers=1`) | 1 | 0 | 0 |

Observação: o spec novo roda só no projeto `desktop` (13 execuções contando o `setup` de login; 12 testes). A primeira tentativa isolada falhou no `setup` (login do QA com timeout de 30s, deploy frio); a repetição passou (8,5s).

`npx tsc --noEmit`: exit 0. `npx eslint .`: exit 0, zero erro e zero aviso.

## Cobertura das mudanças do PR (`tests/e2e/robos-ia.spec.ts`, somente leitura)

O alias `@/lib/seo/robos-ia` resolve nos specs (Playwright lê o `paths` do tsconfig); a lista de agentes vem do código (`ROBOS_IA`, 11 agentes), não digitada à mão.

`/robots.txt`
- 200 e `text/plain`.
- Cada agente de `ROBOS_IA` aparece como linha `User-Agent:`.
- Todo grupo (o `*` e o de IA) tem `Allow: /` e `Disallow: /admin`.
- Nenhuma linha `Disallow: /` sozinha.
- Linha `Sitemap:` presente.

`/llms.txt`
- 200 direto com `maxRedirects: 0` (sem redirect nem barra adicionada); `Content-Type: text/plain; charset=utf-8`.
- Começa com `# Rafael Teixeira · Capital Imobiliário`; tem blockquote `> `.
- Sem mojibake (contém "Imobiliário", nenhum `Ã` nem `�`).
- `## Serviços` com `/financiamento/` e `/home_equity/`; `## Artigos` com links `/blog/<slug>/`.
- Todo link Markdown é absoluto em `https://rtcapitalimobiliario.com.br/...`, termina em `/` e não contém `/admin`.
- Os links `/blog/` e `/imoveis/` do `llms.txt` (limitado a 15; havia 15 artigos + imóveis, o teste verificou os 15 primeiros, todos artigos) respondem 200 no host do deploy, sem redirect. **Os links de `/imoveis/` não foram exercitados por causa do limite de 15** (o llms.txt lista 15 artigos antes dos imóveis); o único imóvel listado no trecho inspecionado é `/imoveis/villagio-santanna-vinhedo/` (ver Observações).

TDD: o deploy já continha a mudança, então os testes passaram de primeira; servem de proteção contra regressão.

## Evidências

`GET /robots.txt` (status 200, `Content-Type: text/plain`):

```
User-Agent: *
Allow: /
Disallow: /admin

User-Agent: OAI-SearchBot
User-Agent: PerplexityBot
User-Agent: Claude-SearchBot
User-Agent: ChatGPT-User
User-Agent: Perplexity-User
User-Agent: Claude-User
User-Agent: GPTBot
User-Agent: ClaudeBot
User-Agent: Google-Extended
User-Agent: CCBot
User-Agent: Applebot-Extended
Allow: /
Disallow: /admin

Sitemap: https://rtcapitalimobiliario.com.br/sitemap.xml
```

`GET /llms.txt` (status 200, `Content-Type: text/plain; charset=utf-8`, 8035 bytes), primeiras linhas:

```
# Rafael Teixeira · Capital Imobiliário

> Correspondente bancário especializado em crédito com garantia de imóvel (home equity), financiamento imobiliário SBPE e consórcio. Análise multibanco com recomendação do menor crédito que resolve o objetivo do cliente.

Correspondente bancário e corretor de imóveis (CRECI-SP 283020-F) em Vinhedo/SP, atendendo Vinhedo, Valinhos, Louveira, Jundiaí, Campinas, Itatiba, Indaiatuba e Sumaré. Contato: telefone +55-19-99783-4187, e-mail contato@rtcapitalimobiliario.com.br.

## Serviços
- [Financiamento imobiliário](https://rtcapitalimobiliario.com.br/financiamento/): Financiamento imobiliário SBPE com cotação em vários bancos, simulador de parcelas e análise sem custo.
- [Home equity](https://rtcapitalimobiliario.com.br/home_equity/): Crédito com garantia de imóvel, com simulador e comparação entre instituições.

## Sobre
- [Sobre Rafael Teixeira](https://rtcapitalimobiliario.com.br/sobre/): Quem é o corretor e correspondente bancário e como é o atendimento.

## Artigos
- [Investir em imóvel em 2026: a conta inteira, contra a Selic a 14%](https://rtcapitalimobiliario.com.br/blog/investir-em-imovel-em-2026-a-conta-inteira-contra-a-selic-a-14/): Abri a conta ...
```

## Falhas

1. **Suíte completa, projeto `mobile`:** `imovel-pagina.spec.ts:31` "hero carrega pelo otimizador /_next/image". `Test timeout of 30000ms exceeded.` Artefatos: `tests/functional-tests/.artefatos/imovel-pagina--imoveis-slu-0315d--pelo-otimizador-next-image-mobile/` (screenshot, trace).
   - Repetição com `--workers=1` (todos os projetos): esse teste passou; falhou outro do mesmo spec/mobile, `imovel-pagina.spec.ts:43` "orçamento de imagens...", com `locator.scrollIntoViewIfNeeded: Test timeout of 30000ms exceeded` (linha 67). Artefatos: `.artefatos/imovel-pagina--imoveis-slu-ca092-as-carregam-ao-chegar-perto-mobile/`.
   - Repetição só do mobile com `--workers=1`: o teste 43 falhou de novo (42,3s). Isolado, em seguida, passou (29,6s, no limite dos 30s). Na produção (`rtcapitalimobiliario.com.br`) o mesmo teste passou em 22,8s.
   - Classificação: **lentidão do preview no mobile** (otimizador `/_next/image` e carregamento de galeria em deploy com cache frio), não defeito do código do PR: o PR não toca páginas de imóvel nem imagens (diff: `app/robots.ts`, `app/llms.txt/route.ts`, `lib/seo/*`, testes unitários, `CLAUDE.md`). O teste fica perto do orçamento de 30s mesmo na produção; é candidato a ter o timeout ampliado em outra branch.

## Pulos e motivos

Dois pulos, ambos condicionais a dados (sem lead de home equity visível ao QA; sem lead com lembrete atrasado), como nas rodadas anteriores. O nome exato de cada um não foi extraído desta rodada (o resultado em JSON foi sobrescrito pelas repetições); a atribuição vem do relatório do PR #78, em que são os mesmos dois pulos.

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' nem 'Anexar simulação' (provável) | desktop | Sem lead de home equity visível ao QA |
| admin-crm: contorno de lembrete atrasado (provável) | desktop | Nenhum lead com lembrete atrasado |

## Observações

- O `llms.txt` lista 15 artigos antes da seção `## Imóveis`, então o limite de 15 links verificados consumiu só artigos. Os links de imóveis aparecem na seção seguinte e não foram exercitados pelo spec. O imóvel `villagio-santanna-vinhedo` foi visto no corpo e a página `/imoveis/<slug>/` é coberta pelo spec `imovel-pagina`. Sugestão: elevar o limite do spec para cobrir imóveis.
- A descrição do artigo "Os condomínios de Vinhedo..." sai truncada no `llms.txt` ("Onde vocês escolheria morar", sem ponto final). Parece vir do texto cadastrado do post (`description`/resumo), não do construtor; vale conferir a fonte.
- Resposta do preview traz `X-Robots-Tag: noindex` (comportamento padrão de preview da Vercel; em produção não deve aparecer. Confirmar após o merge em `main`).
- O `robots.txt` serve `Content-Type: text/plain` sem `charset`; o `llms.txt` serve `charset=utf-8`. Ambos corretos para o que se pede.
- Ruído de terceiros no console (GA/Meta) segue como nos outros relatórios; nada novo.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação, salvamento ou formulário enviado.
- [x] O spec novo faz apenas GET de `/robots.txt`, `/llms.txt` e das páginas listadas nele.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (a suíte passou sem acusar).

## Veredito

**APROVADO** — o `robots.txt` e o `/llms.txt` conferem em tudo o que o PR prometeu (13 de 13 no spec novo; tsc e eslint limpos); a única falha da suíte completa é lentidão do preview em teste mobile de imagens de imóvel, não relacionada ao PR, que passa isolado e na produção.

## Validação (Opus)

- O limite único de 15 links era todo consumido pelos artigos, então nenhum imóvel era verificado. O spec passou a verificar `/blog/` e `/imoveis/` separadamente, cada um com até 15 links. Rodado contra o deploy (desktop): 14 passaram, 0 falharam (a primeira tentativa caiu só no setup de login do QA, por deploy frio; a repetição passou).
- Os 4 imóveis listados no `llms.txt` servido respondem 200 no deploy.
- Resumo truncado do post "Os condomínios de Vinhedo" ("Onde vocês escolheria morar"): vem do `excerpt` cadastrado, não do construtor. Correção é pelo admin, a critério do dono.
- Falha de `imovel-pagina.spec.ts` (mobile) não tem relação com o PR; o teste roda perto do limite de 30 s também em produção. Ajuste de timeout fica para outra branch.

**Veredito: APROVADO.**
