import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Menu } from 'primeng/menu';

import { PreferenciasNotificacaoDto } from 'src/app/core/models/notificacao.model';
import { NotificacoesService } from 'src/app/core/services/notificacoes.service';
import { isoDate } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { PreferenciasComponent } from './preferencias.component';

/** Card #73 — Preferências › Notificações (mockup B): salva a cada mudança. */
describe('PreferenciasComponent', () => {
  let fixture: ComponentFixture<PreferenciasComponent>;
  let comp: PreferenciasComponent;
  let notificacoes: jasmine.SpyObj<NotificacoesService>;
  let alert: jasmine.SpyObj<AlertService>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const menuFalso = { toggle: jasmine.createSpy('toggle') } as unknown as Menu;

  const padrao = (): PreferenciasNotificacaoDto => ({
    contasAVencer: { ativo: true, diasAntes: 1 },
    vencidas: { ativo: true, soUltimos90Dias: true },
    fatura: { ativo: true, diasAntes: 3 },
    agenda: { ativo: true, diasAntes: 0 },
    acertos: { ativo: true, diasEmAberto: 30 },
    pausadoAte: null
  });

  const criar = () => {
    fixture = TestBed.createComponent(PreferenciasComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    notificacoes = jasmine.createSpyObj<NotificacoesService>('NotificacoesService', ['preferencias', 'salvarPreferencias']);
    notificacoes.preferencias.and.returnValue(of(padrao()));
    notificacoes.salvarPreferencias.and.callFake(p => of(structuredClone(p)));
    alert = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [PreferenciasComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: NotificacoesService, useValue: notificacoes },
        { provide: AlertService, useValue: alert }
      ]
    });
  });

  it('mostra No app com o resumo de cada opção, e-mail e push como "em breve", e Pausar tudo', () => {
    criar();
    ['Contas a vencer', '1 dia antes', 'Contas vencidas', 'resumo · só últimos 90 dias', 'Fatura do cartão', '3 dias antes',
      'Agenda', 'no dia', 'Acertos com pessoas', 'após 30 dias', 'E-mail diário', 'em breve', 'Notificações push',
      'Pausar tudo', 'Não pausar'].forEach(t => expect(texto()).toContain(t));
    expect(el().querySelectorAll('p-inputswitch').length).toBe(7);
    expect(texto()).not.toMatch(/\blistas?\b/i);
  });

  it('o interruptor salva na hora', () => {
    criar();
    comp.alternar('fatura', false);
    expect(notificacoes.salvarPreferencias).toHaveBeenCalledWith(jasmine.objectContaining({ fatura: { ativo: false, diasAntes: 3 } }));
    expect(comp.salvoAgora).toBeTrue();
  });

  it('trocar a opção pelo menu salva; o menu marca a atual', () => {
    criar();
    comp.abrirOpcoes(comp.linhas[0], menuFalso, new Event('click'));
    expect(comp.menuItens.map(i => i.label)).toEqual(['no dia', '1 dia antes', '2 dias antes', '3 dias antes']);
    expect(comp.menuItens[1].icon).toBe('pi pi-check');

    comp.menuItens[3].command!({});

    expect(notificacoes.salvarPreferencias).toHaveBeenCalledWith(jasmine.objectContaining({ contasAVencer: { ativo: true, diasAntes: 3 } }));
  });

  it('tipo desligado não abre as opções', () => {
    criar();
    comp.pref!.agenda.ativo = false;
    (menuFalso.toggle as jasmine.Spy).calls.reset();
    comp.abrirOpcoes(comp.linhas[3], menuFalso, new Event('click'));
    expect(menuFalso.toggle).not.toHaveBeenCalled();
  });

  it('Pausar tudo grava a data e mostra "Até dd/mm"; "Não pausar" limpa', () => {
    criar();
    comp.abrirPausa(menuFalso, new Event('click'));
    comp.menuItens.find(i => i.label === 'Por 1 semana')!.command!({});
    expect(notificacoes.salvarPreferencias).toHaveBeenCalledWith(jasmine.objectContaining({ pausadoAte: isoDate(7) }));
    expect(comp.resumoPausa).toMatch(/^Até \d{2}\/\d{2}$/);

    comp.abrirPausa(menuFalso, new Event('click'));
    comp.menuItens.find(i => i.label === 'Não pausar')!.command!({});
    expect(comp.resumoPausa).toBe('Não pausar');
  });

  it('mudança durante a gravação sai logo depois; erro volta ao que estava salvo', () => {
    const resposta = new Subject<PreferenciasNotificacaoDto>();
    notificacoes.salvarPreferencias.and.returnValue(resposta);
    criar();

    comp.alternar('fatura', false);
    comp.alternar('agenda', false);
    expect(notificacoes.salvarPreferencias).toHaveBeenCalledTimes(1);

    notificacoes.salvarPreferencias.and.returnValue(throwError(() => new Error('x')));
    resposta.next({ ...padrao(), fatura: { ativo: false, diasAntes: 3 } });
    expect(notificacoes.salvarPreferencias).toHaveBeenCalledTimes(2);
    expect(alert.error).toHaveBeenCalled();
    expect(comp.pref!.fatura.ativo).toBeFalse();
    expect(comp.pref!.agenda.ativo).toBeTrue();
  });

  it('erro ao carregar mostra Tentar de novo', () => {
    notificacoes.preferencias.and.returnValue(throwError(() => new Error('x')));
    criar();
    expect(texto()).toContain('Não foi possível carregar as preferências');
  });
});
