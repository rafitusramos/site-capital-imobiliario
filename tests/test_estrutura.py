"""Testes estruturais do site (unittest) — validam a árvore nova, a separação
de scripts, a navegação e a consistência de SEO. Rodar da raiz do projeto:
    python3 -m unittest tests.test_estrutura -v
"""
import os, re, unittest
from html.parser import HTMLParser

DIST = os.path.join(os.path.dirname(__file__), '..', 'dist')
PAGINAS = ['index.html', 'sobre.html',
           os.path.join('financiamento','index.html'),
           os.path.join('home_equity','index.html'),
           os.path.join('blog','index.html'),
           os.path.join('blog','home-equity-empresario-capital-de-giro','index.html')]

def ler(rel):
    with open(os.path.join(DIST, rel), encoding='utf-8') as f:
        return f.read()

class ParserBalanceado(HTMLParser):
    VOID = {'meta','link','input','img','br','hr','source','area','base','col','embed','track','wbr'}
    def __init__(self):
        super().__init__(); self.stack=[]; self.erros=[]
    def handle_starttag(self, t, a):
        if t not in self.VOID: self.stack.append(t)
    def handle_endtag(self, t):
        if t in self.VOID: return
        if self.stack and self.stack[-1]==t: self.stack.pop()
        elif t in self.stack:
            while self.stack and self.stack[-1]!=t: self.erros.append('não fechada: '+self.stack.pop())
            self.stack.pop()
        else: self.erros.append('fechamento órfão: '+t)

class TestArvoreDeArquivos(unittest.TestCase):
    def test_paginas_existem(self):
        for p in PAGINAS + ['sitemap.xml','robots.txt','.htaccess']:
            self.assertTrue(os.path.isfile(os.path.join(DIST,p)), p)

    def test_assets_existem(self):
        for a in ['assets/css/lp.css','assets/css/home.css',
                  'assets/js/analytics.js','assets/js/reveal.js','assets/js/nav.js',
                  'assets/js/financeiro.js','assets/js/modal-form.js',
                  'assets/js/home.js','assets/js/home-equity.js','assets/js/financiamento.js']:
            self.assertTrue(os.path.isfile(os.path.join(DIST,a)), a)

class TestHTML(unittest.TestCase):
    def test_html_balanceado(self):
        for p in PAGINAS:
            par = ParserBalanceado(); par.feed(ler(p))
            self.assertEqual(par.stack, [], f'{p}: tags pendentes {par.stack}')
            self.assertEqual(par.erros, [], f'{p}: {par.erros[:3]}')

    def test_sem_scripts_inline(self):
        """Todo <script> deve ter src ou ser JSON-LD — nenhuma lógica inline."""
        for p in PAGINAS:
            for m in re.finditer(r'<script([^>]*)>', ler(p)):
                attrs = m.group(1)
                self.assertTrue('src=' in attrs or 'application/ld+json' in attrs,
                                f'{p}: script inline encontrado ({attrs.strip()[:60]})')

    def test_lps_sem_style_inline(self):
        for p in ['index.html', os.path.join('financiamento','index.html'),
                  os.path.join('home_equity','index.html')]:
            self.assertNotIn('<style>', ler(p), f'{p} deve usar CSS externo')

class TestNavegacao(unittest.TestCase):
    def test_dropdown_em_todas_as_paginas(self):
        for p in PAGINAS:
            h = ler(p)
            self.assertIn('Soluções de Crédito', h, p)
            self.assertIn('href="/financiamento/"', h, p)
            self.assertIn('href="/home_equity/"', h, p)
            self.assertIn('nav.js', h, p)

    def test_links_e_assets_locais_resolvem(self):
        padrao = re.compile(r'(?:href|src)="(/[^"#]*)"')
        for p in PAGINAS:
            for url in padrao.findall(ler(p)):
                alvo = url.lstrip('/').split('?')[0]  # remove query string (?v=N de cache-busting)
                if alvo == '': alvo = 'index.html'
                if alvo.endswith('/'): alvo += 'index.html'
                caminho = os.path.join(DIST, alvo)
                # imagens de card e de blog são opcionais (fallback via onerror)
                if 'card-' in alvo or alvo.startswith('images/blog/'): continue
                self.assertTrue(os.path.isfile(caminho), f'{p}: link quebrado {url}')

class TestSEO(unittest.TestCase):
    CANONICOS = {
        'index.html': 'https://rtcapitalimobiliario.com.br/',
        os.path.join('financiamento','index.html'): 'https://rtcapitalimobiliario.com.br/financiamento/',
        os.path.join('home_equity','index.html'): 'https://rtcapitalimobiliario.com.br/home_equity/',
    }
    def test_canonicos(self):
        for p, url in self.CANONICOS.items():
            self.assertIn(f'<link rel="canonical" href="{url}">', ler(p), p)

    def test_sitemap_cobre_arvore(self):
        s = ler('sitemap.xml')
        for url in ['https://rtcapitalimobiliario.com.br/',
                    'https://rtcapitalimobiliario.com.br/financiamento/',
                    'https://rtcapitalimobiliario.com.br/home_equity/',
                    'https://rtcapitalimobiliario.com.br/sobre.html']:
            self.assertIn(f'<loc>{url}</loc>', s, url)
        self.assertNotIn('financiamento.html', s)

    def test_redirect_da_url_antiga(self):
        self.assertIn('Redirect 301 /financiamento.html /financiamento/', ler('.htaccess'))

class TestFormularios(unittest.TestCase):
    def test_config_de_pagina_casa_com_html(self):
        """Todo campo declarado em blocos/validadores do JS existe no HTML da LP."""
        casos = {
            os.path.join('financiamento','index.html'): 'assets/js/financiamento.js',
            os.path.join('home_equity','index.html'): 'assets/js/home-equity.js',
        }
        for pagina, js in casos.items():
            h, j = ler(pagina), ler(js)
            ids = set(re.findall(r"'(c-[a-z]+)'", j)) | set(re.findall(r"'(f-[a-z]+)'", j))
            for i in ids:
                self.assertIn(f'id="{i}"', h, f'{pagina}: id {i} usado em {js} não existe no HTML')

    def test_origem_dos_leads_distinta(self):
        self.assertIn("origem:'lp-financiamento-sbpe'", ler('assets/js/financiamento.js'))
        self.assertIn("origem:'lp-home-equity'", ler('assets/js/home-equity.js'))

    def test_endpoint_definido_em_um_unico_lugar(self):
        arquivos_com_endpoint = []
        for raiz,_,fs in os.walk(os.path.join(DIST,'assets','js')):
            for f in fs:
                if 'script.google.com' in open(os.path.join(raiz,f), encoding='utf-8').read():
                    arquivos_com_endpoint.append(f)
        self.assertEqual(arquivos_com_endpoint, ['modal-form.js'])

class TestAjustesFinanciamento(unittest.TestCase):
    """Regressão dos ajustes pedidos para /financiamento/ (LTV 90%, taxas 11,69-13,99%,
    simulador com novo padrão/step, e reestruturação do formulário)."""
    def setUp(self):
        self.h = ler(os.path.join('financiamento','index.html'))
        self.js = ler('assets/js/financiamento.js')

    def test_ltv_90_por_cento(self):
        self.assertIn('90%', self.h)
        self.assertIn('Santander Select', self.h)
        self.assertNotIn('80%</div>', self.h)

    def test_taxas_comparativas_atualizadas(self):
        for taxa in ['13,99%', '11,69%']:
            self.assertIn(taxa, self.h)
        self.assertNotIn('13,8%', self.h)
        self.assertNotIn('11,19%', self.h)

    def test_primeira_etapa_como_funciona_1_dia_util(self):
        self.assertIn('Até 1 dia útil', self.h)
        self.assertNotIn('Sem custo · 30 min', self.h)

    def test_simulador_valor_e_steps(self):
        self.assertIn('value="R$ 1.000.000"', self.h)
        self.assertIn('step="1" value="20"', self.h)
        self.assertIn('step="6" value="420"', self.h)

    def test_intro_e_resp_sem_max_width(self):
        css = ler('assets/css/lp.css') if False else None
        css_path = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets', 'css', 'lp.css')
        with open(css_path, encoding='utf-8') as f:
            css = f.read()
        self.assertNotIn('max-width:60ch', css)
        self.assertNotIn('max-width:56ch', css)
        self.assertNotIn('max-width:70ch', css)

    def test_formulario_reestruturado(self):
        # FGTS agora é switch, com padrão "Não"
        self.assertIn('id="f-fgts" class="switch"', self.h)
        self.assertIn('aria-checked="false"', self.h)
        # valor do imóvel migrou para o bloco 1 (etapa 2)
        bloco1 = self.h.split('data-bloco="1"')[1].split('data-bloco="2"')[0]
        self.assertIn('c-valor', bloco1)
        # cidade + estado na etapa 3, em grid 70/30
        bloco2 = self.h.split('data-bloco="2"')[1]
        self.assertIn('dupla-7030', bloco2)
        self.assertIn('c-estado', bloco2)
        # momento de compra: "Ainda procurando" é a primeira opção
        m = re.search(r'name="momento_compra"[^>]*>(.*?)</select>', self.h, re.S)
        primeira_opcao = re.findall(r'<option[^>]*>([^<]+)</option>', m.group(1))[1]  # [0] é "Selecione"
        self.assertEqual(primeira_opcao, 'Ainda procurando')

    def test_payload_com_aba_da_planilha(self):
        self.assertIn("aba:'Financiamento'", self.js)
        he_js = ler('assets/js/home-equity.js')
        self.assertIn("aba:'Home Equity'", he_js)


class TestSEOLocalVinhedo(unittest.TestCase):
    """Regressão do reforço de SEO local (Vinhedo) na LP de home equity."""
    def setUp(self):
        self.h = ler(os.path.join('home_equity','index.html'))

    def test_title_e_meta_mencionam_vinhedo(self):
        self.assertIn('<title>Home Equity em Vinhedo', self.h)
        self.assertIn('Vinhedo', self.h.split('<meta name="description"')[1][:200])

    def test_schema_com_area_served(self):
        bloco = self.h.split('application/ld+json')[1]
        self.assertIn('"areaServed"', bloco)
        self.assertIn('"Vinhedo"', bloco)

    def test_secao_regiao_presente(self):
        self.assertIn('id="regiao"', self.h)
        self.assertIn('Marambaia', self.h)
        for cidade in ['Vinhedo','Valinhos','Louveira','Jundiaí','Campinas','Itatiba','Indaiatuba','Sumaré']:
            self.assertIn(f'<span>{cidade}</span>', self.h)


class TestBlog(unittest.TestCase):
    """Estrutura do blog: índice, artigo, dados e nav."""
    INDICE = os.path.join('blog','index.html')
    ARTIGO = os.path.join('blog','home-equity-empresario-capital-de-giro','index.html')
    CATS_VALIDAS = {'Financiamento','Home Equity','Consórcio','Imóveis'}

    def test_paginas_e_assets_do_blog(self):
        for a in ['assets/js/posts.js','assets/js/blog-index.js','assets/js/blog-artigo.js',
                  'assets/css/blog.css','images/blog-background.jpg']:
            self.assertTrue(os.path.isfile(os.path.join(DIST,a)), a)

    def test_indice_tem_filtro_destaque_grade_e_mais(self):
        h = ler(self.INDICE)
        self.assertIn('id="blog-filtro"', h)
        self.assertIn('id="blog-destaque"', h)
        self.assertIn('id="blog-grade"', h)
        self.assertIn('id="blog-mais"', h)
        self.assertIn('Carregar mais', h)

    def test_hero_usa_imagem_de_referencia(self):
        css = None
        with open(os.path.join(DIST,'assets','css','blog.css'), encoding='utf-8') as f:
            css = f.read()
        self.assertIn("url('/images/blog-background.jpg')", css)

    def test_grade_inicial_9_e_passo_6(self):
        j = None
        with open(os.path.join(DIST,'assets','js','blog-index.js'), encoding='utf-8') as f:
            j = f.read()
        self.assertIn('GRADE_INICIAL = 9', j)
        self.assertIn('PASSO = 6', j)

    def test_posts_js_bem_formado(self):
        with open(os.path.join(DIST,'assets','js','posts.js'), encoding='utf-8') as f:
            src = f.read()
        # categorias declaradas na config batem com as válidas
        for c in self.CATS_VALIDAS:
            self.assertIn(f"'{c}'", src)
        # todo post tem os campos essenciais e data no formato dd-mm-yyyy
        for slug in re.findall(r"slug:\s*'([^']+)'", src):
            self.assertRegex(slug, r'^[a-z0-9-]+$')
        for data in re.findall(r"data:\s*'([^']+)'", src):
            self.assertRegex(data, r'^\d{2}-\d{2}-\d{4}$', f'data fora do formato dd-mm-yyyy: {data}')

    def test_artigo_tem_imagem_cta_e_relacionados(self):
        h = ler(self.ARTIGO)
        # imagem do artigo fica embutida no corpo do texto, não em hero de topo
        self.assertIn('class="artigo-imagem"', h)
        self.assertNotIn('class="artigo-hero"', h)
        self.assertIn('class="artigo-cta"', h)
        self.assertIn('id="relacionados-grade"', h)
        # CTA aponta direto para a seção do simulador na LP da categoria (home equity)
        self.assertIn('href="/home_equity/#simulador"', h)
        # dados do artigo no body para o motor de relacionados
        self.assertIn('data-artigo-categoria="Home Equity"', h)

    def test_cta_do_artigo_bate_com_a_categoria(self):
        # o CTA de fim de artigo é gerado dinamicamente por categoria (gerador-artigo.js);
        # este teste pega regressão para "home equity" (ou outra) vazando num artigo de
        # categoria diferente, como aconteceu quando o texto era fixo no template.
        pasta_blog = os.path.join(DIST, 'blog')
        categorias_de_credito = {'financiamento', 'home equity', 'consórcio'}
        for slug in sorted(os.listdir(pasta_blog)):
            caminho_rel = os.path.join('blog', slug, 'index.html')
            if not os.path.isfile(os.path.join(DIST, caminho_rel)):
                continue
            h = ler(caminho_rel)
            m_cat = re.search(r'data-artigo-categoria="([^"]+)"', h)
            m_cta = re.search(r'<div class="artigo-cta">.*?</div>', h, re.S)
            self.assertIsNotNone(m_cat, slug)
            self.assertIsNotNone(m_cta, slug)
            categoria = m_cat.group(1).lower()
            cta_texto = m_cta.group(0).lower()
            for outra in categorias_de_credito - {categoria}:
                self.assertNotIn(outra, cta_texto,
                    f'{slug}: CTA menciona "{outra}" mas a categoria do artigo é "{categoria}"')

    def test_blog_no_menu_de_todas_as_paginas(self):
        for p in PAGINAS:
            self.assertIn('href="/blog/"', ler(p), f'{p}: falta link Blog no menu')

    def test_sitemap_inclui_blog(self):
        s = ler('sitemap.xml')
        self.assertIn('https://rtcapitalimobiliario.com.br/blog/</loc>', s)


if __name__ == '__main__':
    unittest.main()
