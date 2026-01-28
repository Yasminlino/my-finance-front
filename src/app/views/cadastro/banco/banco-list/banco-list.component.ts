import { Component, OnInit } from '@angular/core';
import { BancoDto, BancoService } from 'src/app/core/services/banco.service';
import { TipoCartao, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-banco-list',
  templateUrl: './banco-list.component.html',
  styleUrls: ['./banco-list.component.scss'],
})
export class BancoListComponent implements OnInit {
  bancos: BancoDto[] = [];
  filtered: BancoDto[] = [];
  tiposCartao: TipoCartao[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  alert: AlertState = { type: '', message: '' };

  // modal
  showModal = false;
  editing: BancoDto | null = null;

  // resumo
  totalGeral = 0;
  totalAtivo = 0;
  totalInativo = 0;

  constructor(
    private bancoService: BancoService,
    private tipoCartaoService: TipoCartaoService
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';

      const [bancos, tipos] = await Promise.all([
        this.bancoService.list(),
        this.tipoCartaoService.list(),
      ]);
      this.bancos = bancos ?? [];
      this.tiposCartao = tipos ?? [];
      this.applyFilters();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar bancos.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.filtered = [...this.bancos]
      .sort((a, b) => (a.nomeBanco ?? '').localeCompare(b.nomeBanco ?? ''))
      .filter((b) => {
        if (this.statusFilter === 'ALL') return true;
        const status = b.ativo ? 'Ativo' : 'Inativo';
        return status === this.statusFilter;
      })
      .filter((b) => {
        if (!term) return true;
        return (
          (b.nomeBanco ?? '').toLowerCase().includes(term) ||
          String(b.id).includes(term)
        );
      });

    this.calcSummary();
  }

  calcSummary() {
    let totalGeral = 0, totalAtivo = 0, totalInativo = 0;

    for (const b of this.bancos) {
      const saldo = Number(b.saldoInicial) || 0;
      totalGeral += saldo;
      if (b.ativo) totalAtivo += saldo;
      else totalInativo += saldo;
    }

    this.totalGeral = totalGeral;
    this.totalAtivo = totalAtivo;
    this.totalInativo = totalInativo;
  }

  onSearchChange(v: string) {
    this.q = v;
    this.applyFilters();
  }

  onStatusChange(v: string) {
    this.statusFilter = v as any;
    this.applyFilters();
  }

  openCreate() {
    this.editing = null;
    this.showModal = true;
  }

  openEdit(banco: BancoDto) {
    this.editing = banco;
    this.showModal = true;
  }

  closeModal(reload?: boolean) {
    this.showModal = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(banco: BancoDto) {
    const ok = window.confirm(`Excluir o banco "${banco.nomeBanco}"?`);
    if (!ok) return;

    try {
      await this.bancoService.delete(banco.id);

      this.alert = { type: 'success', message: 'Banco deletado com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);

      await this.load();
    } catch {
      this.alert = {
        type: 'error',
        message: 'Falha ao deletar. O banco pode estar vinculado a transações.',
      };
      setTimeout(() => (this.alert = { type: '', message: '' }), 12000);
    }
  }

  badgeClass(ativo: boolean) {
    return ativo ? 'badge bg-success-lt' : 'badge bg-secondary-lt';
  }

  formatMoney(value: any) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }
}
