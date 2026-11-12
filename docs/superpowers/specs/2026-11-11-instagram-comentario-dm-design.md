# Instagram: comentário → DM, dentro do `/admin` (substituto do ManyChat)

Data: 2026-11-11 · Status: rascunho para aprovação do dono

Legenda: o que não tem marca foi **decidido pelo dono** na conversa. **[escolha do desenho]** é
decisão minha, que o dono pode reverter lendo este documento. **[deixado ao construtor]** é
detalhe técnico que não muda o que é construído.

## 1. Intenção e porquê

O dono usa o ManyChat para responder comentários de posts e reels do @rt.capitalimobiliario com
uma sequência de DMs que entrega um link (hoje, o simulador de financiamento). Os recursos que
ele quer (qualquer publicação, exigir seguir antes do link, lembrete para quem não abriu) são do
plano pago do ManyChat. O objetivo é ter o mesmo resultado **dentro do `/admin` do site**, em
plano grátis, configurável sem mexer em código, num lugar onde mais tarde entra o atendimento
de WhatsApp Business.

Ele abre a caixa de entrada para responder uma pergunta: **"está funcionando? alguém ficou sem o
link?"**. A tela principal existe para responder isso de relance.

Sucesso: o ManyChat pode ser desligado; toda pessoa que comenta a palavra-chave recebe a
sequência; o dono enxerga, em segundos, quem ficou parado em que ponto e qualquer falha de
envio.

## 2. Objetivos

1. **Automações por publicação**, criadas, editadas, pausadas e reativadas no `/admin`.
2. **Sequência**: comentário com palavra-chave → resposta pública (opcional) → 1ª DM com botão →
   (opcional) checagem de "segue o perfil" → DM com o link → lembrete para quem não abriu.
3. **Retomada** quando a mesma pessoa comenta de novo; silêncio a partir do 3º comentário.
4. **Caixa de entrada só de leitura**, só com quem entrou numa automação: números do dia,
   situação de cada pessoa, histórico completo da conversa (inclusive o que o dono responde pelo
   app do celular).
5. **Conexão da conta** do Instagram pelo próprio `/admin`.

## 3. Não-objetivos (agora)

- Contato da DM **não vira lead do CRM**. (Atribuição indireta existe: ver §7.4.)
- **Responder pelo painel.** O dono atende pelo app do Instagram no celular.
- **Boas-vindas a novo seguidor.** A Meta não emite evento de "novo seguidor" na API oficial nem
  permite DM a quem nunca escreveu; o ManyChat usa recurso fora da documentação pública, que
  quebra com frequência. Reavaliar se a Meta liberar oficialmente.
- Boas-vindas na primeira DM, ice breakers, gatilho por DM ou por resposta a story, pedir e-mail.
  Possíveis depois sem refazer nada.
- Mais de uma conta do Instagram. É uma conta só: @rt.capitalimobiliario.
- WhatsApp. Vem depois; o desenho só não deve fechar a porta (§8).

## 4. Anti-objetivos (falha mesmo que "funcione")

- **Mandar a mesma DM duas vezes** para a mesma pessoa pelo mesmo evento (webhook repetido,
  clique duplo no botão, cron rodando em paralelo).
- **Atropelar o atendimento**: a automação responder algo quando a pessoa escreve texto livre ou
  quando o dono está conversando.
- **Responder ao próprio dono**: comentário ou mensagem da própria conta disparando automação
  (laço).
- **Quebrar o site**: qualquer falha deste módulo derrubar captação de lead, páginas públicas ou o
  CRM. O webhook responde 200 rápido e processa depois; erro vira registro, nunca exceção que
  escapa.
- **Vazar o token da conta** ou dados das conversas para o navegador de visitante (anon).
- **Mandar fora das janelas da Meta** e ter a conta restringida.

## 5. Restrições

- **Plano grátis**: Vercel Hobby (cron da Vercel só 1x/dia, inútil para lembretes) e o
  Supabase do site. **O agendador é o `pg_cron` + `pg_net`** do banco do site chamando uma rota
  do site a cada minuto, protegida por segredo (§7.5). `pg_net` ainda não é usado no projeto.
- **Banco único**: Preview e produção usam o mesmo banco; merge em `Preview` aplica migration em
  produção. Migrations a partir da **034**, sem `begin/commit`, no padrão do projeto.
- **Regras de segurança do projeto (CLAUDE.md)**: toda policy `to authenticated`; `revoke all ...
  from anon` em tabela/view nova; função com `revoke execute ... from public`; escrita só
  `eh_admin()`; token e chave de serviço nunca em código de cliente. Testes que leem o `.sql`
  travam isso, como em `tests/unidade/crm-sem-acesso-anonimo.test.ts`.
- **Regras da Meta** (moldam o comportamento):
  - Resposta privada a comentário: **uma por comentário**, até **7 dias** depois dele.
  - Depois que a pessoa toca um botão ou escreve, abre-se uma janela de **24 h** para mandar
    mensagens a ela.
  - Quem nunca tocou o primeiro botão nem escreveu **não pode receber mais nada** (só uma nova
    resposta privada se comentar de novo).
- **App da Meta já criado** (Etapas 1 e 2 do roteiro): app "RT Comentario DM", caso de uso
  "Gerenciar mensagens e conteúdo no Instagram", **login unificado** (Facebook Login for Business
  com configuração `1842700220240953`, token de usuário do sistema que **nunca expira**,
  compatível com login do Instagram, **sem Página do Facebook**). Portfólio rafaelteixeiraimovel.
  @rt.capitalimobiliario é Testador do Instagram. App novo não tem mais o "login do Instagram"
  (graph.instagram.com) puro. Uso só na própria conta: acesso padrão basta, sem App Review.
- `trailingSlash: true`: todas as URLs registradas na Meta terminam em `/`.
- Regra inviolável 5 do projeto (não criar páginas sem pedir): este documento é o pedido das telas
  do `/admin` e das rotas abaixo. Nenhuma página indexável nova é criada.

## 6. O que o dono decidiu

### 6.1 Automação (editor)
Espelha a tela do ManyChat (prints na conversa). Campos, na ordem:

1. **Nome** da automação.
2. **Quando alguém comenta em**: uma publicação/reel **específico** (grade com as publicações da
   conta) · **qualquer publicação** · **a próxima publicação**.
3. **E o comentário tem**: **palavras específicas** (separadas por vírgula) ou **qualquer
   palavra**.
4. **Responder o comentário publicamente** (liga/desliga) com **várias frases**, uma sorteada por
   vez.
5. **1ª DM**: texto + texto do botão (ex.: "Me envie o link").
6. **Exigir seguir o perfil** (liga/desliga): quem já segue recebe o link direto; quem não segue
   recebe uma mensagem pedindo para seguir + botão "Já estou seguindo"; ao tocar, o sistema
   confere de novo; se ainda não segue, recebe outra mensagem pedindo para seguir.
7. **DM com o link**: texto + texto do botão + URL de destino.
8. **Lembrete** (liga/desliga): depois de N horas, para quem **recebeu o link e não abriu** e
   para quem **não seguiu** (este recebe o link no lembrete, mesmo sem seguir).
9. **Pausar / ativar**.

### 6.2 Comentou de novo (mesma pessoa, mesma automação)
- **2º comentário: retoma do ponto onde parou**, com mensagem própria para cada ponto, por ex.
  "Olá! Vi que você comentou novamente no post. Vou te mandar o link depois que nos seguir por
  aqui". Se no meio-tempo ela passou a seguir, recebe o link direto.
- **A partir do 3º comentário: nenhuma automação.**

### 6.3 Caixa de entrada
- **Só leitura**; o dono responde pelo app do Instagram.
- **Só aparece quem entrou numa automação** (comentou uma palavra-chave). DM de quem nunca
  participou de automação **não é guardada nem mostrada**: o evento é descartado sem gravar o
  conteúdo. De quem participa, a conversa é guardada inteira (inclusive texto livre e as
  respostas do dono pelo app), a partir da entrada na automação.
- Números do dia, filtros por automação e por situação, lista de pessoas com etiqueta da
  situação, conversa completa à direita (comentário de origem, DMs, toques em botão, se segue,
  quando abriu o link, texto livre da pessoa e respostas do dono pelo app).

## 7. Escolhas do desenho

### 7.1 Onde fica
- Módulo **Instagram** no `SidebarAdmin`, **só admin** (`layout.tsx` com
  `garantirAdminOuRedirecionar()`, como `posts/`). **[escolha do desenho]**
- Rotas do admin: `/admin/instagram/` (caixa de entrada, tela padrão do módulo),
  `/admin/instagram/automacoes/` (lista com liga/pausa), `/admin/instagram/automacoes/nova/` e
  `/admin/instagram/automacoes/[id]/` (editor), `/admin/instagram/conexao/` (status da conta e
  botão "Conectar Instagram"). **[escolha do desenho]**
- Visual do admin existente (Tailwind + variáveis de `admin.css`). A conversa reaproveita a ideia
  da `LinhaDoTempo` do CRM. Prévia de celular no editor, como no ManyChat. **[escolha do desenho]**
  Diretiva de design do projeto: carregar `frontend-design` e `ui-ux-pro-max` ao construir as telas.

### 7.2 Regras de disparo **[escolha do desenho]**
- Palavra-chave casa **sem diferenciar maiúscula, minúscula e acento**, como **palavra inteira**
  dentro do comentário ("avaliar" casa com "Quero avaliar!", não com "reavaliar").
- Mais de uma automação servindo o mesmo comentário: vale **uma só**, nesta ordem: publicação
  específica > próxima publicação > qualquer publicação; empate, a mais recente.
- "Próxima publicação" se prende à **primeira publicação feita depois de a automação ser salva**
  e, a partir daí, se comporta como específica.
- Comentário **da própria conta** e mensagem **echo** (enviada pela própria conta) nunca disparam.
- Resposta a comentário (comentário filho) dispara igual a um comentário de primeiro nível.
- Automação **pausada** não inicia sequência nova; sequências em andamento **continuam** (o
  botão tocado ainda entrega o link). O lembrete pendente de automação pausada também sai.
- **Texto livre** da pessoa é só registrado. A automação reage apenas a comentário com
  palavra-chave e a toque nos seus botões.

### 7.3 Situações de cada pessoa (por automação) **[escolha do desenho]**
`aguardando_botao` → (`aguardando_seguir`) → `link_enviado` → `link_aberto`; mais
`falha` (último envio recusado pela Meta, com o motivo) e o contador de comentários. São as
etiquetas e os filtros da caixa de entrada.

Mensagens de retomada (2º comentário), **uma por situação**, editáveis em cada automação e
preenchidas com um texto padrão:
| Parou em | Recebe |
|---|---|
| `aguardando_botao` | "Olá! Vi que você comentou novamente…" + o 1º botão de novo |
| `aguardando_seguir` | "Vou te mandar o link depois que nos seguir" + "Já estou seguindo" (se já segue: link direto) |
| `link_enviado` / `link_aberto` | "Vi que você comentou de novo, aqui está o link" + o link |

3º comentário em diante: nem DM nem resposta pública; a caixa mostra "comentou 3+ vezes".

**Contagem [escolha do desenho]**: por pessoa × automação × **publicação**. Numa automação de
publicação específica dá no mesmo; numa de "qualquer publicação", cada post novo começa do zero
(senão um seguidor fiel seria ignorado para sempre depois do 3º post comentado).

**Atendimento humano [escolha do desenho]**: quando o dono responde pelo app (echo) ou a pessoa
escreve texto livre, o **lembrete pendente é cancelado** — já há conversa humana. Toque em botão
continua entregando o que o botão promete, e um comentário novo continua seguindo §6.2 (é um
pedido novo da pessoa).

### 7.4 Rastrear "abriu o link" **[escolha do desenho]**
- O botão de link aponta para um endereço curto do site, **`/ir/<código>/`**, um código por pessoa
  e automação. A rota registra o clique (data, hora) e redireciona (302) para o destino. Não é
  página: sem HTML, `noindex`, e o prefixo entra no `disallow` de `app/robots.ts` (grupo `*` e
  grupo dos robôs de IA).
- Ao redirecionar, acrescenta `utm_source=instagram&utm_medium=dm&utm_campaign=<slug da
  automação>` quando o destino é o próprio site. O `lib/utm.ts` já guarda isso no `leads.utm`:
  quem pedir simulação depois chega ao CRM com a origem "instagram/dm", **sem** o contato da DM
  virar lead.
- Pré-visualizador de link do Instagram pode "abrir" o endereço sozinho: cliques de robô
  conhecidos (user-agent do crawler da Meta) não contam como abertura. **[deixado ao construtor]**
  confirmar quais user-agents.

### 7.5 Motor de envio **[escolha do desenho]**
- **Webhook** público em `/api/meta/webhook/` (nome genérico porque o mesmo app recebe WhatsApp
  no futuro). `GET` responde o desafio de verificação com `META_WEBHOOK_VERIFY_TOKEN`. `POST`
  confere `X-Hub-Signature-256` com `META_APP_SECRET`, grava o evento bruto (idempotente pelo
  identificador do evento/mensagem/comentário), responde **200 imediatamente** e processa em
  `after()`.
- **Fila de envios** numa tabela: toda mensagem a mandar vira linha com "enviar a partir de".
  Envio imediato é tentado logo no `after()`; o que falhar ou estiver agendado (lembrete) é pego
  pelo **disparador** `/api/meta/disparar/`, chamado **a cada minuto** por `pg_cron` + `pg_net`
  com um segredo em cabeçalho (`CRON_SECRET`). Cada linha é reservada atomicamente antes do envio,
  para dois disparos simultâneos nunca mandarem a mesma mensagem.
- **Lembrete** é agendado no momento em que o link (ou o pedido de seguir) é enviado e
  **cancelado** se o link for aberto ou a situação avançar. N horas é configurável na automação,
  **padrão 2 h, máximo 23 h** (precisa sair dentro da janela de 24 h contada do último toque da
  pessoa). **Um** lembrete por sequência.
- **Novas tentativas**: erro temporário da Meta (limite, 5xx) tenta de novo com espera crescente,
  até 3 vezes; erro definitivo (janela fechada, usuário bloqueou) vira `falha` com o motivo
  legível na caixa de entrada. Nenhuma falha lança para fora do motor.
- Checagem de "segue": consulta o perfil da pessoa na API (campo de "segue a conta") no momento do
  toque. **[deixado ao construtor]** confirmar o nome do campo e o endereço no login unificado.

### 7.6 Conexão da conta **[escolha do desenho]**
- `/admin/instagram/conexao/` tem o botão **Conectar Instagram**, que abre o login unificado com
  `config_id = META_LOGIN_CONFIG_ID`. O retorno vai para `/api/meta/instagram/retorno/`, que só
  aceita admin logado (e confere o `state` anti-CSRF), troca o código pelo token do usuário do
  sistema, descobre a conta do Instagram atribuída, grava e assina o app nos webhooks da conta.
- Essa URL de retorno é a "URL de redirecionamento" a registrar na Meta (Etapa 5 do roteiro).
- A tela mostra: conta conectada (@, foto), desde quando, se os webhooks estão assinados, último
  evento recebido, e "Reconectar".
- **Token guardado no banco**, numa tabela sem acesso algum para `anon` e `authenticated` (só a
  service role lê). **[deixado ao construtor]** cifrar a coluna (ex.: com chave em variável de
  ambiente) se for simples; o mínimo é nunca chegar ao cliente.

### 7.7 Dados **[escolha do desenho; nomes deixados ao construtor]**
Tabelas novas, todas com RLS: leitura e escrita pelo painel só `eh_admin()` (`to authenticated`),
`revoke all from anon`; o motor escreve com a service role.
- **conta conectada** (uma linha): id da conta IG, @, token (só service role), datas.
- **automações**: campos do §6.1, palavras, frases públicas, textos de retomada, ativo/pausado,
  publicação alvo (ou modo qualquer/próxima), slug para o UTM.
- **contatos**: id da pessoa no Instagram (IGSID), @, nome, foto, se segue (com data da última
  checagem), **canal** (`instagram`) para o WhatsApp reaproveitar depois.
- **participações** (pessoa × automação): situação, contador de comentários, código do link
  curto, datas de cada passo, motivo da última falha.
- **mensagens**: tudo que entra e sai na conversa (comentário de origem, DMs nossas, toques em
  botão, texto livre da pessoa, echo do dono pelo app), com direção e horário. Alimenta a
  conversa da caixa de entrada.
- **fila de envios**: mensagem, destinatário, "enviar a partir de", estado, tentativas, erro.
- **eventos do webhook** brutos: idempotência e investigação. Evento de DM de quem não participa
  de automação guarda só o identificador (para idempotência), nunca o conteúdo.
  **[escolha do desenho]** apagar os brutos com mais de 30 dias por `pg_cron`.
- Números do dia da caixa de entrada vêm de **uma função no banco**, nunca de soma em JS (mesma
  armadilha do PostgREST que o CRM já pagou).

### 7.8 Variáveis de ambiente novas (só servidor)
`META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`,
`CRON_SECRET`; documentadas em `.env.local.example`. O `pg_cron` precisa da URL do site e do
`CRON_SECRET` no banco: guardar no Vault do Supabase, nunca no `.sql` versionado.
**[deixado ao construtor]** o mecanismo exato.

### 7.9 Ambiente que processa **[escolha do desenho]**
Só **produção** processa. A Meta aceita uma URL de webhook e o `pg_cron` chama uma URL: as duas
apontam para `https://rtcapitalimobiliario.com.br`. As variáveis da Meta e o `CRON_SECRET` existem
só no ambiente Production da Vercel; sem elas, um deploy de preview responde ao webhook com 503 e
não envia nada (é a trava contra preview e produção processarem o mesmo evento). Os testes do
fluxo de testes do projeto em preview cobrem telas e rotas em modo leitura; o primeiro teste
real de comentário → DM acontece depois do merge em `main` (Etapa 6 do roteiro).

### 7.10 Nível de acesso
A própria tela "API setup with Unified login" diz que a análise do app pode ser pulada por quem
desenvolve só para as próprias empresas no Instagram. O app precisa ir para modo **publicado**
(senão comentários de quem não tem função no app não chegam), mas com acesso padrão, sem App
Review nem verificação do portfólio. Se a Meta exigir acesso avançado na prática, a construção
não muda; muda só a Etapa 5, que passa a incluir análise e verificação.

### 7.11 Comentários em anúncios **[escolha do desenho]**
"Qualquer publicação" dispara também em comentário de anúncio, se a Meta entregar o evento. A
grade de publicação específica mostra só posts do perfil; anúncio sem post no perfil fica fora.

### 7.12 Privacidade e retenção (decidido pelo dono)
- **Política de privacidade**: entra um parágrafo novo em `/politica-de-privacidade/` dizendo o
  que é guardado das conversas do Instagram (perfil público da pessoa, comentário que disparou a
  automação, mensagens trocadas a partir dali, cliques no link), para quê (entregar o material
  pedido e acompanhar o atendimento) e por quanto tempo. O texto é **redigido pelo construtor e
  aprovado pelo dono antes de publicar**; a URL da política não muda. `TEXTO_CONSENTIMENTO`
  (`lib/legal.ts`) **não** muda.
- **Exclusão de dados**: instrução na própria política ("peça por DM ou e-mail e apagamos"), sem
  rota nova. O admin precisa de um jeito de apagar um contato e tudo dele (botão "Excluir dados
  deste contato" na caixa de entrada, com confirmação).
- **Retenção**: contato sem interação há **12 meses** é apagado sozinho, com mensagens,
  participações, cliques e envios, por `pg_cron` diário.

## 8. Porta aberta para o WhatsApp
Webhook com nome genérico (`/api/meta/webhook/`), contatos com `canal`, e conversa como lista de
mensagens com direção. Nada específico de WhatsApp é construído agora.

## 9. Fora do código (feito pelo dono, guiado)
Seguem o roteiro em `C:\Repos-GIT\comentario-dm\ROTEIRO.md`, Etapas 4 a 6: variáveis na Vercel,
URL de redirecionamento e webhook (campos `comments`, `messages`, `messaging_postbacks`) no
console da Meta, conectar a conta pelo `/admin`, colocar o app em modo publicado (exige URL da
política de privacidade, que já existe em `/politica-de-privacidade/`), criar a primeira
automação, testar com comentário real e só então desligar a automação equivalente no ManyChat
(as duas juntas mandariam DM em dobro).

## 10. Deixado ao construtor
Endereços e versões exatas da Graph API no login unificado; formato do botão (template) nas DMs;
nomes de tabelas, colunas e funções; layout fino das telas dentro das escolhas acima; quebra em
fases e PRs; política de reenvio fina; como reproduzir os prints do ManyChat na prévia.
