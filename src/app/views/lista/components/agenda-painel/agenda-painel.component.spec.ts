import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AgendaPainelComponent } from './agenda-painel.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';
import { OcorrenciaEscolhida } from '../agenda-semana/agenda-semana.component';
import { diasDaSemana, diasDoMes, inicioDaSemana, isoDe, somarDias } from '../../agenda.regras';

/** Painel lateral da agenda (card #69, parte 2). */
describe('AgendaPainelComponent', () => {
  let fixture: ComponentFixture<AgendaPainelComponent>;
  let service: jasmine.SpyObj<ItemListaService>;
  const el = () => fixture.nativeElement as HTMLElement;
  const tela = () => fixture.componentInstance;

  const lista: ListaDto = {
    id: 11, nome: 'Agenda', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false, usaData: true,
    usaObservacao: false, modelo: 'AGENDA'
  };
  const hoje = isoDe(new Date());
  const amanha = isoDe(somarDias(new Date(), 1));
  const ontem = isoDe(somarDias(new Date(), -1));
  const dias = diasDaSemana(inicioDaSemana(new Date()));
  const oc = (o: Partial<OcorrenciaDto>): OcorrenciaDto => ({
    itemId: 1, dataOriginal: hoje, data: hoje, hora: null, feito: false, repete: false, descricao: 'X', ...o
  });

  function abrir(ocorrencias: OcorrenciaDto[]) {
    fixture = TestBed.createComponent(AgendaPainelComponent);
    fixture.componentRef.setInput('lista', lista);
    fixture.componentRef.setInput('ocorrencias', ocorrencias);
    fixture.componentRef.setInput('dias', dias);
    fixture.componentRef.setInput('regras', { 4: 'toda quinta' });
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['listarPeriodo']);
    service.listarPeriodo.and.returnValue(of([
      oc({ itemId: 3, data: amanha, dataOriginal: amanha, hora: '08:00:00', repete: true, descricao: 'Feira' }),
      oc({ itemId: 4, data: amanha, dataOriginal: amanha, hora: '07:00:00', repete: true, descricao: 'Natação' }),
      oc({ itemId: 5, data: hoje, dataOriginal: hoje, hora: null, descricao: 'Pagar diarista' })
    ]));
    TestBed.configureTestingModule({
      imports: [AgendaPainelComponent],
      providers: [provideNoopAnimations(), { provide: ItemListaService, useValue: service }]
    });
  });

  it('progresso e atrasados do período mostrado', () => {
    abrir([oc({ feito: true }), oc({ itemId: 2, data: ontem, dataOriginal: ontem }), oc({ itemId: 3 })]);
    expect(el().textContent).toContain('1 de 3 feitos');
    expect(tela().percentual).toBe(33);
    expect(tela().atrasados).toBe(1);
    expect(el().querySelector('.painel__valor--atrasado')!.textContent).toContain('1');
  });

  it('busca os pontos do mês e as próximas a partir de hoje', () => {
    abrir([]);
    const grade = diasDoMes(new Date());
    expect(service.listarPeriodo).toHaveBeenCalledWith(11, grade[0], grade[grade.length - 1]);
    expect(service.listarPeriodo).toHaveBeenCalledWith(11, hoje, isoDe(somarDias(new Date(), 30)));
    expect(service.listarPeriodo).toHaveBeenCalledTimes(2);
    expect(tela().marcados.has(amanha)).toBeTrue();
    const proximas = Array.from(el().querySelectorAll('.painel__descricao')).map(e => e.textContent);
    expect(proximas).toEqual(['Pagar diarista', 'Natação', 'Feira']);
    const detalhes = Array.from(el().querySelectorAll('.painel__proxima .mf-hint')).map(e => e.textContent);
    expect(detalhes[0]).toBe('dia todo · hoje');
    expect(detalhes[1]).toBe('07:00 · amanhã');
  });

  it('trocar o mês do mini calendário busca os pontos dele; clicar numa próxima abre', () => {
    abrir([]);
    tela().trocarMes(1);
    const agora = new Date();
    const proximo = diasDoMes(new Date(agora.getFullYear(), agora.getMonth() + 1, 1));
    expect(service.listarPeriodo).toHaveBeenCalledWith(11, proximo[0], proximo[proximo.length - 1]);
    const abertas: OcorrenciaEscolhida[] = [];
    tela().abrir.subscribe(o => abertas.push(o));
    (el().querySelector('.painel__proxima') as HTMLButtonElement).click();
    expect(abertas).toEqual([{ itemId: 5, dataOriginal: hoje, repete: false }]);
  });

  it('sem pendentes nos próximos dias, avisa', () => {
    service.listarPeriodo.and.returnValue(of([]));
    abrir([]);
    expect(el().textContent).toContain('Nada pendente nos próximos 30 dias.');
  });
});
