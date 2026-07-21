/* Preenche os 3 cards de "relacionados" da mesma categoria do artigo atual.
   A página do artigo declara window.ARTIGO_ATUAL = {slug, categoria}. */
(function(){
  var atual = {slug: document.body.dataset.artigoSlug, categoria: document.body.dataset.artigoCategoria};
  var POSTS = window.BLOG_POSTS || [];
  var CATS = window.BLOG_CATEGORIAS || {};
  var box = document.getElementById('relacionados-grade');
  if(!box) return;

  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function corCat(cat){ return (CATS[cat] && CATS[cat].cor) || 'var(--areia)'; }

  function card(p){
    return '<a class="post-card" href="/blog/'+esc(p.slug)+'/">'
      + '<div class="post-card-img">'
      +   (p.imagem ? '<img src="'+esc(p.imagem)+'" alt="" onerror="this.remove()">' : '')
      +   '<span class="post-cat" style="--c:'+corCat(p.categoria)+'">'+esc(p.categoria)+'</span>'
      +   '<span class="post-seta" aria-hidden="true">\u2192</span>'
      + '</div>'
      + '<div class="post-card-corpo">'
      +   '<span class="post-data">'+esc(p.data)+'</span>'
      +   '<h3>'+esc(p.titulo)+'</h3>'
      +   '<span class="post-leiamais">Leia mais \u2192</span>'
      + '</div></a>';
  }

  // mesma categoria, excluindo o próprio; completa com recentes de outras se faltar
  var mesma = POSTS.filter(function(p){ return p.categoria===atual.categoria && p.slug!==atual.slug; });
  var outras = POSTS.filter(function(p){ return p.categoria!==atual.categoria && p.slug!==atual.slug; });
  var sel = mesma.concat(outras).slice(0,3);

  if(!sel.length){ document.getElementById('relacionados').style.display='none'; return; }
  box.innerHTML = sel.map(card).join('');
})();
