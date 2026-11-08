# Relatório de testes funcionais

- **Branch:** `<feature/nome>`
- **Commit (SHA):** `<sha completo>`
- **URL do deploy:** <https://...vercel.app>
- **Data/hora (America/Sao_Paulo):** AAAA-MM-DD HH:MM
- **Executor:** <agente/modelo e skills usadas>
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim / não

## Resumo

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| imoveis-listagem | desktop | | | |
| imoveis-listagem | mobile | | | |
| imovel-pagina | desktop | | | |
| imovel-pagina | mobile | | | |
| landings | desktop | | | |
| landings | mobile | | | |
| seo | desktop | | | |
| seo | mobile | | | |
| admin-listas | desktop | | | |
| admin-editor | desktop | | | |
| admin-crm | desktop | | | |
| admin-parametros | desktop | | | |
| **Total** | | | | |

## Falhas

Para cada falha: spec e projeto, passos para reproduzir, esperado x obtido, caminho do trace e do
screenshot em `tests/functional-tests/.artefatos/`, e se é defeito do código ou do teste.

_Nenhuma._

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |

## Observações

Ruído de terceiros no console (GA/Meta), lentidão, flakiness, lacunas de cobertura, algo estranho que
passou mas merece olhar.

## Confirmação da política de segurança

- [ ] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [ ] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada.

## Veredito

**APROVADO** / **REPROVADO** — justificativa em uma ou duas frases.
