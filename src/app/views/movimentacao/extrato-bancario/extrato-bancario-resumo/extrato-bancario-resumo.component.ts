import { Component, OnInit, ViewChild } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ExibirCampos, GridColumn, GridColumnOption, GridRowChange } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { Router } from '@angular/router';
import { formatYearMonth, isoDateMinusHours, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { BancoDto } from 'src/app/core/interfaces/banco.interface';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { ExtratoBancarioItemService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario-item.service';
import { ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { MenuItem } from 'primeng/api';


@Component({
  selector: 'app-extrato-bancario-resumo',
  templateUrl: './extrato-bancario-resumo.component.html',
})
export class ExtratoBancarioResumoComponent implements OnInit {
  exibirCampos: ExibirCampos | null = null;
  dateFilter: Date | undefined
  gridColumns: GridColumn[] = [];
  categorias: Category[] = [];
  tiposConta: TipoCartaoDto[] = [];
  bancos: BancoDto[] = [];
  extratos: ExtratoItemDto[] = [];
  resumo: any[] = [];
  file: any;
  selectedMonth: any;
  itemsButtom: MenuItem[] = [];

  statusLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
  }

  breadcrumb = [{ label: 'Movimentações' }, { label: 'Resumo Extrato Bancário' }]

  loading = false;

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showImportModal = false;
  showManualModal = false;
  showModalImportacoesMensais = false;
  showModalConfigPessoas = false;
  showToolbar = false;
  importLoading = false;
  savingManual = false;

  selectedBancoId = '';
  selectedBancoNome = '';
  selectedTipoContaId = '';

  manualForm = {
    dataMovimentacao: isoDateMinusHours(),
    tipo: 'SAIDA', // ENTRADA | SAIDA
    valor: '',
    bancoId: '',
    tipoCartaoId: '',
    tipoCartaoNome: '',
    pessoaTransacao: '',
    categoriaId: '',
    descricao: '',
    observacao: '',

    parcelado: false,
    totalParcelas: '',
    numeroParcela: '1',
    grupoParcelamentoId: '',
  };

  editing: Category | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(
    private router: Router,
    private extratoItemService: ExtratoBancarioItemService,
    private contaService: ContaService,
    private contaMensalService: ContaMensalService,
    private tipoCartaoService: TipoCartaoService,
    private categoryService: CategoryService,
    private bancoService: BancoService,
    private readonly alertService: AlertService
  ) { }

  async ngOnInit() {
    this.setExibirCampos()
    this.setitemsButtom();
    this.setGridColumns()
    await this.carregarDados()
    this.resumo = this.buildResumo()
    await this.load();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: false,
      paginator: true,
      filterMonth: true,
      buttonDeleteAll: false,
      buttonNew: false,
      buttonLock: false,
      buttonPopUp: true,
      buttonEditLine: true,
      buttonDeleteLine: false,
      buttonSaveCancel: false,
    }
  }

  async carregarDados() {
    try {
      const [bancos, tipos, cats] = await Promise.all([
        this.bancoService.list(),
        this.tipoCartaoService.list(),
        this.categoryService.buscarCategoriasAtivas(),
      ]);

      this.bancos = bancos ?? [];
      this.tiposConta = tipos ?? [];
      this.categorias = cats ?? [];
    } catch (e: any) {
      this.alertService.info('Falha ao carregar catálogos (bancos/tipos/categorias).');
    }
  }


  private setitemsButtom(): void {
    this.itemsButtom = [
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
          this.load();
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
        classe: 'text-success fw-bold'
      },
      {
        field: 'totalSaida',
        header: 'TOTAL SAÍDAS',
        type: GridColumnTypeEnum.Text,
        width: "25%",
        formatter: (row: any) => this.formatarMoeda(row.totalSaida),
        classe: 'text-danger fw-bold'
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
      month: this.dateFilter,
    };

    this.router.navigate(['extrato-bancario/RelatorioGastosMensais'], { queryParams: params });
  }

  async load(dataSelecionada?: Date) {
    try {
      this.loading = true;

      if (dataSelecionada) {
        this.dateFilter = dataSelecionada;
        localStorage.setItem('dataFiltroContaMensal', dataSelecionada.toISOString());
      } else {
        const ultimoMesSelecionado = localStorage.getItem('dataFiltroContaMensal');
        this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
      }

      const mesFormatado = formatYearMonth(this.dateFilter);
      this.selectedMonth = mesFormatado

      // a API já recebe monthFilter e opcional bancoId
      const rows = await this.extratoItemService.listExtratos(this.selectedMonth);
      this.extratos = Array.isArray(rows) ? rows : [];

    } catch {
      // Trata o erro
    } finally {
      this.loading = false;
      this.resumo = this.buildResumo();
    }
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

  openImportModal() {
    this.selectedBancoId = '';
    this.selectedBancoNome = '';
    this.selectedTipoContaId = '';
    this.showImportModal = true;
  }

  closeImportModal() {
    if (!this.importLoading) this.showImportModal = false;
  }

  onBancoModalChange(value: string) {
    this.selectedBancoId = value;

    const banco = this.bancos.find(b => String(b.id) === String(value));
    this.selectedBancoNome = banco?.nomeBanco ?? '';
    this.selectedTipoContaId = banco?.tipoCartaoId ? String(banco.tipoCartaoId) : '';
  }

  async onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.file = file;

  }

  async onSave(ev: Event) {
    if (!this.file)
      this.alertService.error('Nenhum arquivo selecionado.');

    const input = ev.target as HTMLInputElement;

    if (!this.selectedBancoId) {
      this.alertService.error('Informe o banco antes de continuar.');
      input.value = '';
      return;
    }

    try {
      this.importLoading = true;
      await this.extratoItemService.importExtrato(this.file, {
        id: Number(this.selectedBancoId),
        nomeBanco: this.selectedBancoNome,
        tipoCartaoId: this.selectedTipoContaId ? Number(this.selectedTipoContaId) : null,
      });

      this.alertService.success('Extrato importado com sucesso!');
      this.showImportModal = false;
      await this.load();
    } catch {
      this.alertService.error('Falha ao importar arquivo.');
    } finally {
      this.importLoading = false;
      input.value = '';
    }
  }

  openManualModal() {
    this.manualForm = {
      dataMovimentacao: isoDateMinusHours(),
      tipo: 'SAIDA',
      valor: '',
      bancoId: '',
      tipoCartaoId: '',
      tipoCartaoNome: '',
      pessoaTransacao: '',
      categoriaId: '',
      descricao: '',
      observacao: '',
      parcelado: false,
      totalParcelas: '',
      numeroParcela: '1',
      grupoParcelamentoId: '',
    };
    this.showManualModal = true;
  }

  closeManualModal() {
    if (!this.savingManual) this.showManualModal = false;
  }

  maskValueTyping(value: any) {
    this.maskValueTyping(value);

  }

  setManual(key: keyof typeof this.manualForm, value: any) {
    (this.manualForm as any)[key] = value;

    // quando escolhe banco -> preenche tipoCartaoId automaticamente
    if (key === 'bancoId') {
      const banco = this.bancos.find(b => String(b.id) === String(value));
      const tipoCartao = banco?.tipoCartao ?? '';
      if (tipoCartao && typeof tipoCartao !== 'string') {
        this.manualForm.tipoCartaoId = String(tipoCartao.id);
        this.manualForm.tipoCartaoNome = tipoCartao.nomeTipoCartao;
      } else {
        this.manualForm.tipoCartaoId = '';
        this.manualForm.tipoCartaoNome = '';
      }

    }
  }

  get isCreditoSelecionado() {
    if (!this.manualForm.tipoCartaoId) return false;
    const conta = this.tiposConta.find(t => String(t.id) === String(this.manualForm.tipoCartaoId));
    if (!conta) return false;

    const bool =
      (conta as any).ehCredito ??
      (conta as any).EhCredito ??
      (conta as any).isCredito ??
      (conta as any).IsCredito;

    if (typeof bool === 'boolean') return bool;

    const nome = String((conta as any).nomeTipoCartao ?? (conta as any).NomeTipoCartao ?? '');
    return /cr[eé]dito/i.test(nome);
  }

  async saveManualItem() {
    console.log('this.manualForm', this.manualForm.pessoaTransacao);
    if (!this.manualForm.bancoId) {
      this.alertService.error('Selecione um banco.');
      return;
    }
    if (!this.manualForm.tipoCartaoId) {
      this.alertService.error('Tipo de conta/cartão não identificado. Verifique o banco.');
      return;
    }

    if (!this.manualForm.valor) {
      this.alertService.error('Informe um valor válido.');
      return;
    }

    if (this.isCreditoSelecionado && this.manualForm.parcelado) {
      const total = Number(this.manualForm.totalParcelas);
      const parc = Number(this.manualForm.numeroParcela);

      if (!total || total < 2) {
        this.alertService.error('Total de parcelas deve ser >= 2.');
        return;
      }
      if (!parc || parc < 1 || parc > total) {
        this.alertService.error('Número da parcela inválido.');
        return;
      }
    }

    try {
      this.savingManual = true;
      const payload = {
        extratoBancarioId: null,
        dataMovimentacao: this.manualForm.dataMovimentacao,
        valor: parseMoneyBRToNumber(this.manualForm.valor),
        tipoLancamento: this.manualForm.tipo,
        bancoId: Number(this.manualForm.bancoId),
        tipoCartaoId: Number(this.manualForm.tipoCartaoId),
        nomePessoaTransacao: (this.manualForm.pessoaTransacao || '').trim() || null,
        categoriaId: this.manualForm.categoriaId ? Number(this.manualForm.categoriaId) : null,
        descricao: (this.manualForm.descricao || '').trim() || null,
        observacao: (this.manualForm.observacao || '').trim() || null,

        ehParcelado: this.isCreditoSelecionado ? !!this.manualForm.parcelado : false,
        quantidadeParcelas: this.isCreditoSelecionado && this.manualForm.parcelado ? Number(this.manualForm.totalParcelas) : null,
        parcelaAtual: this.isCreditoSelecionado && this.manualForm.parcelado ? Number(this.manualForm.numeroParcela) : null,
        grupoParcelamentoId: this.isCreditoSelecionado && this.manualForm.parcelado && this.manualForm.grupoParcelamentoId?.trim()
          ? this.manualForm.grupoParcelamentoId.trim()
          : null,
      };

      await this.extratoItemService.createExtratoManualItem(payload);

      this.alertService.success('Item manual adicionado com sucesso!');
      this.showManualModal = false;
      await this.load();
    } catch (e: any) {
      this.alertService.error(e?.error?.message || 'Falha ao adicionar item manual.');
    } finally {
      this.savingManual = false;
    }
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

    this.router.navigate(['extrato-bancario/ExtratoBancarioDetalhe'], { queryParams: params });
  }
}

