import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { BancoDto } from 'src/app/core/models/banco.model';
import { CoberturaImportacoesDto, ExtratoItemDto, ImportacaoDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { BancoService } from 'src/app/core/services/banco.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { ResumoBancosComponent } from './resumo-bancos.component';
import { contarPendencias, filtrarBancos, montarCardsBancos, ordenarBancos } from './resumo-bancos.regras';

const tipos = [{ id: 1, nomeTipoCartao: 'Conta corrente', ehCredito: false }, { id: 2, nomeTipoCartao: 'Cartão de crédito', ehCredito: true }] as TipoCartaoDto[];
const bancos = [
  { id: 1, nomeBanco: 'Caixa', tipoCartaoId: 1, saldoInicial: 0, ativo: true },
  { id: 2, nomeBanco: 'NuBank', tipoCartaoId: 2, saldoInicial: 0, ativo: true, diaVencimento: 31 },
  { id: 3, nomeBanco: 'Santander', tipoCartaoId: 1, saldoInicial: 0, ativo: true }
] as BancoDto[];
const item = (extra: Partial<ExtratoItemDto>): ExtratoItemDto =>
  ({ id: 1, dataMovimentacao: '2026-10-05', valor: 10, tipoLancamento: 'Saída', categoriaId: 1, ...extra }) as ExtratoItemDto;
const imp = (extra: Partial<ImportacaoDto>): ImportacaoDto =>
  ({ id: 7, bancoId: 1, bancoNome: 'Caixa', importadoEm: '2026-10-30T10:00:00', lancamentos: 2, semCategoria: 0, entradas: 0, saidas: 0, status: 'Concluida', ...extra }) as ImportacaoDto;
const cobertura: CoberturaImportacoesDto = {
  meses: ['2026-10'],
  contas: [{ bancoId: 3, bancoNome: 'Santander', celulas: [{ mes: '2026-10', estado: 'falta', lancamentos: 0, pendencias: 0 }] }]
};
const itens = [
  item({ bancoId: 1, valor: 100, tipoLancamento: 'Entrada', extratoBancarioId: 7 }),
  item({ bancoId: 1, valor: 30, categoriaId: null, extratoBancarioId: 7 }),
  item({ bancoId: 2, valor: 80 })
];
const dados = { mes: '2026-10', itens, bancos, tipos, pessoas: [], importacoes: [imp({}), imp({ id: 8, bancoId: 3, importadoEm: '2026-09-02T10:00:00' })], cobertura, compras: null, hoje: new Date(2026, 9, 21) };

/** Lista de bancos do Resumo (card #62). */
describe('ResumoBancos', () => {
  it('monta conta, cartão com fatura e vencimento, e conta sem extrato', () => {
    const [caixa, nu, santander] = montarCardsBancos(dados);

    expect([caixa.entradas, caixa.saidas, caixa.semCategoria, caixa.importadoEm]).toEqual([100, 30, 1, '2026-10-30T10:00:00']);
    expect([nu.fatura, nu.vence, nu.importadoEm, nu.quantidade, nu.subtitulo]).toEqual([80, '31/10', null, 1, 'Fatura out · vence 31/10 (em 10 dias)']);
    expect([santander.falta, santander.ultimaImportacao]).toEqual([true, '2026-09-02T10:00:00']);
  });

  it('falta receber vem dos Acertos e só das compras deste banco; sem Acertos fica null', () => {
    const lista = [item({ id: 5, bancoId: 2, valor: 80 }), item({ id: 6, bancoId: 1, valor: 9 })];
    const compras = new Map([[5, { valor: 80, pago: 30 }], [6, { valor: 9, pago: 0 }]]);

    expect(montarCardsBancos({ ...dados, itens: lista, compras })[1].faltaReceber).toBe(50);
    expect(montarCardsBancos({ ...dados, itens: lista })[1].faltaReceber).toBeNull();
  });

  it('conta agência e pendências', () => {
    const comAgencia = bancos.map(b => (b.id === 1 ? { ...b, agencia: '1234', numeroConta: '5678-9' } : b));
    const cards = montarCardsBancos({ ...dados, bancos: comAgencia });

    expect(cards[0].subtitulo).toBe('Ag. 1234 · CC 5678-9');
    expect(contarPendencias(cards)).toEqual({ total: 2, semExtrato: 1, semCategoria: 1 });
  });

  it('ordena por valor, lançamentos e sem categoria, desempatando pelo nome', () => {
    const cards = montarCardsBancos(dados);
    expect(ordenarBancos(cards, 'valor').map(c => c.nome)).toEqual(['NuBank', 'Caixa', 'Santander']);
    expect(ordenarBancos(cards, 'lancamentos').map(c => c.nome)).toEqual(['Caixa', 'NuBank', 'Santander']);
    expect(ordenarBancos(cards, 'sem-categoria')[0].nome).toBe('Caixa');
    expect(ordenarBancos(cards, 'nome').map(c => c.nome)).toEqual(['Caixa', 'NuBank', 'Santander']);
  });

  it('importação desfeita não conta como importado', () => {
    const [caixa] = montarCardsBancos({ ...dados, importacoes: [imp({ status: 'Desfeita' })] });
    expect(caixa.importadoEm).toBeNull();
  });

  it('filtra contas e cartões', () => {
    const cards = montarCardsBancos(dados);
    expect(filtrarBancos(cards, 'cartoes').map(c => c.nome)).toEqual(['NuBank']);
    expect(filtrarBancos(cards, 'contas').map(c => c.nome)).toEqual(['Caixa', 'Santander']);
    expect(filtrarBancos(cards, 'todas').length).toBe(3);
    expect(filtrarBancos(cards, 'todas', 'nub').map(c => c.nome)).toEqual(['NuBank']);
  });

  describe('tela', () => {
    let itensService: jasmine.SpyObj<ExtratoBancarioItemService>;
    const criar = () => {
      const f = TestBed.createComponent(ResumoBancosComponent);
      f.detectChanges();
      return f;
    };

    beforeEach(() => {
      itensService = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['listarDoMes', 'acertos', 'evolucao']);
      itensService.acertos.and.returnValue(of({ pessoas: [] }) as never);
      itensService.evolucao.and.returnValue(of({ meses: [{ mes: '2026-10', entradas: 100, saidas: 30, resultado: 70 }] }));
      itensService.listarDoMes.and.returnValue(of(itens));
      TestBed.configureTestingModule({
        imports: [ResumoBancosComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService,
          { provide: LarguraTelaService, useValue: { movel: signal(false) } },
          { provide: ExtratoBancarioItemService, useValue: itensService },
          { provide: ExtratoBancarioService, useValue: { listarImportacoes: () => of([imp({})]), coberturaImportacoes: () => of(cobertura) } },
          { provide: BancoService, useValue: { listar: () => of(bancos) } },
          { provide: TipoCartaoService, useValue: { listar: () => of(tipos) } },
          { provide: CategoryService, useValue: { listarAtivas: () => of([]) } },
          { provide: PessoaMovimentacaoService, useValue: { listar: () => of([]) } }]
      });
    });

    it('clicar no banco abre o Extrato dele no mês', () => {
      const f = criar();
      f.componentInstance.selectedMonth = '2026-10';
      const navegar = spyOn(TestBed.inject(Router), 'navigate');

      (f.nativeElement.querySelector('button.rb-card') as HTMLElement).click();

      expect(navegar).toHaveBeenCalledWith(['/extrato-bancario'], { queryParams: { month: '2026-10', bancoId: 1 } });
    });

    it('conta sem extrato abre o Importar com a conta', () => {
      const f = criar();
      f.componentInstance.cards = f.componentInstance.cards.map(c => ({ ...c, falta: c.bancoId === 3 }));
      f.detectChanges();
      expect(f.nativeElement.querySelector('.rb-falta').textContent).toContain('ainda não importado');

      f.componentInstance.abrirImportar(3);
      expect([f.componentInstance.showImportar, f.componentInstance.bancoParaImportar]).toEqual([true, 3]);
      f.destroy();
    });

    it('a barra mostra busca, ordenação e cards × lista à direita', () => {
      const el = criar().nativeElement as HTMLElement;
      const fim = el.querySelector('.mf-filter-bar__fim') as HTMLElement;

      expect(fim.querySelector('input[aria-label="Buscar banco"]')).not.toBeNull();
      expect(fim.querySelector('p-dropdown')).not.toBeNull();
      expect(fim.querySelectorAll('.rb-modos p-button').length).toBe(2);
    });

    it('os botões alternam para lista', () => {
      const f = criar();
      (f.nativeElement.querySelectorAll('.rb-modos button')[1] as HTMLElement).click();
      f.detectChanges();
      expect(f.nativeElement.querySelector('.rb-tabela')).not.toBeNull();
    });

    it('mostra os totais do mês e alterna para lista', () => {
      const f = criar();
      expect(f.componentInstance.totais?.resultado).toBe(70);
      expect(f.nativeElement.textContent).toContain('Resultado do mês');

      f.componentInstance.modo = 'lista';
      f.detectChanges();
      expect(f.nativeElement.querySelector('.rb-tabela')).not.toBeNull();
      expect(f.nativeElement.querySelector('button.rb-card')).toBeNull();
    });

    it('mês vazio mostra o que fazer', () => {
      itensService.listarDoMes.and.returnValue(of([]));
      const f = criar();
      f.componentInstance.cards = f.componentInstance.cards.map(c => ({ ...c, falta: false }));
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Importe o extrato');
    });
  });
});
