import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BancoDto } from 'src/app/core/services/banco.service';
import { Category } from 'src/app/core/services/category.service';
import { ExtratoBancarioService, ExtratoItemDto } from 'src/app/core/services/extrato-bancario.service';
import { TipoCartaoDto } from 'src/app/core/services/tipo-cartao.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { BancoService } from 'src/app/core/services/banco.service';

type AlertState = { type: '' | 'success' | 'error' | 'warning'; message: string };

function getCurrentMonthISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function formatMoneyBR(v: any) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
}

@Component({
  selector: 'app-extrato-bancario-resumo',
  templateUrl: './extrato-bancario-resumo.component.html',
})
export class ExtratoBancarioResumoComponent implements OnInit {
  // filtros
  monthFilter = getCurrentMonthISO();
  bancoFilter = '';
  tipoContaFilter = '';

  alert: AlertState = { type: '', message: '' };

  loading = false;

  extratos: ExtratoItemDto[] = [];

  bancos: BancoDto[] = [];
  tiposConta: TipoCartaoDto[] = [];
  categorias: Category[] = [];

  // modais
  showImportModal = false;
  importLoading = false;

  selectedBancoId = '';
  selectedBancoNome = '';
  selectedTipoContaId = '';

  showManualModal = false;
  savingManual = false;

  manualForm = {
    dataMovimentacao: new Date().toISOString().slice(0, 10),
    tipo: 'SAIDA', // ENTRADA | SAIDA
    valor: '',
    bancoId: '',
    tipoCartaoId: '',
    categoriaId: '',
    descricao: '',
    observacao: '',

    parcelado: false,
    totalParcelas: '',
    numeroParcela: '1',
    grupoParcelamentoId: '',
  };

  constructor(
    private router: Router,
    private extratoService: ExtratoBancarioService,
    private contaService: ContaService,
    private contaMensalService: ContaMensalService,
    private tipoCartaoService: TipoCartaoService,
    private categoryService: CategoryService,
    private bancoService: BancoService,
  ) { }

  ngOnInit() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    this.monthFilter = `${now.getFullYear()}-${mm}`; // ex: 2026-02

    this.refresh();
    this.carregaFiltros();
  }

  async carregaFiltros() {
    try {
      const [bancos, tipos, cats] = await Promise.all([
        this.bancoService.list(),
        this.tipoCartaoService.list(),
        this.categoryService.list(),
      ]);

      this.bancos = bancos ?? [];
      this.tiposConta = tipos ?? [];
      this.categorias = cats ?? [];
    } catch (e: any) {
      this.setAlert('warning', 'Falha ao carregar catálogos (bancos/tipos/categorias).');
    }
  }

  async refresh() {
    this.loading = true;
    try {
      const bancoId = this.bancoFilter ? Number(this.bancoFilter) : null;

      // a API já recebe monthFilter e opcional bancoId
      const rows = await this.extratoService.listExtratos(this.monthFilter, bancoId);
      this.extratos = Array.isArray(rows) ? rows : [];
    } catch (e: any) {
      this.setAlert('error', 'Erro ao carregar extrato.');
    } finally {
      this.loading = false;
    }
  }

  // -----------------------
  // Resumo agrupado
  // -----------------------
  get resumo() {
    const map = new Map<string, any>();

    for (const e of this.extratos) {
      const bancoId = (e as any).bancoId ?? (e as any).banco?.id ?? null;
      const bancoNome = (e as any).bancoNome ?? (e as any).banco?.nomeBanco ?? '—';

      const tipoCartaoId = (e as any).tipoCartaoId ?? (e as any).tipoCartao?.id ?? null;
      const tipoContaNome = (e as any).tipoCartaoNome ?? (e as any).tipoCartao?.nomeTipoCartao ?? '—';

      if (this.bancoFilter && String(bancoId) !== String(this.bancoFilter)) continue;
      if (this.tipoContaFilter && String(tipoCartaoId) !== String(this.tipoContaFilter)) continue;

      const key = `${bancoId ?? 'null'}-${tipoCartaoId ?? 'null'}`;

      if (!map.has(key)) {
        map.set(key, {
          bancoId,
          bancoNome,
          tipoCartaoId,
          tipoContaNome,
          totalEntrada: 0,
          totalSaida: 0,
        });
      }

      const row = map.get(key);
      const v = Number((e as any).valor ?? (e as any).Valor ?? 0);
      if (v >= 0) row.totalEntrada += v;
      else row.totalSaida += Math.abs(v);
    }

    return Array.from(map.values()).sort((a, b) => {
      const x = (a.bancoNome || '').localeCompare(b.bancoNome || '');
      if (x !== 0) return x;
      return (a.tipoContaNome || '').localeCompare(b.tipoContaNome || '');
    });
  }

  // -----------------------
  // Importação
  // -----------------------
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

    if (!this.selectedBancoId) {
      this.setAlert('error', 'Informe o banco antes de continuar.');
      input.value = '';
      return;
    }

    try {
      this.importLoading = true;
      await this.extratoService.importExtrato(file, {
        id: Number(this.selectedBancoId),
        nomeBanco: this.selectedBancoNome,
        tipoCartaoId: this.selectedTipoContaId ? Number(this.selectedTipoContaId) : null,
      });

      this.setAlert('success', 'Extrato importado com sucesso!');
      this.showImportModal = false;
      await this.refresh();
    } catch {
      this.setAlert('error', 'Falha ao importar arquivo.');
    } finally {
      this.importLoading = false;
      input.value = '';
    }
  }

  // -----------------------
  // Manual modal
  // -----------------------
  openManualModal() {
    this.manualForm = {
      dataMovimentacao: new Date().toISOString().slice(0, 10),
      tipo: 'SAIDA',
      valor: '',
      bancoId: '',
      tipoCartaoId: '',
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

  setManual(key: keyof typeof this.manualForm, value: any) {
    (this.manualForm as any)[key] = value;

    // quando escolhe banco -> preenche tipoCartaoId automaticamente
    if (key === 'bancoId') {
      const banco = this.bancos.find(b => String(b.id) === String(value));
      const tipoCartaoId = banco?.tipoCartaoId ?? '';
      this.manualForm.tipoCartaoId = tipoCartaoId ? String(tipoCartaoId) : '';
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
    if (!this.manualForm.bancoId) {
      this.setAlert('error', 'Selecione um banco.');
      return;
    }
    if (!this.manualForm.tipoCartaoId) {
      this.setAlert('error', 'Tipo de conta/cartão não identificado. Verifique o banco.');
      return;
    }

    const valorNum = Number(this.manualForm.valor);
    if (!valorNum || isNaN(valorNum)) {
      this.setAlert('error', 'Informe um valor válido.');
      return;
    }

    if (this.isCreditoSelecionado && this.manualForm.parcelado) {
      const total = Number(this.manualForm.totalParcelas);
      const parc = Number(this.manualForm.numeroParcela);

      if (!total || total < 2) {
        this.setAlert('error', 'Total de parcelas deve ser >= 2.');
        return;
      }
      if (!parc || parc < 1 || parc > total) {
        this.setAlert('error', 'Número da parcela inválido.');
        return;
      }
    }

    try {
      this.savingManual = true;

      const valorFinal = this.manualForm.tipo === 'SAIDA'
        ? -Math.abs(valorNum)
        : Math.abs(valorNum);

      const payload = {
        extratoBancarioId: null,
        dataMovimentacao: this.manualForm.dataMovimentacao,
        valor: valorFinal,
        tipoLancamento: this.manualForm.tipo === 'SAIDA' ? 'DEBITO' : 'CREDITO',
        bancoId: Number(this.manualForm.bancoId),
        tipoCartaoId: Number(this.manualForm.tipoCartaoId),
        categoriaId: this.manualForm.categoriaId ? Number(this.manualForm.categoriaId) : null,
        descricao: (this.manualForm.descricao || '').trim() || null,
        observacao: (this.manualForm.observacao || '').trim() || null,

        ehParcelado: this.isCreditoSelecionado ? !!this.manualForm.parcelado : false,
        totalParcelas: this.isCreditoSelecionado && this.manualForm.parcelado ? Number(this.manualForm.totalParcelas) : null,
        numeroParcela: this.isCreditoSelecionado && this.manualForm.parcelado ? Number(this.manualForm.numeroParcela) : null,
        grupoParcelamentoId: this.isCreditoSelecionado && this.manualForm.parcelado && this.manualForm.grupoParcelamentoId?.trim()
          ? this.manualForm.grupoParcelamentoId.trim()
          : null,
      };

      await this.extratoService.createExtratoManualItem(payload);

      this.setAlert('success', 'Item manual adicionado com sucesso!');
      this.showManualModal = false;
      await this.refresh();
    } catch (e: any) {
      this.setAlert('error', e?.error?.message || 'Falha ao adicionar item manual.');
    } finally {
      this.savingManual = false;
    }
  }

  // -----------------------
  // Navegar para Detalhe
  // -----------------------
  goToDetalhe(row: any) {
    console.log('row', row);
    const params: any = {
      month: this.monthFilter,
    };
    if (row?.bancoId != null) params.bancoId = row.bancoId;
    if (row?.tipoCartaoId != null) params.tipoContaId = row.tipoCartaoId;

    this.router.navigate(['extrato-bancario/ExtratoBancarioDetalhe'], { queryParams: params });
  }

  trackById(_: number, row: any) {
    return row.id;
  }

  setAlert(type: AlertState['type'], message: string) {
    this.alert = { type, message };
    setTimeout(() => (this.alert = { type: '', message: '' }), 4000);
  }

  money(v: any) {
    return formatMoneyBR(v);
  }
}