import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AgendaSemanaComponent, ModoAgenda, OcorrenciaEscolhida, OcorrenciaMovida } from './agenda-semana.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';
import { diasDaSemana, diasDoMes, doMes, inicioDaSemana, isoDe, somarDias } from '../../agenda.regras';

/** Agenda do planejamento (card #69): visões Semana e Dia, feito por ocorrência, layout dos mockups (parte 1b). */
describe('AgendaSemanaComponent', () => {
  let fixture: ComponentFixture<AgendaSemanaComponent>;
  let service: jasmine.SpyObj<ItemListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const movel = signal(false);
  const tela = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;

  const agenda: ListaDto = {
    id: 11, nome: 'Agenda semanal', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false,
    usaData: true, usaObservacao: true, modelo: 'AGENDA'
  };
  const hoje = isoDe(new Date());
  const dias = diasDaSemana(inicioDaSemana(new Date()));
  const ocorrencia = (o: Partial<OcorrenciaDto>): OcorrenciaDto => ({
    itemId: 1, dataOriginal: dias[0], data: dias[0], hora: null, feito: false, repete: false, descricao: 'Item', ...o
  });
  const academia = ocorrencia({ itemId: 1, dataOriginal: dias[0], data: dias[0], hora: '07:00:00', repete: true, descricao: 'Academia' });
  const academiaQuarta = ocorrencia({ itemId: 1, dataOriginal: dias[2], data: dias[2], hora: '07:00:00', repete: true, descricao: 'Academia' });
  const dentista = ocorrencia({ itemId: 2, dataOriginal: dias[2], data: dias[2], descricao: 'Dentista', feito: true });

  function abrir(opcoes: { somenteLeitura?: boolean; modo?: ModoAgenda } = {}) {
    fixture = TestBed.createComponent(AgendaSemanaComponent);
    fixture.componentRef.setInput('lista', agenda);
    fixture.componentRef.setInput('modo', opcoes.modo ?? 'SEMANA');
    fixture.componentRef.setInput('cor', 'rosa');
    fixture.componentRef.setInput('regras', { 1: 'seg, qua e sex', 2: 'não repete' });
    fixture.componentRef.setInput('somenteLeitura', opcoes.somenteLeitura ?? false);
    fixture.detectChanges();
  }

  /** Troca o modo como a tela faz (mesmo componente, input novo). */
  function mudarModo(modo: ModoAgenda) {
    fixture.componentRef.setInput('modo', modo);
    fixture.detectChanges();
  }

  const textos = (seletor: string) => Array.from(el().querySelectorAll(seletor)).map(e => e.textContent!.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    movel.set(false);
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['listarPeriodo', 'alterarOcorrencia', 'marcarFeito']);
    service.listarPeriodo.and.returnValue(of([academia, academiaQuarta, dentista]));
    service.alterarOcorrencia.and.returnValue(of(null));
    service.marcarFeito.and.returnValue(of({ sucesso: [], falha: [] } as any));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [AgendaSemanaComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ItemListaService, useValue: service },
        { provide: AlertService, useValue: alerta },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
  });

  describe('Semana no desktop', () => {
    it('carrega de segunda a domingo e põe cada ocorrência no seu dia', () => {
      abrir();
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, dias[0], dias[6]);
      const colunas = el().querySelectorAll('.agenda-dia');
      expect(colunas.length).toBe(7);
      expect(colunas[0].textContent).toContain('Academia');
      expect(colunas[0].textContent).toContain('07:00');
      expect(colunas[2].textContent).toContain('Dentista');
      expect(colunas[2].textContent).toContain('Dia todo');
      expect(colunas[2].querySelector('.agenda-item--feito')).not.toBeNull();
      expect(colunas[1].querySelector('.agenda-item')).toBeNull();
      expect(colunas[1].textContent).toContain('Livre');
    });

    it('hoje com destaque; ícone em quem repete; contagem dos feitos', () => {
      abrir();
      const hojeEl = el().querySelector('.agenda-dia--hoje')!;
      expect(hojeEl).not.toBeNull();
      expect(hojeEl.textContent).toContain('hoje');
      expect(el().querySelectorAll('.agenda-dia')[0].querySelector('.pi-sync')).not.toBeNull();
      expect(el().querySelector('.agenda-contagem')!.textContent).toContain('1 de 3 feitos nesta semana');
    });

    it('a cor do planejamento vai para a borda e o destaque', () => {
      abrir();
      expect(el().style.getPropertyValue('--agenda-cor')).toContain('--mf-cor-rosa-fg');
      expect(el().style.getPropertyValue('--agenda-cor-fundo')).toContain('--mf-cor-rosa-bg');
    });

    it('"Ocultar feitos" tira os feitos e volta', () => {
      abrir();
      tela().ocultarFeitos = true;
      tela().aoOcultar();
      fixture.detectChanges();
      expect(textos('.agenda-item__descricao').join('|')).not.toContain('Dentista');
      tela().ocultarFeitos = false;
      tela().aoOcultar();
      fixture.detectChanges();
      expect(textos('.agenda-item__descricao').join('|')).toContain('Dentista');
    });

    it('navega para a próxima semana, a anterior e volta para hoje', () => {
      abrir();
      tela().proxima();
      const proxima = diasDaSemana(somarDias(inicioDaSemana(new Date()), 7));
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, proxima[0], proxima[6]);
      expect(tela().noPeriodoDeHoje).toBeFalse();
      expect(tela().diaParaNovo).toBe(proxima[0]);
      tela().anterior();
      tela().anterior();
      const anterior = diasDaSemana(somarDias(inicioDaSemana(new Date()), -7));
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, anterior[0], anterior[6]);
      tela().irParaHoje();
      expect(tela().dias).toEqual(dias);
      expect(tela().noPeriodoDeHoje).toBeTrue();
      expect(tela().diaParaNovo).toBe(hoje);
    });

    it('clicar no cabeçalho do dia pede a visão Dia daquele dia', () => {
      abrir();
      const modos: ModoAgenda[] = [];
      tela().modoChange.subscribe(m => modos.push(m));
      (el().querySelectorAll('.agenda-dia__cabecalho')[2] as HTMLButtonElement).click();
      expect(modos).toEqual(['DIA']);
      mudarModo('DIA');
      expect(tela().dias).toEqual([dias[2]]);
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, dias[2], dias[2]);
    });

    it('clicar na ocorrência abre com a data original; "+ adicionar" leva o dia', () => {
      abrir();
      const abertas: OcorrenciaEscolhida[] = [];
      const adicionados: string[] = [];
      tela().abrir.subscribe(o => abertas.push(o));
      tela().adicionar.subscribe(d => adicionados.push(d));
      const daQuarta = Array.from(el().querySelectorAll('.agenda-dia')[2].querySelectorAll<HTMLButtonElement>('.agenda-item__corpo'));
      daQuarta.find(b => b.textContent!.includes('Academia'))!.click();
      (el().querySelectorAll('.agenda-dia__adicionar')[4] as HTMLButtonElement).click();
      expect(abertas[0]).toEqual({ itemId: 1, dataOriginal: dias[2], repete: true });
      expect(adicionados).toEqual([dias[4]]);
    });
  });

  describe('marcar feito', () => {
    it('quem repete vale só para a ocorrência', () => {
      abrir();
      let mudou = 0;
      tela().mudou.subscribe(() => mudou++);
      tela().alternar(academiaQuarta);
      expect(service.alterarOcorrencia).toHaveBeenCalledWith(11, 1, dias[2], { feito: true });
      expect(service.marcarFeito).not.toHaveBeenCalled();
      expect(tela().porDia[dias[2]].find(o => o.itemId === 1)!.feito).toBeTrue();
      expect(tela().porDia[dias[0]][0].feito).toBeFalse();
      expect(mudou).toBe(1);
    });

    it('quem não repete marca o item', () => {
      abrir();
      tela().alternar(dentista);
      expect(service.marcarFeito).toHaveBeenCalledWith(11, [2], false);
      expect(service.alterarOcorrencia).not.toHaveBeenCalled();
    });

    it('se falhar, volta como estava e avisa', () => {
      service.alterarOcorrencia.and.returnValue(throwError(() => ({ error: { message: 'Fora do ar' } })));
      abrir();
      tela().alternar(academia);
      expect(tela().porDia[dias[0]][0].feito).toBeFalse();
      expect(alerta.error).toHaveBeenCalled();
    });
  });

  it('somente leitura: sem adicionar, sem abrir e sem marcar', () => {
    abrir({ somenteLeitura: true });
    const abertas: OcorrenciaEscolhida[] = [];
    tela().abrir.subscribe(o => abertas.push(o));
    expect(el().querySelector('.agenda-dia__adicionar')).toBeNull();
    tela().escolher(academia);
    tela().alternar(academia);
    expect(abertas.length).toBe(0);
    expect(service.alterarOcorrencia).not.toHaveBeenCalled();
  });

  it('erro ao carregar avisa', () => {
    service.listarPeriodo.and.returnValue(throwError(() => ({ status: 500 })));
    abrir();
    expect(alerta.error).toHaveBeenCalled();
    expect(tela().loading).toBeFalse();
  });

  describe('visão Dia', () => {
    it('carrega só hoje, com título "Hoje · …" e os cartões por hora', () => {
      service.listarPeriodo.and.returnValue(of([
        ocorrencia({ itemId: 3, data: hoje, dataOriginal: hoje, hora: '18:00:00', descricao: 'Pagar diarista' }),
        ocorrencia({ itemId: 1, data: hoje, dataOriginal: hoje, hora: null, repete: true, descricao: 'Academia' })
      ]));
      abrir({ modo: 'DIA' });
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, hoje, hoje);
      expect(el().querySelector('.agenda-periodo')!.textContent).toMatch(/^Hoje · /);
      expect(textos('.agenda-cartao__descricao')).toEqual(['Academia', 'Pagar diarista']);
      // Item 3 não está nas regras recebidas: cai no padrão pelo "repete" da ocorrência.
      expect(textos('.agenda-cartao__regra')).toEqual(['seg, qua e sex', 'não repete']);
      expect(el().querySelector('.agenda-contagem')!.textContent).toContain('0 de 2 feitos neste dia');
    });

    it('anda um dia por vez e "+ adicionar neste dia" leva o dia mostrado', () => {
      service.listarPeriodo.and.returnValue(of([]));
      abrir({ modo: 'DIA' });
      tela().proxima();
      const amanha = isoDe(somarDias(new Date(), 1));
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, amanha, amanha);
      fixture.detectChanges();
      expect(el().querySelector('.agenda-periodo')!.textContent).toMatch(/^Amanhã · /);
      expect(el().textContent).toContain('Nada neste dia.');
      const adicionados: string[] = [];
      tela().adicionar.subscribe(d => adicionados.push(d));
      (el().querySelector('.agenda-link-adicionar') as HTMLButtonElement).click();
      expect(adicionados).toEqual([amanha]);
      expect(tela().diaParaNovo).toBe(amanha);
    });

    it('o círculo marca o feito', () => {
      const hojeAcademia = ocorrencia({ itemId: 1, data: hoje, dataOriginal: hoje, hora: '07:00:00', repete: true, descricao: 'Academia' });
      service.listarPeriodo.and.returnValue(of([hojeAcademia]));
      abrir({ modo: 'DIA' });
      const circulo = el().querySelector('.agenda-cartao__marcar') as HTMLButtonElement;
      expect(circulo.getAttribute('aria-checked')).toBe('false');
      circulo.click();
      fixture.detectChanges();
      expect(service.alterarOcorrencia).toHaveBeenCalledWith(11, 1, hoje, { feito: true });
      expect((el().querySelector('.agenda-cartao__marcar') as HTMLButtonElement).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Semana no celular', () => {
    beforeEach(() => movel.set(true));

    it('faixa com ponto onde tem item; só os dias com pendentes; feitos recolhidos', () => {
      abrir();
      const faixa = el().querySelectorAll('.agenda-faixa__dia');
      expect(faixa.length).toBe(7);
      expect(faixa[0].querySelector('.agenda-faixa__ponto--tem')).not.toBeNull();
      expect(faixa[1].querySelector('.agenda-faixa__ponto--tem')).toBeNull();
      expect(el().querySelector('#agenda-dia-' + dias[0])).not.toBeNull();
      expect(el().querySelector('#agenda-dia-' + dias[1])).toBeNull();
      expect(el().querySelector('#agenda-dia-' + dias[2])).not.toBeNull();
      expect(textos('.agenda-cartao__descricao')).toEqual(['Academia', 'Academia']);
      expect(textos('.agenda-cartao__regra')).toEqual(['seg, qua e sex', 'seg, qua e sex']);

      const alternar = el().querySelector('.agenda-feitos__alternar') as HTMLButtonElement;
      expect(alternar.textContent).toContain('Feitos nesta semana · 1');
      expect(alternar.getAttribute('aria-expanded')).toBe('false');
      alternar.click();
      fixture.detectChanges();
      expect(textos('.agenda-cartao__descricao')).toContain('Dentista');
    });

    it('com "Ocultar feitos", os feitos recolhidos somem', () => {
      abrir();
      tela().ocultarFeitos = true;
      tela().aoOcultar();
      fixture.detectChanges();
      expect(el().querySelector('.agenda-feitos__alternar')).toBeNull();
    });

    it('tocar num dia sem pendentes abre a visão Dia dele', () => {
      abrir();
      const modos: ModoAgenda[] = [];
      tela().modoChange.subscribe(m => modos.push(m));
      (el().querySelectorAll('.agenda-faixa__dia')[1] as HTMLButtonElement).click();
      expect(modos).toEqual(['DIA']);
      expect(isoDe(tela().referencia)).toBe(dias[1]);
    });

    it('arrastar a faixa para os lados troca a semana; toque curto não', () => {
      abrir();
      const toque = (x: number) => ({ changedTouches: [{ clientX: x }] }) as unknown as TouchEvent;
      tela().inicioDoToque(toque(200));
      tela().fimDoToque(toque(190));
      expect(tela().dias).toEqual(dias);
      tela().inicioDoToque(toque(200));
      tela().fimDoToque(toque(100));
      expect(tela().dias[0]).toBe(isoDe(somarDias(inicioDaSemana(new Date()), 7)));
      tela().inicioDoToque(toque(100));
      tela().fimDoToque(toque(220));
      expect(tela().dias).toEqual(dias);
    });

    it('semana sem pendentes avisa', () => {
      service.listarPeriodo.and.returnValue(of([dentista]));
      abrir();
      expect(el().textContent).toContain('Nada pendente nesta semana.');
    });
  });

  describe('Mês no desktop (parte 2)', () => {
    const grade = diasDoMes(new Date());
    const muitos = [1, 2, 3, 4, 5].map(i => ocorrencia({ itemId: 10 + i, data: hoje, dataOriginal: hoje, hora: `0${i}:00:00`, descricao: `Item ${i}` }));
    const foraDoMes = grade.find(d => !doMes(d, new Date()));

    it('grade do mês com até 3 itens por dia e "+N mais"; só os dias do mês contam', () => {
      const lista = [...muitos, ...(foraDoMes ? [ocorrencia({ itemId: 30, data: foraDoMes, dataOriginal: foraDoMes, feito: true, descricao: 'Fora' })] : [])];
      service.listarPeriodo.and.returnValue(of(lista));
      abrir({ modo: 'MES' });
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, grade[0], grade[grade.length - 1]);
      expect(el().querySelectorAll('.agenda-mes__dia').length).toBe(grade.length);
      expect(el().querySelectorAll('.agenda-mes__semana').length).toBe(7);
      const deHoje = el().querySelector('.agenda-mes__dia--hoje')!;
      expect(deHoje.querySelectorAll('.agenda-mes__item').length).toBe(3);
      expect(deHoje.querySelector('.agenda-mes__mais')!.textContent).toContain('+2 mais');
      expect(el().querySelector('.agenda-contagem')!.textContent).toContain('0 de 5 feitos neste mês');
      if (foraDoMes) expect(el().querySelector('.agenda-mes__dia--fora')).not.toBeNull();
      expect(el().querySelector('app-agenda-painel')).toBeNull();
    });

    it('‹ › anda um mês; o número do dia abre o Dia', () => {
      service.listarPeriodo.and.returnValue(of([]));
      abrir({ modo: 'MES' });
      const agora = new Date();
      tela().proxima();
      const proximo = diasDoMes(new Date(agora.getFullYear(), agora.getMonth() + 1, 1));
      expect(service.listarPeriodo).toHaveBeenCalledWith(11, proximo[0], proximo[proximo.length - 1]);
      expect(tela().noPeriodoDeHoje).toBeFalse();
      tela().irParaHoje();
      fixture.detectChanges();
      const modos: ModoAgenda[] = [];
      tela().modoChange.subscribe(m => modos.push(m));
      (el().querySelector('.agenda-mes__dia--hoje .agenda-mes__numero') as HTMLButtonElement).click();
      expect(modos).toEqual(['DIA']);
      expect(isoDe(tela().referencia)).toBe(hoje);
    });
  });

  describe('Mês no celular (parte 2)', () => {
    beforeEach(() => movel.set(true));

    it('calendário com pontos e os itens do dia escolhido embaixo', () => {
      service.listarPeriodo.and.returnValue(of([
        ocorrencia({ itemId: 1, data: hoje, dataOriginal: hoje, hora: '07:00:00', descricao: 'Academia' }),
        ocorrencia({ itemId: 2, data: isoDe(somarDias(new Date(), 1)), dataOriginal: isoDe(somarDias(new Date(), 1)), descricao: 'Feira' })
      ]));
      abrir({ modo: 'MES' });
      expect(el().querySelector('app-agenda-mini-mes')).not.toBeNull();
      expect(tela().marcados.has(hoje)).toBeTrue();
      expect(el().querySelector('.agenda-grupo__titulo')!.textContent).toContain('Hoje');
      expect(el().querySelector('.agenda-grupo__titulo')!.textContent).toContain('1 item');
      expect(textos('.agenda-cartao__descricao')).toEqual(['Academia']);

      const amanha = isoDe(somarDias(new Date(), 1));
      tela().escolherNoMes(amanha);
      fixture.detectChanges();
      expect(tela().diaParaNovo).toBe(amanha);
      const adicionados: string[] = [];
      tela().adicionar.subscribe(d => adicionados.push(d));
      (el().querySelector('.agenda-link-adicionar') as HTMLButtonElement).click();
      expect(adicionados).toEqual([amanha]);
    });

    it('escolher um dia de outro mês troca o mês', () => {
      service.listarPeriodo.and.returnValue(of([]));
      abrir({ modo: 'MES' });
      const agora = new Date();
      const doProximo = isoDe(new Date(agora.getFullYear(), agora.getMonth() + 1, 3));
      tela().escolherNoMes(doProximo);
      expect(doMes(doProximo, tela().referencia)).toBeTrue();
      expect(tela().diaEscolhido).toBe(doProximo);
    });
  });

  describe('painel lateral e arrastar (parte 2)', () => {
    const arrasto = () => ({ preventDefault: () => undefined, dataTransfer: null }) as unknown as DragEvent;

    it('painel só no desktop, no Dia e na Semana', () => {
      abrir();
      expect(el().querySelector('app-agenda-painel')).not.toBeNull();
      mudarModo('DIA');
      expect(el().querySelector('app-agenda-painel')).not.toBeNull();
      expect(tela().rotuloDoPainel).toBe(tela().dias[0] === hoje ? 'Hoje' : 'Neste dia');
      movel.set(true);
      fixture.detectChanges();
      expect(el().querySelector('app-agenda-painel')).toBeNull();
    });

    it('arrastar para outro dia muda na hora e avisa a tela', () => {
      abrir();
      const movidas: OcorrenciaMovida[] = [];
      tela().mover.subscribe(m => movidas.push(m));
      tela().arrastar(arrasto(), academia);
      tela().sobre(arrasto(), dias[1]);
      expect(tela().alvo).toBe(dias[1]);
      tela().soltar(arrasto(), dias[1]);
      expect(movidas).toEqual([{ ocorrencia: academia, para: dias[1] }]);
      expect(tela().porDia[dias[1]].map(o => o.descricao)).toEqual(['Academia']);
      expect(tela().porDia[dias[0]].length).toBe(0);
      expect(tela().alvo).toBeNull();
    });

    it('soltar no mesmo dia, sem arrastar ou só leitura não faz nada', () => {
      abrir({ somenteLeitura: true });
      const movidas: OcorrenciaMovida[] = [];
      tela().mover.subscribe(m => movidas.push(m));
      tela().arrastar(arrasto(), academia);
      tela().soltar(arrasto(), dias[3]);
      fixture.componentRef.setInput('somenteLeitura', false);
      tela().arrastar(arrasto(), academia);
      tela().soltar(arrasto(), dias[0]);
      expect(movidas.length).toBe(0);
    });
  });
});
