import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ItemPlanejamentoFormComponent } from './item-planejamento-form.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';

/** Formulário do item (card #66): só os campos ligados no planejamento. */
describe('ItemPlanejamentoFormComponent', () => {
  let fixture: ComponentFixture<ItemPlanejamentoFormComponent>;
  let service: jasmine.SpyObj<ItemListaService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const tela = () => fixture.componentInstance;
  const form = () => tela().form;
  const el = () => fixture.nativeElement as HTMLElement;
  const painel = () => fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance as FormPanelComponent;

  const compras: ListaDto = {
    id: 8, nome: 'Mercado', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS'
  };
  const tarefas: ListaDto = { ...compras, usaQuantidade: false, usaValor: false, modelo: 'TAREFAS' };
  const agenda: ListaDto = { ...tarefas, usaData: true, usaObservacao: true, modelo: 'AGENDA' };

  function abrir(lista: ListaDto, item: ItemListaDto | null = null) {
    fixture = TestBed.createComponent(ItemPlanejamentoFormComponent);
    fixture.componentRef.setInput('lista', lista);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar', 'atualizar', 'excluir']);
    service.criar.and.callFake((_id, dto) => of({ ...dto, id: 70 } as ItemListaDto));
    service.atualizar.and.callFake((_id, dto) => of(dto as ItemListaDto));
    service.excluir.and.returnValue(of(null));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ItemPlanejamentoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ItemListaService, useValue: service },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: alerta }
      ]
    });
  });

  it('mostra só os campos ligados', () => {
    abrir(tarefas);
    expect(el().querySelector('#item-quantidade')).toBeNull();
    expect(el().querySelector('#item-valor')).toBeNull();
    expect(el().querySelector('#item-data')).toBeNull();
    expect(el().querySelector('#item-observacao')).toBeNull();

    abrir(agenda);
    expect(el().querySelector('#item-data')).not.toBeNull();
    expect(el().querySelector('#item-hora')).not.toBeNull();
    expect(el().querySelector('#item-observacao')).not.toBeNull();
  });

  it('item é obrigatório (só espaços não vale); quantidade ≥ 1; valor ≥ 0', () => {
    abrir(compras);
    form().patchValue({ descricao: '   ' });
    tela().save();
    expect(service.criar).not.toHaveBeenCalled();

    form().patchValue({ descricao: 'Arroz', quantidade: 0 });
    expect(form().controls.quantidade.valid).toBeFalse();
    form().patchValue({ quantidade: 1, valor: -1 });
    expect(form().controls.valor.valid).toBeFalse();
  });

  it('total na hora: qtd × valor no unitário; valor no total', () => {
    abrir(compras);
    form().patchValue({ quantidade: 3, valor: 2.5 });
    expect(tela().total).toBe(7.5);

    abrir({ ...compras, modoValor: 'TOTAL' });
    form().patchValue({ quantidade: 3, valor: 2.5 });
    expect(tela().total).toBe(2.5);
  });

  it('cria só com os campos ligados; hora vai com segundos', () => {
    abrir(agenda);
    const fechou = jasmine.createSpy('closed');
    tela().closed.subscribe(fechou);
    form().patchValue({ descricao: ' Academia ', data: '2026-10-30', hora: '07:30', observacao: 'levar toalha' });

    tela().save();

    expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({
      descricao: 'Academia', data: '2026-10-30', hora: '07:30:00', observacao: 'levar toalha', feito: false,
      quantidade: null, valor: null
    }));
    expect(fechou).toHaveBeenCalledWith(true);
  });

  it('editar mantém o que está escondido (repetição, campos desligados, ordem)', () => {
    const academia: ItemListaDto = {
      id: 5, listaId: 8, descricao: 'Academia', feito: false, data: '2026-10-27', hora: '07:00:00', repeticao: 'SEMANAL',
      diasSemana: [1, 3, 5], repetirAte: null, observacao: 'antiga', quantidade: 2, valor: 30, ordem: 4
    };
    abrir({ ...agenda, usaObservacao: false }, academia);
    expect(painel().titulo).toBe('Editar item');
    expect(form().controls.hora.value).toBe('07:00');
    expect(el().textContent).toContain('repete');

    form().patchValue({ descricao: 'Academia (cedo)', hora: '06:30' });
    tela().save();

    expect(service.atualizar).toHaveBeenCalledWith(8, jasmine.objectContaining({
      id: 5, descricao: 'Academia (cedo)', hora: '06:30:00', repeticao: 'SEMANAL', diasSemana: [1, 3, 5],
      observacao: 'antiga', quantidade: 2, valor: 30, ordem: 4
    }));
  });

  it('Excluir só na edição, com confirmação', async () => {
    abrir(compras);
    expect(el().querySelector('[data-acao="excluir-item"]')).toBeNull();

    abrir(compras, { id: 9, descricao: 'Arroz', feito: false });
    const fechou = jasmine.createSpy('closed');
    tela().closed.subscribe(fechou);
    expect(el().querySelector('[data-acao="excluir-item"]')).not.toBeNull();

    confirmacao.confirmar.and.resolveTo(false);
    await tela().excluir();
    expect(service.excluir).not.toHaveBeenCalled();

    confirmacao.confirmar.and.resolveTo(true);
    await tela().excluir();
    expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('"Arroz"');
    expect(service.excluir).toHaveBeenCalledWith(8, 9);
    expect(fechou).toHaveBeenCalledWith(true);
  });

  it('erro da API avisa e mantém aberto', () => {
    abrir(compras);
    const fechou = jasmine.createSpy('closed');
    tela().closed.subscribe(fechou);
    service.criar.and.returnValue(throwError(() => ({ status: 409 })));
    form().patchValue({ descricao: 'Arroz' });

    tela().save();

    expect(alerta.error).toHaveBeenCalled();
    expect(fechou).not.toHaveBeenCalled();
  });
});
