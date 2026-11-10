import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { BuscaComponent } from './busca.component';
import { daApi, filtrarFixas } from './busca.regras';
import { BuscaService } from '../../services/busca.service';

/** Busca rápida do menu (card #72). */
describe('BuscaComponent', () => {
  let fixture: ComponentFixture<BuscaComponent>;
  let busca: BuscaComponent;
  let servico: jasmine.SpyObj<BuscaService>;
  let router: { navigateByUrl: jasmine.Spy };

  const tecla = (key: string) => busca.teclado(new KeyboardEvent('keydown', { key }));

  beforeEach(() => {
    servico = jasmine.createSpyObj<BuscaService>('BuscaService', ['buscar']);
    servico.buscar.and.returnValue(of([
      { tipo: 'planejamento', id: 3, titulo: 'Mercado do mês' },
      { tipo: 'categoria', id: 4, titulo: 'Mercado', detalhe: 'Despesa' }
    ]));
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    TestBed.configureTestingModule({
      imports: [BuscaComponent],
      providers: [provideNoopAnimations(), { provide: BuscaService, useValue: servico }, { provide: Router, useValue: router }]
    });
    fixture = TestBed.createComponent(BuscaComponent);
    busca = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('sem termo mostra as ações e telas, sem chamar a API', () => {
    expect(busca.resultados[0].titulo).toBe('Nova conta a pagar');
    expect(servico.buscar).not.toHaveBeenCalled();
  });

  it('com 2+ letras busca na API depois da pausa e junta com as telas', fakeAsync(() => {
    busca.termo = 'merc';
    busca.aoDigitar();
    tick(300);

    expect(servico.buscar).toHaveBeenCalledWith('merc');
    expect(busca.resultados.map(r => r.url)).toEqual(['/planejamento/3', '/categorias?editar=4']);
  }));

  it('↑↓ escolhem, Enter abre e fecha; Esc fecha', () => {
    const fechou = jasmine.createSpy('fechado');
    busca.fechado.subscribe(fechou);

    tecla('ArrowDown');
    tecla('ArrowDown');
    tecla('ArrowUp');
    expect(busca.selecionado).toBe(1);
    tecla('Enter');
    expect(router.navigateByUrl).toHaveBeenCalledWith(busca.resultados[1].url);
    expect(fechou).toHaveBeenCalledTimes(1);

    tecla('Escape');
    expect(fechou).toHaveBeenCalledTimes(2);
  });

  it('regras: sem acento acha a tela; cada tipo da API abre no registro', () => {
    expect(filtrarFixas('relatorio').map(e => e.titulo)).toEqual(['Relatório do mês']);
    expect(daApi({ tipo: 'item', id: 8, titulo: 'Arroz', listaId: 3 })?.url).toBe('/planejamento/3');
    expect(daApi({ tipo: 'conta-fixa', id: 5, titulo: 'Internet' })?.url).toBe('/contas?editar=5');
    expect(daApi({ tipo: 'item', id: 8, titulo: 'Sem lista' })).toBeNull();
  });
});
