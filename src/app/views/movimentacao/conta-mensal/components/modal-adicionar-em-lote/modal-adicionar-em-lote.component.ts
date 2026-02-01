import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';

// ⬇️ Ajuste os imports para seus services reais
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';

// ⬇️ Ajuste para seus helpers reais
import { formatCurrencyBR, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { AgrupamentoContaMensal, ContaMensal } from 'src/app/core/models/conta-mensal.model';


type AlertState = { type: 'success' | 'error' | '' ; message: string };

@Component({
  selector: 'app-modal-adicionar-em-lote',
  templateUrl: './modal-adicionar-em-lote.component.html',
  styleUrls: ['./modal-adicionar-em-lote.component.scss'],
})
export class ModalAdicionarEmLoteComponent implements OnInit, OnDestroy {
  @Input() month!: string | Date; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou

  alert: AlertState = { type: '', message: '' };
  saving = false;

  contas: AccountDto[] = [];
  contasMensais: ContaMensal[] = [];

  /** contas que já possuem transação no mês */
  disabledIds = new Set<number>();

  /** selecionados */
  selectedIds = new Set<number>();

  private sub = new Subscription();
  private alertTimer: any;

  constructor(
    private readonly contaService: ContaService,
    private readonly contaMensalService: ContaMensalService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.alertTimer) clearTimeout(this.alertTimer);
  }

  // =========================
  // Helpers UI
  // =========================
  money(v: any) {
    return formatCurrencyBR(v);
  }

  get selectableAccounts(): AccountDto[] {
    return this.contas.filter(a => !this.disabledIds.has(a.id));
  }

  get allSelected(): boolean {
    const selectable = this.selectableAccounts;
    return selectable.length > 0 && selectable.every(a => this.selectedIds.has(a.id));
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  close(saved = false) {
    this.closed.emit(saved);
  }

  showError(msg: string) {
    this.alert = { type: 'error', message: msg };
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => (this.alert = { type: '', message: '' }), 6000);
  }

  showSuccess(msg: string) {
    this.alert = { type: 'success', message: msg };
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => (this.alert = { type: '', message: '' }), 4000);
  }

  toggleOne(accountId: number) {
    const next = new Set(this.selectedIds);
    if (next.has(accountId)) next.delete(accountId);
    else next.add(accountId);
    this.selectedIds = next;
  }

  toggleAll() {
    if (this.allSelected) {
      this.selectedIds = new Set();
      return;
    }
    this.selectedIds = new Set(this.selectableAccounts.map(a => a.id));
  }

  // =========================
  // Data
  // =========================
  private async load() {
    try {
      // Ajuste: se seus services retornam Observable, use firstValueFrom.
      // Se retornam signal/hook, adapte.
      const [contas, contasMensais] = await Promise.all([
        this.contaService.list(),
        this.contaMensalService.GetTransactionByDate(String(this.month)),
      ]);

      this.contas = contas ?? [];
      this.contasMensais = contasMensais ?? [];

      const idsDoMes = new Set<number>(
        this.contasMensais.flatMap(m => m.idAccount)
      )

      this.disabledIds = idsDoMes;

      console.log(this.disabledIds);
      
      // limpa seleção de ids que viraram inválidos
      this.selectedIds = new Set([...this.selectedIds].filter(id => !this.disabledIds.has(id)));
    } catch (e) {
      this.showError('Erro ao carregar contas/transações.');
    }
  }

  async handleSave() {
    if (this.selectedIds.size === 0) {
      this.showError('Por favor, selecione ao menos uma conta!');
      return;
    }

    this.saving = true;

    const payloads = this.contas
      .filter(acc => this.selectedIds.has(acc.id))
      .map(acc => ({
        date: formatDateVencimento(this.month, acc.dataOperacao),
        name: acc.name,
        idAccount: acc.id,
        value: removeFormatCurrencyBR(acc.value),
        status: 'PENDENTE',
      }));

    let successCount = 0;
    let errorCount = 0;

    for (const p of payloads) {
      try {
        const created = await this.contaMensalService.createContaMensal(p);
        // ajuste: se sua API retorna { account: created } como no React:
        // if (created?.account) successCount++; else errorCount++;
        if (created) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    this.saving = false;

    if (successCount > 0) {
      this.showSuccess(`${successCount} ${successCount === 1 ? 'conta adicionada' : 'contas adicionadas'} com sucesso.`);
      this.close(true);
    }

    if (errorCount > 0) {
      this.showError('Houve erros ao processar algumas contas.');
    }
  }
}