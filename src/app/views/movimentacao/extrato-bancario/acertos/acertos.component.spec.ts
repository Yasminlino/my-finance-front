import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AcertosComponent } from './acertos.component';
import { AcertosDto } from 'src/app/core/models/acertos.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Aba Acertos com pessoas do Extrato (card #45, parte 3). */
describe('AcertosComponent', () => {
  let fixture: ComponentFixture<AcertosComponent>;
  let servico: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ');

  const dados = (): AcertosDto => ({
    pessoas: [
      {
        pessoaId: 10, nome: 'CARLOS', ehTitular: false, devido: 150, recebido: 30, falta: 120, quitado: false, aindaVaiCobrar: 200,
        compras: [
          { id: 1, data: '2026-10-03', descricao: 'Tênis', valor: 100, bancoId: 3, bancoNome: 'Nubank Cred', parcelaAtual: 2, quantidadeParcelas: 4, pago: 30, quitada: false },
          { id: 2, data: '2026-10-05', descricao: 'Lanche', valor: 50, bancoId: 3, bancoNome: 'Nubank Cred', parcelaAtual: null, quantidadeParcelas: null, pago: 0, quitada: false }
        ],
        pagamentos: [{ id: 9, data: '2026-10-20', descricao: 'Pagamento de CARLOS', valor: 30, bancoId: 5, bancoNome: 'NuBank', abateItemId: 1 }],
        proximasParcelas: [
          { mes: '2026-11', descricao: 'Tênis', valor: 100, parcela: 3, quantidadeParcelas: 4 },
          { mes: '2026-12', descricao: 'Tênis', valor: 100, parcela: 4, quantidadeParcelas: 4 }
        ]
      },
      {
        pessoaId: 11, nome: 'ÁGATHA', ehTitular: false, devido: 80, recebido: 80, falta: 0, quitado: true, aindaVaiCobrar: 0,
        compras: [], pagamentos: [], proximasParcelas: []
      }
    ],
    eu: {
      pessoaId: 1, nome: 'Eu', ehTitular: true, devido: 12, recebido: 0, falta: 12, quitado: false, aindaVaiCobrar: 0,
      compras: [], pagamentos: [], proximasParcelas: []
    },
    totais: { devido: 230, recebido: 110, faltaReceber: 120, aindaVaiCobrar: 200 }
  });

  function abrir(movel = false) {
    fixture = TestBed.createComponent(AcertosComponent);
    fixture.componentRef.setInput('bancos', [{ id: 3, nomeBanco: 'Nubank Cred' }, { id: 5, nomeBanco: 'NuBank' }]);
    fixture.componentRef.setInput('movel', movel);
    fixture.detectChanges();
  }

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['acertos', 'criar']);
    servico.acertos.and.returnValue(of(dados()));
    servico.criar.and.returnValue(of({}));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info']);
    TestBed.configureTestingModule({
      imports: [AcertosComponent],
      providers: [provideNoopAnimations(), { provide: ExtratoBancarioItemService, useValue: servico }, { provide: AlertService, useValue: alerta }]
    });
  });

  afterEach(() => fixture?.destroy());

  it('carrega sem período, mostra os 4 totais e um card por pessoa que ainda deve; avisa o que falta receber', () => {
    const faltas: number[] = [];
    fixture = TestBed.createComponent(AcertosComponent);
    fixture.componentInstance.faltaReceber.subscribe(v => faltas.push(v));
    fixture.componentRef.setInput('bancos', []);
    fixture.detectChanges();

    expect(servico.acertos).toHaveBeenCalledWith({ inicio: null, fim: null, bancoId: null });
    expect(el().querySelectorAll('mf-stat-card').length).toBe(4);
    expect(texto(el())).toContain('Ainda vai cobrar');
    expect(el().querySelectorAll('.acerto-card').length).toBe(1);
    expect(texto(el().querySelector('.acerto-card'))).toContain('CARLOS');
    expect(faltas).toEqual([120]);
  });

  it('switches mostram os quitados (com selo) e o "Eu"', () => {
    abrir();
    comp().mostrarQuitados = true;
    comp().mostrarEu = true;
    fixture.detectChanges();

    const cards = Array.from(el().querySelectorAll('.acerto-card')).map(texto);
    expect(cards.length).toBe(3);
    expect(cards[1]).toContain('Quitado');
    expect(cards[2]).toContain('Eu');
  });

  it('período e conta recarregam com AAAA-MM e o banco', () => {
    abrir();
    comp().periodo = [new Date(2026, 9, 1), new Date(2026, 10, 1)];
    comp().bancoId = 3;
    comp().aoMudarFiltro();

    expect(servico.acertos).toHaveBeenCalledWith({ inicio: '2026-10', fim: '2026-11', bancoId: 3 });
  });

  it('clicar no card abre o detalhe: compras com o pago, próximas parcelas por mês e pagamentos', () => {
    abrir();
    (el().querySelector('.acerto-card') as HTMLElement).click();
    fixture.detectChanges();

    const detalhe = texto(el().querySelector('.acerto-detalhe'));
    expect(detalhe).toContain('Tênis');
    expect(detalhe).toContain('2/4');
    expect(detalhe).toContain('novembro de 2026');
    expect(detalhe).toContain('Pagamento de CARLOS');
    expect(el().querySelector('.acerto-detalhe p-timeline')).not.toBeNull();
  });

  it('Registrar pagamento: "Tudo" é o que falta (ou o restante da compra); salvar cria a Entrada e recarrega', () => {
    const alterou = jasmine.createSpy('alterou');
    abrir();
    comp().alterou.subscribe(alterou);
    comp().abrirPagamento(comp().acertos!.pessoas[0]);
    fixture.detectChanges();

    expect(comp().pagamento?.valor).toBe(120);
    comp().escolherCompra(1);
    expect(comp().pagamento?.valor).toBe(70);
    comp().pagamento!.bancoId = 5;
    comp().pagamento!.data = new Date(2026, 9, 25);
    comp().salvarPagamento();

    expect(servico.criar).toHaveBeenCalledWith(jasmine.objectContaining({
      tipoLancamento: 'Entrada', valor: 70, bancoId: 5, abateItemId: 1, pessoaMovimentacaoId: 10, dataMovimentacao: '2026-10-25'
    }));
    expect(servico.acertos).toHaveBeenCalledTimes(2);
    expect(alterou).toHaveBeenCalled();
    expect(comp().pagamento).toBeNull();
  });

  it('pagamento sem conta ou sem valor não salva; erro da API avisa e mantém aberto', () => {
    abrir();
    comp().abrirPagamento(comp().acertos!.pessoas[0]);
    comp().salvarPagamento();
    expect(servico.criar).not.toHaveBeenCalled();

    comp().pagamento!.bancoId = 5;
    comp().pagamento!.modo = 'outro';
    comp().pagamento!.outroValor = 0;
    comp().salvarPagamento();
    expect(servico.criar).not.toHaveBeenCalled();

    servico.criar.and.returnValue(throwError(() => ({ error: { message: 'A compra abatida tem que ser uma saída da mesma pessoa.' } })));
    comp().pagamento!.outroValor = 15;
    comp().salvarPagamento();
    expect(alerta.error).toHaveBeenCalled();
    expect(comp().pagamento).not.toBeNull();
  });

  it('celular: 2 mini-cards (Falta receber e Ainda vai cobrar) e o pagamento numa folha de baixo', () => {
    abrir(true);

    expect(el().querySelectorAll('mf-stat-card').length).toBe(2);
    expect(texto(el())).toContain('Falta receber');
    comp().abrirPagamento(comp().acertos!.pessoas[0]);
    fixture.detectChanges();
    expect(comp().posicaoPainel).toBe('bottom');
  });
});
