import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { Router } from '@angular/router';
import { formatYearMonth } from 'src/app/core/utils/mask';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { MenuItem } from 'primeng/api';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin } from 'rxjs';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';


@Component({
  selector: 'app-extrato-bancario-resumo',
  templateUrl: './extrato-bancario-resumo.component.html',
})
export class ExtratoBancarioResumoComponent implements OnInit {
  exibirCampos: ExibirCamposConfig | null = null;
  dateFilter: Date | undefined
  gridColumns: GridColumn[] = [];
  categorias: CategoriaDto[] = [];
  tiposConta: TipoCartaoDto[] = [];
  bancos: BancoDto[] = [];
  /** Para o autocomplete do lançamento manual. */
  pessoas: PessoaMovimentacaoDto[] = [];
  extratos: ExtratoItemDto[] = [];
  resumo: any[] = [];
  selectedMonth: any;
  itemsButtom: MenuItem[] = [];

  breadcrumb = [{ label: 'Movimentações' }, { label: 'Resumo Extrato Bancário' }]

  loading = false;

  showImportModal = false;
  showManualModal = false;
  showModalImportacoesMensais = false;
  showModalConfigPessoas = false;
  showToolbar = false;



  editing: CategoriaDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;
  private readonly destroyRef = inject(DestroyRef);
  /** Mês pedido ("YYYY-MM"); a carga segue sempre o último. */
  private readonly mes$ = new Subject<string>();

  constructor(
    private router: Router,
    private extratoItemService: ExtratoBancarioItemService,
    private tipoCartaoService: TipoCartaoService,
    private categoryService: CategoryService,
    private bancoService: BancoService,
    private readonly pessoaService: PessoaMovimentacaoService,
    private readonly alertService: AlertService
  ) { }

  ngOnInit() {
    this.setExibirCampos()
    this.setitemsButtom();
    this.setGridColumns()

    // Troca de mês: só a resposta do último mês pedido chega à tela (FE-P2-08).
    ultimaBusca(this.mes$, mes => this.extratoItemService.listarDoMes(mes), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o extrato do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(itens => {
        this.extratos = Array.isArray(itens) ? itens : [];
        this.loading = false;
        this.resumo = this.buildResumo();
      });

    this.carregarDados();
    this.loadMonth();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      paginator: true,
      filterMonth: true,
      buttonPopUp: true,
      buttonEditLine: true,
    }
  }

  carregarDados() {
    forkJoin({
      bancos: this.bancoService.listar(),
      tipos: this.tipoCartaoService.listar(),
      categorias: this.categoryService.listarAtivas(),
      pessoas: this.pessoaService.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ bancos, tipos, categorias, pessoas }) => {
          this.bancos = bancos ?? [];
          this.tiposConta = tipos ?? [];
          this.categorias = categorias ?? [];
          this.pessoas = pessoas ?? [];
          this.resumo = this.buildResumo();
        },
        error: () => this.alertService.info('Falha ao carregar catálogos (bancos/tipos/categorias).')
      });
  }


  private setitemsButtom(): void {
    this.itemsButtom = [
      // "Importar extrato" e "Adicionar item" eram botões da toolbar antiga e ficaram de fora
      // na migração para a grid genérica (8d74acc); os modais continuavam no template.
      {
        label: 'Importar extrato',
        icon: 'pi pi-file-import',
        command: () => {
          this.showImportModal = true;
        }
      },
      {
        label: 'Adicionar item',
        icon: 'pi pi-plus',
        command: () => {
          this.showManualModal = true;
        }
      },
      {
        label: 'Importações Mensais',
        icon: 'pi pi-download',
        command: () => {
          this.showModalImportacoesMensais = true;
        }
      },
      {
        label: 'Relatório Mensal',
        icon: 'pi pi-chart-line',
        command: () => {
          this.abrirRelatorioMensal();
        }
      },
      {
        label: 'Configurar Pessoas',
        icon: 'pi pi-cog',
        command: () => {
          this.abrirConfigPessoas();
        }
      },
      {
        label: 'Exportar tabela',
        icon: 'pi pi-upload',
        command: () => {
          this.grid?.onExport();
        }
      },
      {
        label: 'Atualizar',
        icon: 'pi pi-refresh',
        command: () => {
          this.loadMonth();
        }
      },
    ];
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'bancoNome', header: 'BANCO', type: GridColumnTypeEnum.Text, width: "20%" },
      { field: 'tipoContaNome', header: 'TIPO CONTA', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: 'totalEntrada',
        header: 'TOTAL ENTRADAS',
        type: GridColumnTypeEnum.Text,
        width: "25%",
        formatter: (row: any) => this.formatarMoeda(row.totalEntrada),
        classe: 'text-green-600 font-bold'
      },
      {
        field: 'totalSaida',
        header: 'TOTAL SAÍDAS',
        type: GridColumnTypeEnum.Text,
        width: "25%",
        formatter: (row: any) => this.formatarMoeda(row.totalSaida),
        classe: 'text-red-500 font-bold'
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions },
    ];
  }

  // Helper opcional para formatar valores em Real (caso sua grid não faça isso nativamente)
  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  abrirRelatorioMensal() {
    const params: any = {
      month: this.selectedMonth,
    };

    this.router.navigate(['extrato-bancario/relatorio'], { queryParams: params });
  }

  loadMonth(dataSelecionada?: Date) {
    if (dataSelecionada) {
      this.dateFilter = dataSelecionada;
      localStorage.setItem('dataFiltroResumo', dataSelecionada.toISOString());
    } else {
      const ultimoMesSelecionado = localStorage.getItem('dataFiltroResumo');
      this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
    }

    this.selectedMonth = formatYearMonth(this.dateFilter);
    this.loading = true;
    this.mes$.next(this.selectedMonth);
  }

  private buildResumo(): any[] {
    const map = new Map<string, any>();

    for (const banco of this.bancos) {
      // // ✅ aplica filtro de banco
      // if (this.bancoFilter && String(banco.id) !== String(this.bancoFilter)) continue;

      // // ✅ aplica filtro de tipo de conta/cartão
      // if (this.tipoContaFilter && String(banco.tipoCartaoId ?? '') !== String(this.tipoContaFilter)) continue;

      const bancoId = String(banco.id);
      const tipoCartaoId = String(banco.tipoCartaoId ?? 'null');
      const key = `${bancoId}-${tipoCartaoId}`;

      const tipoCartaoNome =
        this.tiposConta.find(t => String(t.id) === tipoCartaoId)?.nomeTipoCartao ?? '—';

      const totalEntrada = this.extratos.reduce((sum, item) => {
        if (item.bancoId == banco.id) {
          return sum + (String(item.tipoLancamento).toUpperCase() === 'ENTRADA' || item.tipoLancamento === 'Entrada'
            ? Number(item.valor)
            : 0);
        }
        return sum;
      }, 0);

      const totalSaida = this.extratos.reduce((sum, item) => {
        if (item.bancoId == banco.id) {
          // aceita "Saída" e "SAIDA"
          const tl = String(item.tipoLancamento ?? '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
          return sum + (tl === 'SAIDA' ? Number(item.valor) : 0);
        }
        return sum;
      }, 0);

      if (!map.has(key)) {
        map.set(key, {
          bancoId,
          bancoNome: banco.nomeBanco,
          tipoCartaoId: banco.tipoCartaoId ? String(banco.tipoCartaoId) : 'null',
          tipoContaNome: tipoCartaoNome ?? '—',
          totalEntrada: 0,
          totalSaida: 0,
        });
      }

      const row = map.get(key);
      row.totalEntrada += totalEntrada;
      row.totalSaida += totalSaida;
    }

    return Array.from(map.values());
  }

  onToggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  /** Fechou a importação (app-modal-importar-extrato): recarrega o mês se importou. */
  onImportacaoFechada(importou: boolean) {
    this.showImportModal = false;
    if (importou) this.loadMonth();
  }

  /** Fechou o lançamento manual (app-modal-lancamento-manual): recarrega o mês se gravou. */
  onLancamentoManualFechado(gravou: boolean) {
    this.showManualModal = false;
    if (gravou) this.loadMonth();
  }

  abrirConfigPessoas() {
    this.showModalConfigPessoas = true;
  }

  onEdit(row: ExtratoItemDto) {
    console.log('Objeto recebido no onEdit:', row);
    const params: any = {
      month: this.selectedMonth,
      bancoId: row.bancoId,
      tipoContaId: row.tipoCartaoId,
    };

    this.router.navigate(['extrato-bancario/detalhes'], { queryParams: params });
  }
}

