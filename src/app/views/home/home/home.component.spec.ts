import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { HomeComponent } from './home.component';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';

/** Home em PrimeFlex, com ícones do PrimeIcons em vez de emojis (FE-P2-07). */
describe('HomeComponent', () => {
  const CHAVE_RECOLHIDAS = 'homeVencidasRecolhidas';
  let fixture: ComponentFixture<HomeComponent>;
  let router: jasmine.SpyObj<Router>;
  let contas: jasmine.SpyObj<ContaMensalService>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  const criar = (vencidas: ContaMensal[] = []) => {
    contas.listarVencidas.and.returnValue(of(vencidas));
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.removeItem(CHAVE_RECOLHIDAS);
    contas = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarVencidas', 'listarPorData']);
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
  });

  afterEach(() => localStorage.removeItem(CHAVE_RECOLHIDAS));

  it('sem contas mostra os avisos sem emoji', () => {
    criar();

    expect(texto()).toContain('Nenhuma conta hoje');
    expect(texto()).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('o botão de "Vencendo hoje" abre Contas a Pagar', () => {
    criar();
    const botao = el().querySelector<HTMLButtonElement>('p-button button')!;

    botao.click();

    expect(router.navigate).toHaveBeenCalledWith(['contas-a-pagar'], jasmine.objectContaining({ queryParams: jasmine.any(Object) }));
  });

  describe('contas vencidas recolhíveis', () => {
    const vencidas: ContaMensal[] = [
      { date: new Date(2026, 9, 5), name: 'Doces', value: 70, idAccount: 1, status: 'PENDENTE', categoryId: null },
      { date: new Date(2026, 9, 10), name: 'Taxa de obra', value: 883, idAccount: 2, status: 'PENDENTE', categoryId: null }
    ];
    const botaoRecolher = () => el().querySelector<HTMLButtonElement>('.recolher-vencidas')!;

    it('começa aberta; recolher esconde a lista e mostra quantidade e total no título', () => {
      criar(vencidas);
      expect(texto()).toContain('Taxa de obra');
      expect(botaoRecolher().getAttribute('aria-expanded')).toBe('true');

      botaoRecolher().click();
      fixture.detectChanges();

      expect(texto()).not.toContain('Taxa de obra');
      expect(texto()).toMatch(/2 contas · R\$\s*953,00/);
      expect(botaoRecolher().getAttribute('aria-expanded')).toBe('false');

      botaoRecolher().click();
      fixture.detectChanges();
      expect(texto()).toContain('Taxa de obra');
    });

    it('lembra a escolha ao voltar para a home', () => {
      criar(vencidas);
      botaoRecolher().click();
      fixture.destroy();

      criar(vencidas);

      expect(texto()).not.toContain('Taxa de obra');
      expect(localStorage.getItem(CHAVE_RECOLHIDAS)).toBe('true');
    });
  });
});
