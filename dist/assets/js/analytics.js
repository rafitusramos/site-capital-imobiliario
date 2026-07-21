/* GA4 — inicialização e helper de eventos tolerante a falha (adblock etc.). */
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-N5PFHEHGZ6');
function evento(nome, params){
  try{ if(typeof gtag === 'function') gtag('event', nome, params || {}); }catch(e){}
}
