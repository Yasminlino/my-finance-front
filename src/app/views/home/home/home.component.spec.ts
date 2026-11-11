import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ContaMensal, LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { OcorrenciaDto } from 'src/app/core/models/lista.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { formatYearMonth, isoDate } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { HomeModule } from '../home.module';
import { HomeComponent } from './home.component';

/** Card #71 — Home: só o que é do dia. */
describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let comp: HomeComponent;
  let contas: jasmine.SpyObj<ContaMensalService>;
  let itens: jasmine.SpyObj<ItemListaService>;
  let router: Router;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  const dia = (d: number) => isoDate(d);
  const linha = (id: number, data: string, valor: number, extra: Partial<LinhaContasMensais> = {}): LinhaContasMensais => ({
    id, contaId: id, nome: `Conta ${id}`, valor, data: data as unknown as Date, ehParcelado: false, categoriaId: 1,
    categoriaNome: 'Casa', tipoContaId: '1', subcategoriaNome: 'Despesa', situacao: 'EM ABERTO', statusSalvo: 'EM ABERTO',
    desbloqueiaCampos: false, ...extra
  });
  const ocorrencias = (): OcorrenciaDto[] => [
    { listaId: 9, listaNome: 'Casa', itemId: 1, dataOriginal: dia(0), data: dia(0), hora: '09:00:00', feito: false, repete: false, descricao: 'Ligar pro síndico' },
    { listaId: 9, listaNome: 'Casa', itemId: 2, dataOriginal: dia(0), data: dia(0), feito: false, repete: true, descricao: 'Regar plantas' }
  ];

  const criar = () => {
    fixture = TestBed.createComponent(HomeComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.setItem('usuarioNome', 'Teste Home');
    localStorage.removeItem('homeVencidasRecolhidas');

    contas = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarDoMes', 'listarVencidas', 'atualizar']);
    contas.listarDoMes.and.returnValue(of([linha(1, dia(0), 120), linha(2, dia(1), 80), linha(3, dia(3), 50)]));
    contas.listarVencidas.and.returnValue(of([]));
    contas.atualizar.and.returnValue(of({}));
    itens = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['agendaPeriodo', 'marcarFeito', 'alterarOcorrencia']);
    itens.agendaPeriodo.and.returnValue(of(ocorrencias()));
    itens.marcarFeito.and.returnValue(of({ afetados: 1 }));
    itens.alterarOcorrencia.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [HomeModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ContaMensalService, useValue: contas },
        { provide: ItemListaService, useValue: itens },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']) }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    localStorage.removeItem('homeVencidasRecolhidas');
    localStorage.removeItem('usuarioNome');
  });

  it('saúda pelo primeiro nome e mostra só o que é do dia', () => {
    criar();

    expect(texto()).toMatch(/(Bom dia|Boa tarde|Boa noite), Teste/);
    expect(contas.listarDoMes).toHaveBeenCalledWith(formatYearMonth(new Date()), false);
    expect(itens.agendaPeriodo).toHaveBeenCalledWith(isoDate(), isoDate());
    expect(texto()).toContain('Conta 1');
    expect(texto()).toContain('Conta 2');
    expect(texto()).not.toContain('Conta 3');
    expect(texto()).toMatch(/Total\s*R\$\s*200,00/);
    expect(texto()).toContain('Ligar pro síndico');
    expect(texto()).not.toMatch(/\blistas?\b/i);
  });

  it('Pagar usa a regra de Contas a Pagar e recarrega as contas', () => {
    criar();
    contas.listarDoMes.calls.reset();

    el().querySelector<HTMLButtonElement>('button[aria-label="Pagar Conta 1"]')!.click();

    expect(contas.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1, situacao: 'PAGO NO PRAZO' }));
    expect(contas.listarDoMes).toHaveBeenCalled();
  });

  it('agenda: item simples marca pelo lote, item que repete marca só a ocorrência', () => {
    criar();
    const [simples, repete] = comp.agenda.dados!;

    comp.marcarAgenda(simples);
    comp.marcarAgenda(repete);

    expect(itens.marcarFeito).toHaveBeenCalledWith(9, [1], true);
    expect(itens.alterarOcorrencia).toHaveBeenCalledWith(9, 2, dia(0), { feito: true });
    expect(simples.feito).toBeTrue();
  });

  it('agenda: se a API recusar, o check volta', () => {
    itens.marcarFeito.and.returnValue(throwError(() => new Error('x')));
    criar();
    const simples = comp.agenda.dados![0];

    comp.marcarAgenda(simples);

    expect(simples.feito).toBeFalse();
  });

  it('erro num bloco não derruba o outro', () => {
    itens.agendaPeriodo.and.returnValue(throwError(() => new Error('x')));
    criar();

    expect(texto()).toContain('Não foi possível carregar');
    expect(texto()).toContain('Conta 1');
  });

  it('dia livre: avisa que está tudo em dia', () => {
    contas.listarDoMes.and.returnValue(of([]));
    itens.agendaPeriodo.and.returnValue(of([]));
    criar();

    expect(texto()).toContain('Tudo em dia');
  });

  describe('contas vencidas', () => {
    const vencidas: ContaMensal[] = [
      { data: new Date(2026, 9, 5), nome: 'Doces', valor: 70, contaId: 1, situacao: 'PENDENTE', categoriaId: null },
      { data: new Date(2026, 9, 10), nome: 'Taxa de obra', valor: 883, contaId: 2, situacao: 'PENDENTE', categoriaId: null }
    ];
    const botaoRecolher = () => el().querySelector<HTMLButtonElement>('.recolher-vencidas')!;

    it('sem vencidas, o bloco não aparece', () => {
      criar();
      expect(el().querySelector('.bloco--vencidas')).toBeNull();
    });

    it('mostra quantidade e total; recolher esconde a lista e fica lembrado', () => {
      contas.listarVencidas.and.returnValue(of(vencidas));
      criar();
      expect(texto()).toMatch(/2 contas vencidas · R\$\s*953,00/);
      expect(texto()).toContain('Taxa de obra');
      expect(texto()).not.toContain('Tudo em dia');

      botaoRecolher().click();
      fixture.detectChanges();

      expect(texto()).not.toContain('Taxa de obra');
      expect(localStorage.getItem('homeVencidasRecolhidas')).toBe('true');
    });
  });
});
