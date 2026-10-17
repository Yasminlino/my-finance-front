import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Button } from 'primeng/button';

import { BarraEdicaoComponent } from './barra-edicao.component';

/** Barra do modo edição: mês, contador, aviso de erros e Descartar / Salvar alterações (N). */
describe('BarraEdicaoComponent', () => {
  let fixture: ComponentFixture<BarraEdicaoComponent>;
  const texto = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
  const botao = (rotulo: string) =>
    fixture.debugElement.queryAll(By.directive(Button))
      .map(d => d.componentInstance as Button)
      .find(b => (b.label ?? '').startsWith(rotulo))!;

  const mostrar = (entradas: { mes?: string; contagem?: number; temErros?: boolean; salvando?: boolean }) => {
    fixture = TestBed.createComponent(BarraEdicaoComponent);
    fixture.componentRef.setInput('mes', entradas.mes ?? 'outubro de 2026');
    fixture.componentRef.setInput('contagem', entradas.contagem ?? 0);
    fixture.componentRef.setInput('temErros', entradas.temErros ?? false);
    fixture.componentRef.setInput('salvando', entradas.salvando ?? false);
    fixture.detectChanges();
  };

  it('mostra o mês, o contador e os atalhos', () => {
    mostrar({ contagem: 2 });

    expect(texto()).toContain('Você está editando as contas de outubro de 2026');
    expect(texto()).toContain('2 alterações');
    expect(texto()).toContain('Esc');
    expect(botao('Salvar alterações').label).toBe('Salvar alterações (2)');
  });

  it('sem alterações ou com erro o Salvar fica desabilitado', () => {
    mostrar({ contagem: 0 });
    expect(botao('Salvar alterações').disabled).toBeTrue();

    mostrar({ contagem: 1, temErros: true });
    expect(botao('Salvar alterações').disabled).toBeTrue();
    expect(texto()).toContain('Corrija os campos em vermelho');

    mostrar({ contagem: 1 });
    expect(botao('Salvar alterações').disabled).toBeFalse();
    expect(texto()).toContain('1 alteração');
  });

  it('com erro, o aviso toma o lugar dos atalhos (a barra não quebra em duas linhas)', () => {
    mostrar({ contagem: 1, temErros: true });

    expect(texto()).toContain('Corrija os campos em vermelho');
    expect(texto()).not.toContain('Esc');
  });

  it('emite descartar e salvar', () => {
    mostrar({ contagem: 1 });
    const descartar = jasmine.createSpy('descartar');
    const salvar = jasmine.createSpy('salvar');
    fixture.componentInstance.descartar.subscribe(descartar);
    fixture.componentInstance.salvar.subscribe(salvar);

    botao('Descartar').onClick.emit(new MouseEvent('click'));
    botao('Salvar alterações').onClick.emit(new MouseEvent('click'));

    expect(descartar).toHaveBeenCalled();
    expect(salvar).toHaveBeenCalled();
  });
});
