import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { ResumoContaDto, ResumoContasDto } from 'src/app/core/models/resumo-categorias.model';
import { BancoService } from 'src/app/core/services/banco.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { ResumoBancosComponent } from './resumo-bancos.component';
import { filtrarBancos, juntarNomes, numerosDoCard, ordenarBancos, semMovimento } from './resumo-bancos.regras';

const conta = (extra: Partial<ResumoContaDto>): ResumoContaDto => ({
  bancoId: 1, nome: 'Caixa', tipoNome: 'Conta corrente', ehCredito: false, ativo: true, compartilhado: false, conviteCompartilharDispensado: false,
  pessoas: [], quantidade: 3, entradas: 100, saidas: 30, resultado: 70, semCategoria: 1, fatura: 0, pagamentosEstornos: 0, parcelasQueContinuam: 0,
  minhasCompras: 0, deOutrasPessoas: 0, porPessoa: [], faltaReceber: 0, importadoEm: '2026-10-30T10:00:00', faltaImportar: false, ...extra
});
const contas = [
  conta({}),
  conta({ bancoId: 2, nome: 'NuBank', tipoNome: 'Cartão de crédito', ehCredito: true, fatura: 110, pagamentosEstornos: 20, quantidade: 4,
    compartilhado: true, pessoas: ['CARLOS'], minhasCompras: 30, deOutrasPessoas: 80, faltaReceber: 50 }),
  conta({ bancoId: 3, nome: 'Santander', quantidade: 0, entradas: 0, saidas: 0, resultado: 0, semCategoria: 0, faltaImportar: true, importadoEm: null }),
  conta({ bancoId: 4, nome: 'Bradesco', quantidade: 0, entradas: 0, saidas: 0, resultado: 0, semCategoria: 0, importadoEm: null })
];
const resumo: ResumoContasDto = { mes: '2026-10', entradas: 100, saidas: 60, paraClassificar: 1, faltaReceber: 50, contas };

/** Listagem das contas (cards #62 e #77). */
describe('ResumoBancos', () => {
  it('os 3 números do card são os do topo do detalhe', () => {
    expect(numerosDoCard(contas[0]).map(n => [n.rotulo, n.valor])).toEqual([['Entradas', 100], ['Saídas', 30], ['Resultado', 70]]);
    expect(numerosDoCard(contas[1]).map(n => [n.rotulo, n.valor])).toEqual([['Fatura', 110], ['Minhas compras', 30], ['De outras pessoas', 80]]);
    const soMeu = conta({ ehCredito: true, fatura: 50, pagamentosEstornos: 5, parcelasQueContinuam: 40 });
    expect(numerosDoCard(soMeu).map(n => n.rotulo)).toEqual(['Fatura', 'Pagamentos', 'Parcelas que continuam']);
  });

  it('filtra, busca, ordena e separa as contas sem movimento', () => {
    expect(filtrarBancos(contas, 'cartoes').map(c => c.nome)).toEqual(['NuBank']);
    expect(filtrarBancos(contas, 'todas', 'nub').map(c => c.nome)).toEqual(['NuBank']);
    expect(ordenarBancos(contas, 'valor')[0].nome).toBe('NuBank');
    expect(contas.filter(semMovimento).map(c => c.nome)).toEqual(['Bradesco']);
    expect(juntarNomes(['Carlos', 'Ágatha', 'Bia'])).toBe('Carlos, Ágatha e Bia');
  });

  describe('tela', () => {
    const criar = () => {
      const f = TestBed.createComponent(ResumoBancosComponent);
      f.detectChanges();
      return f;
    };

    beforeEach(() => {
      const itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['resumoContas']);
      itens.resumoContas.and.returnValue(of(resumo));
      TestBed.configureTestingModule({
        imports: [ResumoBancosComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService,
          { provide: LarguraTelaService, useValue: { movel: signal(false) } },
          { provide: ExtratoBancarioItemService, useValue: itens },
          { provide: BancoService, useValue: { listar: () => of([]) } },
          { provide: TipoCartaoService, useValue: { listar: () => of([]) } },
          { provide: CategoryService, useValue: { listarAtivas: () => of([]) } },
          { provide: PessoaMovimentacaoService, useValue: { listar: () => of([]) } }]
      });
    });

    it('KPIs com Falta receber quando há cartão compartilhado; card compartilhado diz quem usa', () => {
      const el = criar().nativeElement as HTMLElement;
      expect(el.textContent).toContain('Falta receber');
      expect(el.textContent).toContain('Para classificar');
      expect(el.querySelector('.rb-card--compartilhado')?.textContent).toContain('CARLOS usa');
    });

    it('conta sem extrato vira aviso com Importar; conta parada fica recolhida', () => {
      const f = criar();
      const el = f.nativeElement as HTMLElement;
      expect(el.querySelector('.rb-card--falta')?.textContent).toContain('ainda não importado');
      expect(el.textContent).not.toContain('Bradesco');
      expect(el.querySelector('.rb-recolhidas')?.textContent).toContain('1 conta sem lançamentos');

      (el.querySelector('.rb-recolhidas') as HTMLElement).click();
      f.detectChanges();
      expect(el.textContent).toContain('Bradesco');
    });

    it('clicar na conta abre o Extrato dela no mês; a barra tem busca, ordenação e cards × lista', () => {
      const f = criar();
      f.componentInstance.selectedMonth = '2026-10';
      const navegar = spyOn(TestBed.inject(Router), 'navigate');
      const el = f.nativeElement as HTMLElement;
      expect(el.querySelector('.mf-filter-bar__fim input[aria-label="Buscar conta"]')).not.toBeNull();
      expect(el.querySelectorAll('.mf-filter-bar__fim .rb-modos p-button').length).toBe(2);

      (el.querySelector('button.rb-card') as HTMLElement).click();

      expect(navegar).toHaveBeenCalledWith(['/extrato-bancario'], { queryParams: { month: '2026-10', bancoId: 1 } });
    });

    it('sem cartão compartilhado, o KPI Falta receber some', () => {
      TestBed.inject(ExtratoBancarioItemService).resumoContas = () => of({ ...resumo, faltaReceber: null });
      const el = criar().nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Falta receber');
    });
  });
});
