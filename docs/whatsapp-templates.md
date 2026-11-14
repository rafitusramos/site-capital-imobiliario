# Templates do WhatsApp (cadastro no WhatsApp Manager)

Cadastre cada template abaixo em WhatsApp Manager > Modelos de mensagem. Em todos:

- Categoria: **Utilidade**
- Idioma: **Portuguese (BR) / pt_BR**
- Nome: exatamente como na lista (minúsculas, números e sublinhado)
- Corpo: exatamente o conteúdo do bloco de código, com as quebras de linha e sem espaços no fim das linhas; sem cabeçalho, rodapé nem botões
- Exemplos de variável: `{{1}}` = `Ana`, `{{2}}` = `RT-2026-0001`

O código só envia template aprovado pela Meta. A fonte do texto é `lib/whatsapp/templates.ts`;
mudou num lugar, refaça no outro. Mexer no corpo exige novo cadastro e nova aprovação.

## rt_confirmacao_credito

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Recebemos o seu pedido de simulação de crédito na RT Capital Imobiliário.
Seu protocolo é {{2}}. 📄
Em até 1 dia útil entraremos em contato.
Por este número você recebe os avisos do seu atendimento. O Rafael fala com você pelo WhatsApp dele e pelo seu e-mail cadastrado.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_confirmacao_imovel

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Recebemos o seu interesse em um imóvel da RT Capital Imobiliário.
Seu protocolo é {{2}}. 📄
Em até 1 dia útil entraremos em contato para entender o que você procura.
Por este número você recebe os avisos do seu atendimento. O Rafael fala com você pelo WhatsApp dele e pelo seu e-mail cadastrado.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_credito_simulacao

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a etapa de simulação. 📊
Protocolo {{2}}.
Estamos calculando as condições possíveis. Os valores são estimativas e dependem da análise da instituição financeira.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_credito_pre_aprovacao

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a análise de crédito. 🏦
Protocolo {{2}}.
Estamos encaminhando a sua proposta à instituição financeira. A decisão é dela e depende do seu perfil e da documentação. Avisaremos assim que houver retorno.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_credito_vistoria

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a vistoria do imóvel. 🏠
Protocolo {{2}}.
A instituição financeira vai avaliar o imóvel. Entraremos em contato para combinar os detalhes.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_credito_contrato

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento chegou à etapa de contrato. 📝
Protocolo {{2}}.
Vamos conferir com você as condições e os documentos antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_consorcio_apresentacao

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a apresentação das opções de consórcio. 📋
Protocolo {{2}}.
Vamos explicar prazos e regras de contemplação para você comparar com calma.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_consorcio_proposta

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
A sua proposta de consórcio está pronta. 📄
Protocolo {{2}}.
Ela traz as condições de adesão para a sua análise. Fique à vontade para tirar dúvidas antes de decidir.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_consorcio_contrato

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento chegou à etapa de contrato. 📝
Protocolo {{2}}.
Vamos conferir com você as condições e a documentação antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_imovel_qualificacao

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a etapa de qualificação. 🔎
Protocolo {{2}}.
Estamos entendendo o perfil do imóvel que você procura para indicar as melhores opções.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_imovel_visita

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a visita ao imóvel. 🏡
Protocolo {{2}}.
Entraremos em contato para combinar data e horário.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_imovel_proposta

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento avançou para a etapa de proposta. 📄
Protocolo {{2}}.
Vamos apoiar você na formalização e no acompanhamento da resposta do vendedor.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_imovel_contrato

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento chegou à etapa de contrato. 📝
Protocolo {{2}}.
Vamos conferir com você as condições e os documentos antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.
Até breve! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001

## rt_etapa_ganho

- Categoria: Utilidade
- Idioma: Portuguese (BR) (pt_BR)
- Corpo:

```
Olá, {{1}}! 👋
Seu atendimento foi concluído. ✅
Protocolo {{2}}.
Obrigado pela confiança na RT Capital Imobiliário. Se precisar de algo, é só chamar o Rafael.
Até logo! 🤝
```

- Exemplo {{1}}: Ana
- Exemplo {{2}}: RT-2026-0001
