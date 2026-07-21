/* Renderiza a página índice do blog a partir de window.BLOG_POSTS:
   - matéria em destaque (primeira com destaque:true, ou a mais recente)
   - grade de cards com filtro por categoria
   - "carregar mais" revelando +6 por vez (grade inicial: 9 = 3x3) */
(function(){
  var POSTS = window.BLOG_POSTS || [];
  var CATS = window.BLOG_CATEGORIAS || {};
  var GRADE_INICIAL = 9;   // 3x3 além do destaque
  var PASSO = 6;           // "carregar mais"

  var elDestaque = document.getElementById('blog-destaque');
  var elGrade = document.getElementById('blog-grade');
  var elFiltro = document.getElementById('blog-filtro');
  var elMais = document.getElementById('blog-mais');
  if(!elGrade) return;

  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function corCat(cat){ return (CATS[cat] && CATS[cat].cor) || 'var(--areia)'; }

  // matéria em destaque = primeira com destaque:true; fallback: primeira da lista
  var destaque = POSTS.filter(function(p){return p.destaque;})[0] || POSTS[0];
  var listaGrade = POSTS.filter(function(p){return p !== destaque;});

  function cardDestaque(p){
    return '<a class="post-destaque" href="/blog/'+esc(p.slug)+'/">'
      + '<div class="post-card-img">'
      +   (p.imagem ? '<img src="'+esc(p.imagem)+'" alt="" onerror="this.remove()">' : '')
      +   '<span class="post-cat" style="--c:'+corCat(p.categoria)+'">'+esc(p.categoria)+'</span>'
      +   '<span class="post-seta" aria-hidden="true">\u2192</span>'
      + '</div>'
      + '<div class="post-card-corpo">'
      +   '<span class="selo-novo">\u00daltima publica\u00e7\u00e3o</span>'
      +   '<h2>'+esc(p.titulo)+'</h2>'
      +   '<p>'+esc(p.resumo)+'</p>'
      +   '<span class="post-data">'+esc(p.data)+'</span>'
      +   '<span class="post-leiamais">Leia mais \u2192</span>'
      + '</div></a>';
  }

  function card(p){
    return '<a class="post-card" data-cat="'+esc(p.categoria)+'" href="/blog/'+esc(p.slug)+'/">'
      + '<div class="post-card-img">'
      +   (p.imagem ? '<img src="'+esc(p.imagem)+'" alt="" onerror="this.remove()">' : '')
      +   '<span class="post-cat" style="--c:'+corCat(p.categoria)+'">'+esc(p.categoria)+'</span>'
      +   '<span class="post-seta" aria-hidden="true">\u2192</span>'
      + '</div>'
      + '<div class="post-card-corpo">'
      +   '<span class="post-data">'+esc(p.data)+'</span>'
      +   '<h3>'+esc(p.titulo)+'</h3>'
      +   '<p>'+esc(p.resumo)+'</p>'
      +   '<span class="post-leiamais">Leia mais \u2192</span>'
      + '</div></a>';
  }

  var filtroAtivo = 'Todos';
  var visiveis = GRADE_INICIAL;

  function filtradas(){
    return filtroAtivo==='Todos' ? listaGrade : listaGrade.filter(function(p){return p.categoria===filtroAtivo;});
  }

  function render(){
    // destaque só aparece no filtro "Todos" (ou se casar com a categoria)
    if(elDestaque){
      var mostraDestaque = destaque && (filtroAtivo==='Todos' || destaque.categoria===filtroAtivo);
      elDestaque.innerHTML = mostraDestaque ? cardDestaque(destaque) : '';
    }
    var lista = filtradas();
    if(!lista.length && !(elDestaque && elDestaque.innerHTML)){
      elGrade.innerHTML = '<div class="blog-vazio">Nenhuma mat\u00e9ria nesta categoria ainda.</div>';
      elMais.style.display = 'none';
      return;
    }
    elGrade.innerHTML = lista.slice(0, visiveis).map(card).join('');
    elMais.style.display = (lista.length > visiveis) ? 'flex' : 'none';
  }

  // filtro
  if(elFiltro){
    var cats = ['Todos'].concat(Object.keys(CATS));
    elFiltro.innerHTML = cats.map(function(c,i){
      return '<button type="button" class="'+(i===0?'ativo':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>';
    }).join('');
    elFiltro.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      filtroAtivo = b.dataset.cat; visiveis = GRADE_INICIAL;
      elFiltro.querySelectorAll('button').forEach(function(x){ x.classList.toggle('ativo', x===b); });
      if(typeof evento==='function') evento('blog_filtro', {categoria: filtroAtivo});
      render();
    });
  }

  elMais.querySelector('button').addEventListener('click', function(){
    visiveis += PASSO;
    if(typeof evento==='function') evento('blog_carregar_mais', {visiveis: visiveis});
    render();
  });

  render();
})();
