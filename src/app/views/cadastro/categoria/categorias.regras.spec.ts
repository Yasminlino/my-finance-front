import { CategoriaDto } from 'src/app/core/models/categoria.model';
import {
  FiltroCategorias, contarPorTipo, filtrarCategorias, naturezasDoTipo, nomesParecidos, resumoDasCategorias, tipoNaturezaIncompativel
} from './categorias.regras';

const categoria = (id: number, nome: string, subcategoria: string, naturezaOperacao: number, ativo = true): CategoriaDto =>
  ({ id, nome, subcategoria, naturezaOperacao, ativo });

/** Regras do Cadastro de Categorias (card #23). */
describe('categorias.regras', () => {
  describe('naturezasDoTipo', () => {
    it('Receita só tem Rendimento / Entrada, para pessoa física e empresa', () => {
      expect(naturezasDoTipo('Receita', false)).toEqual([0]);
      expect(naturezasDoTipo('Receita', true)).toEqual([0]);
    });

    it('Despesa: Essencial, Lazer e Reserva na pessoa física; Pessoal e Empresa na empresa', () => {
      expect(naturezasDoTipo('Despesa', false)).toEqual([1, 2, 3]);
      expect(naturezasDoTipo('Despesa', true)).toEqual([4, 5]);
    });

    it('sem tipo, nenhuma natureza', () => {
      expect(naturezasDoTipo('', false)).toEqual([]);
    });
  });

  describe('tipoNaturezaIncompativel', () => {
    it('Despesa com Rendimento / Entrada (o caso de Ágatha) e Receita com natureza de despesa', () => {
      expect(tipoNaturezaIncompativel(categoria(16, 'Ágatha', 'Despesa', 0))).toBeTrue();
      expect(tipoNaturezaIncompativel(categoria(1, 'X', 'Receita', 2))).toBeTrue();
    });

    it('combinações certas', () => {
      expect(tipoNaturezaIncompativel(categoria(5, 'Salário', 'Receita', 0))).toBeFalse();
      expect(tipoNaturezaIncompativel(categoria(6, 'Casa', 'Despesa', 1))).toBeFalse();
      expect(tipoNaturezaIncompativel(categoria(42, 'COLABORADOR', 'Despesa', 5))).toBeFalse();
    });
  });

  describe('nomesParecidos', () => {
    it('acha erro de uma letra, mesmo em tipos diferentes', () => {
      const parecidos = nomesParecidos([
        categoria(26, 'Tansferência entre contas', 'Despesa', 1),
        categoria(27, 'Transferência entre contas', 'Receita', 0),
        categoria(6, 'Casa', 'Despesa', 1)
      ]);

      expect(parecidos.get(26)).toEqual(['Transferência entre contas']);
      expect(parecidos.get(27)).toEqual(['Tansferência entre contas']);
      expect(parecidos.has(6)).toBeFalse();
    });

    it('ignora acento, maiúscula e espaços', () => {
      const parecidos = nomesParecidos([categoria(1, 'Saúde', 'Despesa', 1), categoria(2, '  SAUDE ', 'Despesa', 1)]);

      expect(parecidos.get(1)).toEqual(['  SAUDE ']);
    });

    it('nomes curtos e diferentes não são parecidos por acaso', () => {
      const parecidos = nomesParecidos([
        categoria(1, 'PLR', 'Receita', 0), categoria(2, '13º', 'Receita', 0), categoria(3, 'Carro', 'Despesa', 1),
        categoria(4, 'Carlos', 'Despesa', 2)
      ]);

      expect(parecidos.size).toBe(0);
    });
  });

  describe('filtrarCategorias e contarPorTipo', () => {
    const todas = [
      categoria(6, 'Casa', 'Despesa', 1), categoria(21, 'Carlos', 'Despesa', 2), categoria(7, 'Investimento', 'Despesa', 3),
      categoria(5, 'Salário', 'Receita', 0), categoria(19, '13º', 'Receita', 0, false)
    ];
    const filtro: FiltroCategorias = { tipo: 'todas', busca: '', naturezas: [], situacao: 'ativas', ordem: 'tipo' };
    const ids = (lista: CategoriaDto[]) => lista.map(c => c.id);

    it('por padrão esconde as inativas; receitas primeiro, depois pelo nome', () => {
      expect(ids(filtrarCategorias(todas, filtro))).toEqual([5, 21, 6, 7]);
      expect(ids(filtrarCategorias(todas, { ...filtro, situacao: 'todas' }))).toEqual([19, 5, 21, 6, 7]);
    });

    it('ordena por nome (A–Z e Z–A), por mais contas e por natureza', () => {
      const comContas = todas.map(c => ({ ...c, quantidadeContas: { 6: 5, 21: 3, 7: 3, 5: 1 }[c.id] ?? 0 }));

      expect(ids(filtrarCategorias(comContas, { ...filtro, ordem: 'nome' }))).toEqual([21, 6, 7, 5]);
      expect(ids(filtrarCategorias(comContas, { ...filtro, ordem: 'nome-desc' }))).toEqual([5, 7, 6, 21]);
      // Empate em quantidade de contas desempata pelo nome.
      expect(ids(filtrarCategorias(comContas, { ...filtro, ordem: 'contas' }))).toEqual([6, 21, 7, 5]);
      expect(ids(filtrarCategorias(comContas, { ...filtro, ordem: 'natureza' }))).toEqual([5, 6, 21, 7]);
    });

    it('situação "inativas" traz só as inativas', () => {
      expect(ids(filtrarCategorias(todas, { ...filtro, situacao: 'inativas' }))).toEqual([19]);
      expect(contarPorTipo(todas, { ...filtro, situacao: 'inativas' })).toEqual({ todas: 1, despesas: 0, receitas: 1 });
    });

    it('filtra por tipo, por natureza e pela busca sem acento', () => {
      expect(ids(filtrarCategorias(todas, { ...filtro, tipo: 'receitas' }))).toEqual([5]);
      expect(ids(filtrarCategorias(todas, { ...filtro, tipo: 'despesas', naturezas: [2, 3] }))).toEqual([21, 7]);
      expect(ids(filtrarCategorias(todas, { ...filtro, busca: 'SALARIO' }))).toEqual([5]);
    });

    it('contador por tipo segue a busca, a natureza e a situação', () => {
      expect(contarPorTipo(todas, filtro)).toEqual({ todas: 4, despesas: 3, receitas: 1 });
      expect(contarPorTipo(todas, { ...filtro, situacao: 'todas' })).toEqual({ todas: 5, despesas: 3, receitas: 2 });
      expect(contarPorTipo(todas, { ...filtro, busca: 'ca' })).toEqual({ todas: 2, despesas: 2, receitas: 0 });
    });
  });

  describe('resumoDasCategorias', () => {
    it('conta as ativas por tipo e as despesas por natureza, com as incompatíveis em "a revisar"', () => {
      const resumo = resumoDasCategorias([
        categoria(1, 'Casa', 'Despesa', 1), categoria(2, 'Carro', 'Despesa', 1), categoria(3, 'Lazer', 'Despesa', 2),
        categoria(4, 'Investimento', 'Despesa', 3), categoria(16, 'Ágatha', 'Despesa', 0),
        categoria(5, 'Salário', 'Receita', 0), categoria(19, '13º', 'Receita', 0, false)
      ]);

      expect(resumo.despesas).toBe(5);
      expect(resumo.receitas).toBe(1);
      expect(resumo.despesasPorNatureza).toEqual([
        { natureza: 1, quantidade: 2 }, { natureza: 2, quantidade: 1 }, { natureza: 3, quantidade: 1 }
      ]);
      expect(resumo.aRevisar).toBe(1);
    });
  });
});
