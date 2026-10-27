import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LancamentoDaConta } from 'src/app/core/models/conta.model';

import { ContaAcompanhamentoComponent } from './conta-acompanhamento.component';

/** Card Acompanhamento do painel de lançamentos (card #22): linha do valor por mês, ponto colorido pela situação. */
describe('ContaAcompanhamentoComponent', () => {
  let fixture: ComponentFixture<ContaAcompanhamentoComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const l = (id: number, data: string, situacao: string, valor: number): LancamentoDaConta =>
    ({ id, data, nome: 'Luz', valor, situacao, ehParcelado: false });
  const mostrar = (lancamentos: LancamentoDaConta[]) => {
    fixture = TestBed.createComponent(ContaAcompanhamentoComponent);
    fixture.componentRef.setInput('lancamentos', lancamentos);
    fixture.componentRef.setInput('hoje', new Date(2026, 9, 27));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ContaAcompanhamentoComponent] }));

  it('uma linha com o valor de cada um dos 12 meses; mês sem lançamento fica vazio', () => {
    mostrar([l(1, '2026-10-05', 'PAGO NO PRAZO', 120), l(2, '2026-09-05', 'PAGO ATRASADO', 110)]);
    const opcoes = fixture.componentInstance.opcoes;

    expect(opcoes.chart.type).toBe('line');
    expect(opcoes.series.map(s => s.name)).toEqual(['Valor do mês']);
    expect((opcoes.xaxis.categories as string[]).length).toBe(12);
    expect(opcoes.series[0].data[11]).toBe(120);
    expect(opcoes.series[0].data[0]).toBeNull();
    expect(opcoes.stroke.width).toBe(2);
  });

  it('cada ponto tem a cor da situação do mês', () => {
    mostrar([l(1, '2026-10-05', 'PENDENTE', 120), l(2, '2026-09-05', 'PAGO ATRASADO', 110), l(3, '2026-08-05', 'PAGO NO PRAZO', 100)]);
    const pontos = fixture.componentInstance.opcoes.markers.discrete!;
    const cores = fixture.componentInstance.cores;

    expect(pontos.map(p => p.dataPointIndex)).toEqual([9, 10, 11]);
    expect(pontos.map(p => p.fillColor)).toEqual([cores['no-prazo'], cores.atraso, cores.aberto]);
  });

  it('só o último mês tem o valor escrito; o tooltip mostra o valor em R$', () => {
    mostrar([l(1, '2026-10-05', 'PAGO NO PRAZO', 120), l(2, '2026-09-05', 'PAGO NO PRAZO', 110)]);
    const opcoes = fixture.componentInstance.opcoes;
    const rotulo = opcoes.dataLabels.formatter as (valor: number, ctx: { dataPointIndex: number }) => string;

    expect(rotulo(120, { dataPointIndex: 11 }).replace(/\s/g, ' ')).toBe('R$ 120,00');
    expect(rotulo(110, { dataPointIndex: 10 })).toBe('');
    expect(opcoes.tooltip.y.formatter(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
  });

  it('legenda das três situações no card, com o título', () => {
    mostrar([l(1, '2026-10-05', 'PAGO NO PRAZO', 120)]);

    expect(el().textContent).toContain('Acompanhamento');
    expect(Array.from(el().querySelectorAll('.acompanhamento-legenda li')).map(i => i.textContent?.trim()))
      .toEqual(['Pago no prazo', 'Pago com atraso', 'Em aberto']);
    expect(el().querySelector('apx-chart')).not.toBeNull();
  });

  it('avisa o mês com valor fora do padrão', () => {
    mostrar([
      l(1, '2026-10-05', 'PAGO NO PRAZO', 250), l(2, '2026-09-05', 'PAGO NO PRAZO', 240),
      l(3, '2026-08-05', 'PAGO NO PRAZO', 260), l(4, '2026-01-05', 'PAGO NO PRAZO', 25000)
    ]);

    const aviso = el().querySelector('.acompanhamento-aviso')?.textContent?.replace(/\s+/g, ' ');
    expect(aviso).toContain('jan/26');
    expect(aviso).toContain('R$ 25.000,00');
  });

  it('com período escolhido, mostra só os meses dele e diz qual é no subtítulo', () => {
    fixture = TestBed.createComponent(ContaAcompanhamentoComponent);
    fixture.componentRef.setInput('lancamentos', [l(1, '2026-02-05', 'PAGO NO PRAZO', 90)]);
    fixture.componentRef.setInput('periodo', { de: { ano: 2026, mes: 1 }, ate: { ano: 2026, mes: 3 } });
    fixture.detectChanges();

    expect(fixture.componentInstance.opcoes.xaxis.categories).toEqual(['jan/26', 'fev/26', 'mar/26']);
    expect(el().textContent).toContain('jan/26 a mar/26');
  });

  it('sem valor fora do padrão, não há aviso', () => {
    mostrar([l(1, '2026-10-05', 'PAGO NO PRAZO', 250), l(2, '2026-09-05', 'PAGO NO PRAZO', 240)]);
    expect(el().querySelector('.acompanhamento-aviso')).toBeNull();
  });
});
