import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AvisoDto } from '../../models/notificacao.model';
import { LinhaContasMensais } from '../../models/conta-mensal.model';
import { ContaMensalService } from '../../services/conta-mensal.service';
import { NotificacoesService } from '../../services/notificacoes.service';
import { VencidasService } from '../../services/vencidas.service';
import { isoDate } from '../../utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { PainelAvisosComponent } from './painel-avisos.component';

/** Card #73 — painel do sino. */
describe('PainelAvisosComponent', () => {
  let fixture: ComponentFixture<PainelAvisosComponent>;
  let comp: PainelAvisosComponent;
  let contas: jasmine.SpyObj<ContaMensalService>;
  let router: Router;
  const lista = signal<AvisoDto[]>([]);
  const erro = signal(false);
  const carregou = signal(true);
  const pausado = signal<string | null>(null);
  let notificacoes: { avisos: typeof lista; erro: typeof erro; carregou: typeof carregou; pausadoAte: typeof pausado; novos: () => number;
    atualizar: jasmine.Spy; marcarTudoComoLido: jasmine.Spy };
  let vencidas: { atualizar: jasmine.Spy };
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  const hoje0h = new Date(new Date().setHours(0, 0, 0, 0));
  const anteontem = new Date(hoje0h.getTime() - 2 * 86_400_000);
  const avisoVencer: AvisoDto = {
    id: 'vencer:5:x', tipo: 'contas-a-vencer', desde: hoje0h.toISOString(), novo: true, titulo: 'Internet vence hoje',
    detalhe: 'Casa', valor: 100, data: isoDate(), transacaoId: 5
  };
  const avisoAcertos: AvisoDto = {
    id: 'acertos:1:x', tipo: 'acertos', desde: anteontem.toISOString(), novo: false, titulo: 'Carlos te deve R$ 250,00',
    detalhe: 'Em aberto há 40 dias', valor: 250
  };

  const criar = () => {
    fixture = TestBed.createComponent(PainelAvisosComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    lista.set([avisoVencer, avisoAcertos]);
    erro.set(false);
    carregou.set(true);
    notificacoes = {
      avisos: lista, erro, carregou, pausadoAte: pausado, novos: () => lista().filter(a => a.novo).length,
      atualizar: jasmine.createSpy('atualizar'), marcarTudoComoLido: jasmine.createSpy('marcar').and.returnValue(of(null))
    };
    vencidas = { atualizar: jasmine.createSpy('atualizar') };
    contas = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarDoMes', 'atualizar']);
    contas.listarDoMes.and.returnValue(of([{ id: 5, nome: 'Internet', valor: 100, data: isoDate() as unknown as Date,
      situacao: 'PENDENTE' } as LinhaContasMensais]));
    contas.atualizar.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [PainelAvisosComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: NotificacoesService, useValue: notificacoes },
        { provide: VencidasService, useValue: vencidas },
        { provide: ContaMensalService, useValue: contas },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']) }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('abre em "Novas" quando há novas e mostra Todas agrupadas em Hoje e Esta semana', () => {
    criar();
    expect(comp.filtro).toBe('novas');
    expect(texto()).toContain('Internet vence hoje');
    expect(texto()).not.toContain('Carlos');

    comp.filtro = 'todas';
    fixture.detectChanges();
    const grupos = Array.from(el().querySelectorAll('.painel__grupo')).map(g => g.textContent?.trim());
    expect(grupos).toEqual(['Hoje', 'Esta semana']);
    expect(texto()).toContain('Carlos te deve R$ 250,00');
    const dia = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][anteontem.getDay()];
    expect(el().querySelector('.aviso__quando')?.textContent?.trim()).toBe(dia);
  });

  it('sem novas, abre em "Todas"', () => {
    lista.set([avisoAcertos]);
    criar();
    expect(comp.filtro).toBe('todas');
  });

  it('Marcar como paga usa a regra de Contas a Pagar e atualiza o sino e o selo', () => {
    criar();
    const botao = Array.from(el().querySelectorAll<HTMLButtonElement>('p-button button')).find(b => b.textContent?.includes('Marcar como paga'))!;

    botao.click();

    expect(contas.listarDoMes).toHaveBeenCalledWith(isoDate(), true);
    expect(contas.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 5, situacao: 'PAGO NO PRAZO' }));
    expect(notificacoes.atualizar).toHaveBeenCalled();
    expect(vencidas.atualizar).toHaveBeenCalled();
  });

  it('Abrir leva à tela de origem e fecha o painel', () => {
    criar();
    const fechou = jasmine.createSpy('fechar');
    comp.fechar.subscribe(fechou);

    comp.abrir(avisoVencer);

    expect(fechou).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/contas-a-pagar'], { queryParams: { date: isoDate() } });
  });

  it('Marcar tudo como lido chama o serviço', () => {
    criar();
    (Array.from(el().querySelectorAll<HTMLButtonElement>('.painel__link')).find(b => b.textContent?.includes('Ler tudo')))!.click();
    expect(notificacoes.marcarTudoComoLido).toHaveBeenCalled();
  });

  it('card novo tem a borda; conta mostra detalhe · valor; acertos é clicável inteiro', () => {
    criar();
    comp.filtro = 'todas';
    fixture.detectChanges();
    const cards = Array.from(el().querySelectorAll('.aviso'));
    expect(cards[0].classList).toContain('aviso--novo');
    expect(cards[0].querySelector('.aviso__linha')?.textContent?.replace(/\s+/g, ' ')).toMatch(/Casa · R\$\s*100,00/);
    expect(cards[1].classList).toContain('aviso--clicavel');
    (cards[1] as HTMLElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/extrato-bancario'], { queryParams: { foco: 'acertos' } });
  });

  it('pausado: mostra até quando, sem avisos', () => {
    pausado.set(isoDate(7));
    criar();
    expect(texto()).toContain('Notificações pausadas até');
    expect(el().querySelector('.aviso')).toBeNull();
    pausado.set(null);
  });

  it('vazio e erro', () => {
    lista.set([]);
    criar();
    expect(texto()).toContain('Nada por aqui. Você está em dia.');

    erro.set(true);
    fixture.detectChanges();
    expect(texto()).toContain('Não foi possível carregar');
  });
});
