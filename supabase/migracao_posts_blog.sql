-- =====================================================================
-- MIGRAÇÃO DE CONTEÚDO — posts.js (populado) -> tabela public.posts
-- Fonte: content/blog/*.md (3 posts atuais, confirmados via sitemap.xml)
-- Pressupõe que o schema_inicial_capital_imobiliario.sql já foi rodado
-- e que existe pelo menos 1 profile com role='admin' (author único).
-- Rodar no SQL Editor do Supabase, DEPOIS do schema inicial.
-- =====================================================================

-- Sanity check: garante que existe um admin antes de seguir
do $$
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Nenhum profile com role=admin encontrado. Crie o profile do admin antes de rodar esta migração.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Post: home-equity-empresario-capital-de-giro
-- ---------------------------------------------------------------------
insert into public.posts (
  slug, title, excerpt, content, cover_image, category_id, author_id,
  status, published_at, seo_title, seo_description, canonical_url
) values (
  $slug$home-equity-empresario-capital-de-giro$slug$,
  $title$Home Equity para Empresário: Trocando a Taxa do Capital de Giro pela do Imóvel$title$,
  $excerpt$Capital de giro PJ custa de 30% a 45% ao ano. Com garantia de imóvel, a taxa cai para a faixa de 1,1% a 1,8% ao mês. Como o empresário usa o próprio patrimônio para baratear o crédito da empresa.$excerpt$,
  $content$# Home Equity para Empresário: Trocando a Taxa do Capital de Giro pela do Imóvel

Um empresário com um imóvel quitado e uma linha de capital de giro ativa quase sempre está pagando caro por algo que poderia custar bem menos. Não porque tomou uma decisão errada, mas porque o crédito com garantia de imóvel raramente aparece no balcão quando a empresa precisa de dinheiro rápido — e é justamente ele o mais barato à disposição de quem tem patrimônio.

## O tamanho da diferença

Capital de giro para pessoa jurídica, no crédito livre, não é barato. Em bancos comerciais, a taxa anual dessa linha varia de cerca de 30% a mais de 45% ao ano, a depender da instituição e do risco da operação. Ofertas anunciadas "a partir de" 1,7% ao mês existem, mas dependem de análise e costumam subir conforme o perfil.

O crédito com garantia de imóvel parte de outro patamar: as taxas praticadas pelos cinco maiores bancos do país ficam entre 1,12% e 1,80% ao mês. Sobre um capital de R$ 500 mil mantido por doze meses, a distância entre uma linha de giro a 3% ao mês e um home equity a 1,3% ao mês passa de R$ 100 mil em juros no período — dinheiro que fica na empresa em vez de ir para o banco.

O prazo também joga a favor. Linhas de giro convencionais costumam se resolver em 12 a 36 meses; o home equity se estende por 15 ou 20 anos, o que reduz o peso da parcela sobre o caixa mês a mês.

## Por que a garantia derruba a taxa

O banco cobra pelo risco. Sem garantia, a linha de giro depende só do fluxo de caixa e do histórico da empresa, e a incerteza vira taxa. Com um imóvel em garantia, o risco da operação cai, e essa queda aparece direto no custo do crédito.

No Brasil isso funciona por alienação fiduciária: enquanto a dívida não é quitada, a propriedade formal do imóvel fica vinculada à instituição, mas você continua com a posse e o uso. Segue morando, alugando ou mantendo o imóvel normalmente — o banco não quer o imóvel, quer a segurança de receber. O bem dado em garantia também não precisa ser onde a empresa opera: pode ser residencial, comercial ou um terreno, dentro dos critérios de cada instituição, e algumas aceitam até imóveis com saldo devedor residual.

## O caso de quem tem imóvel em Vinhedo

Vinhedo reúne um patrimônio imobiliário caro e, em boa parte, já quitado. Um empresário com casa em condomínio como Marambaia, São Joaquim, Terras de Vinhedo ou Campo de Toscana costuma ter um ativo de sobra parado — cumprindo função de moradia e nada além disso.

Esse ativo resolve um problema concreto do negócio: quitar uma dívida cara de cheque especial ou cartão PJ, financiar uma expansão, montar uma reserva de capital mais barata para a próxima oportunidade. Vale para quem toca empresa em Vinhedo, Valinhos, Louveira, Jundiaí, Campinas, Itatiba, Indaiatuba ou Sumaré — a garantia é o imóvel, não o CNPJ.

## Quanto o imóvel libera

O crédito costuma chegar a cerca de 60% do valor de avaliação do imóvel — o percentual exato varia por instituição, tipo de imóvel e perfil. Um imóvel avaliado em R$ 2 milhões sustenta, nessa ordem de grandeza, algo perto de R$ 1,2 milhão de crédito, diluído em prazo longo.

## Onde a maioria perde dinheiro

A diferença de meio ponto percentual ao mês, esticada por 15 ou 20 anos, é uma cifra alta. Ainda assim, o mais comum é o empresário fechar com o próprio banco onde já tem conta, sem cotar em nenhum outro lugar, e pagar uma taxa de relacionamento que ele nem sabia estar pagando.

Cotar a mesma operação em várias instituições, comparar pelo custo efetivo total — não pela taxa de vitrine — e dimensionar o menor crédito que resolve o objetivo, em vez do maior que o banco libera: é aí que a conta muda.

## Vale rodar a simulação

Se a empresa paga caro por giro e existe um imóvel com patrimônio disponível, a simulação leva poucos minutos e mostra o crédito estimado e a parcela aproximada. A partir dela, dá para pedir uma análise multibanco sem custo.$content$,
  $img$/images/blog/home-equity-empresario.jpg$img$,
  (select id from public.categories where slug = 'home-equity'),
  (select id from public.profiles where role = 'admin' limit 1),
  'published',
  '2026-07-21T00:00:00-03:00',
  $seotitle$Home Equity para Empresário em Vinhedo — Capital de Giro Mais Barato | Rafael Teixeira$seotitle$,
  $seodesc$Capital de giro PJ custa de 30% a 45% ao ano. Com garantia de imóvel, a taxa cai para a faixa de 1,1% a 1,8% ao mês. Como o empresário de Vinhedo e região usa o imóvel para baratear o crédito da empresa.$seodesc$,
  'https://rtcapitalimobiliario.com.br/blog/home-equity-empresario-capital-de-giro/'
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image = excluded.cover_image,
  category_id = excluded.category_id,
  status = excluded.status,
  published_at = excluded.published_at,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url;

-- ---------------------------------------------------------------------
-- Post: home-equity-o-que-e-como-funciona
-- ---------------------------------------------------------------------
insert into public.posts (
  slug, title, excerpt, content, cover_image, category_id, author_id,
  status, published_at, seo_title, seo_description, canonical_url
) values (
  $slug$home-equity-o-que-e-como-funciona$slug$,
  $title$Home Equity: o que é, como funciona e quando vale a pena usar seu imóvel como garantia$title$,
  $excerpt$Seu imóvel quitado pode ser a chave para o crédito mais barato do mercado. Entenda, de forma simples, o que é home equity, como funciona a alienação fiduciária, quanto dá para captar e quais os riscos.$excerpt$,
  $content$# Home Equity: o que é, como funciona e quando vale a pena usar seu imóvel como garantia

Existe um patrimônio parado dentro da sua casa. Um imóvel quitado costuma ser o bem mais valioso de uma família — e, na maioria das vezes, ele fica ali, imóvel também no sentido financeiro, sem trabalhar a favor de quem o conquistou. O **home equity** é justamente o mecanismo que transforma esse patrimônio em capital, sem que você precise vender ou abrir mão de morar nele.

Nos últimos anos, essa modalidade deixou de ser um termo de nicho para virar uma das conversas mais frequentes sobre crédito no Brasil. Só no primeiro trimestre de 2026, as concessões de crédito com garantia de imóvel somaram cerca de **R$ 3,1 bilhões**, o maior volume já registrado pela ABECIP para o período — um crescimento de aproximadamente 26% em relação ao ano anterior. Com a Selic em patamar elevado e o crédito pessoal cada vez mais caro, o home equity se firmou como a alternativa mais inteligente para quem precisa de valores altos com juros baixos.

Neste artigo, a **Capital Imobiliário** explica tudo em linguagem clara: o que é, como funciona na prática, quanto dá para captar, quais são os requisitos e — com honestidade — quais são os riscos que você precisa conhecer antes de assinar.

## Afinal, o que é home equity?

Home equity é uma expressão em inglês que, em bom português, significa **empréstimo com garantia de imóvel** — você também vai encontrar as siglas EGI (Empréstimo com Garantia de Imóvel) ou CGI (Crédito com Garantia de Imóvel).

A ideia é simples: você oferece um imóvel próprio, já quitado ou com baixo saldo devedor, como garantia de pagamento. Em troca dessa segurança, a instituição financeira libera crédito com condições que nenhuma outra linha sem garantia consegue oferecer — juros baixos, prazos longos e valores elevados.

O ponto mais importante — e que costuma gerar dúvida — é este: **você continua morando e usando o imóvel normalmente durante todo o contrato.** Ele pode inclusive permanecer alugado, gerando renda. A garantia é jurídica, não física.

## Como funciona a alienação fiduciária (sem juridiquês)

Durante o contrato, o imóvel entra em um regime chamado **alienação fiduciária**. Na prática, a propriedade fica formalmente vinculada ao credor até que a dívida seja quitada, mas **a posse e o uso continuam sendo seus**. Quando você paga a última parcela, o imóvel volta a estar 100% no seu nome, livre de qualquer ônus.

Esse mecanismo é o segredo por trás dos juros baixos. Como o banco tem uma garantia sólida e de recuperação rápida em caso de inadimplência, o risco da operação despenca — e esse risco menor se traduz diretamente em taxas mais camaradas para você. É diferente da antiga hipoteca, que caiu em desuso justamente por depender de um processo judicial lento.

## O passo a passo da contratação

Uma operação de home equity bem conduzida segue etapas claras. Na Capital Imobiliário, acompanhamos você em cada uma delas:

1. **Análise de crédito.** A instituição avalia sua renda, seu histórico e seu grau de endividamento para dimensionar a capacidade de pagamento.
2. **Avaliação do imóvel.** Um profissional determina o valor de mercado do bem, que é o que define o limite de crédito disponível.
3. **Análise jurídica.** Toda a documentação do imóvel e do proprietário é conferida (matrícula, IPTU, ITBI, certidões).
4. **Formalização do contrato.** Estando tudo em ordem, a operação é registrada — normalmente por meio de uma Cédula de Crédito Bancário (CCB) — e o valor é liberado.

O prazo total varia conforme a instituição e a documentação, mas o processo tem ficado cada vez mais digital e rápido nos últimos anos.

## Quanto dá para captar e em quanto tempo pagar

Duas perguntas resumem quase todas as dúvidas sobre home equity:

- **Quanto de crédito eu consigo?** Em geral, os bancos liberam entre **50% e 60% do valor de avaliação do imóvel**. Na prática, o mercado costuma operar abaixo desse teto — os dados mais recentes da ABECIP apontam liberação média em torno de 32% do valor do bem, porque cada operação é calibrada pela capacidade de pagamento do cliente.
- **Quanto tempo tenho para pagar?** Os prazos são longos, chegando a 15 ou 20 anos dependendo da instituição. A média praticada no mercado gira em torno de **13 anos**, o que dilui bastante o valor das parcelas.

Isso significa que um imóvel de R$ 800 mil pode destravar, com folga, algumas centenas de milhares de reais em crédito — um volume impensável em um empréstimo pessoal comum.

## Por que os juros são tão mais baixos?

Aqui está o coração do produto. Enquanto linhas como cheque especial e crédito pessoal podem ultrapassar **100% ao ano**, o home equity opera com taxas que, segundo a ABECIP, chegam a ser até **cinco vezes menores** que as do crédito pessoal.

O motivo, como já vimos, é a garantia. Do ponto de vista do banco, emprestar para alguém que oferece um imóvel de lastro é uma operação de baixo risco — e baixo risco significa juros baixos. Em um cenário de Selic elevada, essa diferença fica ainda mais evidente: o home equity se torna, disparado, o crédito de alto valor mais barato acessível ao brasileiro comum.

## Quem pode contratar? Os requisitos

Para acessar o home equity, você precisa reunir, de forma geral:

- **Um imóvel próprio** — residencial ou comercial — quitado ou com baixo saldo devedor;
- **Documentação em dia**, incluindo IPTU e ITBI sem pendências;
- **Imóvel em bom estado de conservação**, comprovado pela avaliação;
- **Renda comprovada e compatível** com as parcelas, com grau de endividamento sob controle.

Cada instituição tem suas particularidades — algumas aceitam, por exemplo, imóvel em nome de terceiros ou de familiares. É exatamente aqui que uma assessoria faz diferença: montar o perfil certo para a instituição certa aumenta muito as chances de aprovação nas melhores condições.

## Para que serve? Os usos mais inteligentes

Diferentemente do financiamento imobiliário, o home equity **não exige que você diga onde vai usar o dinheiro**. Essa liberdade é uma das suas maiores forças. Os usos mais estratégicos que vemos são:

- **Trocar dívida cara por dívida barata** — quitar cartão, cheque especial e empréstimos pessoais, reorganizando o orçamento;
- **Investir no próprio negócio** — capital de giro, expansão, compra de equipamentos;
- **Reformar ou ampliar** o imóvel, valorizando o patrimônio;
- **Comprar um novo imóvel**, usando o crédito como entrada ou pagamento à vista para negociar melhor;
- **Financiar projetos de vida** — educação, saúde, oportunidades que não esperam.

## Home equity x financiamento imobiliário: qual a diferença?

É uma confusão comum, mas os produtos são opostos em sua lógica:

- No **financiamento imobiliário**, você ainda **não tem** o imóvel — o crédito é liberado justamente para comprá-lo, e o uso do dinheiro é vinculado a essa aquisição.
- No **home equity**, você **já tem** um imóvel quitado e o usa como garantia para captar recursos com finalidade livre.

Um constrói patrimônio; o outro coloca o patrimônio que você já tem para trabalhar. Se a sua dúvida é entre as duas modalidades, vale conferir também nosso conteúdo da categoria **Financiamento** — e, se o objetivo for planejamento de médio prazo, o **Consórcio** pode entrar na conversa.

## Riscos e cuidados: a parte que ninguém deveria pular

Nenhum produto de crédito é isento de risco, e seria desonesto dizer o contrário. O principal ponto de atenção do home equity é claro: **como o imóvel é a garantia, a inadimplência grave e prolongada pode levar à perda do bem.** Por isso, três cuidados são inegociáveis:

1. **A parcela precisa caber no orçamento** com folga, mesmo em cenários adversos.
2. **O crédito deve ter um destino estratégico** — trocar dívida cara ou investir em algo que gera retorno, não financiar consumo sem retorno.
3. **Leia o custo total da operação**, não só a taxa mensal. Prazos longos barateiam a parcela, mas exigem atenção ao montante final.

Home equity é uma ferramenta poderosa nas mãos de quem planeja. O nosso papel é garantir que você entre na operação com todas as contas na mesa.

## O que mudou com o Marco Legal das Garantias

Parte do avanço recente do home equity no Brasil se deve ao **Marco Legal das Garantias (Lei nº 14.711/2023)**. A legislação modernizou o uso de garantias em operações de crédito, tornando os mecanismos mais eficientes e ampliando o acesso ao financiamento. O efeito prático, para você, é um mercado mais competitivo, mais digital e com condições cada vez melhores.

## Como a Capital Imobiliário conduz sua operação

O home equity envolve avaliação de imóvel, análise jurídica de documentação e negociação com instituições financeiras — etapas em que um erro custa tempo e dinheiro. A **Capital Imobiliário** atua como sua parceira em todo o percurso, aqui em **Vinhedo e região**: cuidamos da análise do seu perfil, da preparação da documentação e da busca pelas melhores condições entre as instituições parceiras, para que você tome uma decisão com segurança e transparência.

E, quando o objetivo for usar o crédito para adquirir um novo imóvel, nós fechamos o ciclo: apresentamos os imóveis disponíveis dentro do valor da sua operação, sem que você precise sair daqui.

## Vale rodar a simulação

Quer saber, em poucos minutos, quanto o seu imóvel pode liberar de crédito e qual seria a parcela estimada? A simulação é rápida e não compromete nada — a partir dela, dá para pedir uma análise multibanco sem custo.$content$,
  $img$/images/blog/home-equity-o-que-e-como-funciona.jpg$img$,
  (select id from public.categories where slug = 'home-equity'),
  (select id from public.profiles where role = 'admin' limit 1),
  'published',
  '2026-07-22T00:00:00-03:00',
  $seotitle$Home Equity: o Que É e Como Funciona | Rafael Teixeira · Capital Imobiliário$seotitle$,
  $seodesc$Home equity é o crédito com garantia de imóvel: taxas bem abaixo do crédito pessoal, prazos de até 20 anos e liberação de até 60% do valor do imóvel. Entenda como funciona, os requisitos e os riscos.$seodesc$,
  'https://rtcapitalimobiliario.com.br/blog/home-equity-o-que-e-como-funciona/'
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image = excluded.cover_image,
  category_id = excluded.category_id,
  status = excluded.status,
  published_at = excluded.published_at,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url;

-- ---------------------------------------------------------------------
-- Post: melhor-taxa-financiamento-imobiliario-bancos
-- ---------------------------------------------------------------------
insert into public.posts (
  slug, title, excerpt, content, cover_image, category_id, author_id,
  status, published_at, seo_title, seo_description, canonical_url
) values (
  $slug$melhor-taxa-financiamento-imobiliario-bancos$slug$,
  $title$Qual Banco Tem a Melhor Taxa de Financiamento Imobiliário em 2026?$title$,
  $excerpt$Caixa a partir de 10,65%, Itaú perto de 11,9% e Santander chegando a 13,29% ao ano. A diferença entre a melhor e a pior taxa no mesmo contrato passa de R$ 170 mil. Um guia direto de taxas, prazos e uso do FGTS.$excerpt$,
  $content$# Qual Banco Tem a Melhor Taxa de Financiamento Imobiliário em 2026?

A pergunta é a primeira que todo comprador faz, e a resposta honesta é: depende do seu perfil — mas a distância entre a melhor e a pior taxa do mercado é grande o suficiente para que valha a pena entender o cenário antes de assinar qualquer coisa.

## O cenário de taxas em 2026

Com a Selic ainda em patamar elevado, os juros do financiamento imobiliário se acomodaram numa faixa que separa claramente os bancos. Estas são as taxas de balcão praticadas em meados de 2026 para o SBPE — o sistema usado na maior parte das compras acima da faixa do Minha Casa Minha Vida:

- **Caixa Econômica** — a partir de cerca de 10,65% a.a. + TR. É historicamente a mais baixa de balcão e responde por mais da metade do crédito habitacional do país.
- **Itaú** — a partir de cerca de 11,9% a.a. + TR. O mais competitivo entre os privados, com aprovação rápida e processo digital.
- **Bradesco** — a partir de cerca de 12,3% a.a. + TR, com vantagens de relacionamento para quem já é cliente antigo.
- **Santander** — a partir de cerca de 13,29% a.a. + TR, costuma ser mais flexível na análise de renda de autônomos e aceita composição de renda sem vínculo familiar.
- **Bancos digitais e demais instituições** — podem ficar acima desse patamar, dependendo da linha e do perfil.

Os números são referências de mercado e mudam mês a mês conforme a Selic e a estratégia comercial de cada banco. A sua taxa pessoal quase nunca é a taxa do comercial: ela depende de score de crédito, renda comprovada, valor da entrada, relacionamento com o banco e tipo de imóvel. Uma entrada maior e um bom histórico derrubam a taxa; renda difícil de comprovar a empurra para cima.

## Por que a diferença de taxa vira dezenas de milhares de reais

Financiamento é um contrato longo — 30, 35 anos. Nesse prazo, uma diferença que parece pequena na taxa anual se multiplica de um jeito que surpreende quem nunca fez a conta.

Um exemplo concreto: um financiamento de R$ 500 mil em 360 meses pela Tabela SAC. Só variando a taxa entre as praticadas hoje:

- A **10,65% a.a.** (patamar Caixa), o total pago fica em torno de **R$ 1,26 milhão**.
- A **11,9% a.a.** (patamar Itaú), sobe para cerca de **R$ 1,35 milhão** — aproximadamente **R$ 85 mil a mais**.
- A **13,29% a.a.** (patamar Santander no exemplo), chega perto de **R$ 1,44 milhão** — cerca de **R$ 179 mil a mais** que a taxa mais baixa, no mesmo imóvel.

É por isso que comparar não é preciosismo. A maioria dos compradores simula apenas no banco onde já tem conta, e essa comodidade custa caro ao longo do contrato.

## O CET importa mais que a taxa de vitrine

Aqui está o detalhe que inverte rankings: a menor taxa nominal nem sempre é o menor contrato. O que você paga de verdade é o **Custo Efetivo Total (CET)**, que soma à taxa os seguros obrigatórios (MIP e DFI) e as tarifas administrativas. Um banco pode anunciar a taxa mais baixa e, ainda assim, ter um CET maior que o do concorrente, porque seus seguros pesam mais.

A comparação correta, portanto, nunca é taxa contra taxa — é CET contra CET, com o mesmo valor de imóvel, a mesma entrada e o mesmo prazo. Sem a planilha de CET por escrito de cada banco, você está comparando fachadas, não contratos.

## Os prazos de cada etapa

Do interesse à chave, o financiamento tem etapas com durações relativamente previsíveis. Saber isso evita ansiedade e ajuda a negociar prazos com o vendedor:

- **Pré-aprovação de crédito** — de algumas horas a poucos dias, dependendo do banco. Vale por cerca de 90 dias e define seu teto real de compra. Negociar o imóvel com a carta pré-aprovada em mãos muda a sua posição.
- **Avaliação do imóvel** — o banco envia um engenheiro para avaliar a garantia; costuma levar poucos dias após a documentação entregue.
- **Análise jurídica e emissão do contrato** — a checagem da documentação do imóvel e das partes, seguida da montagem do contrato.
- **Assinatura e registro em cartório** — o registro é o que efetiva a transferência e libera o recurso ao vendedor.

No total, da proposta aceita até as chaves, o processo costuma levar de 30 a 60 dias. A maior parte dos atrasos vem de documentação incompleta — quanto mais organizados os documentos do comprador e do imóvel, mais perto do piso desse intervalo você fica.

## Onde o FGTS entra

O FGTS é uma das ferramentas mais subaproveitadas do financiamento, e pode entrar em mais de um momento:

- **Na entrada** — o saldo do fundo pode compor ou até cobrir a entrada, reduzindo o valor que você precisa ter em dinheiro.
- **Para amortizar o saldo devedor** — a cada 2 anos, você pode usar o FGTS para abater parte da dívida ou reduzir o valor das parcelas.
- **Para pagar parte das prestações** — em condições específicas, o fundo pode quitar até uma parcela dos pagamentos por um período.

Para usar o FGTS, é preciso cumprir alguns requisitos: ter ao menos 3 anos de trabalho sob o regime do fundo (somando períodos), não possuir outro imóvel residencial na mesma cidade e comprar um imóvel residencial urbano dentro do teto do SFH, que em 2026 foi ampliado para R$ 2,25 milhões. Essa ampliação do teto é relevante para quem compra imóveis de padrão mais alto: passou a ser possível acessar as condições reguladas e o uso do FGTS em faixas de valor que antes ficavam de fora.

## O caminho mais barato quase nunca é o do seu banco

Reunindo tudo: a taxa varia bastante entre instituições, o CET pode inverter o que a taxa sugere, e o FGTS muda a conta. A decisão certa exige comparar a mesma operação em vários bancos, pelo CET — e não pela primeira proposta do gerente com quem você já tem conta.

É exatamente isso que uma cotação multibanco faz: submete o seu perfil a diferentes instituições, coloca as propostas lado a lado pelo custo real e recomenda a que sai mais barata para o seu caso — sem que você precise abrir cinco processos por conta própria.

Antes de conversar com qualquer banco, vale ter uma ordem de grandeza da sua operação. A calculadora de financiamento do site mostra, em poucos minutos, o valor financiado, a parcela inicial estimada e a renda sugerida para o seu caso:$content$,
  $img$/images/blog/melhor-taxa-financiamento.jpg$img$,
  (select id from public.categories where slug = 'financiamento'),
  (select id from public.profiles where role = 'admin' limit 1),
  'published',
  '2026-07-22T00:00:00-03:00',
  $seotitle$Melhor Taxa de Financiamento Imobiliário 2026 — Comparação de Bancos | Rafael Teixeira$seotitle$,
  $seodesc$Caixa a partir de 10,65%, Itaú 11,9%, Bradesco 12,3% e Santander 13,29% ao ano: veja as taxas de financiamento imobiliário de 2026, os prazos de cada etapa, como o FGTS entra na conta e por que comparar bancos pode valer mais de R$ 170 mil.$seodesc$,
  'https://rtcapitalimobiliario.com.br/blog/melhor-taxa-financiamento-imobiliario-bancos/'
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image = excluded.cover_image,
  category_id = excluded.category_id,
  status = excluded.status,
  published_at = excluded.published_at,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url;

-- =====================================================================
-- FIM DA MIGRAÇÃO
-- Confirme após rodar: select slug, status, published_at from public.posts order by published_at desc;
-- =====================================================================
