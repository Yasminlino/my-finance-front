import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';

// ⬇️ Ajuste os imports para seus services reais
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';

// ⬇️ Ajuste para seus helpers reais
import { formatCurrencyBR, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { AgrupamentoContaMensal, ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { AlertService } from 'src/app/shared/components/alert.service';


type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-modal-adicionar-em-lote',
  templateUrl: './modal-adicionar-em-lote.component.html',
  styleUrls: ['./modal-adicionar-em-lote.component.scss'],
})
export class ModalAdicionarEmLoteComponent implements OnInit, OnDestroy {
  @Input() month!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou  
  @Output() 'reload' = new EventEmitter<any[]>();

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
    private readonly contaMensalService: ContaMensalService,
    private readonly alertService: AlertService,
  ) { }

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
      const [contas, contasMensais] = await Promise.all([
        this.contaService.buscarContasAtivas(),
        this.contaMensalService.BuscarContasMensais(this.month, false),
      ]);

      this.contas = contas ?? [];
      this.contasMensais = contasMensais ?? [];

      // 🔹 Mapa: AccountId -> quantidade de lançamentos no mês
      const mapaLancamentos = new Map<number, number>();

      for (const t of this.contasMensais) {
        if (!t.idAccount) continue;

        const atual = mapaLancamentos.get(t.idAccount) ?? 0;
        mapaLancamentos.set(t.idAccount, atual + 1);
      }

      // 🔹 Set de contas que devem ser desabilitadas
      const desabilitados = new Set<number>();

      for (const conta of this.contas) {
        const totalVencimentos = conta.contaVencimentos?.length ?? 0;
        const totalLancados = mapaLancamentos.get(conta.id) ?? 0;

        // ⚠️ Só desabilita se tiver vencimentos configurados
        if (totalVencimentos > 0 && totalLancados >= totalVencimentos) {
          desabilitados.add(conta.id);
        }
      }

      this.disabledIds = desabilitados;

      // 🔹 Remove da seleção contas que agora estão desabilitadas
      this.selectedIds = new Set(
        [...this.selectedIds].filter(id => !this.disabledIds.has(id))
      );

    } catch (e) {
      console.error(e);
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
        date: formatDateVencimento(this.month, "01"),
        name: acc.name,
        idAccount: acc.id,
        value: removeFormatCurrencyBR(acc.value),
        status: 'PENDENTE',
        ehParcelado: acc.ehParcelado,
        parcelaAtual: acc.ehParcelado ? acc.parcelaAtual : null,
        quantidadeParcelas: acc.ehParcelado ? acc.quantidadeParcelas : null,
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
      this.alertService.success(`${successCount} itens adicionados com sucesso!`);
      this.reload.emit();
      this.close(true);
    }
    
    if (errorCount > 0) {
      this.alertService.error( `${errorCount} itens não foram adicionados!`);
    }
  }
}