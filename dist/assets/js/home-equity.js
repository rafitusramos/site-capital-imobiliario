/* Página /home_equity — configuração do formulário + simulador (Tabela Price). */
(function(){
  const F = window.Financeiro;
  const g = id => document.getElementById(id).value;

  /* ===== CONFIGURAÇÃO DO FORMULÁRIO ===== */
  window.PAGE_FORM = {
    nomes: ['Etapa 1 de 3 · Dados pessoais','Etapa 2 de 3 · Renda','Etapa 3 de 3 · Imóvel'],
    blocos: [
      ['c-nome','c-cpf','c-tel','c-email'],
      ['c-renda','c-remun','c-objetivo'],
      ['c-tipo','c-cep','c-num','c-area','c-valor']
    ],
    mascaras: {
      'f-valor':'moeda', 'f-renda':'moeda', 'f-saldo':'moeda',
      'f-tel':'telefone', 'f-cpf':'cpf', 'f-cep':'cep', 'f-area':'numDec', 'f-num':'num'
    },
    validadores: {
      'c-nome':   ()=>g('f-nome').trim().split(/\s+/).length>=2,
      'c-cpf':    ()=>F.cpfValido(g('f-cpf')),
      'c-tel':    ()=>g('f-tel').replace(/\D/g,'').length>=10,
      'c-email':  ()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('f-email').trim()),
      'c-renda':  ()=>g('f-renda').replace(/\D/g,'').length>=3,
      'c-remun':  ()=>!!g('f-remun'),
      'c-objetivo':()=>!!g('f-objetivo'),
      'c-tipo':   ()=>!!g('f-tipo'),
      'c-cep':    ()=>g('f-cep').replace(/\D/g,'').length===8,
      'c-num':    ()=>g('f-num').trim().length>=1,
      'c-area':   ()=>g('f-area').replace(/\D/g,'').length>=1,
      'c-valor':  ()=>g('f-valor').replace(/\D/g,'').length>=5,
      'c-saldo':  ()=>g('f-saldo').replace(/\D/g,'').length>=4
    },
    /* saldo devedor só é obrigatório quando o imóvel NÃO está quitado */
    camposExtras(n){
      return (n===2 && !document.getElementById('c-saldo').hidden) ? ['c-saldo'] : [];
    },
    preencher(){
      const fv = document.getElementById('f-valor');
      if(fv && !fv.value && window.__simValorImovel){ fv.value = window.__simValorImovel; }
    },
    /* switch "Imóvel quitado" (padrão: Sim). Ao marcar "Não", abre saldo devedor. */
    aoIniciar(){
      const sw = document.getElementById('f-quitado');
      const txt = document.getElementById('quitadoTxt');
      const saldoCampo = document.getElementById('c-saldo');
      const saldoInput = document.getElementById('f-saldo');
      function setQuitado(quitado){
        sw.setAttribute('aria-checked', quitado?'true':'false');
        txt.textContent = quitado?'Sim':'Não';
        if(quitado){
          saldoCampo.hidden = true;
          saldoInput.value = '';
          saldoCampo.classList.remove('invalido');
        }else{
          saldoCampo.hidden = false;
        }
      }
      sw.addEventListener('click', ()=> setQuitado(sw.getAttribute('aria-checked')==='false'));
      setQuitado(true);
    },
    montarLead(){
      return {
        nome:g('f-nome').trim(), cpf:g('f-cpf'), telefone:g('f-tel'), email:g('f-email').trim(),
        renda:g('f-renda'), tipo_remuneracao:g('f-remun'), objetivo_credito:g('f-objetivo'),
        tipo_imovel:g('f-tipo'), cep:g('f-cep'), numero:g('f-num'), area_m2:g('f-area'), valor_imovel:g('f-valor'),
        imovel_quitado: document.getElementById('f-quitado').getAttribute('aria-checked')==='true' ? 'Sim' : 'Não',
        saldo_devedor: document.getElementById('c-saldo').hidden ? '' : g('f-saldo'),
        origem:'lp-home-equity', aba:'Home Equity'
      };
    },
    eventoEnvio(lead){
      return {objetivo_credito: lead.objetivo_credito, tipo_imovel: lead.tipo_imovel, funil:'home_equity'};
    }
  };

  /* ===== SIMULADOR ===== */
  const LTV = 0.60;            /* teto de crédito: 60% do valor do imóvel */
  const TAXA_MENSAL = 0.0109;  /* referência interna 1,09% a.m. (≈13,9% a.a.), não exibida */

  const elValor = document.getElementById('sim-valor');
  const elPrazo = document.getElementById('sim-prazo');
  const elPrazoVal = document.getElementById('sim-prazo-val');
  const elCredito = document.getElementById('sim-credito');
  const elParcela = document.getElementById('sim-parcela');
  const elParcelaSub = document.getElementById('sim-parcela-sub');
  if(!elValor) return;

  function calcular(){
    const valor = F.digitos(elValor.value);
    const prazo = Number(elPrazo.value);
    const credito = Math.round(valor * LTV);
    const parcela = credito>0 ? Math.round(F.parcelaPrice(credito, TAXA_MENSAL, prazo)) : 0;

    elCredito.innerHTML = F.brl(credito) + '<span class="lote"></span>';
    elParcela.innerHTML = F.brl(parcela) + '<span style="font-size:.5em">/mês</span>';
    elParcelaSub.textContent = 'Estimativa em ' + prazo + ' meses · taxa sujeita a análise';
    elPrazoVal.textContent = prazo + ' meses';

    window.__simValorImovel = valor ? 'R$ ' + valor.toLocaleString('pt-BR') : '';
  }

  let jaInteragiu = false;
  function marcarInteracao(){ if(!jaInteragiu){ jaInteragiu=true; evento('abriu_simulador'); } }

  elValor.addEventListener('input', ()=>{
    marcarInteracao();
    const d = F.digitos(elValor.value).toString().slice(0,12);
    elValor.value = Number(d) ? 'R$ ' + Number(d).toLocaleString('pt-BR') : '';
    calcular();
  });
  elPrazo.addEventListener('input', ()=>{ marcarInteracao(); calcular(); });

  const btnSimCta = document.getElementById('sim-whats');
  if(btnSimCta){
    btnSimCta.addEventListener('click', ()=>{
      evento('simulou_e_clicou_cta', {
        valor_imovel: elValor.value,
        prazo_meses: elPrazo.value,
        credito_estimado: elCredito.textContent
      });
    });
  }

  calcular();
})();
