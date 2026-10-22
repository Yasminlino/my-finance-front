import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { CategoriaFormComponent } from './categoria-form.component';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Formulário de categoria: standalone e recebe o registro em edição por [registro] (FE-P2-11/12). */
describe('CategoriaFormComponent', () => {
  let fixture: ComponentFixture<CategoriaFormComponent>;
  let service: jasmine.SpyObj<CategoryService>;
  const categoria = { id: 29, nome: 'Alimentação', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: 1 };

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['criar', 'atualizar']);
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [CategoriaFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoryService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(CategoriaFormComponent);
    fixture.componentRef.setInput('registro', categoria);
    fixture.detectChanges();
  });

  it('na edição preenche o formulário com o registro', () => {
    expect(fixture.componentInstance.form.value.name).toBe('Alimentação');
    expect(fixture.componentInstance.form.value.subCategory).toBe('Despesa');
  });

  it('salva atualizando o registro', () => {
    fixture.componentInstance.form.patchValue({ name: 'Mercado' });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 29, nome: 'Mercado' }));
  });

  it('o nome tem o limite da API (120) e passar dele não salva (DB-P3-04)', () => {
    const nome = document.getElementById('categoria-nome') as HTMLInputElement;
    expect(nome.maxLength).toBe(120);

    fixture.componentInstance.form.patchValue({ name: 'a'.repeat(121) });
    fixture.componentInstance.save();

    expect(service.atualizar).not.toHaveBeenCalled();
  });

  it('abre num p-dialog com o título e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Editar Categoria');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
