import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { addMonthsToYearMonth, formatCurrencyBR, formatDateBR, formatDateInput, formatYearMonth, isoDate, parseCurrencyBR } from 'src/app/core/utils/mask';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, TypeGrid, GridRowChange, GridColumnOption } from "src/app/shared/components/data-grid/data-grid.interface"
import { CategoryService } from 'src/app/core/services/category.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { MenuItem } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { STATUS_PAGAMENTO_OPTIONS } from 'src/app/shared/enums/status.enum';
import { calcularTotaisSelecao, naturezaPorTipoLancamento } from 'src/app/shared/utils/totais-selecao';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { debounceTime, distinctUntilChanged, map, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BancoService } from 'src/app/core/services/banco.service';
import { EXIBIR_CAMPOS_MOVIMENTACOES, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { ContextoExtrato, paraExtratoItemDto } from 'src/app/core/models/extrato.mapper';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, concat, finalize, forkJoin, of, tap, toArray } from 'rxjs';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';

@Component({
  selector: 'app-extrato-bancario-detalhes',
  templateUrl: './extrato-bancario-detalhes.component.html',
})
export class ExtratoBancarioDetalhesComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;
  private readonly destroyRef = inject(DestroyRef);
  /** Mês pedido ("YYYY-MM"); a carga segue sempre o último. */
  private readonly mes$ = new Subject<string>();
  breadcrumb = [] = [{ label: 'Extrato Bancário' }, { label: 'Detalhes Extrato Bancário' }]
  titulo = 'Detalhes Extrato Bancário'
  tipoTabela = TypeGrid.editaLinha
  extratoMensal: ExtratoItemDto[] = [];
  dateFilter: Date | undefined

  gridColumns: GridColumn[] = [];
  itemsButtom: MenuItem[] = [];


  showModalConfigPessoas = false;
  showAddModal = false;


  manualData = isoDate();
  manualValor = '';
  manualTipoLancamento = 'Entrada';
  manualDescricao = '';
  manualPessoaNome = '';
  manualPessoaId: number | null = null;
  manualIdentificador = '';
  manualCategoriaId = '';
  manualObservacao = '';

  manualParcelado = false;
  manualQuantidadeParcelas = 2;
  manualParcelaAtual = 1;
  manualGerarTodasParcelas = true;
  manualNumeroFatura = '';

  categorias: CategoriaDto[] = [];
  tiposMovimentacao: TipoMovimentacaoDto[] = [];
  tiposConta: TipoCartaoDto[] = [];
  pessoasMov: PessoaMovimentacaoDto[] = [];
  isCreditCard: boolean = false;

  categoriasOptions: GridColumnOption[] = [];
  tiposMovimentacaoOptions: GridColumnOption[] = [];
  tiposContaOptions: GridColumnOption[] = [];
  pessoasMovOptions: GridColumnOption[] = [];

  month = '';
  bancoId: number | null = null;
  tipoContaId: number | null = null;

  editing: ExtratoItemDto | null = null;
  saving = false;

  statusOptions = STATUS_PAGAMENTO_OPTIONS;


  deletingId: number | null = null;
  selectedMonth: any;
  loading: boolean = false;
  selectedTotals = { receita: 0, despesa: 0, saldo: 0, count: 0 };
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_MOVIMENTACOES };

  categoriaOptions: string[] = [];

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }


  constructor( 
    private readonly categoriaService: CategoryService,
    private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService,
    private readonly tipoCartaoService: TipoCartaoService,
    private readonly tipoMovimentacaoService: TipoMovimentacaoService,
    private readonly pessoaMovService: PessoaMovimentacaoService,
    private readonly bancoService: BancoService,
    private readonly extratoItemService: ExtratoBancarioItemService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.carregaDadosUrl();

    // Troca de mês: só a resposta do último mês pedido chega à tela (FE-P2-08).
    ultimaBusca(this.mes$, mes => this.extratoItemService.listarDoMes(mes, this.bancoId, this.isCreditCard), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o extrato do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(itens => {
        this.extratoMensal = itens.map(item => ({
          ...item,
          categoriaNome: item.categoriaNome ?? item.categoria?.name ?? '',
          tipoMovimentacaoNome: item.tipoMovimentacaoNome ?? item.tipoMovimentacao?.nomeTipoMovimentacao ?? '',
        }));
        this.loading = false;
      });

    // O mês só carrega depois dos catálogos: é o tipo de cartão que diz se é crédito (fatura) ou data.
    this.carregarDados().subscribe(() => {
      this.setGridColumns();
      this.setitemsButtom();
      this.loadMonth();
    });
  }

  carregaDadosUrl() {
    // Parâmetros da rota (ex.: ?bancoId=1&month=2026-05&tipoContaId=2).
    const bancoIdParam = this.route.snapshot.queryParamMap.get('bancoId');
    const monthParam = this.route.snapshot.queryParamMap.get('month');
    const contaIdParam = this.route.snapshot.queryParamMap.get('tipoContaId');

    if (bancoIdParam) {
      this.bancoId = Number(bancoIdParam);
    }

    if (monthParam) {
      this.month = monthParam;
      const dataFormatada = this.parseAnoMesParaData(monthParam)
      if(dataFormatada)
        localStorage.setItem('dataFiltroDetalheExtrato', dataFormatada.toISOString())
    }

    if (contaIdParam !== null) {
      this.tipoContaId = Number(contaIdParam);
    }
  }

  parseAnoMesParaData(anoMesStr: string): Date | null {
  if (!anoMesStr) return null;

  // Espera o formato "YYYY-MM" (ex: "2026-10")
  const partes = anoMesStr.split('-');
  if (partes.length >= 2) {
    const ano = Number(partes[0]);
    const mes = Number(partes[1]) - 1; // Meses em JavaScript vão de 0 a 11 (0 = Janeiro, 9 = Outubro)
    
    // Cria a data fixando o dia como 1 para evitar problemas de fuso horário
    return new Date(ano, mes, 1);
  }

  return null;
}

  /** Catálogos, título e se é cartão de crédito. Emite uma vez, mesmo se algo falhar. */
  carregarDados(): Observable<void> {
    return forkJoin({
      categorias: this.categoriaService.listarAtivas(),
      tiposCartao: this.tipoCartaoService.listar(),
      tiposMov: this.tipoMovimentacaoService.listar(),
      pessoas: this.pessoaMovService.listar(),
      banco: this.bancoId ? this.bancoService.obterPorId(this.bancoId) : of(null),
    }).pipe(
      map(({ categorias, tiposCartao, tiposMov, pessoas, banco }) => {
        this.categorias = categorias ?? [];
        this.tiposConta = tiposCartao ?? [];
        this.tiposMovimentacao = tiposMov ?? [];
        this.pessoasMov = pessoas ?? [];

        const tipoCartao = this.tipoContaId ? this.tiposConta.find(e => e.id == this.tipoContaId) : undefined;
        this.isCreditCard = tipoCartao?.ehCredito === true; // antes comparava o nome (DB-P1-07)
        const bancoDisplay = banco?.nomeBanco ?? 'Banco Desconhecido';
        const tipoCartaoDisplay = tipoCartao?.nomeTipoCartao ?? 'Tipo de Cartão Desconhecido';
        this.titulo = `${tipoCartaoDisplay} - ${bancoDisplay}`;

        this.categoriasOptions = this.categorias.map(c => ({ label: c.name, value: c.id }));
        this.tiposContaOptions = this.tiposConta.map(t => ({ label: t.nomeTipoCartao, value: t.id }));
        this.tiposMovimentacaoOptions = this.tiposMovimentacao.map(t => ({ label: t.nomeTipoMovimentacao, value: t.id }));
        this.pessoasMovOptions = this.pessoasMov.map(p => ({ label: p.nomePessoa, value: p.id }));
      }),
      catchError(() => {
        this.alertService.info('Não foi possível carregar catálogos.');
        return of(undefined);
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  onSelectionChange(selectedItems: ExtratoItemDto[]) {
    this.selectedTotals = calcularTotaisSelecao(
      selectedItems,
      item => item.valor,
      item => naturezaPorTipoLancamento(item.tipoLancamento)
    );
  }

  searchPessoa = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      map((term) => {
        const t = (term ?? '').trim().toLowerCase();
        if (t.length < 1) return this.pessoasMov.slice(0, 10);

        return this.pessoasMov
          .filter(p => (p.nomePessoa ?? '').toLowerCase().includes(t))
          .slice(0, 10);
      })
    );

  private setitemsButtom(): void {
    this.itemsButtom = [
      {
        label: 'Adicionar lançamento',
        icon: 'pi pi-plus',
        command: () => {
          this.openAddModal();
        }
      },
      {
        label: 'Configurar Vinculo',
        icon: 'pi pi-plus',
        command: () => {
          this.abrirConfigPessoas();
        }
      },
      {
        label: 'Exportar',
        icon: 'pi pi-upload',
        command: () => {
          this.grid?.onExport();
        }
      },
      {
        label: 'Atualizar',
        icon: 'pi pi-load',
        command: () => {
          this.loadMonth();
        }
      },
    ];
  }

  private setGridColumns(): void {
    this.gridColumns = [
      {
        field: "dataMovimentacao",
        header: "DATA",
        type: GridColumnTypeEnum.Date,
        formatter: (row) => formatDateBR(row.dataMovimentacao),
        width:  '15%',
        editable: true
      },
      {
        field: "nomePessoaTransacao",
        header: "PESSOA",
        type: GridColumnTypeEnum.Text,
        width: this.isCreditCard ? '15%' : '20%',
        editable: true
      },
      // Adição condicional correta usando spread operator e operador ternário
      ...(this.isCreditCard ? [{
        field: "parcelaAtual",
        header: "PARCELA",
        type: GridColumnTypeEnum.Number,
        formatter: (row: any) => // <--- Adicionado o tipo (row: any)
          row.dataMovimentacao && row.parcelaAtual && row.quantidadeParcelas
            ? `${row.parcelaAtual}/${row.quantidadeParcelas}`
            : '',
        width: '10%',
        editable: true
      }] : []),
      {
        field: "categoriaId",
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        options: this.categoriasOptions,
        width: this.isCreditCard ? '12%' : '17%',
        editable: true
      },
      {
        field: "descricao",
        header: "DESCRIÇÃO",
        type: GridColumnTypeEnum.TextArea,
        width: '12%',
        editable: true
      },
      {
        field: "tipoMovimentacaoId",
        header: "TIPO MOVIMENTAÇÃO",
        type: GridColumnTypeEnum.Select,
        options: this.tiposMovimentacaoOptions,
        width: '15%',
        editable: true
      },
      {
        field: "valor",
        header: "VALOR",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.valor),
        classe: (row) => row.tipoLancamento == "Saída" ? 'text-danger fw-bold' : 'text-success fw-bold',
        width: '10%',
        editable: true
      },
      {
        field: 'actions',
        header: 'AÇÕES',
        type: GridColumnTypeEnum.Actions,
        functions: ['delete']
      }
    ];
  }


  loadMonth(dataSelecionada?: Date) {
    if (dataSelecionada) {
      this.dateFilter = dataSelecionada;
      localStorage.setItem('dataFiltroDetalheExtrato', dataSelecionada.toISOString());
    } else {
      const ultimoMesSelecionado = localStorage.getItem('dataFiltroDetalheExtrato');
      this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
    }

    this.selectedMonth = formatYearMonth(this.dateFilter);
    this.loading = true;
    this.mes$.next(this.selectedMonth);
  }

  formatterPessoa = (p: PessoaMovimentacaoDto | null) => p?.nomePessoa ?? '';


  abrirConfigPessoas() {
    this.showModalConfigPessoas = true;
  }
  fecharConfigPessoas(evt: { reload: boolean }) {
    this.showModalConfigPessoas = false;
    if (evt?.reload) this.loadMonth();
  }

  onDeleteSelected(rows: ExtratoItemDto[]) {
    this.exclusaoEmLote
      .confirmarEExcluir(this.grid, rows, row => this.extratoItemService.excluir(row.id), { singular: 'lançamento', plural: 'lançamentos' })
      .subscribe(excluiu => {
        if (excluiu) this.loadMonth();
      });
  }



  onDelete(row: ExtratoItemDto) {
    const ok = window.confirm(`Excluir o lançamento '${row.nomePessoaTransacao}'?`);
    if (!ok) return;

    // Loading na linha até a API responder.
    this.deletingId = row.id;
    this.extratoItemService.excluir(row.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: () => {
          this.alertService.success(`Lançamento '${row.nomePessoaTransacao}' excluído com sucesso!`);
          this.loadMonth();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Falha ao excluir o lançamento '${row.nomePessoaTransacao}'.`))
      });
  }

  /** Banco, cartão e mês abertos, mais as listas para resolver categoria e tipo pelo nome. */
  private contextoExtrato(): ContextoExtrato {
    return {
      categorias: this.categorias,
      tiposMovimentacao: this.tiposMovimentacao,
      bancoId: this.bancoId ? Number(this.bancoId) : null,
      tipoCartaoId: this.tipoContaId ? Number(this.tipoContaId) : null,
      numeroFatura: this.month || null,
    };
  }

  /** Salva em lote as alterações feitas via edição inline ("Salvar tudo"). */
  onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      return;
    }

    const contexto = this.contextoExtrato();
    // Linha original + alterações, no contrato camelCase da API (FE-P2-01).
    const gravacoes = changes.map(change => {
      const dto = paraExtratoItemDto({ ...change.row, ...change.changes }, contexto);
      return this.extratoItemService.atualizar(dto).pipe(tap(() => {
        // Atualiza a linha exibida sem esperar o recarregamento.
        const index = this.extratoMensal.findIndex(item => item.id === dto.id);
        if (index !== -1) {
          this.extratoMensal[index] = {
            ...this.extratoMensal[index],
            ...change.changes,
            categoriaId: dto.categoriaId,
            categoriaNome: dto.categoriaNome,
            tipoMovimentacaoId: dto.tipoMovimentacaoId,
            tipoMovimentacaoNome: dto.tipoMovimentacaoNome
          };
        }
      }));
    });

    // Uma por vez, na ordem; para no primeiro erro, como antes.
    concat(...gravacoes).pipe(toArray()).subscribe({
      next: () => {
        this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`);
        this.grid?.clearSelection();
        this.grid?.finishInlineSave();
        this.loadMonth();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar as alterações. Tente novamente.'))
    });
  }
    openAddModal() {
    if (this.isCreditCard)
      this.manualNumeroFatura = this.month
    else
      this.manualNumeroFatura = '';

    this.manualData = `${this.month}-01`
    this.manualTipoLancamento = "Saída"

    this.manualValor = '';
    this.manualDescricao = '';
    this.manualPessoaNome = '';
    this.manualPessoaId = null;
    this.manualIdentificador = '';
    this.manualCategoriaId = '';
    this.manualObservacao = '';

    this.manualParcelado = false;
    this.manualQuantidadeParcelas = 2;
    this.manualParcelaAtual = 1;
    this.manualGerarTodasParcelas = true;

    this.showAddModal = true;
  }

  closeAddModal() {
    if (!this.saving) this.showAddModal = false;
  }

  // -----------------------
  // Salvar manual
  // -----------------------
  handleSaveManual() {
    // validações
    if (!this.manualData) {
      this.alertService.error('Informe uma data válida.');
      return;
    }

    const valor = parseCurrencyBR(this.manualValor);
    if (valor === null) {
      this.alertService.error('Informe um valor válido.');
      return;
    }

    // O autocomplete devolve a pessoa (objeto) quando ela é escolhida, ou o texto digitado.
    const pessoa = typeof this.manualPessoaNome === 'object' ? this.manualPessoaNome : null;

    // Item novo: sem id. Mesmo mapeador da edição inline, em camelCase (FE-P2-01).
    const basePayload = paraExtratoItemDto({
      dataMovimentacao: this.manualData,
      valor,
      tipoLancamento: this.manualTipoLancamento,
      descricao: this.manualDescricao || null,
      observacao: this.manualObservacao || null,
      pessoaMovimentacao: pessoa,
      nomePessoaTransacao: pessoa ? null : this.manualPessoaNome,
      pessoaMovimentacaoId: this.manualPessoaId,
      identificador: this.manualIdentificador || null,
      categoriaId: this.manualCategoriaId || null,
      ehParcelado: this.manualParcelado ?? false,
    }, this.contextoExtrato());

    // O que criar: 1 item; ou, no cartão parcelado, todas as parcelas (cada uma na fatura do
    // mês correspondente) ou só a parcela informada.
    let itens: ExtratoItemDto[];
    let mensagem: string;
    if (!this.isCreditCard || !this.manualParcelado) {
      itens = [basePayload];
      mensagem = 'Lançamento adicionado com sucesso!';
    } else {
      const quantidadeParcelas = Math.max(2, Number(this.manualQuantidadeParcelas) || 2);
      if (this.manualGerarTodasParcelas) {
        itens = [];
        for (let p = this.manualParcelaAtual; p <= quantidadeParcelas; p++) {
          itens.push({
            ...basePayload,
            numeroFatura: addMonthsToYearMonth(this.month, p - this.manualParcelaAtual),
            ehParcelado: true,
            parcelaAtual: p,
            quantidadeParcelas,
          });
        }
        mensagem = `Parcelamento criado: ${itens.length} parcelas.`;
      } else {
        itens = [{ ...basePayload, ehParcelado: true, parcelaAtual: 1, quantidadeParcelas }];
        mensagem = `Compra parcelada registrada (1/${quantidadeParcelas}).`;
      }
    }

    this.saving = true;
    // Uma por vez, na ordem; para no primeiro erro, como antes.
    concat(...itens.map(item => this.extratoItemService.criar(item)))
      .pipe(toArray(), finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(mensagem);
          this.showAddModal = false;
          this.loadMonth();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao adicionar lançamento.'))
      });
  }


}