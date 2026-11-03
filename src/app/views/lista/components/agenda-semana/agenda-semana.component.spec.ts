import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AgendaSemanaComponent, ModoAgenda, OcorrenciaEscolhida } from './agenda-semana.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';
import { diasDaSemana, inicioDaSemana, isoDe, somarDias } from '../../agenda.regras';

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
});
