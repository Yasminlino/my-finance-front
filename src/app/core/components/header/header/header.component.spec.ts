import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../services/auth.service';

/** Menu do topo em p-menubar, com ícones do PrimeIcons (FE-P2-07). */
describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let header: HeaderComponent;
  let router: jasmine.SpyObj<Router>;
  let auth: { token: string | null; logout: jasmine.Spy };

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    auth = { token: 'x', logout: jasmine.createSpy('logout') };
    TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(HeaderComponent);
    header = fixture.componentInstance;
  });

  it('todos os itens do menu usam um ícone do PrimeIcons', () => {
    const itens = [...header.cadastrosItems, ...header.movimentacoesItems, ...header.listasItems];

    expect(itens.length).toBeGreaterThan(0);
    itens.forEach(item => expect(item.icon).toMatch(/^pi pi-[a-z-]+$/));
  });

  it('não sobra emoji no menu renderizado', () => {
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('monta o menu do p-menubar: página inicial e os três grupos, com rota e ícone em cada item', () => {
    expect(header.menu.map(m => m.label)).toEqual(['Página Inicial', 'Cadastros', 'Movimentações', 'Listas']);
    expect(header.menu[0].routerLink).toBe('/home');

    const cadastros = header.menu[1].items ?? [];
    expect(cadastros.map(i => i.routerLink)).toEqual(header.cadastrosItems.map(i => i.path));
    expect(cadastros.map(i => i.icon)).toEqual(header.cadastrosItems.map(i => i.icon));
    header.menu.forEach(grupo => expect(grupo.icon).toMatch(/^pi pi-[a-z-]+$/));
  });

  it('renderiza o menu num p-menubar', () => {
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('p-menubar')).not.toBeNull();
  });

  it('Sair desloga e volta para o login', () => {
    header.logout();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
