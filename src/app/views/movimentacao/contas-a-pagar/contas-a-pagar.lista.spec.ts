import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import {
  categoriasDe, filtrarContas, metaDasContas, opcoesDeFiltro, ordenarPorVencimento
} from './contas-a-pagar.lista';

/** O que a tabela (desktop) e a lista (mobile) compartilham: linha exibida, ordem e filtros. */
describe('contas-a-pagar.lista', () => {
  const hoje = new Date(2026, 9, 17, 10, 0);

  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, idAccount: 1, name: 'Luz', value: 100, date: '2026-10-20' as any, ehParcelado: false,
    categoryId: 1, categoryName: 'Moradia', tipoContaId: '', subCategoryName: 'Despesa',
    status: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false,
    ...parcial
  });

  const contas = [
    conta({ id: 1, name: 'Energia elétrica', value: 200 }),
    conta({ id: 2, name: 'Aluguel', value: 1500, date: '2026-10-05' as any, observacao: 'reajuste' }),
    conta({ id: 3, name: 'Salário', value: 5000, categoryName: 'Renda', subCategoryName: 'Receita', status: 'PAGO NO PRAZO' }),
    conta({ id: 4, name: 'Carro', value: 800, categoryName: 'Transporte', ehParcelado: true, parcelaAtual: 8, quantidadeParcelas: 12 })
  ];
  const meta = metaDasContas(contas, hoje);
  const ids = (lista: LinhaContasMensais[]) => lista.map(c => c.id);
  const semFiltro = { filtro: 'todas' as const, busca: '', categorias: [] as string[] };

  it('metaDasContas: o que a linha mostra', () => {
    expect(meta[4].parcela).toBe('8 / 12');
    expect(meta[4].progressoParcela).toBeCloseTo(66.67, 1);
    expect(meta[2].situacao).toBe('atrasada');
    expect(meta[2].relativo.texto).toBe('Vencida há 12 dias');
    expect(meta[2].tag.label).toBe('ATRASADA');
    expect(meta[3].receita).toBeTrue();
    expect(meta[3].valor.replace(/\s/g, ' ')).toBe('+ R$ 5.000,00');
    expect(meta[1].icone).toBe('pi pi-home');
    expect(meta[1].cor).toMatch(/^cor-[0-7]$/);
  });

  it('ordenarPorVencimento: por data e, no mesmo dia, por nome, sem mexer na lista original', () => {
    expect(ids(ordenarPorVencimento(contas))).toEqual([2, 4, 1, 3]);
    expect(ids(contas)).toEqual([1, 2, 3, 4]);
  });

  it('filtrarContas: situação, busca sem acento (nome, categoria, observação) e categorias', () => {
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, filtro: 'vencidas' }))).toEqual([2]);
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, filtro: 'pagas' }))).toEqual([3]);
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, busca: 'eletrica' }))).toEqual([1]);
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, busca: 'REAJUSTE' }))).toEqual([2]);
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, categorias: ['Transporte', 'Renda'] }))).toEqual([3, 4]);
  });

  it('filtrarContas: "alteradas" usa os ids informados (nenhum, sem edição)', () => {
    expect(ids(filtrarContas(contas, meta, { ...semFiltro, filtro: 'alteradas', alteradas: new Set([4]) }))).toEqual([4]);
    expect(filtrarContas(contas, meta, { ...semFiltro, filtro: 'alteradas' })).toEqual([]);
  });

  it('opcoesDeFiltro: contadores do mês e "Alteradas" só quando informado', () => {
    expect(opcoesDeFiltro(contas, hoje).map(o => [o.value, o.contagem])).toEqual([
      ['todas', 4], ['a-vencer', 2], ['vencidas', 1], ['pagas', 1]
    ]);
    expect(opcoesDeFiltro(contas, hoje, 2).at(-1)).toEqual({ label: 'Alteradas', value: 'alteradas', contagem: 2 });
  });

  it('categoriasDe: nomes únicos em ordem', () => {
    expect(categoriasDe(contas)).toEqual(['Moradia', 'Renda', 'Transporte']);
  });
});
