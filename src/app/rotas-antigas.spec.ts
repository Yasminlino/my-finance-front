import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ROTAS_ANTIGAS } from './rotas-antigas';

@Component({ standalone: true, template: '' })
class TelaFalsa {}

/** Rotas em português (FE-P2-12): os endereços antigos continuam funcionando por redirecionamento. */
describe('ROTAS_ANTIGAS', () => {
  let router: Router;

  const novas = [
    'categorias', 'contas', 'tipos-cartao', 'tipos-movimentacao',
    'listas', 'listas/:id/checagem', 'listas/:id/cronograma', 'listas/:id/orcamento',
    'extrato-bancario/detalhes', 'extrato-bancario/relatorio'
  ].map(path => ({ path, component: TelaFalsa }));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([...ROTAS_ANTIGAS, ...novas])] });
    router = TestBed.inject(Router);
  });

  const casos: [string, string][] = [
    ['/category', '/categorias'],
    ['/account', '/contas'],
    ['/tipo-cartao', '/tipos-cartao'],
    ['/tipo-movimentacao', '/tipos-movimentacao'],
    ['/catalogos-listas', '/listas'],
    ['/catalogos-listas/31/checagem', '/listas/31/checagem'],
    ['/catalogos-listas/31/cronograma', '/listas/31/cronograma'],
    ['/catalogos-listas/31/orcamento', '/listas/31/orcamento'],
    ['/extrato-bancario/ExtratoBancarioDetalhe?month=2026-12&bancoId=5&tipoContaId=2',
      '/extrato-bancario/detalhes?month=2026-12&bancoId=5&tipoContaId=2'],
    ['/extrato-bancario/RelatorioGastosMensais?month=2026-09', '/extrato-bancario/relatorio?month=2026-09']
  ];

  casos.forEach(([antiga, nova]) => {
    it(`${antiga} vai para ${nova}`, async () => {
      await router.navigateByUrl(antiga);

      expect(router.url).toBe(nova);
    });
  });
});
