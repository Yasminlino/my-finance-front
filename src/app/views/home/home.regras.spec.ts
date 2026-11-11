import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { contasDoDia, saudacao } from './home.regras';

const conta = (id: number, data: string, valor: number, extra: Partial<LinhaContasMensais> = {}): LinhaContasMensais => ({
  id, contaId: id, nome: `Conta ${id}`, valor, data: data as unknown as Date, ehParcelado: false, categoriaId: 1, categoriaNome: 'Casa',
  tipoContaId: '1', subcategoriaNome: 'Despesa', situacao: 'EM ABERTO', statusSalvo: 'EM ABERTO', desbloqueiaCampos: false, ...extra
});

/** Card #71 — regras puras da Home (só o que é do dia). */
describe('home.regras', () => {
  const hoje = new Date(2026, 10, 10);   // 10/11/2026

  it('saudação pela hora', () => {
    expect(saudacao(new Date(2026, 10, 10, 8))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 10, 10, 14))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 10, 10, 21))).toBe('Boa noite');
    expect(saudacao(new Date(2026, 10, 10, 2))).toBe('Boa noite');
  });

  it('contas do dia: hoje e amanhã, só despesas em aberto, com o total', () => {
    const r = contasDoDia([
      conta(1, '2026-11-10', 50), conta(2, '2026-11-11', 20), conta(3, '2026-11-12', 70),
      conta(4, '2026-11-10', 10, { situacao: 'PAGO NO PRAZO' }), conta(5, '2026-11-10', 500, { subcategoriaNome: 'Receita' }),
      conta(6, '2026-11-09', 15)   // atrasada: aparece nas vencidas, não aqui
    ], hoje);
    expect(r.hoje.map(c => c.id)).toEqual([1]);
    expect(r.amanha.map(c => c.id)).toEqual([2]);
    expect(r.total).toBe(70);
  });

  it('valor em texto pt-BR também soma', () => {
    expect(contasDoDia([conta(1, '2026-11-10', '1.234,50' as never)], hoje).total).toBe(1234.5);
  });
});
