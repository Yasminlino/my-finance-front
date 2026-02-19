import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { TipoCartaoService, TipoCartaoDto } from 'src/app/core/services/tipo-cartao.service';
import { ExtratoBancarioItemService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario-item.service';
import { isoDateMinusHours, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';

type AlertState = { type: '' | 'success' | 'error' | 'warning'; message: string };

function formatMoneyBR(v: any) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
}

function formatDateBR(dateString?: string) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString('pt-BR');
}

function addMonthsISO(isoDate: string, monthsToAdd: number) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m - 1) + monthsToAdd, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

type RowId = string | number;

type RowForm = FormGroup<{
  dataMovimentacao: FormControl<string>;
  tipoLancamento: FormControl<string>;
  categoriaId: FormControl<string>;
  tipoMovimentacaoId: FormControl<string>; // ✅ novo (select)
  descricao: FormControl<string>;
  nomePessoaTransacao: FormControl<string>;
  valor: FormControl<string>;
  numeroFatura: FormControl<string>;
  parcelaAtual: FormControl<string>;
  quantidadeParcelas: FormControl<string>;
}>;



type TableFilters = {
  data: string;
  tipo: string;
  categoriaId: string;
  descricao: string;
  tipoMovimentacaoId: string;
  pessoa: string;
  minValor: string;
  maxValor: string;
  fatura: string;
};

@Component({
  selector: 'app-extrato-bancario-detalhes',
  templateUrl: './extrato-bancario-detalhes.component.html',
})
export class ExtratoBancarioDetalhesComponent implements OnInit, OnDestroy {
  private sub = new Subscription();

  month = '';
  bancoId: number | null = null;
  tipoContaId: number | null = null;
  tiposMovimentacao: any[] = []

  loading = false;
  extratos: ExtratoItemDto[] = [];
  localItems: ExtratoItemDto[] = [];

  categorias: Category[] = [];
  tiposConta: TipoCartaoDto[] = [];

  alert: AlertState = { type: '', message: '' };

  showModalConfigPessoas = false;

  // filtros gerais (se quiser manter)
  dateFrom = '';
  dateTo = '';
  tipoLancamentoFilter: string | '' = '';
  descricaoFilter = '';
  pessoaFilter = '';
  categoriaFilter: number | '' = '';
  minValue = '';
  maxValue = '';

  // ✅ filtros por coluna (tabela)
  tableFilters: TableFilters = {
    data: '',
    tipo: '',
    categoriaId: '',
    descricao: '',
    tipoMovimentacaoId: '',
    pessoa: '',
    minValor: '',
    maxValor: '',
    fatura: '',
  };

  // modal add
  showAddModal = false;
  saving = false;

  manualData = isoDateMinusHours();
  manualValor = '';
  manualTipoLancamento = 'Entrada';
  manualDescricao = '';
  manualPessoa = '';
  manualIdentificador = '';
  manualCategoriaId = '';
  manualObservacao = '';

  manualParcelado = false;
  manualQuantidadeParcelas = 2;
  manualGerarTodasParcelas = true;
  manualNumeroFatura = '';

  // ✅ edição inline
  rowForms = new Map<RowId, RowForm>();
  editingIds = new Set<RowId>();
  savingRowIds = new Set<RowId>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoriaService: CategoryService,
    private tipoCartaoService: TipoCartaoService,
    private extratoItemService: ExtratoBancarioItemService,
    private fb: FormBuilder,
    private tipoMovimentacaoService: TipoMovimentacaoService
  ) { }

  ngOnInit(): void {
    this.sub.add(
      this.route.queryParamMap.subscribe(async (qp) => {
        this.month = qp.get('month') ?? '';
        this.bancoId = qp.get('bancoId') ? Number(qp.get('bancoId')) : null;
        this.tipoContaId = qp.get('tipoContaId') ? Number(qp.get('tipoContaId')) : null;

        const firstDay = new Date(this.month + '-01T00:00:00');
        this.dateFrom = firstDay.toISOString().substring(0, 10);

        const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
        this.dateTo = lastDay.toISOString().substring(0, 10);

        await this.loadCatalogos();
        if (!this.tipoLancamentoFilter) this.tipoLancamentoFilter = '';
        if (!this.categoriaFilter) this.categoriaFilter = '';

        await this.refresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async loadCatalogos() {
    try {
      const [cats, tiposCartao, tiposMov] = await Promise.all([
        this.categoriaService.list(),
        this.tipoCartaoService.list(),
        this.tipoMovimentacaoService.list(), // ✅
      ]);
      this.categorias = cats ?? [];
      this.tiposConta = tiposCartao ?? [];
      this.tiposMovimentacao = tiposMov ?? [];
    } catch {
      this.setAlert('warning', 'Não foi possível carregar catálogos.');
    }
  }


  abrirConfigPessoas() {
    this.showModalConfigPessoas = true;
  }
  fecharConfigPessoas(evt: { reload: boolean }) {
    this.showModalConfigPessoas = false;
    if (evt?.reload) this.refresh();
  }

  private getTipoMovimentacaoId(e: any): string {
    const id = e.tipoMovimentacaoId ?? e.TipoMovimentacaoId ?? e.tipoMovimentacao?.id ?? '';
    return id == null ? '' : String(id);
  }


  async refresh() {
    this.loading = true;
    try {
      const rows = await this.extratoItemService.listExtratos(this.month, this.bancoId);
      this.extratos = Array.isArray(rows) ? rows : [];
      // mantém localItems
      this.rebuildForms();
    } catch {
      this.setAlert('error', 'Erro ao carregar detalhes.');
    } finally {
      this.loading = false;
    }
  }

  // -----------------------
  // Derivações
  // -----------------------
  get items(): ExtratoItemDto[] {
    return [...this.localItems, ...this.extratos];
  }

  get tipoContaSelecionada(): TipoCartaoDto | null {
    if (!this.tipoContaId) return null;
    return this.tiposConta.find(t => String(t.id) === String(this.tipoContaId)) ?? null;
  }

  get isCreditCard(): boolean {
    const t: any = this.tipoContaSelecionada;
    if (!t) return false;

    const bool = t.isCredito ?? t.IsCredito ?? t.ehCredito ?? t.EhCredito ?? t.cartaoCredito ?? t.CartaoCredito;
    if (typeof bool === 'boolean') return bool;

    const nome = String(t.nomeTipoCartao ?? t.nome ?? t.Nome ?? t.descricao ?? t.Descricao ?? '');
    return /cr[eé]dito/i.test(nome);
  }

  get headerBancoNome(): string {
    const first: any = this.items?.[0];
    if (!first) return this.bancoId ? `Banco #${this.bancoId}` : 'Banco';
    return first.bancoNome ?? first.banco?.nomeBanco ?? first.banco?.nome ?? (this.bancoId ? `Banco #${this.bancoId}` : 'Banco');
  }

  get headerTipoContaNome(): string {
    const first: any = this.items?.[0];
    if (!first) return this.tipoContaId ? `Tipo #${this.tipoContaId}` : 'Tipo Conta';
    return first.nomeTipoCartao ?? first.banco?.tipoCartao?.nomeTipoCartao ?? (this.tipoContaId ? `Tipo #${this.tipoContaId}` : 'Tipo Conta');
  }

  get totalItens() {
    return this.filteredExtratos.length;
  }

  get totalEntrada() {
    return this.filteredExtratos.reduce((sum: number, e: any) => {
      const v = Number(e.valor ?? e.Valor ?? 0);
      return sum + (v > 0 ? v : 0);
    }, 0);
  }

  get totalSaida() {
    return this.filteredExtratos.reduce((sum: number, e: any) => {
      const v = Number(e.valor ?? e.Valor ?? 0);
      return sum + (v < 0 ? Math.abs(v) : 0);
    }, 0);
  }

  get totalValor() {
    return this.filteredExtratos.reduce((sum: number, e: any) => sum + Number(e.valor ?? e.Valor ?? 0), 0);
  }


  get categoriaNomePorId(): Map<string, string> {
    const map = new Map<string, string>();
    for (const c of this.categorias) {
      const id = (c as any).id ?? (c as any).Id;
      const nome = (c as any).nome ?? (c as any).name ?? (c as any).descricao ?? (c as any).Descricao;
      if (id != null) map.set(String(id), nome || `Categoria #${id}`);
    }
    return map;
  }

  get tipoLancamentoOptions(): string[] {
    const set = new Set(['Saída', 'Entrada']);
    for (const e of this.items) {
      const tl = (e as any).tipoLancamento;
      if (tl) set.add(tl);
    }
    return Array.from(set);
  }

  // -----------------------
  // ✅ filtros por coluna + filtros gerais
  // -----------------------
  get filteredExtratos(): ExtratoItemDto[] {
    const t = this.tableFilters;

    return this.items.filter((e: any) => {
      const valor = Number(e.valor ?? e.Valor ?? 0);

      const itemTipoContaId = e.tipoCartaoId ?? e.tipoCartao?.id ?? e.tipoContaId ?? null;
      if (this.tipoContaId && String(itemTipoContaId) !== String(this.tipoContaId)) return false;

      // gerais
      if (this.dateFrom || this.dateTo) {
        const data = e.dataMovimentacao;
        const d = data ? new Date(data) : null;
        if (d && !isNaN(d.getTime())) {
          if (this.dateFrom) {
            const from = new Date(this.dateFrom); from.setHours(0, 0, 0, 0);
            if (d < from) return false;
          }
          if (this.dateTo) {
            const to = new Date(this.dateTo); to.setHours(23, 59, 59, 999);
            if (d > to) return false;
          }
        }
      }

      const lanc = String(e.tipoLancamento ?? '');
      if (this.tipoLancamentoFilter && lanc !== this.tipoLancamentoFilter) return false;

      const catId = e.categoriaId ?? e.categoryId ?? e.categoria?.id ?? e.category?.id ?? null;
      if (this.categoriaFilter && String(catId) !== String(this.categoriaFilter)) return false;

      if (this.descricaoFilter.trim()) {
        const needle = this.descricaoFilter.trim().toLowerCase();
        const desc = String(e.descricao || '').toLowerCase();
        const obs = String(e.observacao || e.descricaoManual || '').toLowerCase();
        if (!desc.includes(needle) && !obs.includes(needle)) return false;
      }

      if (this.pessoaFilter.trim()) {
        const pessoa = String(e.nomePessoaTransacao || '').toLowerCase();
        if (!pessoa.includes(this.pessoaFilter.trim().toLowerCase())) return false;
      }

      if (this.minValue !== '' && valor < Number(this.minValue)) return false;
      if (this.maxValue !== '' && valor > Number(this.maxValue)) return false;

      // ✅ por coluna (tabela)
      if (t.data) {
        // compara só yyyy-mm-dd (funciona bem com input date)
        const d = String(e.dataMovimentacao ?? '').substring(0, 10);
        if (d !== t.data) return false;
      }

      if (t.tipo) {
        if (!String(e.tipoLancamento ?? '').toLowerCase().includes(t.tipo.toLowerCase())) return false;
      }

      if (t.categoriaId) {
        const idStr = String(catId ?? '');
        if (idStr !== String(t.categoriaId)) return false;
      }

      if (t.fatura && this.isCreditCard) {
        if (!String(e.numeroFatura ?? '').toLowerCase().includes(t.fatura.toLowerCase())) return false;
      }

      if (t.descricao) {
        const desc = String(e.descricao ?? '').toLowerCase();
        if (!desc.includes(t.descricao.toLowerCase())) return false;
      }

      if (t.tipoMovimentacaoId) {
        const obs = String(e.observacao ?? e.descricaoManual ?? '').toLowerCase();
        if (!obs.includes(t.tipoMovimentacaoId.toLowerCase())) return false;
      }

      if (t.pessoa) {
        const pessoa = String(e.nomePessoaTransacao ?? '').toLowerCase();
        if (!pessoa.includes(t.pessoa.toLowerCase())) return false;
      }

      if (t.minValor !== '' && valor < Number(t.minValor)) return false;
      if (t.maxValor !== '' && valor > Number(t.maxValor)) return false;

      return true;
    });
  }



  rowKey(e: any): RowId {
    // prioridade: id real
    const id = e?.id ?? e?.Id ?? e?.extratoId ?? e?.codigo;
    if (id !== undefined && id !== null && String(id) !== '') return id;

    // fallback para itens manuais/sem id (tenta identificador/grupo)
    const ident = e?.identificador ?? e?.grupoParcelamento ?? e?.GrupoParcelamento;
    if (ident) return String(ident);

    // último fallback (evite, mas garante não quebrar)
    return String(e?.dataMovimentacao ?? '') + '|' + String(e?.descricao ?? '') + '|' + String(e?.valor ?? '');
  }


  private getCategoriaId(e: any): string {
    const catId = e.categoriaId ?? e.categoryId ?? e.categoria?.id ?? e.category?.id ?? '';
    return catId == null ? '' : String(catId);
  }

  private rebuildForms() {
    const visibleIds = new Set<RowId>();

    for (const e of this.items as any[]) {
      const id = this.rowKey(e);
      visibleIds.add(id);

      if (!this.rowForms.has(id)) {
        const fg: RowForm = this.fb.group({
          dataMovimentacao: this.fb.control(String(e.dataMovimentacao ?? '').substring(0, 10), { nonNullable: true }),
          tipoLancamento: this.fb.control(String(e.tipoLancamento ?? ''), { nonNullable: true }),
          categoriaId: this.fb.control(this.getCategoriaId(e), { nonNullable: true }),
          tipoMovimentacaoId: this.fb.control(this.getTipoMovimentacaoId(e), { nonNullable: true }), // ✅
          descricao: this.fb.control(String(e.descricao ?? ''), { nonNullable: true }),
          nomePessoaTransacao: this.fb.control(String(e.nomePessoaTransacao ?? ''), { nonNullable: true }),
          valor: this.fb.control(formatMoneyBR(e.valor ?? 0), { nonNullable: true }),
          numeroFatura: this.fb.control(String(e.numeroFatura ?? ''), { nonNullable: true }),
          parcelaAtual: this.fb.control(String(e.parcelaAtual ?? ''), { nonNullable: true }),
          quantidadeParcelas: this.fb.control(String(e.quantidadeParcelas ?? ''), { nonNullable: true }),
        });

        this.rowForms.set(id, fg);
      }
    }

    // remove forms que não existem mais
    for (const id of Array.from(this.rowForms.keys())) {
      if (!visibleIds.has(id)) {
        this.rowForms.delete(id);
        this.editingIds.delete(id);
        this.savingRowIds.delete(id);
      }
    }
  }

  isEditing(e: any) {
    return this.editingIds.has(this.rowKey(e));
  }

  startEdit(e: any) {
    const id = this.rowKey(e);

    // garante que exista form para essa linha
    if (!this.rowForms.has(id)) {
      this.rebuildForms();
    }

    const f = this.rowForms.get(id);
    if (!f) {
      // se ainda assim não existe, não entra em edição (evita sumir)
      return;
    }

    // só marca como editando depois que o form existe
    this.editingIds.add(id);

    f.reset({
      dataMovimentacao: String(e.dataMovimentacao ?? '').substring(0, 10),
      tipoLancamento: String(e.tipoLancamento ?? ''),
      categoriaId: this.getCategoriaId(e),
      tipoMovimentacaoId: this.getTipoMovimentacaoId(e), // ✅
      descricao: String(e.descricao ?? ''),
      nomePessoaTransacao: String(e.nomePessoaTransacao ?? ''),
      valor: formatMoneyBR(e.valor ?? 0),
      numeroFatura: String(e.numeroFatura ?? ''),
      parcelaAtual: String(e.parcelaAtual ?? ''),
      quantidadeParcelas: String(e.quantidadeParcelas ?? ''),
    });
  }


  cancelEdit(e: any) {
    const id = this.rowKey(e);
    this.editingIds.delete(id);
    const f = this.rowForms.get(id);
    f?.markAsPristine();
  }

  async saveEdit(e: any) {
    const idKey = this.rowKey(e);
    const f = this.rowForms.get(idKey);
    if (!f) return;

    // ⚠️ precisa ter Id real pra atualizar
    const idReal = Number(e?.id ?? e?.Id ?? 0);
    if (!idReal) {
      this.setAlert('error', 'Este item não possui Id válido para atualizar.');
      return;
    }

    this.savingRowIds.add(idKey);

    try {
      const valorNumber = this.toDecimalBR(f.controls.valor.value);

      const dto: any = {
        Id: idReal,
        DataMovimentacao: f.controls.dataMovimentacao.value,
        Valor: valorNumber, // number
        TipoLancamento: f.controls.tipoLancamento.value,

        Descricao: f.controls.descricao.value || null,
        NomePessoaTransacao: f.controls.nomePessoaTransacao.value || null,
        Identificador: e?.identificador ?? e?.Identificador ?? null,

        BancoId: e?.bancoId ?? e?.BancoId ?? this.bancoId ?? null,
        CategoriaId: f.controls.categoriaId.value ? Number(f.controls.categoriaId.value) : null,

        TipoMovimentacaoId: f.controls.tipoMovimentacaoId.value
          ? Number(f.controls.tipoMovimentacaoId.value)
          : null,

        EhParcelado: e?.ehParcelado ?? e?.EhParcelado ?? null,
        ParcelaAtual: f.controls.parcelaAtual.value ? Number(f.controls.parcelaAtual.value) : null,
        QuantidadeParcelas: f.controls.quantidadeParcelas.value ? Number(f.controls.quantidadeParcelas.value) : null,

        TipoCartaoId: e?.tipoCartaoId ?? e?.TipoCartaoId ?? this.tipoContaId ?? null,
        UserId: e?.userId ?? e?.UserId ?? 0,
        ChaveDescricao: e?.chaveDescricao ?? e?.ChaveDescricao ?? null,

        PessoaMovimentacaoId: e?.pessoaMovimentacaoId ?? e?.PessoaMovimentacaoId ?? null,
        AlteraVinculoPessoa: true
      };

      await this.extratoItemService.updateExtratoItem(dto).then(() => {
        this.setAlert('success', 'Linha atualizada!');
      }).catch((err: any) => {
        this.setAlert('error', err?.error?.message || err?.message || 'Falha ao salvar edição.');
      });

      // aplica no front (como o endpoint retorna string, a gente aplica o dto mesmo)
      const applyUpdate = (arr: any[]) =>
        arr.map(x => (String(this.rowKey(x)) === String(idKey) ? { ...x, ...e, ...dto, valor: valorNumber } : x));

      this.localItems = applyUpdate(this.localItems as any);
      this.extratos = applyUpdate(this.extratos as any);

      // refaz forms e sai do modo edição
      this.rebuildForms();
      this.editingIds.delete(idKey);
      f.markAsPristine();

      this.setAlert('success', 'Linha atualizada!');
    } catch (err: any) {
      this.setAlert('error', err?.error?.message || err?.message || 'Falha ao salvar edição.');
    } finally {
      this.savingRowIds.delete(idKey);
    }
  }
  private toDecimalBR(input: any): number {
    if (input === null || input === undefined) return 0;

    // se já é número:
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;

    const s = String(input).trim();

    // remove "R$", espaços e pontos de milhar, troca vírgula por ponto
    const normalized = s
      .replace(/\s/g, '')
      .replace(/^R\$/i, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '');

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }



  trackByRow = (_: number, e: any) => this.rowKey(e);

  rowId(e: any): string {
    return String(e?.id ?? e?.Id ?? e?.extratoId ?? e?.codigo ?? e?.identificador ?? '');
  }

  isSavingRow(e: any) {
    return this.savingRowIds.has(this.rowKey(e));
  }

  // -----------------------
  // UI actions
  // -----------------------
  back() { this.router.navigateByUrl('/extrato-bancario'); }

  clearFilters() {
    const firstDay = new Date(this.month + '-01T00:00:00');
    this.dateFrom = firstDay.toISOString().substring(0, 10);

    const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
    this.dateTo = lastDay.toISOString().substring(0, 10);
    this.tipoLancamentoFilter = '';
    this.categoriaFilter = '';
    this.descricaoFilter = '';
    this.pessoaFilter = '';
    this.minValue = '';
    this.maxValue = '';

    // ✅ limpa também os filtros da tabela
    this.tableFilters = {
      data: '',
      tipo: '',
      categoriaId: '',
      descricao: '',
      tipoMovimentacaoId: '',
      pessoa: '',
      minValor: '',
      maxValor: '',
      fatura: '',
    };
  }

  openAddModal() {
    this.manualData = isoDateMinusHours();
    this.manualValor = '';
    this.manualTipoLancamento = 'Entrada';
    this.manualDescricao = '';
    this.manualPessoa = '';
    this.manualIdentificador = '';
    this.manualCategoriaId = '';
    this.manualObservacao = '';

    this.manualParcelado = false;
    this.manualQuantidadeParcelas = 2;
    this.manualGerarTodasParcelas = true;
    this.manualNumeroFatura = '';

    this.showAddModal = true;
  }

  closeAddModal() {
    if (!this.saving) this.showAddModal = false;
  }

  // -----------------------
  // Salvar manual (o seu código pode ficar igual)
  // -----------------------
  async handleSaveManual() {
    if (!this.manualData) {
      this.setAlert('error', 'Informe a data da movimentação.');
      return;
    }
    if (this.manualValor === '') {
      this.setAlert('error', 'Informe um valor válido.');
      return;
    }

    this.saving = true;
    try {
      const basePayload: any = {
        DataMovimentacao: this.manualData,
        Valor: this.manualValor,
        TipoLancamento: this.manualTipoLancamento,
        Descricao: this.manualDescricao || null,
        NomePessoaTransacao: this.manualPessoa || null,
        Identificador: this.manualIdentificador || null,
        BancoId: this.bancoId,
        TipoCartaoId: this.tipoContaId,
        CategoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
        Observacao: this.manualObservacao || null,
        NumeroFatura: this.manualNumeroFatura || null,
        EhParcelado: this.manualParcelado ?? false,
      };

      // não cartão ou não parcelado -> 1 item
      if (!this.isCreditCard || !this.manualParcelado) {
        const saved: any = await this.extratoItemService.createExtratoManualItem(basePayload);

        this.localItems = [
          (saved && typeof saved === 'object') ? saved : {
            id: `manual-${Date.now()}`,
            dataMovimentacao: this.manualData,
            valor: parseMoneyBRToNumber(this.manualValor),
            tipoLancamento: this.manualTipoLancamento,
            descricao: this.manualDescricao,
            nomePessoaTransacao: this.manualPessoa,
            identificador: this.manualIdentificador,
            bancoId: this.bancoId,
            tipoCartaoId: this.tipoContaId,
            categoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
            categoriaNome: this.manualCategoriaId ? (this.categoriaNomePorId.get(String(this.manualCategoriaId)) ?? '—') : '—',
            observacao: this.manualObservacao,
            bancoNome: this.headerBancoNome,
            tipoCartaoNome: this.headerTipoContaNome,
            isManual: true,
          },
          ...this.localItems,
        ];
        this.rebuildForms();

        this.setAlert('success', 'Lançamento adicionado com sucesso!');
        this.showAddModal = false;
        return;
      }

      // cartão parcelado + gerar todas
      const quantidadeParcelas = Math.max(2, Number(this.manualQuantidadeParcelas) || 2);

      if (this.manualGerarTodasParcelas) {
        const groupKey = `PARC-${Date.now()}`;
        const created: any[] = [];

        for (let p = 1; p <= quantidadeParcelas; p++) {
          const dataParcela = addMonthsISO(this.manualData, p - 1);

          const payloadParcela = {
            ...basePayload,
            DataMovimentacao: dataParcela,
            EhParcelado: true,
            ParcelaAtual: p,
            QuantidadeParcelas: quantidadeParcelas,
            GrupoParcelamento: groupKey,
          };

          const saved: any = await this.extratoItemService.createExtratoManualItem(payloadParcela);
          created.push(saved && typeof saved === 'object' ? saved : {
            id: `manual-${groupKey}-${p}`,
            dataMovimentacao: dataParcela,
            valor: parseMoneyBRToNumber(this.manualValor),
            tipoLancamento: this.manualTipoLancamento,
            descricao: this.manualDescricao,
            nomePessoaTransacao: this.manualPessoa,
            identificador: this.manualIdentificador,
            bancoId: this.bancoId,
            tipoCartaoId: this.tipoContaId,
            categoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
            categoriaNome: this.manualCategoriaId ? (this.categoriaNomePorId.get(String(this.manualCategoriaId)) ?? '—') : '—',
            observacao: this.manualObservacao,
            parcelaAtual: p,
            quantidadeParcelas: quantidadeParcelas,
            grupoParcelamento: groupKey,
            numeroFatura: this.manualNumeroFatura || null,
            bancoNome: this.headerBancoNome,
            tipoCartaoNome: this.headerTipoContaNome,
            isManual: true,
          });
        }

        // coloca na lista (ordem coerente)
        this.localItems = [...created.reverse(), ...this.localItems];
        this.rebuildForms();

        this.setAlert('success', `Parcelamento criado: ${quantidadeParcelas} parcelas.`);
        this.showAddModal = false;
        return;
      }

      // cartão parcelado sem gerar todas: salva 1ª
      const payloadSingle = {
        ...basePayload,
        Parcelado: true,
        ParcelaAtual: 1,
        QuantidadeParcelas: quantidadeParcelas,
      };

      const saved: any = await this.extratoItemService.createExtratoManualItem(payloadSingle);

      this.localItems = [
        saved && typeof saved === 'object' ? saved : {
          id: `manual-${Date.now()}`,
          dataMovimentacao: this.manualData,
          valor: parseMoneyBRToNumber(this.manualValor),
          tipoLancamento: this.manualTipoLancamento,
          descricao: this.manualDescricao,
          nomePessoaTransacao: this.manualPessoa,
          identificador: this.manualIdentificador,
          bancoId: this.bancoId,
          tipoCartaoId: this.tipoContaId,
          categoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
          categoriaNome: this.manualCategoriaId ? (this.categoriaNomePorId.get(String(this.manualCategoriaId)) ?? '—') : '—',
          observacao: this.manualObservacao,
          ehParcelado: true,
          parcelaAtual: 1,
          quantidadeParcelas: quantidadeParcelas,
          numeroFatura: this.manualNumeroFatura || null,
          bancoNome: this.headerBancoNome,
          tipoCartaoNome: this.headerTipoContaNome,
          isManual: true,
        },
        ...this.localItems,
      ];
      this.rebuildForms();

      this.setAlert('success', `Compra parcelada registrada (1/${quantidadeParcelas}).`);
      this.showAddModal = false;

    } catch (e: any) {
      this.setAlert('error', e?.error?.message || e?.message || 'Falha ao salvar lançamento manual.');
    } finally {
      this.saving = false;
    }
  }

  setAlert(type: AlertState['type'], message: string) {
    this.alert = { type, message };
    setTimeout(() => (this.alert = { type: '', message: '' }), 4000);
  }

  money(v: any) { return formatMoneyBR(v); }
  dateBR(v: any) { return formatDateBR(v); }
}

