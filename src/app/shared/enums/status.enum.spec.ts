import { contaPaga } from './status.enum';

/** Contas a Pagar bloqueia a edição inline da conta já paga (FE-P2-04, decisão de 14/10/2026). */
describe('contaPaga', () => {
  it('é paga no prazo ou paga atrasada', () => {
    expect(contaPaga({ status: 'PAGO NO PRAZO' })).toBeTrue();
    expect(contaPaga({ status: 'PAGO ATRASADO' })).toBeTrue();
  });

  it('pendente e aguardando continuam editáveis', () => {
    expect(contaPaga({ status: 'PENDENTE' })).toBeFalse();
    expect(contaPaga({ status: 'AGUARDANDO' })).toBeFalse();
    expect(contaPaga({})).toBeFalse();
  });
});
