import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { ContaService } from 'src/app/core/services/contas.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ContaDto } from 'src/app/core/models/conta.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { duplicarConta } from '../contas.regras';

import { ContaMensalFormComponent } from './conta-mensal-form.component';

/** Formulário de conta no layout novo (card #22). */
describe('ContaMensalFormComponent', () => {
  let fixture: ComponentFixture<ContaMensalFormComponent>;
  let service: jasmine.SpyObj<ContaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const movel = signal(false);

  const categorias: CategoriaDto[] = [
    { id: 12, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, icone: 'pi pi-home', cor: 'laranja' }
  ];
  const sofa: ContaDto = {
    id: 16, nome: 'Sofá', valor: 300, categoriaId: 12, ativo: true, ehParcelado: true, parcelaAtual: 3,
    quantidadeParcelas: 10, observacao: 'Loja X',
    vencimentos: [{ id: 1, contaId: 16, dia: 20, diasVencimentoString: '' }, { id: 2, contaId: 16, dia: 5, diasVencimentoString: '' }]
  };
  const outras: ContaDto[] = [
    { id: 30, nome: 'Cartão Caixa', valor: 10, categoriaId: 12, ativo: true, ehParcelado: false, parcelaAtual: 0, quantidadeParcelas: 0 }
  ];

  const comp = () => fixture.componentInstance;
  const form = () => comp().form;
  const el = () => fixture.nativeElement as HTMLElement;
  const painel = () => fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance as FormPanelComponent;
  const abrir = (registro: ContaDto | null = null) => {
    fixture = TestBed.createComponent(ContaMensalFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.componentRef.setInput('categories', categorias);
    fixture.componentRef.setInput('contas', outras);
    fixture.detectChanges();
  };
  const preencherValida = () => form().patchValue({ nome: 'Internet', categoriaId: 12, valor: 120, dias: ['10'] });

  beforeEach(() => {
    movel.set(false);
    service = jasmine.createSpyObj<ContaService>('ContaService', ['criar', 'atualizar', 'listarLancamentos']);
    service.criar.and.returnValue(of({}));
    service.atualizar.and.returnValue(of({}));
    service.listarLancamentos.and.returnValue(of([]));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ContaMensalFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ContaService, useValue: service },
        { provide: AlertService, useValue: alerta },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
  });

  it('título "Nova conta" e "Editar conta"; a cópia (Duplicar) abre como nova', () => {
    abrir();
    expect(painel().titulo).toBe('Nova conta');

    abrir(sofa);
    expect(painel().titulo).toBe('Editar conta');

    abrir(duplicarConta(sofa));
    expect(painel().titulo).toBe('Nova conta');
    expect(form().controls.nome.value).toBe('Sofá (cópia)');
    expect(form().controls.parcelaAtual.value).toBe(1);
  });

  it('na edição preenche tudo, com os dias em ordem', () => {
    abrir(sofa);

    expect(form().getRawValue()).toEqual(jasmine.objectContaining({
      nome: 'Sofá', categoriaId: 12, valor: 300, dias: ['5', '20'], ehParcelado: true, parcelaAtual: 3,
      quantidadeParcelas: 10, ativo: true, observacao: 'Loja X'
    }));
  });

  it('salvar manda os dias como números em ordem, ativo, observação e as parcelas', () => {
    abrir(sofa);
    form().patchValue({ dias: ['20', '5'] });

    comp().save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 16, nome: 'Sofá', valor: 300, categoriaId: 12, dataOperacao: [5, 20], ativo: true, ehParcelado: true,
      parcelaAtual: 3, quantidadeParcelas: 10, observacao: 'Loja X'
    }));
    expect(alerta.success).toHaveBeenCalled();
  });

  it('valor fixo (card #47): switch na seção de valor, preenchido na edição e enviado ao salvar', () => {
    abrir({ ...sofa, valorFixo: true });
    expect(el().querySelector('#conta-valor-fixo')).not.toBeNull();
    expect(form().controls.valorFixo.value).toBeTrue();

    form().patchValue({ valorFixo: false });
    comp().save();
    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ valorFixo: false }));

    abrir();
    expect(form().controls.valorFixo.value).toBeFalse();
  });

  it('conta não parcelada vai com parcelas 0/0 e observação vazia como null', () => {
    abrir();
    preencherValida();
    form().patchValue({ observacao: '   ' });

    comp().save();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({
      ehParcelado: false, parcelaAtual: 0, quantidadeParcelas: 0, observacao: null
    }));
  });

  describe('dias de vencimento', () => {
    beforeEach(() => abrir());

    it('dia fora de 1 a 31 sai da lista e avisa', () => {
      form().patchValue({ dias: ['5', '32'] });
      comp().aoAdicionarDia('32');

      expect(form().controls.dias.value).toEqual(['5']);
      expect(comp().avisoDia).toContain('1 a 31');
    });

    it('dia repetido sai da lista e avisa', () => {
      form().patchValue({ dias: ['5', '05'] });
      comp().aoAdicionarDia('05');

      expect(form().controls.dias.value).toEqual(['5']);
      expect(comp().avisoDia).toContain('já está');
    });

    it('sem nenhum dia não salva', () => {
      preencherValida();
      form().patchValue({ dias: [] });

      comp().save();

      expect(form().controls.dias.invalid).toBeTrue();
      expect(service.criar).not.toHaveBeenCalled();
    });
  });

  describe('parcelamento', () => {
    beforeEach(() => {
      abrir();
      preencherValida();
    });

    it('parcela atual maior que o total não salva', () => {
      form().patchValue({ ehParcelado: true, parcelaAtual: 11, quantidadeParcelas: 10 });

      comp().save();

      expect(form().hasError('parcelas')).toBeTrue();
      expect(service.criar).not.toHaveBeenCalled();
    });

    it('a prévia mostra quantas faltam, o valor por mês dividido pelos dias e o total restante', () => {
      form().patchValue({ valor: 300, dias: ['5', '20'], ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 10 });
      fixture.detectChanges();

      // Intl pt-BR separa "R$" do número com espaço não separável.
      const previa = el().querySelector('.conta-previa')!.textContent!.replace(/\s+/g, ' ');
      expect(previa).toContain('Faltam 8 parcelas (3ª a 10ª)');
      expect(previa).toContain('2 lançamentos de R$ 150,00');
      expect(previa).toContain('R$ 2.400,00');
    });

    it('sem parcelamento não há prévia', () => {
      fixture.detectChanges();
      expect(el().querySelector('.conta-previa')).toBeNull();
    });
  });

  it('avisa nome parecido com outra conta (sem contar a própria)', () => {
    abrir();
    form().patchValue({ nome: 'cartao  caixa' });
    fixture.detectChanges();

    expect(comp().parecidos).toEqual(['Cartão Caixa']);
    expect(el().textContent).toContain('Cartão Caixa');

    abrir({ ...outras[0] });
    expect(comp().parecidos).toEqual([]);
  });

  it('"Salvar e criar outra" (só na nova) grava, limpa e mantém o painel; ao fechar, a lista recarrega', () => {
    abrir();
    const fechado = jasmine.createSpy('closed');
    comp().closed.subscribe(fechado);
    expect(painel().criarOutra).toBeTrue();
    preencherValida();

    comp().salvarEOutra();

    expect(service.criar).toHaveBeenCalled();
    expect(form().controls.nome.value).toBe('');
    expect(fechado).not.toHaveBeenCalled();
    comp().close();
    expect(fechado).toHaveBeenCalledOnceWith(true);

    abrir(sofa);
    expect(painel().criarOutra).toBeFalse();
  });

  it('erro da API avisa e mantém o painel aberto', () => {
    service.criar.and.returnValue(throwError(() => new Error('falhou')));
    abrir();
    const fechado = jasmine.createSpy('closed');
    comp().closed.subscribe(fechado);
    preencherValida();

    comp().save();

    expect(alerta.error).toHaveBeenCalled();
    expect(fechado).not.toHaveBeenCalled();
  });

  it('o X fecha sem recarregar', () => {
    abrir(sofa);
    const fechado = jasmine.createSpy('closed');
    comp().closed.subscribe(fechado);

    painel().fechar.emit();

    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  describe('celular: dois passos', () => {
    beforeEach(() => {
      movel.set(true);
      abrir();
    });

    it('passo 1 com identificação, valor e dias; passo 2 com parcelamento, situação e resumo', () => {
      expect(painel().passos).toBe(2);
      expect(el().querySelector('#conta-nome')).not.toBeNull();
      expect(el().querySelector('#conta-parcelada')).toBeNull();

      preencherValida();
      comp().avancar();
      fixture.detectChanges();

      expect(comp().passo).toBe(2);
      expect(el().querySelector('#conta-nome')).toBeNull();
      expect(el().querySelector('#conta-parcelada')).not.toBeNull();
      expect(el().querySelector('.conta-resumo')?.textContent).toContain('Internet');
    });

    it('erro no passo 1 impede avançar', () => {
      comp().avancar();

      expect(comp().passo).toBe(1);
      expect(form().controls.nome.touched).toBeTrue();
    });

    it('Voltar volta ao passo 1', () => {
      preencherValida();
      comp().avancar();
      comp().voltar();

      expect(comp().passo).toBe(1);
    });
  });

  it('a edição é só o formulário: sem abas e sem buscar lançamentos (eles têm painel próprio)', () => {
    abrir(sofa);

    expect(el().querySelector('p-tabview')).toBeNull();
    expect(service.listarLancamentos).not.toHaveBeenCalled();
  });

  it('no desktop é um passo só, com tudo visível', () => {
    abrir();

    expect(painel().passos).toBe(1);
    expect(el().querySelector('#conta-nome')).not.toBeNull();
    expect(el().querySelector('#conta-parcelada')).not.toBeNull();
  });
});
