import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateBRView, formatDateInput, formatYearMonth, isoDateMinusHours, parseMoneyBRToNumber, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, TypeGrid, GridRowChange, GridColumnOption, ExibirCampos } from "src/app/shared/components/data-grid/data-grid.interface"
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimentoView } from 'src/app/core/utils/mask';
import { CategoryService } from 'src/app/core/services/category.service';
import { Category } from 'src/app/core/services/category.service';
import { RowForm } from 'src/app/core/interfaces/conta-mensal.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { MenuItem } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { PessoaMovimentacaoDto, PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { ExtratoBancarioItemService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario-item.service';
import { debounceTime, distinctUntilChanged, map, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BancoService } from 'src/app/core/services/banco.service';

@Component({
  selector: 'app-extrato-bancario-detalhes',
  templateUrl: './extrato-bancario-detalhes.component.html',
})
export class ExtratoBancarioDetalhesComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;
  breadcrumb = [] = [{ label: 'Extrato Bancário' }, { label: 'Detalhes Extrato Bancário' }]
  titulo = 'Detalhes Extrato Bancário'
  tipoTabela = TypeGrid.editaLinha
  extratoMensal: ExtratoItemDto[] = [];
  dateFilter: Date | undefined

  gridColumns: GridColumn[] = [];
  itemsButtom: MenuItem[] = [];


  showModalConfigPessoas = false;
  showAddModal = false;


  manualData = isoDateMinusHours();
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

  categorias: Category[] = [];
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

  statusOptions: GridColumnOption[] = [
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Danger },
    { label: 'PAGO NO PRAZO', value: 'PAGO NO PRAZO', classe: TagStatus.Success },
    { label: 'AGUARDANDO', value: 'AGUARDANDO', classe: TagStatus.Alert },
    { label: 'PAGO ATRASADO', value: 'PAGO ATRASADO', classe: TagStatus.Warning }
  ];


  deletingId: number | null = null;
  selectedMonth: any;
  loading: boolean = false;
  selectedTotals = { receita: 0, despesa: 0, saldo: 0, count: 0 };
  exibirCampos: ExibirCampos | null = null;

  statusLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
  }

  rowForms = new Map<number, RowForm>();

  categoriaOptions: string[] = [];

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }


  constructor(
    private fb: FormBuilder,
    private contaMensalService: ContaMensalService,
    private readonly categoriaService: CategoryService,
    private readonly alertService: AlertService,
    private readonly tipoCartaoService: TipoCartaoService,
    private readonly tipoMovimentacaoService: TipoMovimentacaoService,
    private readonly pessoaMovService: PessoaMovimentacaoService,
    private readonly bancoService: BancoService,
    private readonly extratoItemService: ExtratoBancarioItemService,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    await this.carregaDadosUrl();
    await this.carregarDados();
    this.setGridColumns();
    this.setitemsButtom();
    this.setExibirCampos();

    await this.loadMonth();
  }

  async carregaDadosUrl() {
    // Se os parâmetros foram enviados como Query Params (ex: ?bancoId=1&month=2026-05)
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
    console.log('Valores recuperados:', { bancoId: this.bancoId, month: this.month, isCreditCard: this.isCreditCard, tipoContaId: this.tipoContaId });
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


  async carregarDados() {
    try {
      const [cats,
        tiposCartao, tiposMov, pessoas] = await Promise.all([
          this.categoriaService.buscarCategoriasAtivas(),
          this.tipoCartaoService.list(),
          this.tipoMovimentacaoService.list(),
          this.pessoaMovService.list(),
        ]);
      this.categorias = cats ?? [];
      this.tiposConta = tiposCartao ?? [];
      this.tiposMovimentacao = tiposMov ?? [];
      this.pessoasMov = pessoas ?? [];

      var bancoIdDisplay = this.bancoId ? await this.bancoService.getById(this.bancoId)?.then((banco) => banco?.nomeBanco) : 'Banco Desconhecido';
      var tipoCartaoDisplay = this.tipoContaId ? tiposCartao.find(e => e.id == this.tipoContaId)?.nomeTipoCartao : 'Tipo de Cartão Desconhecido';
      this.isCreditCard = tipoCartaoDisplay === "Cartão de crédito" ? true: false;

      var tituloBase = `${tipoCartaoDisplay} - ${bancoIdDisplay}`;

      this.titulo =  tituloBase ?? `Extrato Bancário - Detalhes`;


      this.categoriasOptions = this.categorias.map(element => ({
        label: element.name,
        value: element.id
      }));
      this.tiposContaOptions = this.tiposConta.map(element => ({
        label: element.nomeTipoCartao,
        value: element.id
      }));
      this.tiposMovimentacaoOptions = this.tiposMovimentacao.map(element => ({
        label: element.nomeTipoMovimentacao,
        value: element.id
      }));
      this.pessoasMovOptions = this.pessoasMov.map(element => ({
        label: element.nomePessoa,
        value: element.id
      }));

    } catch {
      this.alertService.info('Não foi possível carregar catálogos.');
    }
  }

  onSelectionChange(selectedItems: ExtratoItemDto[]) {
    let receita = 0;
    let despesa = 0;

    selectedItems.forEach((item) => {
      const val = removeFormatCurrencyBR(item.valor);
      const sub = String(item.tipoLancamento || '').toLowerCase();
      if (sub === 'entrada' || sub === 'entradas') receita += val;
      if (sub === "saída" || sub === "saídas") despesa += val;
    });

    this.selectedTotals = { receita, despesa, saldo: receita - despesa, count: selectedItems.length };
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

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: true,
      paginator: true,
      filterMonth: true,
      buttonDeleteAll: true,
      buttonNew: false,
      buttonLock: true,
      buttonPopUp: true,
      buttonEditLine: false,
      buttonDeleteLine: true,
      buttonSaveCancel: true,
    }
  }

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
        formatter: (row) => formatDateBRView(row.dataMovimentacao),
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


  async loadMonth(dataSelecionada?: Date) {
    try {
      this.loading = true;

      if (dataSelecionada) {
        this.dateFilter = dataSelecionada;
        localStorage.setItem('dataFiltroDetalheExtrato', dataSelecionada.toISOString());
      } else {
        const ultimoMesSelecionado = localStorage.getItem('dataFiltroDetalheExtrato');
        this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
      }

      const mesFormatado = formatYearMonth(this.dateFilter);
      this.selectedMonth = mesFormatado
      this.extratoMensal = (await this.extratoItemService.listExtratos(this.selectedMonth, this.bancoId, this.isCreditCard)).map(item => ({
        ...item,
        categoriaNome: item.categoriaNome ?? item.categoria?.name ?? '',
        tipoMovimentacaoNome: item.tipoMovimentacaoNome ?? item.tipoMovimentacao?.nomeTipoMovimentacao ?? '',
      }));
      console.log(this.extratoMensal)
    } catch {
      // Trata o erro
    } finally {
      this.loading = false;
    }
  }

  formatterPessoa = (p: PessoaMovimentacaoDto | null) => p?.nomePessoa ?? '';


  abrirConfigPessoas() {
    this.showModalConfigPessoas = true;
  }
  fecharConfigPessoas(evt: { reload: boolean }) {
    this.showModalConfigPessoas = false;
    if (evt?.reload) this.loadMonth();
  }

  async onDeleteSelected(rows: ExtratoItemDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} conta(s) selecionada(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.extratoItemService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`'${rows.length}' itens deletados com sucesso!`);
      }

      this.grid?.clearSelection();
      await this.loadMonth();
    } catch (e) {
      this.alertService.error(`'${rows.length}' itens deram erros ao deletar!`);
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }



  async onDelete(row: ExtratoItemDto) {
    const ok = window.confirm(`Excluir a conta '${row.nomePessoaTransacao}'?`);
    if (!ok) return;

    // Define o ID que está sendo deletado (ativa o loading na linha correspondente)
    this.deletingId = row.id;

    try {
      const response = await this.extratoItemService.delete(row.id);

      if (response) {
        this.alertService.success(`Conta '${row.nomePessoaTransacao}' deletada com sucesso!`);
      }

      await this.loadMonth();
    } catch (e: any) {
      this.alertService.error(e);
    } finally {
      // 🔹 O loading só some aqui, quando a API termina (com sucesso ou erro)
      this.deletingId = null;
    }
  }

  // 1. Obtenha a referência do seu componente data-grid no HTML do pai
  // Substitua 'AppDataGridComponent' pelo nome real da classe do seu componente de grid

/** Salva em lote as alterações feitas via edição inline ("Salvar tudo"). */
  /** Salva em lote as alterações feitas via edição inline ("Salvar tudo"). */
  async onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      return;
    }

    try {
      let response;
      for (const change of changes) {
        // Junta os dados originais da linha com as alterações feitas
        const linhaAtual = {
          ...change.row,
          ...change.changes
        };

        // 1. Trata a data para o formato exato YYYY-MM-DD exigido pelo DateOnly do C#
        let dataFormatada = '';
        const rawDate = linhaAtual.DataMovimentacao || linhaAtual.dataMovimentacao;
        if (rawDate) {
          dataFormatada = typeof rawDate === 'string' 
            ? rawDate.split('T')[0] 
            : new Date(rawDate).toISOString().split('T')[0];
        }

        // 2. Garante o TipoLancamento (obrigatório no backend)
        const tipoLanc = linhaAtual.TipoLancamento || linhaAtual.tipoLancamento || linhaAtual.tipoMovimentacaoNome || 'Saída';

        // 3. Resolução inteligente de CategoriaId caso venha o nome ou ID
        let resolvedCategoriaId = 0;
        let resolvedCategoriaNome = '';
        const rawCatId = linhaAtual.CategoriaId ?? linhaAtual.categoriaId;
        const rawCatNome = linhaAtual.CategoriaNome ?? linhaAtual.categoriaNome;

        if (rawCatId !== undefined && rawCatId !== null && rawCatId !== '') {
          resolvedCategoriaId = Number(rawCatId);
          const catObj = this.categorias.find(c => c.id === resolvedCategoriaId);
          resolvedCategoriaNome = catObj ? catObj.name : rawCatNome;
        } else if (rawCatNome) {
          resolvedCategoriaNome = rawCatNome;
          const catEncontrada = this.categorias.find(c => c.name?.toLowerCase() === String(rawCatNome).toLowerCase());
          if (catEncontrada) resolvedCategoriaId = catEncontrada.id;
        }

        // 4. Resolução inteligente de TipoMovimentacaoId caso venha o nome ou ID
        let resolvedTipoMovId = 0;
        let resolvedTipoMovNome = '';
        const rawTipoMovId = linhaAtual.TipoMovimentacaoId ?? linhaAtual.tipoMovimentacaoId;
        const rawTipoMovNome = linhaAtual.TipoMovimentacaoNome ?? linhaAtual.tipoMovimentacaoNome;

        if (rawTipoMovId !== undefined && rawTipoMovId !== null && rawTipoMovId !== '') {
          resolvedTipoMovId = Number(rawTipoMovId);
          const movObj = this.tiposMovimentacao.find(m => m.id === resolvedTipoMovId);
          resolvedTipoMovNome = movObj ? movObj.nomeTipoMovimentacao : rawTipoMovNome;
        } else if (rawTipoMovNome) {
          resolvedTipoMovNome = rawTipoMovNome;
          const movEncontrada = this.tiposMovimentacao.find(m => m.nomeTipoMovimentacao?.toLowerCase() === String(rawTipoMovNome).toLowerCase());
          if (movEncontrada) resolvedTipoMovId = movEncontrada.id;
        }

        // 5. Mapeia exatamente para a estrutura do ExtratoBancarioItemDTO do backend
        const dtoMapeado = {
          id: Number(linhaAtual.Id ?? linhaAtual.id),
          extratoBancarioId: linhaAtual.ExtratoBancarioId !== undefined ? linhaAtual.ExtratoBancarioId : (linhaAtual.extratoBancarioId ?? null),
          dataMovimentacao: dataFormatada,
          valor: Number(linhaAtual.Valor ?? linhaAtual.valor ?? 0),
          tipoLancamento: tipoLanc,
          
          descricao: linhaAtual.Descricao ?? linhaAtual.descricao ?? null,
          observacao: linhaAtual.Observacao ?? linhaAtual.observacao ?? null,
          
          pessoaMovimentacaoId: linhaAtual.PessoaMovimentacaoId !== undefined && linhaAtual.PessoaMovimentacaoId !== null ? Number(linhaAtual.PessoaMovimentacaoId) : null,
          nomePessoaTransacao: linhaAtual.NomePessoaTransacao ?? linhaAtual.nomePessoaTransacao ?? null,
          identificador: linhaAtual.Identificador ?? linhaAtual.identificador ?? null,
          
          bancoId: linhaAtual.BancoId !== undefined && linhaAtual.BancoId !== null ? Number(linhaAtual.BancoId) : (this.bancoId ? Number(this.bancoId) : null),
          bancoNome: linhaAtual.BancoNome ?? linhaAtual.bancoNome ?? null,
          
          categoriaId: resolvedCategoriaId,
          numeroFatura: linhaAtual.NumeroFatura ?? linhaAtual.numeroFatura ?? this.month ?? null,
          categoriaNome: resolvedCategoriaNome,
          
          ehParcelado: Boolean(linhaAtual.EhParcelado ?? linhaAtual.ehParcelado ?? false),
          parcelaAtual: linhaAtual.ParcelaAtual !== undefined ? linhaAtual.ParcelaAtual : null,
          quantidadeParcelas: linhaAtual.QuantidadeParcelas !== undefined ? linhaAtual.QuantidadeParcelas : null,
          
          tipoCartaoId: linhaAtual.TipoCartaoId !== undefined && linhaAtual.TipoCartaoId !== null ? Number(linhaAtual.TipoCartaoId) : (this.tipoContaId ? Number(this.tipoContaId) : null),
          tipoCartaoNome: linhaAtual.TipoCartaoNome ?? linhaAtual.tipoCartaoNome ?? null,
          
          tipoMovimentacaoId: resolvedTipoMovId,
          tipoMovimentacaoNome: resolvedTipoMovNome,
          
          userId: Number(linhaAtual.UserId ?? linhaAtual.userId ?? 1),
          chaveDescricao: linhaAtual.ChaveDescricao ?? linhaAtual.chaveDescricao ?? null,
          
          alteraVinculoPessoa: Boolean(linhaAtual.AlteraVinculoPessoa ?? linhaAtual.alteraVinculoPessoa ?? false)
        };

        response = await this.extratoItemService.updateExtratoItem(dtoMapeado);

        // 6. Atualiza o estado local imediatamente na lista exibida
        const idAlterado = Number(linhaAtual.Id ?? linhaAtual.id);
        const index = this.extratoMensal.findIndex(item => item.id === idAlterado);
        if (index !== -1) {
          this.extratoMensal[index] = {
            ...this.extratoMensal[index],
            ...change.changes,
            categoriaId: resolvedCategoriaId,
            categoriaNome: resolvedCategoriaNome,
            tipoMovimentacaoId: resolvedTipoMovId,
            tipoMovimentacaoNome: resolvedTipoMovNome
          };
        }
      }

      if (response) {
        this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`);
      }

      this.grid?.clearSelection();
      this.grid?.finishInlineSave(); 
      await this.loadMonth();        

    } catch (e: any) {
      this.alertService.error(e?.error?.message || 'Erro ao salvar as alterações. Tente novamente.');
    }
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
  async handleSaveManual() {
    // validações
    if (!this.manualData) {
      this.alertService.error('Informe uma data válida.');
      return;
    }

    if (!this.manualValor || String(this.manualValor).trim() === '') {
      this.alertService.error('Informe um valor válido.');
      return;
    }

    this.saving = true;

    var isObject = typeof this.manualPessoaNome === 'object' ? this.manualPessoaNome : null;
    console.log(this.manualPessoaNome)

    try {
      // ✅ NÃO envie Id aqui
      const basePayload: any = {
        DataMovimentacao: this.manualData,
        Valor: parseMoneyBRToNumber(this.manualValor),
        TipoLancamento: this.manualTipoLancamento,

        Descricao: this.manualDescricao || null,
        Observacao: this.manualObservacao || null,

        PessoaMovimentacao: isObject ? this.manualPessoaNome : null,
        NomePessoaTransacao: !isObject ? this.manualPessoaNome : null,
        PessoaMovimentacaoId: this.manualPessoaId,

        Identificador: this.manualIdentificador || null,

        BancoId: this.bancoId,
        TipoCartaoId: this.tipoContaId,
        CategoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,

        NumeroFatura: this.month || null,

        EhParcelado: this.manualParcelado ?? false,
      };

      // 1) ✅ Não é cartão OU não parcelado -> cria 1 item e sai
      if (!this.isCreditCard || !this.manualParcelado) {
        await this.extratoItemService.createExtratoManualItem(basePayload);

        this.alertService.success('Lançamento adicionado com sucesso!');
        this.showAddModal = false;

        await this.loadMonth();
        return;
      }

      // 2) ✅ É cartão e é parcelado
      const quantidadeParcelas = Math.max(2, Number(this.manualQuantidadeParcelas) || 2); //exemplo 10

      var totalCriado = 0
      // 2.1) Parcelado e "gerar todas"
      if (this.manualGerarTodasParcelas) {

        for (let p = this.manualParcelaAtual; p <= quantidadeParcelas; p++) {
          const groupKey = `PARC-${p}/${quantidadeParcelas}`;
          const [y, m] = this.month.split('-').map(Number)

          if (p > this.manualParcelaAtual) {
            var diferenca = p - this.manualParcelaAtual
            basePayload.NumeroFatura = y + '-' + (m + diferenca).toString().padStart(2, '0')
          }

          const payloadParcela: any = {
            ...basePayload,
            DataMovimentacao: this.manualData,
            EhParcelado: true,
            ParcelaAtual: p,
            QuantidadeParcelas: quantidadeParcelas,
            GrupoParcelamento: groupKey,
          };

          totalCriado += 1

          await this.extratoItemService.createExtratoManualItem(payloadParcela);
        }

        this.alertService.success(`Parcelamento criado: ${totalCriado} parcelas.`);
        this.showAddModal = false;

        await this.loadMonth();
        return;
      }

      // 2.2) Parcelado SEM gerar todas -> salva só a 1ª
      const payloadSingle: any = {
        ...basePayload,
        EhParcelado: true,
        ParcelaAtual: 1,
        QuantidadeParcelas: quantidadeParcelas,
      };

      await this.extratoItemService.createExtratoManualItem(payloadSingle);

      this.alertService.success(`Compra parcelada registrada (1/${quantidadeParcelas}).`);
      this.showAddModal = false;

      await this.loadMonth();
      return;

    } catch (err: any) {
      this.alertService.error(err?.error?.message || err?.message || 'Erro ao adicionar lançamento.');
    } finally {
      this.saving = false;
    }
  }


}