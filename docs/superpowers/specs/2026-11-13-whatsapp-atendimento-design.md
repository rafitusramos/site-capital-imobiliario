# WhatsApp: atendimento automatizado de leads (IA para imóveis, avisos para crédito)

Data: 2026-11-13 · Status: rascunho para aprovação do dono

Legenda: o que não tem marca foi **decidido pelo dono** na conversa. **[escolha do desenho]** é
decisão minha, que o dono pode reverter lendo este documento. **[deixado ao construtor]** é
detalhe técnico que não muda o que é construído.

## 1. Intenção e porquê

O dono quer que o lead seja atendido pelo WhatsApp **em minutos, a qualquer hora**, sem ele
precisar conduzir o começo de cada conversa. Para **imóveis**, uma assistente com IA qualifica o
cliente e **marca a visita** em espaços que ele reservou na agenda; ele só entra quando o cliente
está qualificado e com hora marcada. Para **crédito** (financiamento e home equity), sem IA: o
cliente recebe confirmação e avisos de andamento pelo WhatsApp, e qualquer resposta dele é
encaminhada ao número oficial do dono.

Sucesso: lead de imóvel chega ao dono qualificado e com visita na agenda Google; nenhum cliente
fica sem resposta; o dono não precisa abrir tela nova para isso funcionar.

## 2. Objetivos

1. **Número novo** (chip novo, nunca usado no WhatsApp), registrado direto na Cloud API, **não
   divulgado**. O número oficial do dono continua no app, intocado.
2. **Primeira mensagem automática** a todo lead novo do site que aceitou o WhatsApp no consentimento.
3. **Imóveis: assistente com IA** (nome próprio, se apresenta como assistente do Rafael) que
   qualifica e agenda visita.
4. **Agendamento na agenda Google do dono**, a partir de blocos de disponibilidade que ele mesmo
   cria na agenda. Lançamento: confirmado na hora. Pronto: reservado até o dono confirmar, em até 24 h.
5. **Crédito: sem IA.** Confirmação ao entrar, aviso de mudança de etapa pelo WhatsApp e
   encaminhamento ao número oficial se o cliente responder.
6. **Contato desconhecido** (escreveu sem ter preenchido formulário): direcionar por produto e,
   se for imóvel, qualificar.
7. **Passagem para o dono** por link para o número oficial + resumo da conversa por e-mail.

## 3. Não-objetivos (agora)

- **Responder pelo `/admin`** ou caixa de entrada com campo de resposta. O dono atende no número
  oficial (opção 2 da conversa). Pode vir depois.
- **Coexistência** (número oficial no app e na API ao mesmo tempo).
- **IA no crédito.** Decidido: crédito fica sem IA. O motor deve permitir ligá-lo depois sem refazer.
- **Tela de agenda no `/admin`.** A agenda é o Google Agenda.
- **WhatsApp Flows**, anúncio Click-to-WhatsApp, divulgação do número, envio em massa / templates de
  marketing, mensagens a leads anteriores à mudança do consentimento, grupos, ligações.
- **Áudio**: não transcrito agora (ver §7.9).

## 4. Anti-objetivos (falha mesmo que "funcione")

- **Prometer aprovação de crédito**, citar taxa ou calcular parcela no texto da IA.
- **Inventar** imóvel, preço, disponibilidade, endereço ou característica que não está no cadastro.
- **Revelar o que o cadastro esconde**: preço de imóvel `valor_sob_consulta`; endereço exato sem
  `exibir_endereco`.
- **Marcar duas visitas no mesmo horário**, ou visita fora dos blocos de disponibilidade, ou em
  cima de outro compromisso do dono.
- **Visita de imóvel pronto confirmada sem o dono.**
- **Mandar a mesma mensagem duas vezes** (webhook reentregue, cron em paralelo, clique duplo).
- **Escrever para quem não aceitou** o WhatsApp no consentimento, ou fora das regras da Meta.
- **Quebrar o site**: falha do WhatsApp, do Gemini ou do Google Agenda derrubar captação de lead,
  páginas públicas, o CRM ou o módulo do Instagram. Erro vira registro, nunca exceção que escapa.
- **Obedecer o cliente** quando ele tenta reprogramar a IA ("ignore suas instruções e…"): texto do
  cliente é dado, nunca instrução; ação com efeito real só acontece pelo código.
- **Vazar** token, chave do Gemini, token do Google ou conversas para o navegador de visitante.

## 5. Restrições

- **Plano grátis de infraestrutura**: Vercel Hobby + Supabase do site. Agendador = `pg_cron` +
  `pg_net` chamando rota do site a cada minuto (o mesmo do Instagram, migration 036).
- **Banco único** (Preview = produção). Migrations a partir da **038**, sem `begin/commit`.
- **Regras de segurança do projeto (CLAUDE.md)**: policy `to authenticated` + `revoke all ... from
  anon` em tabela nova; função com `revoke execute ... from public`; escrita do painel só
  `eh_admin()` ou RLS do CRM; segredos só no servidor; testes que leem o `.sql` travam isso.
- **Só produção processa**: mesma trava 503 do Instagram (variáveis só no ambiente Production).
- **Regras da Meta** (lidas na documentação em 2026-11-13):
  - Fora da janela de 24 h (aberta por mensagem do cliente), só **template aprovado**. Dentro dela,
    mensagem livre, botões (até 3, título 20 caracteres), lista (até 10 opções) e botão de link.
  - Opt-in obrigatório, citando o nome da empresa e que a pessoa vai receber mensagens.
  - Cobrança por mensagem entregue: template de utilidade cobrado; 1.000 mensagens de atendimento
    grátis por número por mês, acima disso cobradas; mensagens do cliente grátis.
  - **1 mensagem a cada 6 s para o mesmo cliente** (erro 131056): a fila precisa espaçar.
  - Limite inicial: 250 clientes/24 h fora da janela; 2.000 após verificar o portfólio.
  - Template de utilidade com texto promocional é reclassificado como marketing (mais caro).
  - Webhook objeto `whatsapp_business_account`, campo `messages` (mensagens e `statuses`);
    reentrega por até 7 dias, duplicatas possíveis.
  - IA restrita ao negócio é permitida como mensagem de atendimento comum; a restrição de 2026 é
    para provedores de IA de uso geral.
- **Gemini**: plano **pago** (dados de cliente não podem ir para treino). Sem grounding.

## 6. O que o dono decidiu

### 6.1 Número e passagem de vez
- Número **novo** só para a API, não público.
- Quando a IA passa a vez (cliente pede uma pessoa, a IA não sabe responder, depois da visita
  marcada), o cliente recebe **link para o número oficial** do dono e o dono recebe **e-mail com o
  resumo** da conversa.

### 6.2 Imóveis: qualificação e visita
- Pelo menos uma **qualificação** antes de chegar ao dono; de preferência com **imóvel escolhido**.
- Destino: **visita marcada** num espaço reservado da agenda.
- Agenda = **Google Agenda** do dono (dá os lembretes). Sem tela de agenda no `/admin`.
- **Lançamento: confirma na hora. Pronto: reservado, o dono confirma em até 24 h.**
- **Sem resposta do dono em 24 h**: a IA avisa o cliente que o Rafael vai ligar pessoalmente,
  libera o horário e o lead fica marcado como pendente no CRM. Lembrete ao dono por e-mail quando
  faltarem 6 h.

### 6.3 Crédito
- **Sem IA.** Confirmação, avisos de etapa e encaminhamento ao número oficial (§7.6).

### 6.4 Contato desconhecido
- Mesmo com número não público, mensagem de origem desconhecida é **direcionada por produto** e,
  se for imóvel, **qualificada** (§7.7).

### 6.5 Consentimento
- **Opção (b)**: uma frase a mais no `TEXTO_CONSENTIMENTO` (obrigatório nos dois formulários,
  `LeadFormShell` e `LeadImovelModal`). Texto proposto:
  > "Autorizo o uso dos meus dados para a pré-qualificação de crédito e o encaminhamento às
  > instituições financeiras parceiras, e aceito receber o atendimento da RT Capital Imobiliário
  > pelo WhatsApp."
- Isso **revoga, por decisão do dono**, a regra do CLAUDE.md de só mudar esse texto junto com a
  CAPI. O CLAUDE.md é atualizado no mesmo PR (a regra passa a ser: mudanças futuras do texto
  gravam nova versão, ver §7.8).

### 6.6 A assistente
- Tem **nome próprio** (o dono escolhe; editável sem código, §7.10) e se apresenta como
  **assistente do Rafael Teixeira, da RT Capital Imobiliário**.

### 6.7 Só o dono, por enquanto
- Agenda, número oficial, e-mail de resumo e Confirmar/Recusar são **do Rafael**, mesmo em lead
  com `corretor_id` de outra pessoa. Agenda e número por corretor ficam para quando houver equipe;
  o desenho não deve impedir (configuração guardada de forma que vire "por usuário" depois).

### 6.8 Quando a assistente para
- **Conversa encerrada** (visita marcada ou passagem de vez): se o cliente voltar a escrever,
  resposta fixa com o link do número oficial + e-mail ao dono. A IA **não** retoma.
- **Movimento manual no CRM** para qualquer etapa além de `qualificacao` (inclusive `perdido`,
  `nao-qualificado`): a assistente para na hora. Movimentos feitos pelo próprio motor não contam.
- **"Pausar assistente"** no modal do lead (e "Retomar"), para quando o dono já assumiu pelo número
  oficial. Pausada, a conversa se comporta como encerrada.

### 6.9 Construção
- **A + Y**: tudo dentro do site, reaproveitando o módulo do Instagram; **roteiro fixo no código,
  com a IA conversando dentro de cada etapa** (§7.2).
- Modelo: Gemini, ver §7.3.

## 7. Escolhas do desenho

### 7.1 Abordagens consideradas
| | Onde roda | Troca |
|---|---|---|
| **A (escolhida)** | No site, Cloud API direta, reaproveitando webhook, fila, agendador e `/ir/` do Instagram | Mais código; custo fixo zero |
| B | Parceiro oficial (Twilio, 360dialog, Blip) | Caixa de entrada e coexistência prontas, mas mensalidade; perdeu sentido com a opção 2 |
| — | Plataforma sem código (ManyChat WhatsApp, Botmaker) | Descartada: é a dependência de plano pago de que o dono está saindo no Instagram |

| | Como a IA conduz | Troca |
|---|---|---|
| X | IA livre com ferramentas | Mais natural; difícil garantir que qualifica antes de marcar |
| **Y (escolhida)** | Roteiro fixo no código; IA conversa dentro de cada etapa e extrai dados | Previsível e testável; conversa um pouco menos livre |

### 7.2 Roteiro (Y) **[escolha do desenho]**
Etapas de uma conversa de imóvel, controladas pelo código:

1. **abertura** — template (lead do site) ou boas-vindas com botões (desconhecido, §7.7).
2. **qualificacao** — a IA conversa até ter, com confiança: faixa de valor; forma de pagamento
   (financiamento, à vista, FGTS, consórcio, combinação); prazo para comprar; se o imóvel de
   interesse cabe no orçamento. A IA **extrai** esses campos em JSON estruturado a cada turno; o
   código decide quando a etapa está completa.
3. **imovel** — se veio da página de um imóvel, já está definido (confirma com o cliente). Se não,
   a IA sugere até 3 imóveis **publicados** do cadastro que caibam no perfil. Pode responder dúvidas
   sobre o imóvel com base **só** no cadastro (§7.4).
4. **agendamento** — o código busca horários livres (§7.5) e oferece 2 ou 3 opções em botões/lista;
   a IA só ajuda a interpretar respostas soltas ("pode ser quinta à tarde").
5. **confirmacao** — lançamento: confirmado; pronto: "[A confirmar]" (§7.5).
6. **encerrada** — visita marcada (cliente recebe o link do número oficial para dali em diante) ou
   passagem de vez.

Em qualquer etapa: "quero falar com uma pessoa", pergunta que a IA não sabe responder ou assunto de
crédito → **passagem de vez** (§6.1). Pergunta fora do escopo → a IA responde em uma linha que não
pode ajudar com isso e volta à etapa. Cliente que some: **um** lembrete dentro da janela de 24 h
(texto livre, sem template), depois nada.

Qualificado mas sem interesse em visitar (ex.: "só pesquisando"): lead fica em `qualificacao`, a IA
encerra com o link do número oficial; o dono decide. Cliente que se mostra claramente fora do perfil
não é movido para `nao-qualificado` pela IA (exige motivo e é decisão do dono).

Financiamento citado na qualificação: a IA oferece o link do simulador `/financiamento/` via `/ir/`
(UTM whatsapp), sem calcular nada e sem criar um segundo lead.

### 7.3 Modelo **[escolha do desenho]**
- `gemini-3.5-flash-lite` por padrão, em variável de ambiente `GEMINI_MODELO` (troca sem código).
  Estimativa: ~US$ 0,04 por conversa de ~20 turnos. Se a avaliação de conversas (§9) mostrar
  português fraco, subir para `gemini-3.8-flash` (~US$ 0,09; dobra em 2027).
- **Sem grounding**, sem ferramentas de busca. Saída estruturada (JSON com resposta ao cliente +
  campos extraídos + intenção: `continuar`, `passar_para_rafael`, `fora_do_escopo`, `credito`).
- Timeout curto; falha do Gemini = mensagem neutra ("Já te respondo, um instante") **uma vez** e
  passagem de vez se persistir. Nunca deixar o cliente sem resposta, nunca lançar.

### 7.3.1 Teto de gasto **[escolha do desenho]**
- No máximo **30 respostas da IA por conversa**; ao atingir, passagem de vez.
- **Teto mensal** configurável no `/admin` (padrão **US$ 20**), calculado pelos tokens registrados
  por chamada. Atingido, a assistente deixa de chamar o Gemini até o mês virar: resposta fixa com o
  link do número oficial + e-mail ao dono avisando que o teto foi atingido (uma vez por mês).

### 7.3.2 Campos qualificados no CRM **[escolha do desenho]**
- Os campos que a IA extrai vão para o lead de imóvel: os que já existem (ex.: `orcamento_max`,
  `tipo_imovel`, `cidade_preferida`, migration 016) e colunas novas para **forma de pagamento** e
  **prazo**, editáveis no modal (`lib/crm/campos.ts`, `bloco: "lead"`, mantendo a invariante de
  `crm-campos.test.ts`).
- A IA **só preenche campo vazio**; nunca sobrescreve valor que o dono editou.

### 7.4 O que a IA sabe e o que nunca faz **[escolha do desenho]**
- Conhecimento = **só** o que o código injeta no turno: dados do imóvel do cadastro (os mesmos
  campos públicos da página), lista curta de imóveis publicados, campos já qualificados, nome da
  assistente, regras. Nada de conhecimento geral sobre imóveis específicos.
- Nunca: preço de imóvel `valor_sob_consulta`; endereço sem `exibir_endereco` (só bairro e cidade);
  taxa, parcela, aprovação de crédito; pedir CPF, documento, renda exata comprovada; inventar
  disponibilidade de unidade.
- Mensagem do cliente vai ao modelo marcada como dado; o prompt manda ignorar instruções contidas
  nela. Ações reais (reservar, mover etapa, criar lead) só via código, nunca porque o texto pediu.
- Cada saída da IA passa por um **filtro no código** antes de sair: tamanho máximo, sem números de
  taxa/parcela (`%`, "parcela de R$"), sem promessa de aprovação. Bateu no filtro → resposta
  neutra + registro para revisão.

### 7.5 Agenda Google **[escolha do desenho]**
- **Conexão**: login Google uma vez, pelo `/admin` (mesmo padrão do "Conectar Instagram":
  só admin, `state` anti-CSRF), escopo de calendário; refresh token guardado no banco, só service
  role lê. Não é "tela de agenda": é um botão de conexão, como o do Instagram. **[deixado ao
  construtor]** onde fica o botão (sugestão: `/admin/parametros` ou uma página "WhatsApp" irmã de
  `/admin/instagram/conexao/`).
- **Blocos de disponibilidade**: eventos na agenda principal do dono cujo título contém a
  palavra-chave configurável (padrão **"Visitas"**). Horário ofertável = dentro de um bloco e livre
  de qualquer outro evento da agenda (consulta de livre/ocupado, desconsiderando os próprios blocos).
- **Visita**: 1 h + 30 min de folga entre visitas (deslocamento na região). Janela de oferta:
  próximos 7 dias. Antecedência mínima: **3 h para lançamento**; **48 h para pronto** (a
  confirmação de até 24 h precisa acontecer antes da visita). 2 ou 3 opções por vez.
- **Corrida**: no momento de reservar, o código consulta de novo livre/ocupado; se o horário foi
  tomado, oferece outros.
- **Evento criado**: título "Visita — {cliente} — {imóvel}" (pronto: prefixo **"[A confirmar]"**);
  local = endereço do cadastro (o evento é privado do dono, então leva o endereço exato mesmo sem
  `exibir_endereco`); descrição com telefone, resumo da qualificação e link do lead no CRM. O id do
  evento fica gravado na reserva.
- **Lançamento**: confirmado na hora → cliente recebe confirmação; lead vai para `visita`.
- **Pronto**: reserva com prazo = agora + 24 h. Dono recebe **e-mail com "Confirmar" / "Recusar"**
  (links assinados, uso único, expiram no prazo) e os mesmos botões aparecem no modal do lead.
  - Confirmar: tira o "[A confirmar]", cliente recebe confirmação, lead vai para `visita`.
  - Recusar: apaga o evento, a IA oferece novos horários.
  - Faltando 6 h: e-mail de lembrete ao dono.
  - Prazo vencido: apaga o evento, cliente recebe "o Rafael vai te ligar pessoalmente" + link do
    número oficial; no CRM, interação na timeline e lembrete (`crm_lembretes`) para ligar; lead
    fica em `qualificacao`.
  - Mensagens ao cliente fora da janela de 24 h saem por template de utilidade.
- **Véspera**: lembrete ao cliente (template) com botões "Confirmo" / "Preciso remarcar".
  Remarcar volta à etapa de agendamento (apaga o evento antigo só depois de reservar o novo).
  "Confirmo" registra na timeline.
- **Cancelamento pelo dono** (apagou o evento na agenda): fora de escopo detectar agora; o dono
  avisa o cliente pelo número oficial. **[escolha do desenho]**

### 7.6 Crédito (sem IA) **[escolha do desenho]**
- **Lead novo**: template de confirmação com nome do dono e protocolo.
- **Mudança de etapa**: para etapas com `crm_etapas.notifica_lead = true`, além do e-mail atual,
  sai um template de utilidade por etapa (o mesmo interruptor de `/admin/parametros` liga os dois
  canais; etapa sem template aprovado fica só no e-mail). Segue a regra de agendamento +10 min e
  cancelamento do e-mail atual (`cancelarAgendados`) — mesmo comportamento, outro canal. Segue
  também a regra da simulação (financiamento indo para `simulacao` com simulação anexada não recebe
  o aviso genérico).
- **Cliente responde**: resposta automática fixa (sem IA) com o link do número oficial; dono recebe
  o texto por e-mail; a mensagem entra na timeline do lead (`crm_interacoes`, tipo `whatsapp`).
- A mesma regra de avisos de etapa vale para o lead de **imóvel**, exceto o movimento para
  `visita` feito pela assistente: a confirmação da visita substitui o aviso genérico. **[escolha do
  desenho]**

### 7.7 Contato desconhecido **[escolha do desenho]**
1. Boas-vindas com botões: **Comprar imóvel** · **Financiamento** · **Home equity**; "Outro assunto"
   no texto.
2. Comprar imóvel → pede **nome e e-mail**, informa em uma linha o uso dos dados (link da política
   de privacidade) e segue o roteiro de imóvel. Lead criado no CRM, aba **imóveis**, origem
   **whatsapp** (telefone da conversa). `leads.email` continua obrigatório: quem não quiser
   informar o e-mail vai para a passagem de vez. O aceite é a própria conversa iniciada pela
   pessoa + o aviso; registrar isso no lead.
3. Financiamento / home equity → link da landing via `/ir/` (UTM whatsapp); o lead nasce pelo
   formulário de sempre (CPF, data de nascimento, consentimento).
4. Outro assunto ou não entendido → link do número oficial + e-mail ao dono.
5. Três mensagens sem conseguir encaminhar → para de responder; só registra.
6. Se o telefone já é de um lead existente, a conversa se liga a esse lead (não cria outro).

### 7.8 Consentimento e privacidade **[escolha do desenho]**
- `leads` ganha a **versão do consentimento** aceita (ou data do aceite do WhatsApp). Só lead com a
  versão nova recebe mensagem iniciada por nós. **[deixado ao construtor]** forma (coluna de versão
  vs timestamp).
- **Política de privacidade**: seção nova sobre o WhatsApp (o que é guardado, que conversas de
  imóveis passam pelo Gemini, do Google, retenção, como pedir exclusão). Texto redigido pelo
  construtor e **aprovado pelo dono antes de publicar**; URL não muda.
- **Retenção**: conversa de contato sem interação há 12 meses é apagada (mesmo padrão do Instagram);
  as interações resumidas no CRM seguem o ciclo do lead. Excluir o lead apaga a conversa.

### 7.9 Mensagens que não são texto **[escolha do desenho]**
Áudio, imagem, figurinha, localização: a assistente responde "Consigo ler só mensagens de texto por
aqui, pode escrever?" (uma vez por conversa) e registra o tipo. Transcrever áudio fica para depois.

### 7.10 Configuração no `/admin` **[escolha do desenho]**
Sem tela de agenda e sem caixa de entrada. O mínimo, só admin:
- Conexão do número (status, número, nome de exibição, se o webhook está chegando) e do Google
  Agenda (conectado / reconectar).
- Nome da assistente; palavra-chave dos blocos; duração e folga da visita; antecedências; número
  oficial do dono (para os links).
- **Bloco "Conversa no WhatsApp"** só leitura no modal do lead (histórico completo), para o dono ver
  o que foi dito antes de ligar. **[escolha do desenho]**: é leitura do que já existe, não caixa de
  entrada; reverter = só o e-mail de resumo.

### 7.11 Motor e dados **[escolha do desenho; nomes deixados ao construtor]**
- **Webhook**: o mesmo `/api/meta/webhook/`, despachando por `object` (`instagram` →
  motor do Instagram; `whatsapp_business_account` → motor novo). `lib/instagram/eventos.ts` hoje
  descarta o que não é `instagram`; o WhatsApp ganha leitor próprio. **[deixado ao construtor]**
  se o número ficar num app da Meta diferente do Instagram, conferir a assinatura com o segredo de
  cada app.
- **Fila de envio** com "enviar a partir de", reserva atômica, idempotência por chave, novas
  tentativas (mesma política do Instagram) e **espaçamento de 6 s por cliente**. Reaproveitar os
  módulos puros do Instagram (`fila`, `assinatura`, `link`) em vez de copiar.
- **Dados** (RLS como no Instagram; leitura do painel pela RLS do CRM para o bloco do modal):
  conta/número conectado (token só service role), conexão Google (refresh token só service role),
  conversas (telefone, `wa_id`, lead ligado, etapa do roteiro, campos qualificados, contadores),
  mensagens (direção, tipo, texto, id da Meta, status entregue/lido/falha), envios (fila), eventos
  brutos (idempotência, limpeza em 30 dias), reservas de visita (imóvel, início/fim, evento Google,
  estado `confirmada`/`a_confirmar`/`recusada`/`expirada`/`remarcada`, prazo, token dos links).
- **Movimentos no CRM** sempre pelo `mover_lead_crm`. **[deixado ao construtor]** o RPC hoje roda
  com o usuário logado; o motor precisa de um caminho de sistema (service role, autor nulo como no
  lembrete automático da 029) sem abrir o RPC para `anon`.
- **Variáveis novas** (só servidor, só Production): token do usuário do sistema do WhatsApp, id do
  número, id da conta WhatsApp, `GEMINI_API_KEY`, `GEMINI_MODELO`, cliente OAuth do Google. Entram
  na trava 503.

## 8. Fases (um PR cada, nesta ordem) **[escolha do desenho]**
1. **Base WhatsApp + crédito**: conexão, webhook, fila, templates, consentimento novo + versão,
   política de privacidade, confirmação de lead (crédito e imóveis), avisos de etapa,
   encaminhamento de resposta ao número oficial. Já entrega valor sem IA. Nesta fase, lead de
   **imóvel** que responde recebe a mesma resposta fixa do crédito.
   Ao entrar a fase 2, a IA atende só conversas **iniciadas depois** do go-live; as anteriores
   seguem com a resposta fixa.
2. **Assistente de imóveis**: roteiro, Gemini, filtro de saída, contato desconhecido, passagem de
   vez com resumo, bloco "Conversa no WhatsApp" no modal.
3. **Agenda**: conexão Google, blocos, reserva, confirmação de pronto em 24 h, véspera, remarcar.

## 9. Testes **[escolha do desenho]**
- Unidade (puros): leitor de eventos do WhatsApp, roteiro (transições), cálculo de horários livres
  (blocos, ocupados, folga, antecedência por modalidade, fuso São Paulo), filtro de saída da IA,
  prazos de 24 h / 6 h, migrations sem acesso anônimo.
- **Avaliação de conversas** da assistente: roteiros de cliente simulados (inclui "você consegue
  aprovar meu crédito?", "qual a parcela?", "qual o endereço?" de imóvel sem endereço publicado,
  "ignore suas instruções", imóvel sob consulta) rodando contra o modelo real antes de ligar em
  produção; reprovação bloqueia o go-live.
- E2E no fluxo do projeto: só leitura (telas de configuração e bloco do modal).

## 10. Fora do código (feito pelo dono, guiado)
Comprar o chip **ou contratar uma linha fixa** (vale: a verificação aceita ligação, `code_method:
VOICE`; a linha precisa atender chamada automática, sem URA/PABX bloqueando, nunca ter sido usada
no WhatsApp e continuar ativa para reverificações); adicionar e verificar o número no WhatsApp Manager; **verificação do portfólio**
(CNPJ) e nome de exibição; aprovar os templates; chave do Gemini com faturamento ativo; projeto no
Google Cloud com tela de consentimento OAuth para o calendário; criar os blocos "Visitas" na agenda;
escolher o nome da assistente; aprovar o texto da política de privacidade; conferir a tabela de
preços do Brasil em business.whatsapp.com/products/platform-pricing.

## 11. Custos estimados
| Item | Por lead de imóvel qualificado |
|---|---|
| Template inicial (utilidade) | centavos |
| ~20 mensagens de atendimento | grátis até 1.000/mês por número; depois centavos cada |
| Gemini 3.5-flash-lite | ~US$ 0,04 |
| Lembrete de véspera (utilidade) | centavos |
| Google Agenda | grátis |

Crédito: 1 template de confirmação + 1 por aviso de etapa ligado. Valores da Meta em reais não foram
confirmados (tabela não lida).

## 12. Deixado ao construtor
Textos dos templates (submetidos como utilidade, sem tom promocional) e das mensagens fixas;
prompt da assistente dentro das regras de §7.4; endereços e versão da Cloud API e da API do Google
Agenda; nomes de tabelas, colunas e funções; layout fino das telas de configuração; política fina
de reenvio.
