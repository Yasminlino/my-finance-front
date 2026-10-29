import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanejamentoCardComponent } from './planejamento-card.component';
import { ListaDto } from 'src/app/core/models/lista.model';


function lista(ajuste: Partial<ListaDto> = {}): ListaDto {
  return {
    id: 7, nome: 'Lista de compras', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'BRANCO', resumo: { itens: 4, feitos: 1, total: 0, totalFeito: 0 }, ...ajuste
  };
}

describe('PlanejamentoCardComponent', () => {
  let fixture: ComponentFixture<PlanejamentoCardComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  function montar(l: ListaDto) {
    fixture = TestBed.createComponent(PlanejamentoCardComponent);
    fixture.componentInstance.lista = l;
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PlanejamentoCardComponent] });
  });

  it('mostra nome, número de itens, chips e o ícone na cor da lista', () => {
    montar(lista({ usaQuantidade: true, usaValor: true, icone: 'pi pi-heart', cor: 'rosa' }));

    expect(el().textContent).toContain('Lista de compras');
    expect(el().textContent).toContain('4 itens');
    expect(Array.from(el().querySelectorAll('.planejamento-card__chip')).map(c => c.textContent?.trim())).toEqual(['Qtd', 'Valor']);
    const icone = el().querySelector('.mf-icone-categoria')!;
    expect(icone.classList).toContain('mf-cor-rosa');
    expect(icone.querySelector('i')!.className).toBe('pi pi-heart');
  });

  it('com Valor: total, valor ok e, com limite, o disponível (negativo em vermelho)', () => {
    montar(lista({
      usaValor: true, usaLimite: true, limite: 500,
      resumo: { itens: 3, feitos: 1, total: 620, totalFeito: 120 }
    }));

    const texto = el().textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('R$ 620,00');
    expect(texto).toContain('R$ 120,00 ok');
    expect(texto).toContain('Disponível');
    expect(el().querySelector('.planejamento-card__disponivel')!.classList).toContain('planejamento-card__disponivel--negativo');
    expect(texto).toContain('-R$ 120,00');
  });

  it('com Data: a próxima data ou "Nada pendente", e X de Y feitos', () => {
    montar(lista({ usaData: true, resumo: { itens: 5, feitos: 2, total: 0, totalFeito: 0, proximaData: '2026-10-30' } }));
    expect(el().textContent).toContain('Próximo: 30/10');
    expect(el().textContent).toContain('2 de 5 feitos');

    montar(lista({ usaData: true, resumo: { itens: 5, feitos: 5, total: 0, totalFeito: 0, proximaData: null } }));
    expect(el().textContent).toContain('Nada pendente');
  });

  it('sem Valor nem Data: X de Y concluídos com o percentual', () => {
    montar(lista({ resumo: { itens: 3, feitos: 2, total: 0, totalFeito: 0 } }));

    expect(el().textContent).toContain('2 de 3 concluídos');
    expect(el().textContent).toContain('67%');
  });

  it('clicar no card abre; o ⋮ só abre o menu', () => {
    montar(lista());
    const abriu = jasmine.createSpy('abrir');
    const menu = jasmine.createSpy('menu');
    fixture.componentInstance.abrir.subscribe(abriu);
    fixture.componentInstance.menu.subscribe(menu);

    (el().querySelector('[aria-label="Mais ações de Lista de compras"] button, button[aria-label="Mais ações de Lista de compras"]') as HTMLElement).click();
    expect(menu).toHaveBeenCalled();
    expect(abriu).not.toHaveBeenCalled();

    (el().querySelector('.planejamento-card') as HTMLElement).click();
    expect(abriu).toHaveBeenCalledTimes(1);
  });
});
