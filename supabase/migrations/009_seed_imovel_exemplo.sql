-- =====================================================================
-- 009_seed_imovel_exemplo.sql
-- Um empreendimento de exemplo, para ter o que testar antes de existir
-- cadastro real. Rodar depois de 008_imoveis_storage.sql.
--
-- Nasce com status = 'inativo': NÃO aparece no site até você publicar
-- pelo admin (/admin/imoveis). É justamente o fluxo a testar.
--
-- As imagens apontam para assets que já existem em /public/images — o
-- seed não depende de upload nem de host externo. Troque pelas imagens
-- reais quando cadastrar o primeiro empreendimento de verdade.
--
-- Para remover o exemplo depois:
--   delete from public.imoveis where slug = 'reserva-jade-vinhedo';
-- (as tabelas filhas caem por on delete cascade)
-- =====================================================================

with novo as (
  insert into public.imoveis (
    slug, titulo, tipo, fase, status,
    bairro, cidade, estado, endereco, cep,
    area_min, area_max,
    dormitorios_min, dormitorios_max,
    banheiros_min, banheiros_max,
    vagas_min, vagas_max,
    valor_a_partir_de, previsao_entrega,
    construtora,
    descricao_breve, descricao_completa, descricao_unidades,
    seo_title, seo_description,
    ordem
  ) values (
    'reserva-jade-vinhedo',
    'Reserva Jade Vinhedo',
    'apartamento',
    'lancamento',
    'inativo',
    'Capela', 'Vinhedo', 'SP',
    'Rua das Acácias, 480 — Capela, Vinhedo/SP',
    '13280000',
    68.00, 142.00,
    2, 3,
    2, 4,
    1, 3,
    780000.00, 'Dez/2027',
    'Construtora Exemplo',
    'Apartamentos de 68 a 142 m² na Capela, a cinco minutos do centro de Vinhedo.',
    'O Reserva Jade nasce de um terreno de 6.200 m² na Capela, com 62% de área permeável preservada e mata nativa mantida no fundo do lote. São duas torres de dez pavimentos, quatro apartamentos por andar, sem unidades voltadas para a via. A implantação privilegia ventilação cruzada em todas as tipologias e orientação solar nordeste nas suítes.

O projeto de arquitetura trabalha com estrutura aparente em concreto e caixilhos de piso a teto, sem sacadas em vidro colorido. O paisagismo aproveita o desnível natural do terreno em três platôs, ligados por um percurso de pedestres independente do acesso de veículos.',
    'As plantas partem de 68 m² com dois dormitórios e chegam a 142 m² com três suítes e living integrado ampliado. Todas têm cozinha com previsão de ilha, lavanderia separada e ponto de ar-condicionado nos dormitórios. As unidades de cobertura têm laje técnica preparada para piscina e churrasqueira.',
    'Reserva Jade Vinhedo — Apartamentos de 68 a 142 m² na Capela | RT Capital Imobiliário',
    'Lançamento na Capela, Vinhedo: apartamentos de 68 a 142 m², 2 e 3 dormitórios, a partir de R$ 780.000. Entrega prevista para Dez/2027. Fale com Rafael Teixeira.',
    1
  )
  returning id
)
-- ---------------------------------------------------------------------
-- Galeria — placeholders apontando para assets locais já existentes
-- ---------------------------------------------------------------------
, imagens as (
  insert into public.imovel_imagens (imovel_id, url, ambiente, grupo, ordem, destaque)
  select novo.id, v.url, v.ambiente, v.grupo, v.ordem, v.destaque
  from novo, (values
    ('/images/background.jpg',        'Fachada vista da Rua das Acácias', 'empreendimento', 0, true),
    ('/images/blog-background.jpg',   'Piscina e deck',                   'empreendimento', 1, false),
    ('/images/card-home-equity.jpg',  'Praça central entre as torres',    'empreendimento', 2, false),
    ('/images/card-financiamento.jpg','Living do decorado de 68 m²',      'decorado',       0, false),
    ('/images/card-home-equity.jpg',  'Suíte do decorado de 68 m²',       'decorado',       1, false),
    ('/images/card-financiamento.jpg','Planta 68 m² — 2 dormitórios',     'planta',         0, false)
  ) as v(url, ambiente, grupo, ordem, destaque)
)
-- ---------------------------------------------------------------------
-- Quadro de áreas
-- ---------------------------------------------------------------------
, tipologias as (
  insert into public.imovel_tipologias
    (imovel_id, nome, area, dormitorios, suites, banheiros, vagas, valor_a_partir_de, ordem)
  select novo.id, v.nome, v.area, v.dorm, v.suites, v.banh, v.vagas, v.valor, v.ordem
  from novo, (values
    ('2 dormitórios',            68.00,  2, 1, 2, 1,  780000.00, 0),
    ('3 dormitórios',            94.00,  3, 1, 3, 2,  980000.00, 1),
    ('3 suítes — cobertura',    142.00,  3, 3, 4, 3, 1640000.00, 2)
  ) as v(nome, area, dorm, suites, banh, vagas, valor, ordem)
)
-- ---------------------------------------------------------------------
-- Lazer e diferenciais. `icone` = slug do catálogo em
-- components/imoveis/icones.tsx.
-- ---------------------------------------------------------------------
, diferenciais as (
  insert into public.imovel_diferenciais (imovel_id, grupo, nome, icone, ordem)
  select novo.id, v.grupo, v.nome, v.icone, v.ordem
  from novo, (values
    ('lazer',       'Piscina com raia de 25 m',        'piscina',       0),
    ('lazer',       'Academia equipada',                'academia',      1),
    ('lazer',       'Salão de festas com cozinha',      'salao-festas',  2),
    ('lazer',       'Playground',                       'playground',    3),
    ('lazer',       'Churrasqueiras cobertas',          'churrasqueira', 4),
    ('lazer',       'Espaço coworking',                 'coworking',     5),
    ('lazer',       'Pet place',                        'pet-place',     6),
    ('lazer',       'Quadra poliesportiva',             'quadra',        7),
    ('lazer',       'Sauna com descanso',               'sauna',         8),
    ('diferencial', 'Portaria 24 horas',                'portaria',      0),
    ('diferencial', 'Bicicletário coberto',             'bicicletario',  1),
    ('diferencial', 'Dois elevadores por torre',        'elevador',      2),
    ('diferencial', '62% de área permeável',            'area-verde',    3),
    ('diferencial', 'Medição individual de água',       'agua',          4),
    ('diferencial', 'Infraestrutura para carro elétrico','carro-eletrico', 5)
  ) as v(grupo, nome, icone, ordem)
)
-- ---------------------------------------------------------------------
-- FAQ — alimenta o accordion e o JSON-LD FAQPage
-- ---------------------------------------------------------------------
insert into public.imovel_faqs (imovel_id, pergunta, resposta, ordem)
select novo.id, v.pergunta, v.resposta, v.ordem
from novo, (values
  ('Qual o valor de entrada do Reserva Jade Vinhedo?',
   'A entrada é negociada caso a caso e costuma ficar entre 20% e 30% do valor da unidade, parcelável até a entrega das chaves. O saldo é financiado com o banco que apresentar a melhor condição para o seu perfil — a análise multibanco é feita sem custo.',
   0),
  ('Dá para financiar ainda na planta?',
   'Sim. O financiamento é contratado na entrega das chaves, mas a aprovação de crédito pode (e deve) ser feita antes, para você saber exatamente o valor que consegue tomar antes de assinar o contrato de compra.',
   1),
  ('Qual a previsão de entrega?',
   'Dezembro de 2027. A previsão é contratual e acompanha o cronograma de obra registrado no memorial de incorporação.',
   2),
  ('Posso usar o FGTS na compra?',
   'Depende do valor da unidade e do seu enquadramento nas regras do SBPE. Nas tipologias de 68 m² o uso de FGTS costuma ser viável; nas coberturas, normalmente não. Avaliamos isso na análise preliminar.',
   3)
) as v(pergunta, resposta, ordem);

-- =====================================================================
-- FIM — 009_seed_imovel_exemplo.sql
-- Confira com:
--   select titulo, status, fase from public.imoveis where slug = 'reserva-jade-vinhedo';
-- =====================================================================
