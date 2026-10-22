import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { EdicaoContas } from './edicao-contas';

/** Estado do modo edição de Contas a Pagar: snapshot, alterações por id, desfazer e validação. */
describe('EdicaoContas', () => {
  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, contaId: 1, nome: 'Luz', valor: 100, data: '2026-10-17' as any, ehParcelado: false,
    categoriaId: 1, categoriaNome: 'Moradia', tipoContaId: '', subcategoriaNome: 'Despesa',
    situacao: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false, observacao: '',
    ...parcial
  });

  let contas: LinhaContasMensais[];
  let edicao: EdicaoContas;

  beforeEach(() => {
    contas = [
      conta({ id: 1 }),
      conta({ id: 2, nome: 'Carro', ehParcelado: true, parcelaAtual: 8, quantidadeParcelas: 12 }),
      conta({ id: 3, situacao: 'PAGO NO PRAZO' })
    ];
    edicao = new EdicaoContas(contas);
  });

  it('começa sem alterações e sem poder salvar', () => {
    expect(edicao.contagem).toBe(0);
    expect(edicao.podeSalvar).toBeFalse();
    expect(edicao.valor(1, 'valor')).toBe(100);
  });

  it('alterar guarda o novo valor e mantém o original', () => {
    edicao.alterar(1, 'valor', 150);

    expect(edicao.valor(1, 'valor')).toBe(150);
    expect(edicao.original(1, 'valor')).toBe(100);
    expect(edicao.foiAlterado(1, 'valor')).toBeTrue();
    expect(edicao.foiAlterado(1)).toBeTrue();
    expect(edicao.contagem).toBe(1);
    expect(edicao.podeSalvar).toBeTrue();
  });

  it('o snapshot não muda quando a lista de origem muda', () => {
    contas[0].valor = 999;
    expect(edicao.original(1, 'valor')).toBe(100);
  });

  it('voltar ao valor original remove a alteração (moeda e data comparadas pelo valor)', () => {
    edicao.alterar(1, 'valor', 'R$ 150,00');
    edicao.alterar(1, 'valor', 'R$ 100,00');
    edicao.alterar(1, 'data', new Date(2026, 9, 20));
    edicao.alterar(1, 'data', new Date(2026, 9, 17));

    expect(edicao.foiAlterado(1)).toBeFalse();
    expect(edicao.contagem).toBe(0);
  });

  it('desfazerCampo volta só aquele campo; desfazerLinha volta a linha toda', () => {
    edicao.alterar(1, 'valor', 150);
    edicao.alterar(1, 'observacao', 'conferir');

    edicao.desfazerCampo(1, 'valor');
    expect(edicao.foiAlterado(1, 'valor')).toBeFalse();
    expect(edicao.foiAlterado(1, 'observacao')).toBeTrue();

    edicao.desfazerLinha(1);
    expect(edicao.foiAlterado(1)).toBeFalse();
  });

  it('descartar restaura todos os originais', () => {
    edicao.alterar(1, 'valor', 150);
    edicao.alterar(2, 'parcelaAtual', 9);

    edicao.descartar();

    expect(edicao.contagem).toBe(0);
    expect(edicao.valor(1, 'valor')).toBe(100);
    expect(edicao.valor(2, 'parcelaAtual')).toBe(8);
  });

  it('alterações de várias linhas (de páginas diferentes) ficam até salvar', () => {
    edicao.alterar(1, 'valor', 150);
    edicao.alterar(2, 'situacao', 'AGUARDANDO');

    expect([...edicao.idsAlterados]).toEqual([1, 2]);
    expect(edicao.alteradas().map(c => [c.id, c.valor, c.situacao])).toEqual([
      [1, 150, 'PENDENTE'],
      [2, 100, 'AGUARDANDO']
    ]);
  });

  describe('validação', () => {
    it('parcela maior que o total ou menor que 1 bloqueia o salvar', () => {
      edicao.alterar(2, 'parcelaAtual', 13);
      expect(edicao.erros(2).parcelaAtual).toBe('Parcela maior que o total (12).');
      expect(edicao.temErros).toBeTrue();
      expect(edicao.podeSalvar).toBeFalse();

      edicao.alterar(2, 'parcelaAtual', 0);
      expect(edicao.erros(2).parcelaAtual).toBe('A parcela começa em 1.');
    });

    it('valor zerado ou vazio e data vazia são erros', () => {
      edicao.alterar(1, 'valor', 0);
      edicao.alterar(1, 'data', null);
      expect(edicao.erros(1)).toEqual({
        valor: 'Informe um valor maior que zero.',
        data: 'Informe uma data válida.'
      });
    });

    it('linha sem alteração não tem erro, e corrigir libera o salvar', () => {
      expect(edicao.erros(1)).toEqual({});

      edicao.alterar(2, 'parcelaAtual', 13);
      edicao.alterar(2, 'parcelaAtual', 12);
      expect(edicao.temErros).toBeFalse();
      expect(edicao.podeSalvar).toBeTrue();
    });
  });

  describe('apoio aos campos (tabela e bottom sheet)', () => {
    it('rascunho: valores no tipo de cada campo PrimeNG', () => {
      edicao.alterar(2, 'valor', 'R$ 150,00');

      expect(edicao.rascunho(2)).toEqual({
        valor: 150,
        data: new Date(2026, 9, 17),
        situacao: 'PENDENTE',
        parcelaAtual: 8,
        observacao: ''
      });
    });

    it('anterior: o valor de antes como a tela mostra', () => {
      expect(edicao.anterior(1, 'valor').replace(/\s/g, ' ')).toBe('R$ 100,00');
      expect(edicao.anterior(1, 'data')).toBe('17/10/2026');
      expect(edicao.anterior(1, 'situacao')).toBe('PENDENTE');
      expect(edicao.anterior(1, 'observacao')).toBe('(vazia)');
      expect(edicao.anterior(2, 'parcelaAtual')).toBe('8');
    });

    it('camposAlterados conta os campos, não as linhas', () => {
      edicao.alterar(1, 'valor', 150);
      edicao.alterar(1, 'observacao', 'x');
      expect(edicao.camposAlterados(1)).toBe(2);
      expect(edicao.camposAlterados(2)).toBe(0);
    });
  });

  describe('contas pagas', () => {
    it('ficam bloqueadas e ignoram alterações até desbloquear', () => {
      expect(edicao.bloqueada(3)).toBeTrue();
      edicao.alterar(3, 'valor', 150);
      expect(edicao.foiAlterado(3)).toBeFalse();

      edicao.desbloquear(3);
      expect(edicao.bloqueada(3)).toBeFalse();
      edicao.alterar(3, 'valor', 150);
      expect(edicao.foiAlterado(3)).toBeTrue();
    });

    it('descartar volta a bloquear', () => {
      edicao.desbloquear(3);
      edicao.descartar();
      expect(edicao.bloqueada(3)).toBeTrue();
    });

    it('conta em aberto não é bloqueada', () => {
      expect(edicao.bloqueada(1)).toBeFalse();
    });
  });
});
