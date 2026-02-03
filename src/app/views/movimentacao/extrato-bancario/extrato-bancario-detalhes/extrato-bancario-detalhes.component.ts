import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BancoService } from 'src/app/core/services/banco.service';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { TipoCartaoService, TipoCartaoDto } from 'src/app/core/services/tipo-cartao.service';
import { ContaService } from 'src/app/core/services/contas.service';
import { ExtratoBancarioService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario.service';

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

@Component({
  selector: 'app-extrato-bancario-detalhes',
  templateUrl: './extrato-bancario-detalhes.component.html',
})
export class ExtratoBancarioDetalhesComponent implements OnInit, OnDestroy {
  private sub = new Subscription();

  // query params
  month = '';
  bancoId: number | null = null;
  tipoContaId: number | null = null;

  // data
  loading = false;
  extratos: ExtratoItemDto[] = [];
  localItems: ExtratoItemDto[] = [];

  categorias: Category[] = [];
  tiposConta: TipoCartaoDto[] = [];

  alert: AlertState = { type: '', message: '' };

  // filtros locais
  dateFrom = '';
  dateTo = '';
  tipoLancamentoFilter = '';
  descricaoFilter = '';
  pessoaFilter = '';
  categoriaFilter = '';
  minValue = '';
  maxValue = '';

  // modal add
  showAddModal = false;
  saving = false;

  manualData = '';
  manualValor = '';
  manualTipoLancamento = 'DEBITO';
  manualDescricao = '';
  manualPessoa = '';
  manualIdentificador = '';
  manualCategoriaId = '';
  manualObservacao = '';

  // cartão
  manualParcelado = false;
  manualTotalParcelas = 2;
  manualGerarTodasParcelas = true;
  manualNumeroFatura = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bancoService: BancoService,
    private categoriaService: CategoryService,
    private tipoCartaoService: TipoCartaoService,
    private contaService: ContaService,
    private extratoService: ExtratoBancarioService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.route.queryParamMap.subscribe(async (qp) => {
        this.month = qp.get('month') ?? '';
        this.bancoId = qp.get('bancoId') ? Number(qp.get('bancoId')) : null;
        this.tipoContaId = qp.get('tipoContaId') ? Number(qp.get('tipoContaId')) : null;

        await this.loadCatalogos();
        await this.refresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async loadCatalogos() {
    try {
      const [cats, tipos] = await Promise.all([
        this.categoriaService.list(),
        this.tipoCartaoService.list(),
      ]);
      this.categorias = cats ?? [];
      this.tiposConta = tipos ?? [];
    } catch {
      this.setAlert('warning', 'Não foi possível carregar categorias/tipos.');
    }
  }

  async refresh() {
    this.loading = true;
    try {
      const rows = await this.extratoService.listExtratos(
        this.month,
        this.bancoId)
      this.extratos = Array.isArray(rows) ? rows : [];
      // não apaga localItems
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
    const set = new Set(['CREDITO', 'DEBITO']);
    for (const e of this.items) {
      const tl = (e as any).tipoLancamento;
      if (tl) set.add(tl);
    }
    return Array.from(set);
  }

  // filtrado
  get filteredExtratos(): ExtratoItemDto[] {
    return this.items.filter((e: any) => {
      const valor = Number(e.valor ?? e.Valor ?? 0);

      const itemTipoContaId = e.tipoCartaoId ?? e.tipoCartao?.id ?? e.tipoContaId ?? null;
      if (this.tipoContaId && String(itemTipoContaId) !== String(this.tipoContaId)) return false;

      if (this.dateFrom || this.dateTo) {
        const data = e.dataMovimentacao;
        const d = data ? new Date(data) : null;
        if (d && !isNaN(d.getTime())) {
          if (this.dateFrom) {
            const from = new Date(this.dateFrom);
            from.setHours(0, 0, 0, 0);
            if (d < from) return false;
          }
          if (this.dateTo) {
            const to = new Date(this.dateTo);
            to.setHours(23, 59, 59, 999);
            if (d > to) return false;
          }
        }
      }

      const lanc = e.tipoLancamento ?? '';
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

      return true;
    });
  }

  get totalItens() { return this.filteredExtratos.length; }

  get totalEntrada() {
    return this.filteredExtratos.reduce((sum, e: any) => {
      const v = Number(e.valor ?? e.Valor ?? 0);
      return sum + (v > 0 ? v : 0);
    }, 0);
  }

  get totalSaida() {
    return this.filteredExtratos.reduce((sum, e: any) => {
      const v = Number(e.valor ?? e.Valor ?? 0);
      return sum + (v < 0 ? Math.abs(v) : 0);
    }, 0);
  }

  get totalValor() {
    return this.filteredExtratos.reduce((sum, e: any) => sum + Number(e.valor ?? e.Valor ?? 0), 0);
  }

  get headerBancoNome() {
    const first: any = this.items[0];
    if (!first) return this.bancoId ? `Banco #${this.bancoId}` : 'Banco';
    return first.bancoNome ?? first.banco?.nomeBanco ?? first.banco?.nome ?? (this.bancoId ? `Banco #${this.bancoId}` : 'Banco');
  }

  get headerTipoContaNome() {
    const t: any = this.tipoContaSelecionada;
    if (!t) return this.tipoContaId ? `Tipo #${this.tipoContaId}` : 'Tipo Conta';
    return t.nomeTipoCartao ?? t.nome ?? t.Nome ?? t.descricao ?? t.Descricao ?? (this.tipoContaId ? `Tipo #${this.tipoContaId}` : 'Tipo Conta');
  }

  // -----------------------
  // UI actions
  // -----------------------
  back() { this.router.navigateByUrl('/ExtratoBancarioResumo'); }

  clearFilters() {
    this.dateFrom = '';
    this.dateTo = '';
    this.tipoLancamentoFilter = '';
    this.categoriaFilter = '';
    this.descricaoFilter = '';
    this.pessoaFilter = '';
    this.minValue = '';
    this.maxValue = '';
  }

  openAddModal() {
    this.manualData = '';
    this.manualValor = '';
    this.manualTipoLancamento = 'DEBITO';
    this.manualDescricao = '';
    this.manualPessoa = '';
    this.manualIdentificador = '';
    this.manualCategoriaId = '';
    this.manualObservacao = '';

    this.manualParcelado = false;
    this.manualTotalParcelas = 2;
    this.manualGerarTodasParcelas = true;
    this.manualNumeroFatura = '';

    this.showAddModal = true;
  }

  closeAddModal() {
    if (!this.saving) this.showAddModal = false;
  }

  // -----------------------
  // Salvar manual
  // -----------------------
  async handleSaveManual() {
    if (!this.manualData) {
      this.setAlert('error', 'Informe a data da movimentação.');
      return;
    }
    if (this.manualValor === '' || isNaN(Number(this.manualValor))) {
      this.setAlert('error', 'Informe um valor válido.');
      return;
    }

    this.saving = true;
    try {
      const valorNum = Number(this.manualValor);
      const isDebito = String(this.manualTipoLancamento).toUpperCase() === 'DEBITO';
      const valorFinal = isDebito && valorNum > 0 ? -Math.abs(valorNum) : valorNum;

      const basePayload: any = {
        DataMovimentacao: this.manualData,
        Valor: valorFinal,
        TipoLancamento: this.manualTipoLancamento,
        Descricao: this.manualDescricao || null,
        NomePessoaTransacao: this.manualPessoa || null,
        Identificador: this.manualIdentificador || null,
        BancoId: this.bancoId,
        TipoCartaoId: this.tipoContaId,
        CategoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
        Observacao: this.manualObservacao || null,
        NumeroFatura: this.manualNumeroFatura || null,
      };

      // não cartão ou não parcelado -> 1 item
      if (!this.isCreditCard || !this.manualParcelado) {
        const saved: any = await this.extratoService.createExtratoManualItem(basePayload);

        this.localItems = [
          (saved && typeof saved === 'object') ? saved : {
            id: `manual-${Date.now()}`,
            dataMovimentacao: this.manualData,
            valor: valorFinal,
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

        this.setAlert('success', 'Lançamento adicionado com sucesso!');
        this.showAddModal = false;
        return;
      }

      // cartão parcelado + gerar todas
      const totalParcelas = Math.max(2, Number(this.manualTotalParcelas) || 2);

      if (this.manualGerarTodasParcelas) {
        const groupKey = `PARC-${Date.now()}`;
        const created: any[] = [];

        for (let p = 1; p <= totalParcelas; p++) {
          const dataParcela = addMonthsISO(this.manualData, p - 1);

          const payloadParcela = {
            ...basePayload,
            DataMovimentacao: dataParcela,
            Parcelado: true,
            NumeroParcela: p,
            TotalParcelas: totalParcelas,
            GrupoParcelamento: groupKey,
          };

          const saved: any = await this.extratoService.createExtratoManualItem(payloadParcela);
          created.push(saved && typeof saved === 'object' ? saved : {
            id: `manual-${groupKey}-${p}`,
            dataMovimentacao: dataParcela,
            valor: valorFinal,
            tipoLancamento: this.manualTipoLancamento,
            descricao: this.manualDescricao,
            nomePessoaTransacao: this.manualPessoa,
            identificador: this.manualIdentificador,
            bancoId: this.bancoId,
            tipoCartaoId: this.tipoContaId,
            categoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
            categoriaNome: this.manualCategoriaId ? (this.categoriaNomePorId.get(String(this.manualCategoriaId)) ?? '—') : '—',
            observacao: this.manualObservacao,
            numeroParcela: p,
            totalParcelas,
            grupoParcelamento: groupKey,
            numeroFatura: this.manualNumeroFatura || null,
            bancoNome: this.headerBancoNome,
            tipoCartaoNome: this.headerTipoContaNome,
            isManual: true,
          });
        }

        // coloca na lista (ordem coerente)
        this.localItems = [...created.reverse(), ...this.localItems];

        this.setAlert('success', `Parcelamento criado: ${totalParcelas} parcelas.`);
        this.showAddModal = false;
        return;
      }

      // cartão parcelado sem gerar todas: salva 1ª
      const payloadSingle = {
        ...basePayload,
        Parcelado: true,
        NumeroParcela: 1,
        TotalParcelas: totalParcelas,
      };

      const saved: any = await this.extratoService.createExtratoManualItem(payloadSingle);

      this.localItems = [
        saved && typeof saved === 'object' ? saved : {
          id: `manual-${Date.now()}`,
          dataMovimentacao: this.manualData,
          valor: valorFinal,
          tipoLancamento: this.manualTipoLancamento,
          descricao: this.manualDescricao,
          nomePessoaTransacao: this.manualPessoa,
          identificador: this.manualIdentificador,
          bancoId: this.bancoId,
          tipoCartaoId: this.tipoContaId,
          categoriaId: this.manualCategoriaId ? Number(this.manualCategoriaId) : null,
          categoriaNome: this.manualCategoriaId ? (this.categoriaNomePorId.get(String(this.manualCategoriaId)) ?? '—') : '—',
          observacao: this.manualObservacao,
          parcelado: true,
          numeroParcela: 1,
          totalParcelas,
          numeroFatura: this.manualNumeroFatura || null,
          bancoNome: this.headerBancoNome,
          tipoCartaoNome: this.headerTipoContaNome,
          isManual: true,
        },
        ...this.localItems,
      ];

      this.setAlert('success', `Compra parcelada registrada (1/${totalParcelas}).`);
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