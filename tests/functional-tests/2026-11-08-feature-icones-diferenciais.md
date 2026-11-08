# Relatório de testes funcionais

- **Branch:** `feature/icones-diferenciais`
- **Commit (SHA):** `09165ea8e9c18e14021bf527c19d755ae8af50b2`
- **URL do deploy:** <https://site-capital-imobiliario-hgx003gh7-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 21:56
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-hgx003gh7-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

Execução final (1ª e única rodada completa): 72 testes, 72 passaram (inclui 1 de `setup`).

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| setup (login) | setup | 1 | 0 | 0 |
| imoveis-listagem | desktop | 2 | 0 | 0 |
| imoveis-listagem | mobile | 2 | 0 | 0 |
| imoveis-redirect | desktop | 2 | 0 | 0 |
| imoveis-redirect | mobile | 2 | 0 | 0 |
| imovel-pagina | desktop | 5 | 0 | 0 |
| imovel-pagina | mobile | 5 | 0 | 0 |
| landings | desktop | 7 | 0 | 0 |
| landings | mobile | 7 | 0 | 0 |
| seo | desktop | 8 | 0 | 0 |
| seo | mobile | 8 | 0 | 0 |
| admin-listas | desktop | 11 | 0 | 0 |
| admin-editor | desktop | 5 | 0 | 0 |
| admin-crm | desktop | 5 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| **Total** | | **72** | **0** | **0** |

## Falhas

_Nenhuma._

## Pulos e motivos

_Nenhum._ O teste novo encontrou diferenciais no primeiro imóvel e rodou por inteiro.

## Mudanças nos testes

- `tests/e2e/admin-editor.spec.ts`: novo teste "lista os 36 ícones com rótulo em português, em ordem alfabética, e o preview acompanha" (desktop, admin, somente leitura):
  abre o primeiro imóvel da lista, vai à aba Diferenciais e, se houver linha, confere no `<select>` "Ícone" (a) pelo menos 36 opções reais do catálogo (exclui "Sem ícone" e "(fora do catálogo)"), (b) presença de "Ar-condicionado", "Espaço delivery" e "Tomadas USB", (c) nenhuma opção com cara de slug, (d) ordem alfabética pt-BR, (e) trocar o valor para `piscina`/`ar-condicionado` muda o `innerHTML` do svg de preview, (f) restaurar o valor original devolve o svg original. Sai pelo menu lateral e, se o diálogo de descarte aparecer, escolhe "Descartar e sair". Sem salvar; a fixture `acoesServidor` exige lista vazia. Se não houver diferencial, pula com motivo (nunca adiciona e salva).
- TDD: o teste foi escrito antes de qualquer execução e passou de primeira contra o deploy, que já contém a feature (o código da feature precede o teste nesta branch). Não foi rodado contra um deploy antigo; por raciocínio ele falharia com o comportamento anterior: as `<option>` mostravam os slugs (`ar-condicionado`, `delivery`, `tomada-usb`), então `toContain("Ar-condicionado")`, `toContain("Espaço delivery")`, `toContain("Tomadas USB")` e a asserção "não parece slug" quebrariam; o catálogo tinha 18 itens, abaixo do mínimo de 36; e a ordem seguia a do objeto `ICONES`, não alfabética pelo rótulo.
- Nenhuma asserção enfraquecida, nenhum `waitForTimeout`, nenhum código do app alterado.

## Defeitos do app

_Nenhum encontrado._

## Observações

- Páginas públicas de imóvel com lazer: `#lazer` renderiza ícones (svg em todos os `li`): villagio-santanna-vinhedo 3/3, jabo-studio 3/3, apartamento-de-2-suites-condominio-piu-bello 4/4, gran-vic-niagara-vinhedo 6/6. Os quatro imóveis têm `#diferenciais` sem `li` (estrutura diferente ou grupo vazio nesses cadastros), então não foi possível confirmar ícones nesse grupo por essa checagem; vale olhar se algum imóvel publicado tem diferenciais do grupo "Diferencial".
- `npx eslint .` sem erros nem avisos e `npx tsc --noEmit` sem erros após a mudança.
- Sem flakiness nem ruído de console observados; suíte completa em ~48 s.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (todos os testes que a exigem passaram).

## Veredito

**APROVADO** — 72/72 na rodada completa final, sem falhas nem pulos; o seletor de ícones mostra o catálogo de 36 itens com rótulos em português em ordem alfabética e o preview acompanha a seleção.

## Validação (Opus 5.5)

A observação de que `#diferenciais` não tem `li` vem do seletor: a seção usa `div.im-diferencial`, não lista. Conferido no deploy: `/imoveis/jabo-studio/` tem 6 itens em `#diferenciais` com 6 `<svg>`; o banco tem itens do grupo `diferencial` nos 4 imóveis publicados. Relatório APROVADO confirmado (72/72 no `.ultimo-resultado.json`).
