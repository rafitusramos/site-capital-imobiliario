/* Fade-in de baixo conforme as seções entram na viewport.
   Sem JS, .reveal fica visível por padrão. */
(function(){
  const alvos = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){
    return; /* deixa tudo visível */
  }
  document.body.classList.add('reveal-ativo');
  const obs = new IntersectionObserver((entradas)=>{
    entradas.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visivel'); obs.unobserve(e.target); } });
  },{threshold:0.12, rootMargin:'0px 0px -8% 0px'});
  alvos.forEach(el=>obs.observe(el));
  setTimeout(()=>alvos.forEach(el=>el.classList.add('visivel')), 3000);
})();
