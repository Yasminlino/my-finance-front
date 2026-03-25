import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { TipoCartaoService, TipoCartaoDto } from 'src/app/core/services/tipo-cartao.service';
import { ExtratoBancarioItemService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario-item.service';
import { isoDateMinusHours, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { PessoaMovimentacaoDto, PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';

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
  tipoMovimentacaoId: FormControl<string>;
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
  nomeTipoMovimentacao: string;
  tipoMovimentacaoId: string; // ✅ agora filtra pelo ID mesmo
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
  pessoasMov: PessoaMovimentacaoDto[] = [];

  tiposMovimentacao: any[] = [];
  headerBancoNomeValue: string = 'Banco';

  loading = false;
  extratos: ExtratoItemDto[] = [];
  localItems: ExtratoItemDto[] = [];

  categorias: Category[] = [];
  tiposConta: TipoCartaoDto[] = [];

  alert: AlertState = { type: '', message: '' };

  showModalConfigPessoas = false;

  // filtros gerais
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
    nomeTipoMovimentacao: '',
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
  manualPessoaNome = '';
  manualPessoaId: number | null = null;
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
    private tipoMovimentacaoService: TipoMovimentacaoService,
    private bancoService: BancoService,
    private pessoaMovService: PessoaMovimentacaoService,
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

        await this.carregarBancoNome();
        await this.refresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async loadCatalogos() {
    try {
      const [cats, tiposCartao, tiposMov, pessoas] = await Promise.all([
        this.categoriaService.buscarCategoriasAtivas(),
        this.tipoCartaoService.list(),
        this.tipoMovimentacaoService.list(),
        this.pessoaMovService.list(),
      ]);
      this.categorias = cats ?? [];
      this.tiposConta = tiposCartao ?? [];
      this.tiposMovimentacao = tiposMov ?? [];
      this.pessoasMov = pessoas ?? [];
    } catch {
      this.setAlert('warning', 'Não foi possível carregar catálogos.');
    }
  }

  // texto exibido no input quando seleciona um item
  formatterPessoa = (p: PessoaMovimentacaoDto | null) => p?.nomePessoa ?? '';

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

  abrirConfigPessoas() {
    this.showModalConfigPessoas = true;
  }
  fecharConfigPessoas(evt: { reload: boolean }) {
    this.showModalConfigPessoas = false;
    if (evt?.reload) this.refresh();
  }

  // -----------------------
  // Normalizações (fonte da verdade)
  // -----------------------
  private toDecimalBR(input: any): number {
    if (input === null || input === undefined) return 0;

    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;

    const s = String(input).trim();

    const normalized = s
      .replace(/\s/g, '')
      .replace(/^R\$/i, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '');

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  private getValorNumber(e: any): number {
    const raw = e?.valor ?? e?.Valor ?? 0;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    return this.toDecimalBR(raw);
  }

  private getTipoLancamentoNorm(e: any): 'Entrada' | 'Saída' | '' {
    const raw = String(e?.tipoLancamento ?? e?.TipoLancamento ?? '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.includes('entrada')) return 'Entrada';
    if (raw.includes('saída') || raw.includes('saida')) return 'Saída';
    return '';
  }

  private getCategoriaId(e: any): string {
    const catId = e?.categoriaId ?? e?.categoryId ?? e?.categoria?.id ?? e?.category?.id ?? '';
    return catId == null ? '' : String(catId);
  }

  private getTipoMovimentacaoId(e: any): string {
    const id = e?.tipoMovimentacaoId ?? e?.TipoMovimentacaoId ?? e?.tipoMovimentacao?.id ?? '';
    return id == null ? '' : String(id);
  }

  // -----------------------
  // Carregar / atualizar lista
  // -----------------------
  async refresh() {
    this.loading = true;
    try {
      const rows = await this.extratoItemService.listExtratos(this.month, this.bancoId);
      this.extratos = Array.isArray(rows) ? rows : [];
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
    return this.tiposConta.find(t => String((t as any).id) === String(this.tipoContaId)) ?? null;
  }

  get isCreditCard(): boolean {
    const t: any = this.tipoContaSelecionada;
    if (!t) return false;

    const bool = t.isCredito ?? t.IsCredito ?? t.ehCredito ?? t.EhCredito ?? t.cartaoCredito ?? t.CartaoCredito;
    if (typeof bool === 'boolean') return bool;

    const nome = String(t.nomeTipoCartao ?? t.nome ?? t.Nome ?? t.descricao ?? t.Descricao ?? '');
    return /cr[eé]dito/i.test(nome);
  }

  async carregarBancoNome() {
    if (!this.bancoId) {
      this.headerBancoNomeValue = 'Banco';
      return;
    }

    const banco = await this.bancoService.getById(this.bancoId);
    this.headerBancoNomeValue = banco?.nomeBanco ?? 'Banco';
  }

  get headerBancoNome(): string {
    return this.headerBancoNomeValue;
  }

  get headerTipoContaNome(): string {
    return this.tipoContaSelecionada?.nomeTipoCartao ?? this.tipoContaSelecionada?.nomeTipoCartao ?? 'Tipo Conta';
  }


  // -----------------------
  // Totais (✅ corrigidos)
  // -----------------------
  get totalItens() {
    return this.filteredExtratos.length;
  }

  get totalEntrada() {
    return this.filteredExtratos.reduce((sum: number, e: any) => {
      const tipo = this.getTipoLancamentoNorm(e);
      const v = Math.abs(this.getValorNumber(e));
      return sum + (tipo === 'Entrada' ? v : 0);
    }, 0);
  }

  get totalSaida() {
    return this.filteredExtratos.reduce((sum: number, e: any) => {
      const tipo = this.getTipoLancamentoNorm(e);
      const v = Math.abs(this.getValorNumber(e));
      return sum + (tipo === 'Saída' ? v : 0);
    }, 0);
  }

  get totalValor() {
    return this.totalEntrada - this.totalSaida;
  }

  // -----------------------
  // Mapas de nomes
  // -----------------------
  get categoriaNomePorId(): Map<string, string> {
    const map = new Map<string, string>();
    for (const c of this.categorias) {
      const id = (c as any).id ?? (c as any).Id;
      const nome = (c as any).nome ?? (c as any).name ?? (c as any).descricao ?? (c as any).Descricao;
      if (id != null) map.set(String(id), nome || `Categoria #${id}`);
    }
    return map;
  }

  get tipoMovNomePorId(): Map<string, string> {
    const map = new Map<string, string>();
    for (const tm of this.tiposMovimentacao ?? []) {
      const id = (tm as any).id ?? (tm as any).Id;
      const nome = (tm as any).nome ?? (tm as any).descricao ?? (tm as any).Descricao;
      if (id != null) map.set(String(id), nome || `Tipo #${id}`);
    }
    return map;
  }

  get tipoLancamentoOptions(): string[] {
    const set = new Set(['Saída', 'Entrada']);
    for (const e of this.items as any[]) {
      const tl = (e as any).tipoLancamento;
      if (tl) set.add(tl);
    }
    return Array.from(set);
  }

  // -----------------------
  // ✅ RELATÓRIOS
  // -----------------------
  get reportPorCategoria() {
    const nomeCat = this.categoriaNomePorId;
    const acc = new Map<string, any>();

    for (const e of this.filteredExtratos as any[]) {
      const catIdRaw = this.getCategoriaId(e);
      const catId = catIdRaw ? String(catIdRaw) : '—';
      const catNome = nomeCat.get(catId) ?? (catId === '—' ? 'Sem categoria' : `Categoria #${catId}`);

      const tipo = this.getTipoLancamentoNorm(e);
      const v = Math.abs(this.getValorNumber(e));

      if (!acc.has(catId)) {
        acc.set(catId, { categoriaId: catId, categoriaNome: catNome, entradas: 0, saidas: 0, liquido: 0, qtd: 0 });
      }

      const row = acc.get(catId);
      row.qtd++;

      if (tipo === 'Entrada') row.entradas += v;
      if (tipo === 'Saída') row.saidas += v;

      row.liquido = row.entradas - row.saidas;
    }

    return Array.from(acc.values())
      .sort((a, b) => Math.abs(b.liquido) - Math.abs(a.liquido));
  }

  get reportPorTipoMovimentacao() {
    const nomeTipo = this.tipoMovNomePorId;
    const acc = new Map<string, any>();

    for (const e of this.filteredExtratos as any[]) {
      const idRaw = this.getTipoMovimentacaoId(e);
      const id = idRaw ? String(idRaw) : '—';
      const nome = nomeTipo.get(id) ?? (id === '—' ? 'Sem tipo' : `Tipo #${id}`);

      const tipoLanc = this.getTipoLancamentoNorm(e);
      const v = Math.abs(this.getValorNumber(e));

      if (!acc.has(id)) {
        acc.set(id, { tipoMovimentacaoId: id, tipoMovimentacaoNome: nome, entradas: 0, saidas: 0, liquido: 0, qtd: 0 });
      }

      const row = acc.get(id);
      row.qtd++;

      if (tipoLanc === 'Entrada') row.entradas += v;
      if (tipoLanc === 'Saída') row.saidas += v;

      row.liquido = row.entradas - row.saidas;
    }

    return Array.from(acc.values())
      .sort((a, b) => Math.abs(b.liquido) - Math.abs(a.liquido));
  }

  // -----------------------
  // ✅ filtros por coluna + filtros gerais
  // -----------------------
  get filteredExtratos(): ExtratoItemDto[] {
    const t = this.tableFilters;

    return this.items.filter((e: any) => {
      const valor = this.getValorNumber(e);

      const itemTipoContaId = e?.tipoCartaoId ?? e?.tipoCartao?.id ?? e?.tipoContaId ?? null;
      if (this.tipoContaId && String(itemTipoContaId) !== String(this.tipoContaId)) return false;

      // gerais: data
      if (this.dateFrom || this.dateTo) {
        const data = e?.dataMovimentacao;
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

      // gerais: tipo lançamento
      const lanc = String(e?.tipoLancamento ?? '');
      if (this.tipoLancamentoFilter && lanc !== this.tipoLancamentoFilter) return false;

      // gerais: categoria
      const catId = e?.categoriaId ?? e?.categoryId ?? e?.categoria?.id ?? e?.category?.id ?? null;
      if (this.categoriaFilter && String(catId) !== String(this.categoriaFilter)) return false;

      // gerais: descrição
      if (this.descricaoFilter.trim()) {
        const needle = this.descricaoFilter.trim().toLowerCase();
        const desc = String(e?.nomeTipoMovimentacao || '').toLowerCase();
        const obs = String(e?.observacao || e?.descricaoManual || '').toLowerCase();
        if (!desc.includes(needle) && !obs.includes(needle)) return false;
      }

      // gerais: pessoa
      if (this.pessoaFilter.trim()) {
        const pessoa = String(e?.nomePessoaTransacao || '').toLowerCase();
        if (!pessoa.includes(this.pessoaFilter.trim().toLowerCase())) return false;
      }

      // gerais: min/max
      if (this.minValue !== '' && valor < Number(this.minValue)) return false;
      if (this.maxValue !== '' && valor > Number(this.maxValue)) return false;

      // ✅ por coluna (tabela)
      if (t.data) {
        const d = String(e?.dataMovimentacao ?? '').substring(0, 10);
        if (d !== t.data) return false;
      }

      if (t.tipo) {
        if (!String(e?.tipoLancamento ?? '').toLowerCase().includes(t.tipo.toLowerCase())) return false;
      }

      if (t.categoriaId) {
        const idStr = String(catId ?? '');
        if (idStr !== String(t.categoriaId)) return false;
      }

      if (t.fatura && this.isCreditCard) {
        if (!String(e?.numeroFatura ?? '').toLowerCase().includes(t.fatura.toLowerCase())) return false;
      }

      if (t.nomeTipoMovimentacao) {
        const desc = String(e?.nomeTipoMovimentacao ?? '').toLowerCase();
        const obs = String(e?.observacao ?? e?.descricaoManual ?? '').toLowerCase();
        const needle = t.nomeTipoMovimentacao.toLowerCase();
        if (!desc.includes(needle) && !obs.includes(needle)) return false;
      }

      // ✅ agora filtra por ID (não mais por observação)
      if (t.tipoMovimentacaoId) {
        const id = this.getTipoMovimentacaoId(e);
        if (String(id) !== String(t.tipoMovimentacaoId)) return false;
      }

      if (t.pessoa) {
        const pessoa = String(e?.nomePessoaTransacao ?? '').toLowerCase();
        if (!pessoa.includes(t.pessoa.toLowerCase())) return false;
      }

      if (t.minValor !== '' && valor < Number(t.minValor)) return false;
      if (t.maxValor !== '' && valor > Number(t.maxValor)) return false;

      return true;
    });
  }

  // -----------------------
  // Forms inline
  // -----------------------
  rowKey(e: any): RowId {
    const id = e?.id ?? e?.Id ?? e?.extratoId ?? e?.codigo;
    if (id !== undefined && id !== null && String(id) !== '') return id;

    const ident = e?.identificador ?? e?.grupoParcelamento ?? e?.GrupoParcelamento;
    if (ident) return String(ident);

    return String(e?.dataMovimentacao ?? '') + '|' + String(e?.descricao ?? '') + '|' + String(e?.valor ?? '');
  }

  private rebuildForms() {
    const visibleIds = new Set<RowId>();

    for (const e of this.items as any[]) {
      const id = this.rowKey(e);
      visibleIds.add(id);

      if (!this.rowForms.has(id)) {
        const fg: RowForm = this.fb.group({
          dataMovimentacao: this.fb.control(String(e?.dataMovimentacao ?? '').substring(0, 10), { nonNullable: true }),
          tipoLancamento: this.fb.control(String(e?.tipoLancamento ?? ''), { nonNullable: true }),
          categoriaId: this.fb.control(this.getCategoriaId(e), { nonNullable: true }),
          tipoMovimentacaoId: this.fb.control(this.getTipoMovimentacaoId(e), { nonNullable: true }),
          descricao: this.fb.control(String(e?.descricao ?? ''), { nonNullable: true }),
          nomePessoaTransacao: this.fb.control(String(e?.nomePessoaTransacao ?? ''), { nonNullable: true }),
          valor: this.fb.control(formatMoneyBR(this.getValorNumber(e) ?? 0), { nonNullable: true }),
          numeroFatura: this.fb.control(String(e?.numeroFatura ?? ''), { nonNullable: true }),
          parcelaAtual: this.fb.control(String(e?.parcelaAtual ?? ''), { nonNullable: true }),
          quantidadeParcelas: this.fb.control(String(e?.quantidadeParcelas ?? ''), { nonNullable: true }),
        });

        this.rowForms.set(id, fg);
      }
    }

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

    if (!this.rowForms.has(id)) {
      this.rebuildForms();
    }

    const f = this.rowForms.get(id);
    if (!f) return;

    this.editingIds.add(id);

    f.reset({
      dataMovimentacao: String(e?.dataMovimentacao ?? '').substring(0, 10),
      tipoLancamento: String(e?.tipoLancamento ?? ''),
      categoriaId: this.getCategoriaId(e),
      tipoMovimentacaoId: this.getTipoMovimentacaoId(e),
      descricao: String(e?.descricao ?? ''),
      nomePessoaTransacao: String(e?.nomePessoaTransacao ?? ''),
      valor: formatMoneyBR(this.getValorNumber(e) ?? 0),
      numeroFatura: String(e?.numeroFatura ?? ''),
      parcelaAtual: String(e?.parcelaAtual ?? ''),
      quantidadeParcelas: String(e?.quantidadeParcelas ?? ''),
    });
  }

  async onDelete(e: any) {
    const ok = window.confirm(`Excluir a movimentação "${e.nomePessoaTransacao}"?`);
    if (!ok) return;
    await this.extratoItemService.delete(e.id).then(
      (res) => {
        this.alert = { type: 'success', message: `${e.nomePessoaTransacao} deletado com sucesso!` };
      }
    ).catch(
      (e) => {
        this.alert = { type: 'error', message: 'Falha ao deletar.' + e.message };
      }
    )
    await this.refresh();
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
        Valor: valorNumber,
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

      await this.extratoItemService.updateExtratoItem(dto).then(
        () => this.setAlert('success', 'Linha atualizada com sucesso!')
      ).catch(() => this.setAlert('error', 'Erro ao atualizar linha.'));


      const applyUpdate = (arr: any[]) =>
        arr.map(x => (String(this.rowKey(x)) === String(idKey)
          ? { ...x, ...e, ...dto, valor: valorNumber }
          : x));

      this.localItems = applyUpdate(this.localItems as any);
      this.extratos = applyUpdate(this.extratos as any);

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

  trackByRow = (_: number, e: any) => this.rowKey(e);

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

    this.tableFilters = {
      data: '',
      tipo: '',
      categoriaId: '',
      nomeTipoMovimentacao: '',
      tipoMovimentacaoId: '',
      pessoa: '',
      minValor: '',
      maxValor: '',
      fatura: '',
    };
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
      this.alert = { type: 'error', message: 'Informe uma data válida.' };
      return;
    }

    if (!this.manualValor || String(this.manualValor).trim() === '') {
      this.alert = { type: 'error', message: 'Informe um valor válido.' };
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

        NumeroFatura: this.manualNumeroFatura || null,

        EhParcelado: this.manualParcelado ?? false,
      };

      // 1) ✅ Não é cartão OU não parcelado -> cria 1 item e sai
      if (!this.isCreditCard || !this.manualParcelado) {
        await this.extratoItemService.createExtratoManualItem(basePayload);

        this.alert = { type: 'success', message: 'Lançamento adicionado com sucesso!' };
        this.showAddModal = false;

        await this.refresh();
        return;
      }

      // 2) ✅ É cartão e é parcelado
      const quantidadeParcelas = Math.max(2, Number(this.manualQuantidadeParcelas) || 2);

      // 2.1) Parcelado e "gerar todas"
      if (this.manualGerarTodasParcelas) {
        const groupKey = `PARC-${Date.now()}`;

        for (let p = 1; p <= quantidadeParcelas; p++) {
          const dataParcela = addMonthsISO(this.manualData, p - 1);

          const payloadParcela: any = {
            ...basePayload,
            DataMovimentacao: dataParcela,
            EhParcelado: true,
            ParcelaAtual: p,
            QuantidadeParcelas: quantidadeParcelas,
            GrupoParcelamento: groupKey,
          };

          await this.extratoItemService.createExtratoManualItem(payloadParcela);
        }

        this.alert = { type: 'success', message: `Parcelamento criado: ${quantidadeParcelas} parcelas.` };
        this.showAddModal = false;

        await this.refresh();
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

      this.alert = { type: 'success', message: `Compra parcelada registrada (1/${quantidadeParcelas}).` };
      this.showAddModal = false;

      await this.refresh();
      return;

    } catch (err: any) {
      this.alert = {
        type: 'error',
        message: err?.error?.message || err?.message || 'Erro ao adicionar lançamento.'
      };
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