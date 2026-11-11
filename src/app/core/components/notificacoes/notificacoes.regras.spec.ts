import { AvisoDto } from '../../models/notificacao.model';
import { agruparAvisos, destinoDoAviso, haQuanto, linhaDoAviso, podePagar, quandoDoAviso } from './notificacoes.regras';

const aviso = (id: string, desde: Date, extra: Partial<AvisoDto> = {}): AvisoDto => ({
  id, tipo: 'vencidas', desde: desde.toISOString(), novo: true, titulo: id, ...extra
});

/** Card #73 — regras puras do sino. */
describe('notificacoes.regras', () => {
  const agora = new Date(2026, 10, 11, 12, 0);
  const hoje0h = new Date(2026, 10, 11, 0, 0);
  const anteontem = new Date(2026, 10, 9, 0, 0);

  it('agrupa em Hoje e Esta semana; "Novas" mostra só as novas', () => {
    const avisos = [aviso('a', hoje0h), aviso('b', anteontem), aviso('c', hoje0h, { novo: false })];

    expect(agruparAvisos(avisos, 'todas', agora).map(g => `${g.rotulo}:${g.avisos.map(a => a.id).join(',')}`))
      .toEqual(['Hoje:a,c', 'Esta semana:b']);
    expect(agruparAvisos(avisos, 'novas', agora).map(g => `${g.rotulo}:${g.avisos.map(a => a.id).join(',')}`))
      .toEqual(['Hoje:a', 'Esta semana:b']);
    expect(agruparAvisos([], 'todas', agora)).toEqual([]);
  });

  it('conta que vence hoje fica em Hoje mesmo avisada desde ontem; o título já diz quando', () => {
    const ontem = new Date(2026, 10, 10);
    const vence = aviso('v', ontem, { tipo: 'contas-a-vencer', data: '2026-11-11' });
    const fatura = aviso('f', anteontem, { tipo: 'fatura', data: '2026-11-13' });
    expect(agruparAvisos([vence, fatura], 'todas', agora).map(g => `${g.rotulo}:${g.avisos.map(a => a.id).join(',')}`))
      .toEqual(['Hoje:v', 'Esta semana:f']);
    expect(quandoDoAviso(vence, agora)).toBe('');
    expect(quandoDoAviso(fatura, agora)).toBe('seg');
    expect(quandoDoAviso(aviso('y', new Date(2026, 10, 10), { tipo: 'acertos' }), agora)).toBe('ontem');
  });

  it('linha de baixo: detalhe e, em conta e fatura, o valor', () => {
    const r = (v: number) => `R$ ${v}`;
    expect(linhaDoAviso(aviso('v', hoje0h, { tipo: 'contas-a-vencer', detalhe: 'Carlos', valor: 250 }), r)).toBe('Carlos · R$ 250');
    expect(linhaDoAviso(aviso('f', hoje0h, { tipo: 'fatura', valor: 900 }), r)).toBe('R$ 900');
    expect(linhaDoAviso(aviso('a', hoje0h, { tipo: 'acertos', detalhe: 'Há mais de 30 dias', valor: 210 }), r)).toBe('Há mais de 30 dias');
  });

  it('há quanto tempo', () => {
    expect(haQuanto(hoje0h.toISOString(), agora)).toBe('hoje');
    expect(haQuanto(new Date(2026, 10, 10).toISOString(), agora)).toBe('ontem');
    expect(haQuanto(anteontem.toISOString(), agora)).toBe('há 2 dias');
  });

  it('só conta a vencer com transação tem Marcar como paga', () => {
    expect(podePagar(aviso('x', hoje0h, { tipo: 'contas-a-vencer', transacaoId: 3 }))).toBeTrue();
    expect(podePagar(aviso('x', hoje0h, { tipo: 'contas-a-vencer' }))).toBeFalse();
    expect(podePagar(aviso('x', hoje0h, { tipo: 'fatura', transacaoId: 3 }))).toBeFalse();
  });

  it('Abrir leva à tela de origem já filtrada', () => {
    const h = '2026-11-11';
    expect(destinoDoAviso(aviso('x', hoje0h, { tipo: 'contas-a-vencer', data: '2026-12-01' }), h))
      .toEqual({ url: '/contas-a-pagar', queryParams: { date: '2026-12-01' } });
    expect(destinoDoAviso(aviso('x', hoje0h, { tipo: 'vencidas' }), h)).toEqual({ url: '/contas-a-pagar', queryParams: { date: h } });
    expect(destinoDoAviso(aviso('x', hoje0h, { tipo: 'fatura', bancoId: 4, data: '2026-11-15' }), h))
      .toEqual({ url: '/extrato-bancario', queryParams: { bancoId: 4, month: '2026-11' } });
    expect(destinoDoAviso(aviso('x', hoje0h, { tipo: 'agenda', listaId: 9 }), h)).toEqual({ url: '/planejamento/9' });
    expect(destinoDoAviso(aviso('x', hoje0h, { tipo: 'acertos' }), h)).toEqual({ url: '/extrato-bancario', queryParams: { foco: 'acertos' } });
  });
});
