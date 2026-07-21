# Site Capital Imobiliário — estrutura v2

## Árvore de publicação (conteúdo de `dist/` vai para a raiz do domínio)
```
/                       home institucional (cards de produto)
/financiamento/         LP financiamento SBPE
/home_equity/           LP home equity
/sobre.html             sobre
/assets/css/            lp.css (design system) · home.css (cards da home)
/assets/js/             analytics · reveal · nav · financeiro · modal-form · <página>.js
/images/                background.jpg · rafael-teixeira.jpg · card-*.jpg (opcionais)
/.htaccess              301 de /financiamento.html -> /financiamento/
```

## Manutenção
- **Lógica financeira** (Price, SAC, CPF): apenas em `assets/js/financeiro.js` (funções puras).
- **Formulário de captação**: motor único em `assets/js/modal-form.js`; cada LP só declara
  sua configuração (campos, validadores, payload) em `financiamento.js` / `home-equity.js`.
- **Endpoint dos leads**: definido uma única vez, no topo de `modal-form.js`.
- **Fotos dos cards da home**: suba `images/card-financiamento.jpg` e `images/card-home-equity.jpg`
  (proporção 16:10). Sem elas, o card usa o degradê da marca como fallback.

## Testes
```
node --test tests/financeiro.test.js        # 9 testes — matemática dos simuladores e CPF
python3 -m unittest tests.test_estrutura -v # 13 testes — árvore, scripts externos, nav, SEO, forms
```
Rodar sempre antes de publicar qualquer alteração.
