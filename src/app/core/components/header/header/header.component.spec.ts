import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../services/auth.service';
import { ListaService } from '../../../services/lista.service';
import { VencidasService } from '../../../services/vencidas.service';
import { NotificacoesService } from '../../../services/notificacoes.service';

/** Navegação do app (card #72). */
describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let header: HeaderComponent;
  let router: { navigate: jasmine.Spy; navigateByUrl: jasmine.Spy; events: Subject<unknown>; url: string };
  let auth: { token: string | null; logout: jasmine.Spy };
  let vencidas: { quantidade: ReturnType<typeof signal<number>>; atualizar: jasmine.Spy };
  let avisos: { novos: ReturnType<typeof signal<number>>; atualizar: jasmine.Spy };
  const larguraOriginal = window.innerWidth;

  const abrir = (largura: number) => {
    spyOnProperty(window, 'innerWidth').and.returnValue(largura);
    fixture = TestBed.createComponent(HeaderComponent);
    header = fixture.componentInstance;
    fixture.detectChanges();
  };
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate'), navigateByUrl: jasmine.createSpy('navigateByUrl'), events: new Subject(), url: '/contas-a-pagar' };
    auth = { token: 'x', logout: jasmine.createSpy('logout') };
    vencidas = { quantidade: signal(24), atualizar: jasmine.createSpy('atualizar') };
    avisos = { novos: signal(3), atualizar: jasmine.createSpy('atualizar') };
    TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
        { provide: VencidasService, useValue: vencidas },
        { provide: NotificacoesService, useValue: avisos },
        { provide: ListaService, useValue: { listar: () => of([{ id: 1, nome: 'Mercado' }, { id: 9, nome: 'Viagem' }]) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  afterEach(() => {
    document.body.classList.remove('mf-com-barra-inferior');
    expect(window.innerWidth).toBeDefined();
    void larguraOriginal;
  });

  it('desktop: Contas a pagar e Extrato a 1 clique, com o badge de vencidas e o item ativo', () => {
    abrir(1280);
    const links = Array.from(el().querySelectorAll('.topo-nav .topo-link')).map(a => a.textContent?.replace(/\s+/g, ' ').trim());

    expect(links).toEqual(['Início', 'Contas a pagar', 'Extratos', 'Planejamento', 'Cadastros']);
    expect(el().querySelector('.topo-nav .topo-link.ativo')?.textContent).toContain('Contas a pagar');
    expect(el().querySelector('.topo-nav p-badge')).not.toBeNull();
    expect(el().querySelector('.barra-inferior')).toBeNull();
    expect(vencidas.atualizar).toHaveBeenCalled();
  });

  it('card #73: sino com os novos; atualiza ao abrir e a cada troca de tela; Preferências no menu do avatar', () => {
    abrir(1280);
    expect(el().querySelector('.topo-sino')?.getAttribute('aria-label')).toBe('Notificações: 3 novas');
    expect(el().querySelector('.topo-sino-badge')?.textContent?.trim()).toBe('3');
    expect(avisos.atualizar).toHaveBeenCalledTimes(1);
    router.events.next(new NavigationEnd(1, '/home', '/home'));
    expect(avisos.atualizar).toHaveBeenCalledTimes(2);
    expect(header.menuUsuario.map(i => i.label)).toEqual(['Preferências', undefined, 'Sair']);
    avisos.novos.set(0);
    fixture.detectChanges();
    expect(el().querySelector('.topo-sino-badge')).toBeNull();
  });

  it('card #73: no celular, o sino abre em tela cheia', () => {
    router.url = '/home';
    abrir(375);
    (el().querySelector('.topo-sino') as HTMLButtonElement).click();
    expect(header.avisosAbertos).toBeTrue();
  });

  it('o Extrato fica ativo na listagem e no detalhe da conta', () => {
    abrir(1280);
    router.events.next(new NavigationEnd(1, '/extrato-bancario?bancoId=2', '/extrato-bancario?bancoId=2'));
    expect(header.ativo('/extrato-bancario/resumo')).toBeTrue();
    expect(header.ativo('/contas-a-pagar')).toBeFalse();
    expect(vencidas.atualizar).toHaveBeenCalledTimes(2);
  });

  it('Planejamento ▾ tem as duas telas e os recentes, sem o termo "lista" (card #63)', () => {
    abrir(1280);
    expect(header.menuPlanejamento.map(i => i.label)).toEqual(['Meus planejamentos', 'Arquivados', undefined, 'Recentes', 'Viagem', 'Mercado']);
    expect(JSON.stringify([header.planejamento, header.cadastrosDoDia, header.configuracoes])).not.toMatch(/lista/i);
  });

  it('Cadastros separa o dia a dia das configurações e chama o cadastro de contas de Contas fixas', () => {
    abrir(1280);
    expect(header.cadastrosDoDia.map(i => i.label)).toEqual(['Contas fixas', 'Categorias']);
    expect(header.configuracoes.map(i => i.label)).toEqual(['Bancos', 'Tipos de cartão', 'Tipos de movimentação']);
    [...header.cadastrosDoDia, ...header.configuracoes].forEach(i => {
      expect(i.icon).toMatch(/^pi pi-[a-z-]+$/);
      expect(i.descricao).toBeTruthy();
    });
  });

  it('celular: barra inferior com Início, Contas, +, Extrato e Mais; páginas ganham espaço embaixo', () => {
    abrir(390);
    const itens = Array.from(el().querySelectorAll('.barra-inferior button')).map(b => b.textContent?.replace(/\s+/g, ' ').trim());

    expect(itens).toEqual(['Início', '24Contas', '', 'Extratos', 'Mais']);
    expect(document.body.classList).toContain('mf-com-barra-inferior');
    expect(el().querySelector('.topo-nav')).toBeNull();
  });

  it('celular (card #78): fora do Início não há barra no topo; no Início, título, busca e avatar com as duas iniciais', () => {
    localStorage.setItem('usuarioNome', 'Yasmin Lino');
    abrir(390);
    expect(el().querySelector('.topo')).toBeNull();

    router.events.next(new NavigationEnd(2, '/home', '/home'));
    fixture.detectChanges();
    // Protótipo "Logo no celular": no Início a marca fica no lugar do título.
    expect(el().querySelector('.topo .marca')?.textContent).toContain('My Finance');
    expect(header.inicial).toBe('YL');
    localStorage.removeItem('usuarioNome');
  });

  it('celular: "Bancos, cartões e tipos" abre as três telas no próprio Mais', () => {
    abrir(390);
    expect(header.configuracoes.map(i => i.path)).toEqual(['/bancos', '/tipos-cartao', '/tipos-movimentacao']);
    header.configuracoesAbertas = true;
    header.ir('/tipos-cartao');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tipos-cartao');
    expect(header.configuracoesAbertas).toBeFalse();
  });

  it('celular: a barra some com o teclado aberto e volta ao sair do campo', () => {
    abrir(390);
    const campo = document.createElement('input');
    header.aoFocar({ target: campo } as unknown as FocusEvent);
    fixture.detectChanges();
    expect(el().querySelector('.barra-inferior--escondida')).not.toBeNull();

    header.aoDesfocar();
    fixture.detectChanges();
    expect(el().querySelector('.barra-inferior--escondida')).toBeNull();
  });

  it('tablet: ≡ abre a gaveta com Sair no rodapé', () => {
    abrir(820);
    expect(el().querySelector('.topo-nav')).toBeNull();
    expect(el().querySelector('[ariaLabel="Abrir menu"]') ?? el().querySelector('p-button')).not.toBeNull();
    expect(el().querySelector('.gaveta-sair')).not.toBeNull();
  });

  it('Ctrl+K abre a busca; os atalhos do + abrem a tela com o formulário', () => {
    abrir(1280);
    header.atalho(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(header.buscaAberta).toBeTrue();

    // Sem ação registrada (Home): Conta a pagar e Lançamento no topo; o grid tem os outros 5.
    expect(header.destaquesCriar.map(d => d.titulo)).toEqual(['Conta a pagar', 'Lançamento no extrato']);
    expect(header.outrosCriar.map(a => a.titulo)).toEqual(['Importar extrato', 'Item em lista', 'Compromisso', 'Nova lista', 'Categoria']);
    header.abrirOutro(header.outrosCriar[0]);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/extrato-bancario/resumo?importar=1');
  });

  it('Sair desloga e volta para o login', () => {
    abrir(1280);
    header.logout();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
