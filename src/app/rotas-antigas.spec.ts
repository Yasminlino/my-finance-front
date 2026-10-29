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
    'planejamento', 'planejamento/arquivados',
    'planejamento/:id/checagem', 'planejamento/:id/cronograma', 'planejamento/:id/orcamento',
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
    ['/catalogos-listas', '/planejamento'],
    ['/catalogos-listas/31/checagem', '/planejamento/31/checagem'],
    ['/catalogos-listas/31/cronograma', '/planejamento/31/cronograma'],
    ['/catalogos-listas/31/orcamento', '/planejamento/31/orcamento'],
    // "Listas" virou "Planejamento" (card #63).
    ['/listas', '/planejamento'],
    ['/listas/31/checagem', '/planejamento/31/checagem'],
    ['/listas/31/cronograma', '/planejamento/31/cronograma'],
    ['/listas/31/orcamento', '/planejamento/31/orcamento'],
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
