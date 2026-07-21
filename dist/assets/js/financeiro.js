/* Funções financeiras e de validação PURAS — sem DOM, testáveis em Node.
   Usadas pelos simuladores e pelo formulário de captação. */
(function(raiz){
  const Financeiro = {
    /* extrai apenas dígitos de uma string ("R$ 800.000" -> 800000) */
    digitos(s){ return Number(String(s == null ? '' : s).replace(/\D/g,'')) || 0; },

    /* formata em BRL sem centavos */
    brl(n){ return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}); },

    /* taxa anual efetiva -> taxa mensal equivalente */
    taxaMensal(aa){ return Math.pow(1 + aa, 1/12) - 1; },

    /* Tabela Price: parcela fixa = PV * i / (1 - (1+i)^-n) */
    parcelaPrice(pv, i, n){
      if(n <= 0 || pv <= 0) return 0;
      if(i <= 0) return pv / n;
      return pv * i / (1 - Math.pow(1 + i, -n));
    },

    /* SAC: parcela inicial = amortização constante + juros sobre o saldo total */
    parcelaInicialSAC(pv, i, n){
      if(n <= 0 || pv <= 0) return 0;
      return pv / n + pv * i;
    },

    /* validação de CPF pelos dígitos verificadores */
    cpfValido(cpf){
      cpf = String(cpf || '').replace(/\D/g,'');
      if(cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
      let s = 0; for(let i=0;i<9;i++) s += parseInt(cpf[i]) * (10 - i);
      let r = (s * 10) % 11; if(r === 10) r = 0; if(r !== parseInt(cpf[9])) return false;
      s = 0; for(let i=0;i<10;i++) s += parseInt(cpf[i]) * (11 - i);
      r = (s * 10) % 11; if(r === 10) r = 0; return r === parseInt(cpf[10]);
    }
  };
  if(typeof module !== 'undefined' && module.exports){ module.exports = Financeiro; }
  raiz.Financeiro = Financeiro;
})(typeof window !== 'undefined' ? window : globalThis);
