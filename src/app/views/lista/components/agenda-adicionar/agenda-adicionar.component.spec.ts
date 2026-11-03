import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AgendaAdicionarComponent, PreviaDoItem } from './agenda-adicionar.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import { isoDe, somarDias } from '../../agenda.regras';

/** Adicionar rápido da agenda (card #69, parte 2). */
describe('AgendaAdicionarComponent', () => {
  let fixture: ComponentFixture<AgendaAdicionarComponent>;
  let service: jasmine.SpyObj<ItemListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const movel = signal(false);
  const tela = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;

  const agenda: ListaDto = {
    id: 11, nome: 'Agenda', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false, usaData: true,
    usaObservacao: false, modelo: 'AGENDA'
  };
  const amanha = isoDe(somarDias(new Date(), 1));
  const padrao = '2026-12-10';

  function abrir() {
    fixture = TestBed.createComponent(AgendaAdicionarComponent);
    fixture.componentRef.setInput('lista', agenda);
    fixture.componentRef.setInput('padrao', padrao);
    fixture.detectChanges();
  }

  function digitar(texto: string) {
    tela().texto = texto;
    tela().aoDigitar();
    fixture.detectChanges();
  }

  beforeEach(() => {
    movel.set(false);
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar']);
    service.criar.and.callFake((_l, dto) => of({ ...dto, id: 99 } as ItemListaDto));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [AgendaAdicionarComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ItemListaService, useValue: service },
        { provide: AlertService, useValue: alerta },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
  });

  it('o texto preenche data, hora e repetir enquanto digita, e mostra a prévia', () => {
    abrir();
    const previas: (PreviaDoItem | null)[] = [];
    tela().previa.subscribe(p => previas.push(p));
    digitar('Dentista amanhã 14h30');
    expect(tela().descricao).toBe('Dentista');
    expect(tela().data).toBe(amanha);
    expect(tela().hora).toBe('14:30');
    expect(tela().repeticao).toBe('NENHUMA');
    expect(previas[previas.length - 1]).toEqual({ descricao: 'Dentista', data: amanha, hora: '14:30' });
  });

  it('sem dia no texto, vale o dia mostrado na agenda; trocar o dia mostrado acompanha', () => {
    abrir();
    expect(tela().data).toBe(padrao);
    digitar('Comprar presente');
    expect(tela().data).toBe(padrao);
    fixture.componentRef.setInput('padrao', '2026-12-11');
    fixture.detectChanges();
    expect(tela().data).toBe('2026-12-11');
  });

  it('campo mexido na mão não é mais sobrescrito pelo texto', () => {
    abrir();
    digitar('Dentista amanhã');
    tela().data = '2026-12-20';
    tela().mexeu('data');
    digitar('Dentista amanhã 9h');
    expect(tela().data).toBe('2026-12-20');
    expect(tela().hora).toBe('09:00');
  });

  it('Adicionar grava com a regra, limpa e avisa a agenda', () => {
    abrir();
    let adicionados = 0;
    tela().adicionado.subscribe(() => adicionados++);
    const previas: (PreviaDoItem | null)[] = [];
    tela().previa.subscribe(p => previas.push(p));
    digitar('Feira toda quinta 8h');
    tela().adicionar();
    expect(service.criar).toHaveBeenCalledWith(11, jasmine.objectContaining({
      descricao: 'Feira', hora: '08:00:00', repeticao: 'SEMANAL', diasSemana: [4], feito: false, quantidade: null
    }));
    expect(adicionados).toBe(1);
    expect(tela().texto).toBe('');
    expect(tela().data).toBe(padrao);
    expect(previas[previas.length - 1]).toBeNull();
  });

  it('escolher "Toda semana" na mão usa o dia da data', () => {
    abrir();
    digitar('Pilates 15/12/2026 7h');
    tela().repeticao = 'SEMANAL';
    tela().mexeu('repeticao');
    tela().adicionar();
    expect(service.criar).toHaveBeenCalledWith(11, jasmine.objectContaining({ data: '2026-12-15', repeticao: 'SEMANAL', diasSemana: [2] }));
  });

  it('sem descrição não grava; erro avisa e mantém o texto', () => {
    abrir();
    tela().adicionar();
    expect(service.criar).not.toHaveBeenCalled();
    service.criar.and.returnValue(throwError(() => ({ error: { message: 'Fora do ar' } })));
    digitar('Dentista amanhã');
    tela().adicionar();
    expect(alerta.error).toHaveBeenCalled();
    expect(tela().texto).toBe('Dentista amanhã');
  });

  it('desktop: uma linha com texto, data, hora, repetir e Adicionar', () => {
    abrir();
    expect(el().querySelector('.adicionar')).not.toBeNull();
    expect(el().querySelector('input[type="date"]')).not.toBeNull();
    expect(el().querySelector('input[type="time"]')).not.toBeNull();
    expect(el().querySelector('p-dropdown')).not.toBeNull();
    expect(el().querySelector('.adicionar-barra')).toBeNull();
  });

  it('celular: barra embaixo; mostra o que entendeu; o + vazio abre o formulário completo', () => {
    movel.set(true);
    abrir();
    expect(el().querySelector('.adicionar-barra')).not.toBeNull();
    expect(el().querySelector('input[type="date"]')).toBeNull();
    digitar('Dentista amanhã 14h30');
    expect(el().querySelector('.adicionar-barra__entendido')!.textContent).toMatch(/^Amanhã · .* · 14:30$/);
    digitar('');
    const pedidos: string[] = [];
    tela().abrirFormulario.subscribe(d => pedidos.push(d));
    tela().adicionar();
    expect(pedidos).toEqual([padrao]);
    expect(service.criar).not.toHaveBeenCalled();
  });
});
