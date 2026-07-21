/* Página /financiamento — configuração do formulário + simulador (SAC). */
(function(){
  const F = window.Financeiro;
  const g = id => document.getElementById(id).value;

  /* ===== CONFIGURAÇÃO DO FORMULÁRIO ===== */
  window.PAGE_FORM = {
    nomes: ['Etapa 1 de 3 · Dados pessoais','Etapa 2 de 3 · Renda e entrada','Etapa 3 de 3 · O imóvel'],
    blocos: [
      ['c-nome','c-cpf','c-tel','c-email'],
      ['c-renda','c-remun','c-entrada','c-valor'],
      ['c-situacao','c-tipo','c-cidade','c-estado']
    ],
    mascaras: {
      'f-valor':'moeda', 'f-renda':'moeda', 'f-entrada':'moeda',
      'f-tel':'telefone', 'f-cpf':'cpf', 'f-estado':'uf'
    },
    validadores: {
      'c-nome':    ()=>g('f-nome').trim().split(/\s+/).length>=2,
      'c-cpf':     ()=>F.cpfValido(g('f-cpf')),
      'c-tel':     ()=>g('f-tel').replace(/\D/g,'').length>=10,
      'c-email':   ()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('f-email').trim()),
      'c-renda':   ()=>g('f-renda').replace(/\D/g,'').length>=3,
      'c-remun':   ()=>!!g('f-remun'),
      'c-entrada': ()=>g('f-entrada').replace(/\D/g,'').length>=4,
      'c-valor':   ()=>g('f-valor').replace(/\D/g,'').length>=5,
      'c-situacao':()=>!!g('f-situacao'),
      'c-tipo':    ()=>!!g('f-tipo'),
      'c-cidade':  ()=>g('f-cidade').trim().length>=2,
      'c-estado':  ()=>g('f-estado').trim().length===2
    },
    preencher(){
      const fv = document.getElementById('f-valor');
      if(fv && !fv.value && window.__simValorImovel){ fv.value = window.__simValorImovel; }
      const fe = document.getElementById('f-entrada');
      if(fe && !fe.value && window.__simEntrada){ fe.value = window.__simEntrada; }
    },
    /* switch "Pretende usar FGTS?" (padrão: Não) */
    aoIniciar(){
      const sw = document.getElementById('f-fgts');
      const txt = document.getElementById('fgtsTxt');
      function setUsaFgts(usa){
        sw.setAttribute('aria-checked', usa?'true':'false');
        txt.textContent = usa?'Sim':'Não';
      }
      sw.addEventListener('click', ()=> setUsaFgts(sw.getAttribute('aria-checked')==='false'));
      setUsaFgts(false);
    },
    montarLead(){
      return {
        nome:g('f-nome').trim(), cpf:g('f-cpf'), telefone:g('f-tel'), email:g('f-email').trim(),
        renda:g('f-renda'), tipo_remuneracao:g('f-remun'),
        entrada_disponivel:g('f-entrada'),
        usa_fgts: document.getElementById('f-fgts').getAttribute('aria-checked')==='true' ? 'Sim' : 'Não',
        valor_imovel:g('f-valor'),
        momento_compra:g('f-situacao'), tipo_imovel:g('f-tipo'),
        cidade:g('f-cidade').trim(), estado:g('f-estado').trim().toUpperCase(),
        origem:'lp-financiamento-sbpe', aba:'Financiamento'
      };
    },
    eventoEnvio(lead){
      return {momento_compra: lead.momento_compra, tipo_imovel: lead.tipo_imovel, funil:'financiamento'};
    }
  };

  /* ===== SIMULADOR ===== */
  const TAXA_ANUAL = 0.115;                       /* referência interna 11,5% a.a. + TR, não exibida */
  const TAXA_MENSAL = F.taxaMensal(TAXA_ANUAL);
  const COMPROMETIMENTO = 0.30;                   /* parcela até 30% da renda */

  const elValor = document.getElementById('sim-valor');
  const elEntrada = document.getElementById('sim-entrada');
  const elEntradaVal = document.getElementById('sim-entrada-val');
  const elPrazo = document.getElementById('sim-prazo');
  const elPrazoVal = document.getElementById('sim-prazo-val');
  const elCredito = document.getElementById('sim-credito');
  const elCreditoSub = document.getElementById('sim-credito-sub');
  const elParcela = document.getElementById('sim-parcela');
  const elParcelaSub = document.getElementById('sim-parcela-sub');
  if(!elValor) return;

  function calcular(){
    const valor = F.digitos(elValor.value);
    const pct = Number(elEntrada.value);
    const prazo = Number(elPrazo.value);
    const entrada = Math.round(valor * pct/100);
    const credito = Math.max(valor - entrada, 0);
    const parcela = credito>0 ? Math.round(F.parcelaInicialSAC(credito, TAXA_MENSAL, prazo)) : 0;
    const renda = parcela>0 ? Math.round(parcela/COMPROMETIMENTO/100)*100 : 0;

    elEntradaVal.textContent = pct + '% · ' + F.brl(entrada);
    elCredito.innerHTML = F.brl(credito) + '<span class="lote"></span>';
    elCreditoSub.textContent = 'Com entrada de ' + F.brl(entrada) + ' (' + pct + '%)';
    elParcela.innerHTML = F.brl(parcela) + '<span style="font-size:.5em">/mês</span>';
    elParcelaSub.textContent = 'SAC em ' + prazo + ' meses · renda familiar sugerida a partir de ' + F.brl(renda);
    elPrazoVal.textContent = prazo + ' meses';

    window.__simValorImovel = valor ? 'R$ ' + valor.toLocaleString('pt-BR') : '';
    window.__simEntrada = entrada ? 'R$ ' + entrada.toLocaleString('pt-BR') : '';
  }

  let jaInteragiu = false;
  function marcarInteracao(){ if(!jaInteragiu){ jaInteragiu=true; evento('abriu_simulador'); } }

  elValor.addEventListener('input', ()=>{
    marcarInteracao();
    const d = F.digitos(elValor.value).toString().slice(0,12);
    elValor.value = Number(d) ? 'R$ ' + Number(d).toLocaleString('pt-BR') : '';
    calcular();
  });
  elEntrada.addEventListener('input', ()=>{ marcarInteracao(); calcular(); });
  elPrazo.addEventListener('input', ()=>{ marcarInteracao(); calcular(); });

  const btnSimCta = document.getElementById('sim-whats');
  if(btnSimCta){
    btnSimCta.addEventListener('click', ()=>{
      evento('simulou_e_clicou_cta', {
        valor_imovel: elValor.value,
        entrada_pct: elEntrada.value,
        prazo_meses: elPrazo.value,
        credito_estimado: elCredito.textContent
      });
    });
  }

  calcular();
})();
