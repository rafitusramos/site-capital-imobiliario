/* Página inicial — evento de clique nos cards de produto. */
(function(){
  document.querySelectorAll('.card[data-produto]').forEach(card=>{
    card.addEventListener('click', ()=>{
      evento('clicou_card', {produto: card.dataset.produto});
    });
  });
})();
