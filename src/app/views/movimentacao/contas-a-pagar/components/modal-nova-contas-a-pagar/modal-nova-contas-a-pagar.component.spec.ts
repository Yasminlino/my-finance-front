import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { ModalNovaContasAPagarComponent } from './modal-nova-contas-a-pagar.component';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Valor da nova conta com a máscara única (currencyInput): número no formulário (FE-P2-10). */
describe('ModalNovaContasAPagarComponent', () => {
  let fixture: ComponentFixture<ModalNovaContasAPagarComponent>;
  let service: jasmine.SpyObj<ContaMensalService>;
  let alertas: jasmine.SpyObj<AlertService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['criar']);
    service.criar.and.returnValue(of({}));
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listarAtivas']);
    categorias.listarAtivas.and.returnValue(of([]));
    alertas = jasmine.createSpyObj<AlertService>('AlertService', ['success']);
    TestBed.configureTestingModule({
      imports: [ModalNovaContasAPagarComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ContaMensalService, useValue: service },
        { provide: CategoryService, useValue: categorias },
        { provide: AlertService, useValue: alertas }
      ]
    });
    fixture = TestBed.createComponent(ModalNovaContasAPagarComponent);
    fixture.componentInstance.dataOperacao = new Date(2026, 9, 1);
    fixture.detectChanges();
  });

  /** Salvar e responder "Sim, cadastrar" na pergunta (card #47). */
  const salvarCadastrando = () => {
    fixture.componentInstance.save();
    fixture.componentInstance.gravar(true);
  };

  it('sem valor não salva', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', dataOperacao: '10', categoryId: 6 });

    fixture.componentInstance.save();

    expect(service.criar).not.toHaveBeenCalled();
  });

  it('salva o valor como número', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: '10', categoryId: 6 });

    salvarCadastrando();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ valor: 15.5 }));
  });

  it('aceita vários dias: envia os dias em ordem e a data do primeiro', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Escola', valor: 300, dataOperacao: '20, 5', categoryId: 6 });

    salvarCadastrando();

    const payload = service.criar.calls.mostRecent().args[0];
    expect(payload.diasVencimento).toEqual([5, 20]);
    expect((payload.data as Date).getDate()).toBe(5);
  });

  it('um dia só continua funcionando', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: '10', categoryId: 6 });

    salvarCadastrando();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ diasVencimento: [10] }));
  });

  it('dia repetido ou maior que 31 não salva e marca o campo', () => {
    for (const dias of ['5, 5', '32']) {
      fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: dias, categoryId: 6 });

      fixture.componentInstance.save();

      expect(fixture.componentInstance.erro('dataOperacao')).toBeTrue();
      expect(fixture.componentInstance.perguntandoCadastro).toBeFalse();
    }
    expect(service.criar).not.toHaveBeenCalled();
  });

  it('abre no painel lateral, categoria é p-dropdown e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));

    expect(dialogo.componentInstance.titulo).toBe('Nova conta');
    expect((fixture.nativeElement as HTMLElement).querySelector('p-dropdown[formControlName=categoryId]')).not.toBeNull();
    dialogo.componentInstance.fechar.emit();
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  describe('padrão do Cadastro de Contas (card #49)', () => {
    const painel = () => fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance as FormPanelComponent;
    const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');

    it('seções Identificação e Valor e vencimento', () => {
      const secoes = Array.from(document.querySelectorAll('.mf-form-panel .mf-section-title')).map(s => s.textContent?.trim());
      expect(secoes).toContain('Identificação');
      expect(secoes).toContain('Valor e vencimento');
    });

    it('categoria escolhida aparece com o ícone e a cor do cadastro', () => {
      fixture.componentInstance.categorias = [
        { id: 6, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, icone: 'pi pi-home', cor: '#2563eb' }
      ];
      fixture.detectChanges();
      fixture.componentInstance.form.patchValue({ categoryId: 6 });
      fixture.detectChanges();

      const dropdown = document.querySelector('p-dropdown[formControlName=categoryId]')!;
      expect(dropdown.querySelector('mf-category-icon')).not.toBeNull();
      expect(dropdown.textContent).toContain('Casa');
    });

    it('"Salvar e criar outra": grava, limpa o formulário e continua aberto; ao fechar, recarrega o mês', () => {
      const fechado = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechado);
      expect(painel().criarOutra).toBeTrue();
      fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: '10', categoryId: 6 });

      painel().salvarEOutra.emit();
      fixture.detectChanges();
      expect(texto()).toContain('Cadastrar também em Contas?');
      fixture.componentInstance.gravar(true);
      fixture.detectChanges();

      expect(service.criar).toHaveBeenCalledTimes(1);
      expect(fechado).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.value.nomeConta).toBeFalsy();
      expect(fixture.componentInstance.form.value.valor).toBeNull();
      expect(alertas.success).toHaveBeenCalledOnceWith('Conta salva com sucesso!');

      painel().fechar.emit();
      expect(fechado).toHaveBeenCalledOnceWith(true);
    });

    it('"Salvar e criar outra" com o formulário inválido não pergunta nem grava', () => {
      painel().salvarEOutra.emit();

      expect(fixture.componentInstance.perguntandoCadastro).toBeFalse();
      expect(service.criar).not.toHaveBeenCalled();
    });
  });

  describe('pergunta "Cadastrar também em Contas?" (card #47)', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    beforeEach(() => fixture.componentInstance.form.patchValue({ nomeConta: 'Presente', valor: 300, dataOperacao: '10, 20', categoryId: 6 }));

    it('Salvar válido não grava ainda: abre a pergunta', () => {
      fixture.componentInstance.save();
      fixture.detectChanges();

      expect(service.criar).not.toHaveBeenCalled();
      expect(fixture.componentInstance.perguntandoCadastro).toBeTrue();
      expect(document.body.textContent).toContain('Cadastrar também em Contas?');
    });

    it('"Sim, cadastrar" grava como antes, criando a conta', () => {
      salvarCadastrando();

      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ cadastrarConta: true, nome: 'Presente' }));
      expect(alertas.success).toHaveBeenCalledOnceWith('Conta salva com sucesso!');
      expect(fixture.componentInstance.perguntandoCadastro).toBeFalse();
    });

    it('"Não, só este mês" grava só o lançamento avulso', () => {
      fixture.componentInstance.save();
      fixture.componentInstance.gravar(false);

      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ cadastrarConta: false, diasVencimento: [10, 20] }));
    });

    it('fechar a pergunta volta ao formulário sem gravar', () => {
      const fechado = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechado);
      fixture.componentInstance.save();

      fixture.componentInstance.perguntandoCadastro = false;

      expect(service.criar).not.toHaveBeenCalled();
      expect(fechado).not.toHaveBeenCalled();
      expect(el().querySelector('#cp-nome')).not.toBeNull();
    });
  });
});
