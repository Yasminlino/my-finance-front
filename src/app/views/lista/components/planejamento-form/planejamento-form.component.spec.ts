import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { PlanejamentoFormComponent } from './planejamento-form.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto } from 'src/app/core/models/lista.model';

/** Formulário de planejamento (card #63): modelo, campos, aparência, prévia e Criar e abrir. */
describe('PlanejamentoFormComponent', () => {
  let fixture: ComponentFixture<PlanejamentoFormComponent>;
  let service: jasmine.SpyObj<ListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const form = () => fixture.componentInstance.form;
  const texto = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
  const painel = () => fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance as FormPanelComponent;

  const gastos: ListaDto = {
    id: 20, nome: 'Gastos do mês', icone: 'pi pi-wallet', cor: 'verde', usaQuantidade: false, usaValor: true, modoValor: 'TOTAL',
    usaLimite: true, limite: 3000, usaData: false, usaObservacao: true, modelo: 'ORCAMENTO', serieId: 'abc', listaOrigemId: null
  };

  const abrir = (registro: ListaDto | null) => {
    fixture = TestBed.createComponent(PlanejamentoFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ListaService>('ListaService', ['criar', 'atualizar']);
    service.criar.and.callFake(dto => of({ ...dto, id: 55 } as ListaDto));
    service.atualizar.and.callFake(dto => of(dto as ListaDto));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [PlanejamentoFormComponent],
      providers: [provideNoopAnimations(), { provide: ListaService, useValue: service }, { provide: AlertService, useValue: alerta }]
    });
  });

  describe('novo', () => {
    beforeEach(() => abrir(null));

    it('abre como "Novo planejamento" com o modelo Compras e os campos dele', () => {
      expect(painel().titulo).toBe('Novo planejamento');
      expect(form().getRawValue()).toEqual(jasmine.objectContaining({
        modelo: 'COMPRAS', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false, usaData: false
      }));
    });

    it('trocar de modelo regrava os campos', () => {
      form().controls.usaData.setValue(true);
      form().controls.modelo.setValue('ORCAMENTO');

      expect(form().getRawValue()).toEqual(jasmine.objectContaining({
        usaQuantidade: false, usaValor: true, modoValor: 'TOTAL', usaLimite: true, usaData: false, usaObservacao: true
      }));
    });

    it('nome é obrigatório; não grava sem ele', () => {
      fixture.componentInstance.save();

      expect(service.criar).not.toHaveBeenCalled();
      expect(form().controls.nome.touched).toBeTrue();
    });

    it('grava com a aparência e os campos, e fecha recarregando', () => {
      const fechou = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechou);
      form().patchValue({ nome: '  Mercado  ', icone: 'pi pi-heart', cor: 'rosa' });

      fixture.componentInstance.save();

      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({
        nome: 'Mercado', icone: 'pi pi-heart', cor: 'rosa', modelo: 'COMPRAS', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO'
      }));
      expect(fechou).toHaveBeenCalledWith(true);
    });

    it('"Criar e abrir" grava e emite o planejamento criado', () => {
      const abriu = jasmine.createSpy('abrir');
      fixture.componentInstance.abrir.subscribe(abriu);
      expect(painel().criarOutra).toBeTrue();
      expect(painel().rotuloCriarOutra).toBe('Criar e abrir');
      form().patchValue({ nome: 'Mercado' });

      painel().salvarEOutra.emit();

      expect(abriu).toHaveBeenCalledWith(jasmine.objectContaining({ id: 55, nome: 'Mercado' }));
    });

    it('erro da API aparece e o painel fica aberto', () => {
      const fechou = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechou);
      service.criar.and.returnValue(throwError(() => ({ status: 409, error: { mensagem: 'Cor inválida: x.' } })));
      form().patchValue({ nome: 'Mercado' });

      fixture.componentInstance.save();

      expect(alerta.error).toHaveBeenCalled();
      expect(fechou).not.toHaveBeenCalled();
    });
  });

  describe('Limite × Valor', () => {
    beforeEach(() => abrir(null));

    it('sem Valor, o Limite desliga e fica travado', () => {
      form().controls.usaLimite.setValue(true);
      form().controls.limite.setValue(500);
      form().controls.usaValor.setValue(false);

      expect(form().controls.usaLimite.value).toBeFalse();
      expect(form().controls.usaLimite.disabled).toBeTrue();

      form().controls.usaValor.setValue(true);
      expect(form().controls.usaLimite.enabled).toBeTrue();
    });

    it('Limite ligado exige o valor do limite (≥ 0)', () => {
      form().patchValue({ nome: 'Casa' });
      form().controls.usaLimite.setValue(true);
      fixture.componentInstance.save();
      expect(service.criar).not.toHaveBeenCalled();

      form().controls.limite.setValue(-1);
      expect(form().controls.limite.valid).toBeFalse();

      form().controls.limite.setValue(800);
      fixture.componentInstance.save();
      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ usaLimite: true, limite: 800 }));
    });
  });

  describe('prévia', () => {
    beforeEach(() => abrir(null));

    it('segue os campos ligados', () => {
      expect(fixture.componentInstance.previa).toBe('Arroz × 2 · R$ 6,50 = R$ 13,00');

      form().controls.modoValor.setValue('TOTAL');
      form().controls.usaData.setValue(true);
      form().controls.usaObservacao.setValue(true);
      expect(fixture.componentInstance.previa).toBe('Arroz × 2 · R$ 13,00 · 30/10 · integral');

      form().controls.modelo.setValue('TAREFAS');
      expect(fixture.componentInstance.previa).toBe('Arroz');
    });
  });

  describe('edição', () => {
    beforeEach(() => abrir(gastos));

    it('abre como "Editar planejamento", sem modelo e sem "Criar e abrir"', () => {
      expect(painel().titulo).toBe('Editar planejamento');
      expect(painel().criarOutra).toBeFalse();
      expect(texto()).not.toContain('Modelo');
      expect(form().getRawValue()).toEqual(jasmine.objectContaining({ nome: 'Gastos do mês', usaLimite: true, limite: 3000, cor: 'verde' }));
    });

    it('grava mantendo série, origem e modelo do registro', () => {
      form().patchValue({ nome: 'Gastos de novembro' });

      fixture.componentInstance.save();

      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({
        id: 20, nome: 'Gastos de novembro', modelo: 'ORCAMENTO', serieId: 'abc', usaLimite: true, limite: 3000
      }));
    });

    it('desligar um campo que estava ligado avisa que os dados continuam guardados', () => {
      expect(texto()).not.toContain('continuam guardados');

      form().controls.usaObservacao.setValue(false);
      fixture.detectChanges();

      expect(texto()).toContain('continuam guardados');
    });
  });
});
