# Modelo de artigo para importação

Use este arquivo como ponto de partida para escrever um artigo fora do admin. Depois, em
`/admin/posts`, clique em **"Importar Markdown"**, envie o `.md` preenchido (e, se tiver, uma
imagem de capa) — o artigo entra como **rascunho**, pronto para revisão e ajustes finos na tela
normal de edição antes de publicar.

## Como preencher

- Copie este arquivo, preencha os campos do bloco entre `---` (o "frontmatter") e escreva o
  corpo do artigo em Markdown normal depois do segundo `---`.
- Não inclua `slug` — ele é gerado automaticamente a partir do título (dá pra ajustar depois,
  antes de publicar).
- `categoria` aceita o nome (ex.: `Home Equity`) ou o identificador (ex.: `home-equity`) — sem
  diferenciar maiúsculas/minúsculas. Valores aceitos hoje: `Financiamento`, `Home Equity`,
  `Consórcio`, `Imóveis`.
- Campos com `(opcional)` podem ficar em branco ou ser removidos do frontmatter.

---

```
---
titulo: "Título do artigo"
resumo: "Resumo curto que aparece no card do blog (até ~220 caracteres)"
categoria: financiamento
rotulo: "Rótulo curto sobre a imagem do card (opcional)"
cta_pagina: /financiamento/#simulador
seo_titulo: "Título para os mecanismos de busca (opcional, até ~60 caracteres)"
seo_descricao: "Descrição para os mecanismos de busca (opcional, até ~160 caracteres)"
---
# Título do artigo

Primeiro parágrafo do artigo em Markdown normal — **negrito**, *itálico*, [links](https://exemplo.com)
e listas funcionam como em qualquer Markdown.

## Um subtítulo (H2)

Mais um parágrafo. Use `##` para os subtítulos internos do artigo.
```
