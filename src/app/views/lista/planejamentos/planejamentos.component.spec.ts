import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavegacaoService } from 'src/app/core/services/navegacao.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { PlanejamentosComponent } from './planejamentos.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto } from 'src/app/core/models/lista.model';

function lista(ajuste: Partial<ListaDto>): ListaDto {
  return {
    id: 1, nome: 'X', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'BRANCO', resumo: { itens: 0, feitos: 0, total: 0, totalFeito: 0 }, ...ajuste
  };
}

/** Meus planejamentos e Arquivados (card #63). */
describe('PlanejamentosComponent', () => {
  let fixture: ComponentFixture<PlanejamentosComponent>;
  let tela: PlanejamentosComponent;
  let service: jasmine.SpyObj<ListaService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let router: Router;
  const rota = { snapshot: { data: {} as Record<string, unknown> } };
  const el = () => fixture.nativeElement as HTMLElement;
  const nomesDosCards = () => Array.from(el().querySelectorAll('.planejamento-card__nome')).map(e => e.textContent?.trim());

  const ativos = [
    lista({ id: 1, nome: 'Gastos do mês', usaValor: true, resumo: { itens: 9, feitos: 3, total: 3597, totalFeito: 1200 } }),
    lista({ id: 2, nome: 'Agenda semanal', usaData: true }),
    lista({ id: 3, nome: 'Lista de compras', usaValor: true, usaQuantidade: true })
  ];
  const arquivados = [
    lista({ id: 4, nome: 'Casamento', arquivadaEm: '2026-10-01T00:00:00Z' }),
    lista({ id: 5, nome: 'Lua de mel', arquivadaEm: '2026-10-01T00:00:00Z' }),
    lista({ id: 6, nome: 'Casa nova', arquivadaEm: '2026-10-01T00:00:00Z' }),
    lista({ id: 7, nome: 'Viagem', arquivadaEm: '2026-10-01T00:00:00Z' })
  ];

  function montar(modoArquivados = false, listas = { ativos, arquivados }) {
    service.listar.and.callFake((arq?: boolean) => of(arq ? listas.arquivados : listas.ativos));
    rota.snapshot.data = modoArquivados ? { arquivados: true } : {};
    fixture = TestBed.createComponent(PlanejamentosComponent);
    tela = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<ListaService>('ListaService', ['listar', 'arquivar', 'desarquivar', 'excluir', 'duplicar']);
    service.arquivar.and.returnValue(of(null));
    service.desarquivar.and.returnValue(of(null));
    service.excluir.and.returnValue(of(null));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    TestBed.configureTestingModule({
      imports: [PlanejamentosComponent],
      providers: [
        provideNoopAnimations(), provideRouter([]), { provide: ActivatedRoute, useValue: rota },
        { provide: ListaService, useValue: service },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error', 'info']) }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  describe('Meus planejamentos', () => {
    it('mostra os em uso, mais recentes primeiro, e a pasta com o total e 3 nomes', () => {
      montar();

      expect(service.listar).toHaveBeenCalledWith(false);
      expect(service.listar).toHaveBeenCalledWith(true);
      expect(nomesDosCards()).toEqual(['Lista de compras', 'Agenda semanal', 'Gastos do mês']);
      const pasta = el().querySelector('.planejamentos-pasta')!;
      expect(pasta.textContent).toContain('Arquivados (4)');
      expect(pasta.textContent).toContain('Viagem, Casa nova, Lua de mel e mais 1');
    });

    it('os contadores do filtro só contam os em uso', () => {
      montar();

      expect(tela.opcoesFiltro.map(o => [o.value, o.contagem])).toEqual([['TODOS', 3], ['VALOR', 2], ['DATA', 1]]);
    });

    it('filtro e busca reduzem os cards e escondem a pasta; limpar volta', () => {
      montar();
      tela.filtro = 'VALOR';
      tela.busca = 'gastos';
      tela.aplicarFiltros();
      fixture.detectChanges();

      expect(nomesDosCards()).toEqual(['Gastos do mês']);
      expect(el().querySelector('.planejamentos-pasta')).toBeNull();

      tela.limparFiltros();
      fixture.detectChanges();
      expect(nomesDosCards().length).toBe(3);
    });

    it('sem arquivados, não há pasta; sem nada, o estado vazio com Novo planejamento', () => {
      montar(false, { ativos, arquivados: [] });
      expect(el().querySelector('.planejamentos-pasta')).toBeNull();

      montar(false, { ativos: [], arquivados: [] });
      expect(el().textContent).toContain('Nenhum planejamento ainda');
    });

    it('nenhum texto da tela usa "lista"', () => {
      montar();

      const texto = el().textContent ?? '';
      const semNomes = ativos.concat(arquivados).reduce((t, l) => t.split(l.nome).join(''), texto);
      expect(semNomes).not.toMatch(/\blistas?\b/i);
    });

    it('abrir vai para a tela do planejamento; a pasta, para Arquivados', () => {
      montar();
      tela.abrir(ativos[0]);
      tela.abrirPasta();

      expect(router.navigate).toHaveBeenCalledWith(['/planejamento', '1']);
      expect(router.navigate).toHaveBeenCalledWith(['/planejamento', 'arquivados']);
    });

    it('tem o ‹ voltar, que volta para a tela anterior', () => {
      montar();
      const navegacao = TestBed.inject(NavegacaoService);
      spyOn(navegacao, 'voltar');
      expect(el().querySelector('mf-page-header [aria-label="Voltar"]')).not.toBeNull();

      tela.voltar();

      expect(navegacao.voltar).toHaveBeenCalledWith();
    });

    it('menu: Abrir, Editar, Duplicar, Arquivar e Excluir', () => {
      montar();

      expect(tela.acoes(ativos[0]).map(a => a.rotulo)).toEqual(['Abrir', 'Editar', 'Duplicar', 'Arquivar', 'Excluir']);
    });

    it('arquivar recarrega e oferece Desfazer, que desarquiva sem novo aviso', () => {
      montar();
      const mensagens = fixture.debugElement.injector.get(MessageService);
      spyOn(mensagens, 'add').and.callThrough();

      tela.arquivar(ativos[0]);

      expect(service.arquivar).toHaveBeenCalledWith(1);
      const aviso = (mensagens.add as jasmine.Spy).calls.mostRecent().args[0];
      expect(aviso.summary).toBe('Planejamento arquivado');
      (mensagens.add as jasmine.Spy).calls.reset();

      tela.acionarAviso(aviso.data);

      expect(service.desarquivar).toHaveBeenCalledWith(1);
      expect(mensagens.add).not.toHaveBeenCalled();
    });

    it('excluir confirma com o número de itens e só exclui se confirmar', async () => {
      montar();
      confirmacao.confirmar.and.resolveTo(false);
      await tela.excluir(ativos[0]);
      expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('Excluir o planejamento "Gastos do mês" e os 9 itens dele?');
      expect(service.excluir).not.toHaveBeenCalled();

      confirmacao.confirmar.and.resolveTo(true);
      await tela.excluir(ativos[1]);
      expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('Excluir o planejamento "Agenda semanal"?');
      expect(service.excluir).toHaveBeenCalledWith(2);
    });

    it('Novo e Editar abrem o formulário; Criar e abrir abre o criado', () => {
      montar();
      tela.novo();
      fixture.detectChanges();
      expect(el().querySelector('app-planejamento-form')).not.toBeNull();

      tela.abrirCriado(lista({ id: 9, usaData: true }));
      fixture.detectChanges();
      expect(el().querySelector('app-planejamento-form')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/planejamento', '9']);
    });
  });

  describe('Arquivados', () => {
    beforeEach(() => montar(true));

    it('mostra só os arquivados, com o aviso, sem pasta, filtro nem Novo', () => {
      expect(service.listar).toHaveBeenCalledOnceWith(true);
      expect(nomesDosCards()).toEqual(['Viagem', 'Casa nova', 'Lua de mel', 'Casamento']);
      expect(el().textContent).toContain('ficam guardados');
      expect(el().querySelector('.planejamentos-pasta')).toBeNull();
      expect(el().querySelector('p-selectbutton')).toBeNull();
      expect(el().textContent).not.toContain('Novo planejamento');
    });

    it('o ‹ voltar leva a Meus planejamentos', () => {
      expect(el().querySelector('mf-page-header [aria-label="Voltar"]')).not.toBeNull();

      tela.voltar();

      expect(router.navigate).toHaveBeenCalledWith(['/planejamento']);
    });

    it('menu: Abrir, Desarquivar e Excluir; desarquivar oferece Desfazer', () => {
      expect(tela.acoes(arquivados[0]).map(a => a.rotulo)).toEqual(['Abrir', 'Desarquivar', 'Excluir']);

      const mensagens = fixture.debugElement.injector.get(MessageService);
      spyOn(mensagens, 'add').and.callThrough();
      tela.desarquivar(arquivados[0]);
      const aviso = (mensagens.add as jasmine.Spy).calls.mostRecent().args[0];
      tela.acionarAviso(aviso.data);

      expect(service.desarquivar).toHaveBeenCalledWith(4);
      expect(service.arquivar).toHaveBeenCalledWith(4);
    });
  });
});
