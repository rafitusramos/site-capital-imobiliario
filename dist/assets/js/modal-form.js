/* Motor genérico do modal de captação em 3 etapas.
   Cada página define window.PAGE_FORM antes deste arquivo:
   {
     nomes:            ['Etapa 1…','Etapa 2…','Etapa 3…'],
     blocos:           [[ids campo bloco0], [bloco1], [bloco2]],
     mascaras:         { 'f-id': 'moeda'|'telefone'|'cpf'|'cep'|'num'|'numDec' },
     validadores:      { 'c-id': () => boolean },
     camposExtras:     (bloco) => [ids extras obrigatórios]   // opcional
     preencher:        () => void                             // opcional, pré-preenche ao abrir
     aoIniciar:        () => void                             // opcional, lógica extra da página
     montarLead:       () => objeto enviado ao endpoint
     eventoEnvio:      (lead) => params do evento GA4 'enviou_formulario'
   } */
(function(){
  const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbxuABmq_M76FZ7kBL4NaWpaKhHtNcRkVOBcza1OMbUCxKtOMqVBmmmGEHtHMCebzMYp/exec";
  const cfg = window.PAGE_FORM;
  const scrim = document.getElementById('scrim');
  if(!cfg || !scrim) return;

  const painel = document.getElementById('painel');
  const form = document.getElementById('formLead');
  const trilho = document.getElementById('trilho');
  const btnProximo = document.getElementById('btnProximo');
  const btnVoltar = document.getElementById('btnVoltar');
  const btnEnviar = document.getElementById('btnEnviar');
  const etapaNome = document.getElementById('etapaNome');
  let passo = 0, ultimoFoco = null;

  /* ---- abertura e fechamento ---- */
  function abrirForm(){
    ultimoFoco = document.activeElement;
    scrim.classList.add('aberto');
    irPara(0);
    const veioDoSimulador = !!window.__simValorImovel;
    if(cfg.preencher) cfg.preencher();
    evento('abriu_formulario', {origem: veioDoSimulador ? 'simulador' : 'direto'});
    document.getElementById('f-nome').focus();
  }
  function fecharForm(){
    scrim.classList.remove('aberto'); painel.classList.remove('enviado'); irPara(0);
    if(ultimoFoco) ultimoFoco.focus();
  }
  document.querySelectorAll('.js-abrir-form').forEach(b=>b.addEventListener('click',e=>{ e.preventDefault(); abrirForm(); }));
  document.querySelectorAll('.js-ir-simulador').forEach(b=>b.addEventListener('click',e=>{
    e.preventDefault();
    const s = document.getElementById('simulador');
    if(s) s.scrollIntoView({behavior:'smooth', block:'start'});
  }));
  document.getElementById('btnFechar').addEventListener('click', fecharForm);
  scrim.addEventListener('click', e=>{ if(e.target===scrim) fecharForm(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && scrim.classList.contains('aberto')) fecharForm(); });

  /* ---- focus trap ---- */
  painel.addEventListener('keydown', e=>{
    if(e.key!=='Tab') return;
    const foco = painel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])');
    const visiveis = [...foco].filter(el=>el.offsetParent!==null && !el.closest('[inert]'));
    if(!visiveis.length) return;
    const primeiro = visiveis[0], ultimo = visiveis[visiveis.length-1];
    if(e.shiftKey && document.activeElement===primeiro){ e.preventDefault(); ultimo.focus(); }
    else if(!e.shiftKey && document.activeElement===ultimo){ e.preventDefault(); primeiro.focus(); }
  });
  (function(){ const w=document.querySelector('.trilho-wrap'); if(w) w.addEventListener('scroll',()=>{ if(w.scrollLeft!==0) w.scrollLeft=0; }); })();

  /* ---- navegação entre blocos ---- */
  function irPara(n, focar){
    passo = n;
    trilho.style.transform = 'translateX(-'+(n*33.3333)+'%)';
    etapaNome.textContent = cfg.nomes[n];
    document.querySelectorAll('.progresso .terco').forEach((t,i)=>{
      t.classList.toggle('feito', i<n);
      t.classList.toggle('atual', i===n);
    });
    btnVoltar.classList.toggle('visivel', n>0);
    const ultimo = n===2;
    btnProximo.style.display = ultimo ? 'none' : 'inline-flex';
    btnEnviar.style.display = ultimo ? 'inline-flex' : 'none';
    document.querySelectorAll('.bloco').forEach(bl=>{
      const ativo = Number(bl.dataset.bloco)===n;
      bl.inert = !ativo;
      bl.setAttribute('aria-hidden', ativo ? 'false' : 'true');
    });
    const w = document.querySelector('.trilho-wrap');
    if(w) w.scrollLeft = 0;
    if(focar){
      const primeiro = trilho.querySelector('.bloco[data-bloco="'+n+'"] input, .bloco[data-bloco="'+n+'"] select');
      if(primeiro) primeiro.focus();
    }
  }

  /* ---- máscaras declarativas ---- */
  const MASCARAS = {
    moeda(el){ el.addEventListener('input', e=>{
      const d = e.target.value.replace(/\D/g,'').slice(0,12);
      e.target.value = d ? 'R$ ' + Number(d).toLocaleString('pt-BR') : '';
    }); },
    telefone(el){ el.addEventListener('input', e=>{
      const d = e.target.value.replace(/\D/g,'').slice(0,11); let v=d;
      if(d.length>2) v='('+d.slice(0,2)+') '+d.slice(2);
      if(d.length>7) v='('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
      e.target.value=v;
    }); },
    cpf(el){ el.addEventListener('input', e=>{
      const d = e.target.value.replace(/\D/g,'').slice(0,11); let v=d;
      if(d.length>3) v=d.slice(0,3)+'.'+d.slice(3);
      if(d.length>6) v=d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6);
      if(d.length>9) v=d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
      e.target.value=v;
    }); },
    cep(el){ el.addEventListener('input', e=>{
      const d = e.target.value.replace(/\D/g,'').slice(0,8);
      e.target.value = d.length>5 ? d.slice(0,5)+'-'+d.slice(5) : d;
    }); },
    num(el){ el.addEventListener('input', e=>{ e.target.value = e.target.value.replace(/\D/g,''); }); },
    uf(el){ el.addEventListener('input', e=>{ e.target.value = e.target.value.replace(/[^a-zA-Z]/g,'').slice(0,2).toUpperCase(); }); },
    numDec(el){ el.addEventListener('input', e=>{ e.target.value = e.target.value.replace(/[^\d.,]/g,''); }); }
  };
  Object.entries(cfg.mascaras || {}).forEach(([id, tipo])=>{
    const el = document.getElementById(id);
    if(el && MASCARAS[tipo]) MASCARAS[tipo](el);
  });

  /* ---- validação ---- */
  function val(id){
    const cond = cfg.validadores[id];
    const ok = cond ? cond() : true;
    document.getElementById(id).classList.toggle('invalido', !ok);
    return ok;
  }
  function validaBloco(n){
    let ok = true, primeiro = null;
    const campos = cfg.blocos[n].slice();
    if(cfg.camposExtras) campos.push(...cfg.camposExtras(n));
    campos.forEach(id=>{ if(!val(id)){ ok=false; if(!primeiro) primeiro=id; } });
    if(primeiro) document.querySelector('#'+primeiro+' input, #'+primeiro+' select')?.focus();
    return ok;
  }

  btnProximo.addEventListener('click', ()=>{
    if(!validaBloco(passo)) return;
    const proximo = passo+1;
    if(proximo===1) evento('avancou_etapa_2');
    if(proximo===2) evento('avancou_etapa_3');
    irPara(proximo, true);
  });
  btnVoltar.addEventListener('click', ()=>{ if(passo>0) irPara(passo-1, true); });

  /* ---- envio ---- */
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    if(!validaBloco(2)) return;
    btnEnviar.disabled = true; btnEnviar.textContent = 'Enviando…';
    const lead = cfg.montarLead();
    lead.data = new Date().toISOString();
    try{
      if(LEAD_ENDPOINT){
        await fetch(LEAD_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(lead)});
      }else{
        console.warn('LEAD_ENDPOINT não configurado — lead não gravado:', lead);
      }
      evento('enviou_formulario', cfg.eventoEnvio(lead));
      painel.classList.add('enviado');
    }catch(err){
      console.error(err);
      evento('enviou_formulario', Object.assign(cfg.eventoEnvio(lead), {obs:'fetch_error'}));
      painel.classList.add('enviado');
    }finally{
      btnEnviar.disabled = false; btnEnviar.textContent = 'Enviar solicitação';
    }
  });

  if(cfg.aoIniciar) cfg.aoIniciar();
})();
