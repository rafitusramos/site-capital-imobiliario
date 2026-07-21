/* Testes unitários das funções financeiras puras (node --test). */
const { test } = require('node:test');
const assert = require('node:assert');
const F = require('../dist/assets/js/financeiro.js');

test('digitos extrai números de valores formatados', () => {
  assert.strictEqual(F.digitos('R$ 800.000'), 800000);
  assert.strictEqual(F.digitos('(19) 99783-4187'), 19997834187);
  assert.strictEqual(F.digitos(''), 0);
  assert.strictEqual(F.digitos(null), 0);
});

test('taxaMensal converte taxa anual efetiva', () => {
  const i = F.taxaMensal(0.115);
  assert.ok(Math.abs(i - 0.009112) < 1e-5, `esperado ~0.009112, obtido ${i}`);
  assert.strictEqual(F.taxaMensal(0), 0);
});

test('parcelaPrice bate com o simulador de home equity (600k, 1,09% a.m., 240m)', () => {
  const p = F.parcelaPrice(600000, 0.0109, 240);
  assert.strictEqual(Math.round(p), 7064);
});

test('parcelaPrice casos de borda', () => {
  assert.strictEqual(F.parcelaPrice(120000, 0, 120), 1000);  // sem juros = divisão simples
  assert.strictEqual(F.parcelaPrice(100000, 0.01, 0), 0);    // prazo inválido
  assert.strictEqual(F.parcelaPrice(0, 0.01, 240), 0);       // sem principal
});

test('parcelaInicialSAC bate com o simulador de financiamento (640k, 11,5% a.a., 420m)', () => {
  const p = F.parcelaInicialSAC(640000, F.taxaMensal(0.115), 420);
  assert.strictEqual(Math.round(p), 7356);
});

test('parcelaInicialSAC bate com a tabela comparativa (800k, 11,19% a.a., 360m)', () => {
  const p = F.parcelaInicialSAC(800000, F.taxaMensal(0.1119), 360);
  assert.strictEqual(Math.round(p), 9325);
});

test('parcelaInicialSAC casos de borda', () => {
  assert.strictEqual(F.parcelaInicialSAC(100000, 0.01, 0), 0);
  assert.strictEqual(F.parcelaInicialSAC(0, 0.01, 360), 0);
});

test('cpfValido aceita CPFs válidos e rejeita inválidos', () => {
  assert.strictEqual(F.cpfValido('529.982.247-25'), true);   // válido conhecido
  assert.strictEqual(F.cpfValido('52998224725'), true);      // sem máscara
  assert.strictEqual(F.cpfValido('529.982.247-26'), false);  // dígito verificador errado
  assert.strictEqual(F.cpfValido('111.111.111-11'), false);  // sequência repetida
  assert.strictEqual(F.cpfValido('123'), false);             // curto
  assert.strictEqual(F.cpfValido(''), false);
});

test('brl formata sem centavos', () => {
  const s = F.brl(640000);
  assert.ok(s.includes('640.000') && s.includes('R$'), s);
});
