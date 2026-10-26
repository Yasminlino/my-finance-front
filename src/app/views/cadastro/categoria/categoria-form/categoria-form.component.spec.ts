import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { CategoriaFormComponent } from './categoria-form.component';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CategoriaDto } from 'src/app/core/models/categoria.model';

/** Formulário de categoria (FE-P2-11/12; novo layout no card #23). */
describe('CategoriaFormComponent', () => {
  let fixture: ComponentFixture<CategoriaFormComponent>;
  let service: jasmine.SpyObj<CategoryService>;
  const categoria: CategoriaDto = { id: 29, nome: 'Alimentação', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, quantidadeContas: 5 };
  const form = () => fixture.componentInstance.form;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const painel = () => fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance as FormPanelComponent;

  const abrir = (registro: CategoriaDto | null, perfil = 'Pessoa') => {
    localStorage.setItem('usuarioRole', perfil);
    fixture = TestBed.createComponent(CategoriaFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['criar', 'atualizar']);
    service.atualizar.and.returnValue(of({}));
    service.criar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [CategoriaFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoryService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
  });

  afterEach(() => localStorage.removeItem('usuarioRole'));

  describe('edição', () => {
    beforeEach(() => abrir(categoria));

    it('preenche o formulário com o registro', () => {
      expect(form().getRawValue()).toEqual(jasmine.objectContaining({ nome: 'Alimentação', tipo: 'Despesa', natureza: 1, ativo: true }));
    });

    it('salva atualizando o registro', () => {
      form().patchValue({ nome: 'Mercado' });

      fixture.componentInstance.save();

      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 29, nome: 'Mercado', subcategoria: 'Despesa', naturezaOperacao: 1 }));
    });

    it('envia ativo como boolean: inativa continua false ao salvar', () => {
      abrir({ ...categoria, ativo: false });

      fixture.componentInstance.save();

      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 29, ativo: false }));
    });

    it('o nome tem o limite da API (120) e passar dele não salva (DB-P3-04)', () => {
      const nome = document.getElementById('categoria-nome') as HTMLInputElement;
      expect(nome.maxLength).toBe(120);

      form().patchValue({ nome: 'a'.repeat(121) });
      fixture.componentInstance.save();

      expect(service.atualizar).not.toHaveBeenCalled();
    });

    it('abre no painel lateral com o título e o X fecha sem recarregar (FE-P2-07)', () => {
      const fechado = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechado);

      expect(painel().titulo).toBe('Editar categoria');
      painel().fechar.emit();
      expect(fechado).toHaveBeenCalledOnceWith(false);
    });

    it('mostra em quantas contas a categoria é usada', () => {
      expect(texto()).toContain('Usada em 5 contas');
    });

    it('sem "Salvar e criar outra" na edição', () => {
      expect(painel().criarOutra).toBeFalse();
    });
  });

  describe('natureza pelo tipo', () => {
    it('pessoa física vê as naturezas de despesa (antes o campo nunca aparecia: perfilEmpresa ?? …)', () => {
      abrir(null);

      expect(texto()).toContain('Essencial');
      expect(texto()).toContain('Estilo de vida / Lazer');
      expect(texto()).toContain('Reserva / Investimentos');
    });

    it('empresa vê Pessoal e Empresa', () => {
      abrir(null, 'Empresa');

      expect(fixture.componentInstance.opcoesNatureza.map(o => o.value)).toEqual([4, 5]);
    });

    it('Receita preenche "Rendimento / Entrada" e trava; voltar para Despesa limpa a natureza', () => {
      abrir(null);

      form().controls.tipo.setValue('Receita');
      expect(form().controls.natureza.value).toBe(0);
      expect(form().controls.natureza.disabled).toBeTrue();

      form().controls.tipo.setValue('Despesa');
      expect(form().controls.natureza.value).toBeNull();
      expect(form().controls.natureza.enabled).toBeTrue();
    });

    it('Despesa sem natureza não salva', () => {
      abrir(null);
      form().patchValue({ nome: 'Pet', tipo: 'Despesa' });

      fixture.componentInstance.save();

      expect(service.criar).not.toHaveBeenCalled();
    });

    it('Ágatha (Despesa com Rendimento / Entrada): avisa e só salva depois de escolher uma natureza de despesa', () => {
      abrir({ id: 16, nome: 'Ágatha', subcategoria: 'Despesa', naturezaOperacao: 0, ativo: true });

      expect(texto()).toContain('não combinam');
      fixture.componentInstance.save();
      expect(service.atualizar).not.toHaveBeenCalled();

      form().controls.natureza.setValue(2);
      fixture.componentInstance.save();
      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 16, naturezaOperacao: 2 }));
    });

    it('Receita grava a natureza 0 mesmo travada', () => {
      abrir(null);
      form().patchValue({ nome: 'Bônus', tipo: 'Receita' });

      fixture.componentInstance.save();

      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ subcategoria: 'Receita', naturezaOperacao: 0 }));
    });
  });

  describe('aparência', () => {
    it('envia o ícone e a cor escolhidos; sem escolha, nulos', () => {
      abrir(null);
      form().patchValue({ nome: 'Pet', tipo: 'Despesa', natureza: 2 });
      fixture.componentInstance.escolherIcone('pi pi-heart');
      fixture.componentInstance.escolherCor('rosa');

      fixture.componentInstance.save();
      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ icone: 'pi pi-heart', cor: 'rosa' }));

      abrir(null);
      form().patchValue({ nome: 'Pet', tipo: 'Despesa', natureza: 2 });
      fixture.componentInstance.save();
      expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ icone: null, cor: null }));
    });

    it('a prévia usa a cor escolhida ou, sem cor, a da natureza; sem ícone, o do nome', () => {
      abrir(null);
      form().patchValue({ nome: 'Mercado', tipo: 'Despesa', natureza: 1 });
      fixture.detectChanges();

      const previa = () => (fixture.nativeElement as HTMLElement).querySelector('.categoria-previa .mf-icone-categoria')!;
      expect(previa().classList).toContain('mf-natureza-1');
      expect(previa().querySelector('i')?.className).toBe('pi pi-shopping-cart');

      fixture.componentInstance.escolherCor('laranja');
      fixture.detectChanges();
      expect(previa().classList).toContain('mf-cor-laranja');
    });

    it('cada amostra da paleta mostra a própria cor', () => {
      abrir(null);
      fixture.detectChanges();

      const rosa = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Rosa"]') as HTMLElement;
      expect(rosa.style.background).toContain('--mf-cor-rosa-fg');
    });
  });

  describe('Salvar e criar outra', () => {
    it('cria, limpa o formulário e mantém o painel aberto; ao fechar, a lista recarrega', () => {
      abrir(null);
      const fechado = jasmine.createSpy('closed');
      fixture.componentInstance.closed.subscribe(fechado);
      expect(painel().criarOutra).toBeTrue();

      form().patchValue({ nome: 'Pet', tipo: 'Despesa', natureza: 2 });
      painel().salvarEOutra.emit();

      expect(service.criar).toHaveBeenCalledTimes(1);
      expect(fechado).not.toHaveBeenCalled();
      expect(form().controls.nome.value).toBe('');

      painel().fechar.emit();
      expect(fechado).toHaveBeenCalledOnceWith(true);
    });
  });
});
