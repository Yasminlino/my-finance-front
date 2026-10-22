import { ContextoExtrato, paraExtratoItemDto } from './extrato.mapper';

/**
 * FE-P2-01: um único mapeador para o ExtratoBancarioItemDTO, só em camelCase (o formato da API).
 * Antes cada campo testava PascalCase ?? camelCase, e o create mandava PascalCase.
 */
describe('paraExtratoItemDto', () => {
  const contexto: ContextoExtrato = {
    categorias: [{ id: 7, nome: 'Mercado' }, { id: 8, nome: 'Saúde' }],
    tiposMovimentacao: [{ id: 3, nomeTipoMovimentacao: 'Alimentação' }],
    bancoId: 5,
    tipoCartaoId: 2,
    numeroFatura: '2026-10',
  };

  it('mantém os campos em camelCase', () => {
    const dto = paraExtratoItemDto({
      id: 10, dataMovimentacao: '2026-10-05', valor: 12.5, tipoLancamento: 'Entrada',
      descricao: 'PIX', observacao: 'obs', nomePessoaTransacao: 'ANA', identificador: 'X1',
    }, contexto);

    expect(dto).toEqual(jasmine.objectContaining({
      id: 10, dataMovimentacao: '2026-10-05', valor: 12.5, tipoLancamento: 'Entrada',
      descricao: 'PIX', observacao: 'obs', nomePessoaTransacao: 'ANA', identificador: 'X1',
    }));
    expect(Object.keys(dto).some(k => /^[A-Z]/.test(k))).toBeFalse();
  });

  it('ignora campos em PascalCase (o contrato é camelCase)', () => {
    const dto = paraExtratoItemDto({ id: 1, Valor: 99, dataMovimentacao: '2026-10-01', valor: 5 } as any, contexto);

    expect(dto.valor).toBe(5);
    expect((dto as any).Valor).toBeUndefined();
  });

  it('data: corta o horário de ISO e converte Date pelo dia local', () => {
    expect(paraExtratoItemDto({ id: 1, dataMovimentacao: '2026-10-05T03:00:00Z' }, contexto).dataMovimentacao).toBe('2026-10-05');
    expect(paraExtratoItemDto({ id: 1, dataMovimentacao: new Date(2026, 9, 6) }, contexto).dataMovimentacao).toBe('2026-10-06');
  });

  it('categoria e tipo: pelo id, completando o nome', () => {
    const dto = paraExtratoItemDto({ id: 1, categoriaId: '7', tipoMovimentacaoId: 3 }, contexto);

    expect(dto.categoriaId).toBe(7);
    expect(dto.categoriaNome).toBe('Mercado');
    expect(dto.tipoMovimentacaoId).toBe(3);
    expect(dto.tipoMovimentacaoNome).toBe('Alimentação');
  });

  it('categoria e tipo: pelo nome, sem diferenciar maiúsculas, quando não vem id', () => {
    const dto = paraExtratoItemDto({ id: 1, categoriaNome: 'saúde', tipoMovimentacaoNome: 'ALIMENTAÇÃO' }, contexto);

    expect(dto.categoriaId).toBe(8);
    expect(dto.categoriaNome).toBe('Saúde');
    expect(dto.tipoMovimentacaoId).toBe(3);
    expect(dto.tipoMovimentacaoNome).toBe('Alimentação');
  });

  it('sem categoria é null, não 0 (0 não existe e a FK recusava)', () => {
    const dto = paraExtratoItemDto({ id: 1, categoriaId: '' }, contexto);

    expect(dto.categoriaId).toBeNull();
    expect(dto.tipoMovimentacaoId).toBeNull();
  });

  it('banco, tipo de cartão e fatura vêm do contexto quando a linha não traz', () => {
    const dto = paraExtratoItemDto({ id: 1 }, contexto);

    expect(dto.bancoId).toBe(5);
    expect(dto.tipoCartaoId).toBe(2);
    expect(dto.numeroFatura).toBe('2026-10');
  });

  it('tipo de lançamento padrão é Saída', () => {
    expect(paraExtratoItemDto({ id: 1 }, contexto).tipoLancamento).toBe('Saída');
  });

  it('usuarioId só quando é um id válido; nunca inventa dono', () => {
    expect(paraExtratoItemDto({ id: 1, usuarioId: 4 }, contexto).usuarioId).toBe(4);
    expect(paraExtratoItemDto({ id: 1 }, contexto).usuarioId).toBeUndefined();
    expect(paraExtratoItemDto({ id: 1, usuarioId: 0 }, contexto).usuarioId).toBeUndefined();
  });

  it('item novo (lançamento manual) não manda id', () => {
    const dto = paraExtratoItemDto({ dataMovimentacao: '2026-10-01', valor: 1 }, contexto);

    expect('id' in dto).toBeFalse();
  });
});
