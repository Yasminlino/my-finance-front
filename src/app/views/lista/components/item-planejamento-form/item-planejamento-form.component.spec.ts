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
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar', 'atualizar', 'excluir', 'alterarOcorrencia', 'dividir', 'encerrar']);
    service.alterarOcorrencia.and.returnValue(of(null));
    service.dividir.and.callFake((_l, _i, _d, dto) => of({ ...dto, id: 80 } as ItemListaDto));
    service.encerrar.and.returnValue(of(null));
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
    form().patchValue({ descricao: ' Academia ', data: '2026-10-30', diaTodo: false, hora: '07:30', observacao: 'levar toalha' });

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
    expect(el().textContent).toContain('Seg, qua e sex às 07:00');

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

  describe('repetição (card #69)', () => {
    const academia: ItemListaDto = {
      id: 5, listaId: 8, descricao: 'Academia', feito: false, data: '2026-10-26', hora: '07:00:00', repeticao: 'SEMANAL',
      diasSemana: [1, 3, 5], repetirAte: null
    };

    it('Toda semana começa pelo dia da data; o resumo da regra acompanha', () => {
      abrir(agenda);
      form().patchValue({ descricao: 'Feira', data: '2026-10-29', diaTodo: false, hora: '08:00' });
      form().controls.repeticao.setValue('SEMANAL');
      fixture.detectChanges();

      expect(form().controls.diasSemana.value).toEqual([4]);
      expect(tela().resumoRegra).toBe('Qui às 08:00 · sem data de fim');
      expect(el().querySelector('#item-repetir-ate')).not.toBeNull();
    });

    it('repetir exige data, um dia na semanal e "até" depois da data', () => {
      abrir(agenda);
      form().patchValue({ descricao: 'Feira', repeticao: 'DIARIA', data: null });
      expect(form().errors).toEqual({ repeticaoSemData: true });

      form().patchValue({ data: '2026-10-29', repeticao: 'SEMANAL', diasSemana: [] });
      expect(form().errors).toEqual({ semanaSemDias: true });

      form().patchValue({ diasSemana: [4], repetirAte: '2026-10-01' });
      expect(form().errors).toEqual({ ateAntesDaData: true });

      tela().save();
      expect(service.criar).not.toHaveBeenCalled();
    });

    it('cria com a regra; ao não repetir, dias e "até" vão vazios', () => {
      abrir(agenda);
      form().patchValue({ descricao: 'Academia', data: '2026-10-26', diaTodo: false, hora: '07:00', repeticao: 'SEMANAL', diasSemana: [5, 1, 3] });
      tela().save();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({
        repeticao: 'SEMANAL', diasSemana: [1, 3, 5], repetirAte: null, hora: '07:00:00'
      }));

      abrir(agenda);
      form().patchValue({ descricao: 'Dentista', data: '2026-11-03', repetirAte: '2026-12-01' });
      tela().save();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ repeticao: 'NENHUMA', diasSemana: null, repetirAte: null }));
    });

    it('novo aberto de um dia da agenda já vem com a data', () => {
      fixture = TestBed.createComponent(ItemPlanejamentoFormComponent);
      fixture.componentRef.setInput('lista', agenda);
      fixture.componentRef.setInput('dataInicial', '2026-10-30');
      fixture.detectChanges();

      expect(form().controls.data.value).toBe('2026-10-30');
    });

    function abrirOcorrencia() {
      fixture = TestBed.createComponent(ItemPlanejamentoFormComponent);
      fixture.componentRef.setInput('lista', agenda);
      fixture.componentRef.setInput('item', academia);
      fixture.componentRef.setInput('dataOriginal', '2026-10-28');
      fixture.detectChanges();
    }

    it('aberto de um dia: mostra a data da ocorrência e salvar pergunta o alcance', () => {
      abrirOcorrencia();
      expect(form().controls.data.value).toBe('2026-10-28');

      tela().save();
      fixture.detectChanges();

      expect(service.atualizar).not.toHaveBeenCalled();
      expect(el().querySelector('[data-acao="so-esta"]')).not.toBeNull();
      expect(el().querySelector('[data-acao="esta-e-proximas"]')).not.toBeNull();
    });

    it('"Só esta" muda só a ocorrência (data, hora e feito)', () => {
      abrirOcorrencia();
      form().patchValue({ data: '2026-10-29', hora: '06:30', feito: true });
      tela().save();

      tela().aplicarAlcance(true);

      expect(service.alterarOcorrencia).toHaveBeenCalledWith(8, 5, '2026-10-28', { feito: true, data: '2026-10-29', hora: '06:30:00' });
    });

    it('"Esta e as próximas" divide o item a partir da ocorrência com o que está no formulário', () => {
      abrirOcorrencia();
      form().patchValue({ descricao: 'Academia (cedo)', hora: '06:00' });
      tela().save();

      tela().aplicarAlcance(false);

      expect(service.dividir).toHaveBeenCalledWith(8, 5, '2026-10-28', jasmine.objectContaining({
        descricao: 'Academia (cedo)', hora: '06:00:00', repeticao: 'SEMANAL', diasSemana: [1, 3, 5]
      }));
    });

    it('excluir pergunta o alcance: só esta pula a ocorrência; esta e as próximas encerra', async () => {
      abrirOcorrencia();
      await tela().excluir();
      tela().aplicarAlcance(true);
      expect(service.alterarOcorrencia).toHaveBeenCalledWith(8, 5, '2026-10-28', { pulada: true });

      abrirOcorrencia();
      await tela().excluir();
      tela().aplicarAlcance(false);
      expect(service.encerrar).toHaveBeenCalledWith(8, 5, '2026-10-28');
      expect(confirmacao.confirmar).not.toHaveBeenCalled();
      expect(service.excluir).not.toHaveBeenCalled();
    });

    it('aberto pela lista de itens (sem dia): salva o item inteiro, sem perguntar', () => {
      abrir(agenda, academia);
      form().patchValue({ hora: '06:00' });

      tela().save();

      expect(service.atualizar).toHaveBeenCalledWith(8, jasmine.objectContaining({ id: 5, hora: '06:00:00', repeticao: 'SEMANAL' }));
    });
  });

  describe('campo Tipo (card #61)', () => {
    const comTipo: ListaDto = { ...compras, usaTipo: true };

    it('só aparece com o campo ligado, com os tipos já usados como sugestão', () => {
      abrir(compras);
      expect(el().querySelector('#item-tipo')).toBeNull();
      fixture = TestBed.createComponent(ItemPlanejamentoFormComponent);
      fixture.componentRef.setInput('lista', comTipo);
      fixture.componentRef.setInput('tipos', ['Farmácia', 'Mercado']);
      fixture.detectChanges();
      expect(el().querySelector('#item-tipo')).not.toBeNull();
      expect(Array.from(el().querySelectorAll('#item-tipos option')).map(o => o.getAttribute('value'))).toEqual(['Farmácia', 'Mercado']);
    });

    it('grava sem espaços nas pontas; vazio vai como sem tipo', () => {
      abrir(comTipo);
      form().patchValue({ descricao: 'Arroz', tipo: '  Mercado ' });
      painel().salvar.emit();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ tipo: 'Mercado' }));
      abrir(comTipo);
      form().patchValue({ descricao: 'Pilhas', tipo: '   ' });
      painel().salvar.emit();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Pilhas', tipo: null }));
    });

    it('com o campo desligado, o tipo guardado continua como estava', () => {
      abrir(compras, { id: 5, listaId: 8, descricao: 'Arroz', feito: false, tipo: 'Mercado' } as ItemListaDto);
      painel().salvar.emit();
      expect(service.atualizar).toHaveBeenCalledWith(8, jasmine.objectContaining({ id: 5, tipo: 'Mercado' }));
    });
  });

  describe('layout do mockup (card #69, parte 1b)', () => {
    it('o exemplo do campo Item segue o planejamento', () => {
      abrir(agenda);
      expect((el().querySelector('#item-descricao') as HTMLInputElement).placeholder).toBe('Ex.: Consulta no dentista');
      expect((el().querySelector('#item-observacao') as HTMLTextAreaElement).placeholder).toBe('Ex.: levar toalha');
    });

    it('compras mostra "Ex.: Arroz"', () => {
      abrir(compras);
      expect((el().querySelector('#item-descricao') as HTMLInputElement).placeholder).toBe('Ex.: Arroz');
    });

    it('"Dia todo" ligado no novo: sem hora; desligado, a hora é obrigatória e vai gravada', () => {
      abrir(agenda);
      expect(form().controls.diaTodo.value).toBeTrue();
      expect(form().controls.hora.disabled).toBeTrue();
      form().patchValue({ descricao: 'Dentista', data: '2026-11-04' });
      form().controls.diaTodo.setValue(false);
      expect(form().controls.hora.enabled).toBeTrue();
      expect(form().errors).toEqual({ semHora: true });
      form().controls.hora.setValue('14:30');
      expect(form().valid).toBeTrue();
      painel().salvar.emit();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ hora: '14:30:00' }));
    });

    it('ligar "Dia todo" de novo limpa a hora', () => {
      abrir(agenda);
      form().controls.diaTodo.setValue(false);
      form().controls.hora.setValue('14:30');
      form().controls.diaTodo.setValue(true);
      form().patchValue({ descricao: 'Feriado', data: '2026-11-15' });
      painel().salvar.emit();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ hora: null }));
    });

    it('editar item com hora abre com "Dia todo" desligado; sem hora, ligado', () => {
      abrir(agenda, { id: 5, listaId: 8, descricao: 'Academia', feito: false, data: '2026-10-27', hora: '07:00:00' } as ItemListaDto);
      expect(form().controls.diaTodo.value).toBeFalse();
      expect(form().controls.hora.value).toBe('07:00');
      abrir(agenda, { id: 6, listaId: 8, descricao: 'Feriado', feito: false, data: '2026-11-15', hora: null } as ItemListaDto);
      expect(form().controls.diaTodo.value).toBeTrue();
    });

    it('Repetir é um dropdown; dias da semana em letras, com o nome inteiro para o leitor de tela', () => {
      abrir(agenda);
      expect(el().querySelector('p-dropdown#item-repetir, p-dropdown [id="item-repetir"]')).not.toBeNull();
      form().patchValue({ data: '2026-11-04' });
      form().controls.repeticao.setValue('SEMANAL');
      fixture.detectChanges();
      const dias = Array.from(el().querySelectorAll('.item-dias-semana [role="button"], .item-dias-semana .p-button'));
      expect(dias.map(d => d.textContent!.trim())).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
      expect(dias.map(d => d.getAttribute('aria-label'))).toContain('Quarta');
    });

    it('resumo diz quando não tem data de fim', () => {
      abrir(agenda);
      form().patchValue({ descricao: 'Academia', data: '2026-11-02', diaTodo: false, hora: '07:00', repeticao: 'SEMANAL', diasSemana: [1, 3, 5] });
      fixture.detectChanges();
      expect(el().textContent).toContain('Seg, qua e sex às 07:00 · sem data de fim');
      form().patchValue({ repetirAte: '2026-11-30' });
      fixture.detectChanges();
      expect(el().textContent).toContain('Seg, qua e sex às 07:00, até 30/11/2026');
    });

    it('"Salvar e outro" só no novo: grava, avisa a tela, limpa e mantém a data', () => {
      abrir(agenda, null);
      expect(painel().criarOutra).toBeTrue();
      let salvos = 0;
      const fechados: boolean[] = [];
      tela().salvo.subscribe(() => salvos++);
      tela().closed.subscribe(f => fechados.push(f));
      form().patchValue({ descricao: 'Dentista', data: '2026-11-04', observacao: 'levar exames' });
      painel().salvarEOutra.emit();
      expect(service.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Dentista', data: '2026-11-04' }));
      expect(salvos).toBe(1);
      expect(fechados.length).toBe(0);
      expect(form().controls.descricao.value).toBe('');
      expect(form().controls.observacao.value).toBeNull();
      expect(form().controls.data.value).toBe('2026-11-04');
      expect(alerta.success).toHaveBeenCalled();

      abrir(agenda, { id: 5, listaId: 8, descricao: 'Academia', feito: false } as ItemListaDto);
      expect(painel().criarOutra).toBeFalse();
    });

    it('"Salvar e outro" com o formulário inválido não grava', () => {
      abrir(agenda);
      painel().salvarEOutra.emit();
      expect(service.criar).not.toHaveBeenCalled();
    });
  });
});
