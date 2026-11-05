import { AcertoPessoaDto, AcertosDto } from 'src/app/core/models/acertos.model';
import {
  comprasEmAberto, iniciais, pagamentoParaDto, percentualRecebido, pessoasVisiveis, proximasPorMes, restanteDaCompra, valorDoPagamento
} from './acertos.regras';

const pessoa = (extra: Partial<AcertoPessoaDto> = {}): AcertoPessoaDto => ({
  pessoaId: 10, nome: 'CARLOS', ehTitular: false, devido: 150, recebido: 30, falta: 120, quitado: false, aindaVaiCobrar: 0,
  compras: [
    { id: 1, data: '2026-10-03', descricao: 'Tênis', valor: 100, bancoId: 3, bancoNome: 'Nubank', parcelaAtual: null, quantidadeParcelas: null, pago: 30, quitada: false },
    { id: 2, data: '2026-10-05', descricao: 'Lanche', valor: 50, bancoId: 3, bancoNome: 'Nubank', parcelaAtual: null, quantidadeParcelas: null, pago: 50, quitada: true }
  ],
  pagamentos: [], proximasParcelas: [], ...extra
});

/** Regras da aba Acertos com pessoas (card #45, parte 3). */
describe('acertos.regras', () => {
  it('quitados e o "Eu" só aparecem com os switches; o "Eu" vem por último', () => {
    const acertos: AcertosDto = {
      pessoas: [pessoa(), pessoa({ pessoaId: 11, nome: 'ÁGATHA', falta: 0, quitado: true })],
      eu: pessoa({ pessoaId: 1, nome: 'Eu', ehTitular: true }),
      totais: { devido: 0, recebido: 0, faltaReceber: 120, aindaVaiCobrar: 0 }
    };

    expect(pessoasVisiveis(acertos, { mostrarQuitados: false, mostrarEu: false }).map(p => p.pessoaId)).toEqual([10]);
    expect(pessoasVisiveis(acertos, { mostrarQuitados: true, mostrarEu: true }).map(p => p.pessoaId)).toEqual([10, 11, 1]);
    expect(pessoasVisiveis(null, { mostrarQuitados: true, mostrarEu: true })).toEqual([]);
  });

  it('percentual recebido vai de 0 a 100; sem dívida é 100', () => {
    expect(percentualRecebido(pessoa())).toBe(20);
    expect(percentualRecebido(pessoa({ devido: 50, recebido: 80 }))).toBe(100);
    expect(percentualRecebido(pessoa({ devido: 0, recebido: 0 }))).toBe(100);
  });

  it('compras em aberto têm o restante; "Tudo" paga o restante da compra ou o que falta no geral', () => {
    const p = pessoa();
    expect(comprasEmAberto(p).map(c => c.id)).toEqual([1]);
    expect(restanteDaCompra(p.compras[0])).toBe(70);
    expect(valorDoPagamento(p, null)).toBe(120);
    expect(valorDoPagamento(p, 1)).toBe(70);
    expect(valorDoPagamento(pessoa({ falta: -10 }), null)).toBe(0);
  });

  it('o pagamento vira uma Entrada da pessoa na conta escolhida, com a compra abatida', () => {
    const dto = pagamentoParaDto(pessoa(), { valor: 70, data: new Date(2026, 9, 20), bancoId: 5, abateItemId: 1 });

    expect(dto).toEqual(jasmine.objectContaining({
      tipoLancamento: 'Entrada', valor: 70, dataMovimentacao: '2026-10-20', bancoId: 5, abateItemId: 1,
      pessoaMovimentacaoId: 10, nomePessoaTransacao: 'CARLOS', descricao: 'Pagamento de CARLOS'
    }));
    expect(pagamentoParaDto(pessoa(), { valor: 10, data: new Date(2026, 9, 20), bancoId: 5, abateItemId: null }).abateItemId).toBeNull();
  });

  it('próximas parcelas agrupadas por mês, com o total do mês', () => {
    const p = pessoa({
      proximasParcelas: [
        { mes: '2026-11', descricao: 'Fone', valor: 30, parcela: 2, quantidadeParcelas: 3 },
        { mes: '2026-11', descricao: 'Geladeira', valor: 100, parcela: 3, quantidadeParcelas: 4 },
        { mes: '2026-12', descricao: 'Geladeira', valor: 100, parcela: 4, quantidadeParcelas: 4 }
      ]
    });

    const meses = proximasPorMes(p);
    expect(meses.map(m => [m.mes, m.total, m.parcelas.length])).toEqual([['2026-11', 130, 2], ['2026-12', 100, 1]]);
    expect(meses[0].titulo).toBe('novembro de 2026');
  });

  it('iniciais do avatar', () => {
    expect(iniciais('CARLOS EDUARDO')).toBe('CE');
    expect(iniciais('ágatha')).toBe('Á');
    expect(iniciais('Eu')).toBe('EU');
  });
});
