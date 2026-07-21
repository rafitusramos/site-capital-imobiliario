/* Menu em árvore "Soluções de Crédito": toque/clique no mobile, hover no desktop (via CSS). */
(function(){
  document.querySelectorAll('.nav-drop').forEach(drop=>{
    const btn = drop.querySelector('.nav-drop-btn');
    if(!btn) return;
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const aberto = drop.classList.toggle('aberto');
      btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    document.addEventListener('click', e=>{
      if(!drop.contains(e.target)){ drop.classList.remove('aberto'); btn.setAttribute('aria-expanded','false'); }
    });
    drop.addEventListener('keydown', e=>{
      if(e.key==='Escape'){ drop.classList.remove('aberto'); btn.setAttribute('aria-expanded','false'); btn.focus(); }
    });
  });
})();
