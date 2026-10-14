import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { HomeComponent } from './home.component';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';

/** Home em PrimeFlex, com ícones do PrimeIcons em vez de emojis (FE-P2-07). */
describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const contas = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarVencidas', 'listarPorData']);
    contas.listarVencidas.and.returnValue(of([]));
    contas.listarPorData.and.returnValue(of([]));
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listar']);
    categorias.listar.and.returnValue(of([]));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [ButtonModule, TooltipModule],
      providers: [
        { provide: ContaMensalService, useValue: contas },
        { provide: CategoryService, useValue: categorias },
        { provide: Router, useValue: router }
      ]
    });
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('sem contas mostra os avisos sem emoji', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Nenhuma conta hoje');
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('o botão de "Vencendo hoje" abre Contas a Pagar', () => {
    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('p-button button')!;

    botao.click();

    expect(router.navigate).toHaveBeenCalledWith(['contas-a-pagar'], jasmine.objectContaining({ queryParams: jasmine.any(Object) }));
  });
});
