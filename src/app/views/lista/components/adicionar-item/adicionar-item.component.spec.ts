import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AdicionarItemComponent } from './adicionar-item.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';

/** Adicionar rápido (card #66): descrição + qtd/valor se ligados, Enter grava e o foco fica. */
describe('AdicionarItemComponent', () => {
  let fixture: ComponentFixture<AdicionarItemComponent>;
  let service: jasmine.SpyObj<ItemListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const tela = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;

  const compras: ListaDto = {
    id: 8, nome: 'Mercado', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS'
  };

  function montar(lista: ListaDto) {
    fixture = TestBed.createComponent(AdicionarItemComponent);
    fixture.componentRef.setInput('lista', lista);
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar']);
    service.criar.and.callFake((_id, dto) => of({ ...dto, id: 71 } as ItemListaDto));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['error']);
    TestBed.configureTestingModule({
      imports: [AdicionarItemComponent],
      providers: [provideNoopAnimations(), { provide: ItemListaService, useValue: service }, { provide: AlertService, useValue: alerta }]
    });
  });

  it('só mostra quantidade e valor se o planejamento usa', () => {
    montar({ ...compras, usaQuantidade: false, usaValor: false, modelo: 'TAREFAS' });
    expect(el().querySelector('[aria-label="Quantidade"]')).toBeNull();
    expect(el().querySelector('[aria-label="Valor"]')).toBeNull();
    expect(el().querySelector('input')!.getAttribute('placeholder')).toBe('Adicionar tarefa...');

    montar(compras);
    expect(el().querySelector('p-inputnumber[ariaLabel="Quantidade"], [aria-label="Quantidade"]')).not.toBeNull();
    expect(el().querySelector('input')!.getAttribute('placeholder')).toBe('Adicionar item...');
  });

  it('grava, emite, limpa e devolve o foco para a descrição', () => {
    montar(compras);
    const adicionados: ItemListaDto[] = [];
    tela().adicionado.subscribe(i => adicionados.push(i));
    tela().form.patchValue({ descricao: ' Arroz ', quantidade: 2, valor: 6.5 });

    tela().adicionar();

    expect(service.criar).toHaveBeenCalledWith(8, { descricao: 'Arroz', feito: false, quantidade: 2, valor: 6.5 });
    expect(adicionados.map(i => i.id)).toEqual([71]);
    expect(tela().form.getRawValue()).toEqual({ descricao: '', quantidade: 1, valor: null });
    expect(document.activeElement).toBe(el().querySelector('input[aria-label="Novo item"]'));
  });

  it('o item seguinte não herda o valor do anterior (Enter saindo do campo de valor)', () => {
    montar(compras);
    const valor = el().querySelector('[aria-label="Valor"] input, input[aria-label="Valor"]') as HTMLInputElement;
    valor.focus();
    tela().form.patchValue({ descricao: 'Arroz', valor: 6.5 });
    fixture.detectChanges();

    tela().adicionar();
    fixture.detectChanges();
    tela().form.patchValue({ descricao: 'Feijão' });
    tela().adicionar();

    expect(service.criar.calls.mostRecent().args[1]).toEqual({ descricao: 'Feijão', feito: false, quantidade: 1, valor: null });
  });

  it('sem descrição não grava; quantidade desligada não vai', () => {
    montar({ ...compras, usaQuantidade: false });
    tela().form.patchValue({ descricao: '   ' });
    tela().adicionar();
    expect(service.criar).not.toHaveBeenCalled();

    tela().form.patchValue({ descricao: 'Luz', valor: 120 });
    tela().adicionar();
    expect(service.criar).toHaveBeenCalledWith(8, { descricao: 'Luz', feito: false, valor: 120 });
  });

  it('erro mantém o texto e avisa', () => {
    montar(compras);
    service.criar.and.returnValue(throwError(() => ({ status: 409 })));
    tela().form.patchValue({ descricao: 'Arroz' });

    tela().adicionar();

    expect(alerta.error).toHaveBeenCalled();
    expect(tela().form.controls.descricao.value).toBe('Arroz');
  });
});
