import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';

import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { STATUS_PAGAMENTO_OPTIONS } from 'src/app/shared/enums/status.enum';
import { corDaCategoria, iconeDaCategoria, previaDoEfeito } from '../../contas-a-pagar.regras';
import { CampoEditavel, EdicaoContas, RascunhoConta } from '../../edicao-contas';
import { ErroCampoDirective } from '../../erro-campo.directive';

/**
 * Edição de uma conta no celular, num bottom sheet (p-sidebar de baixo). Usa a mesma EdicaoContas
 * do modo edição do desktop, só que com uma conta: destaque de alterado, valor anterior, erro e
 * prévia iguais. Quem grava é a tela, pelo (salvar).
 */
@Component({
  selector: 'app-editar-conta-sheet',
  standalone: true,
  imports: [
    NgClass, FormsModule, SidebarModule, ButtonModule, InputNumberModule, CalendarModule, DropdownModule,
    InputTextareaModule, TagModule, ErroCampoDirective
  ],
  templateUrl: './editar-conta-sheet.component.html',
  styleUrls: ['./editar-conta-sheet.component.scss']
})
export class EditarContaSheetComponent implements OnChanges {
  /** Provido pela tela (ela tem o p-confirmDialog). */
  private readonly confirmacao = inject(ConfirmationService);

  /** Conta em edição; null fecha o sheet. */
  @Input() conta: LinhaContasMensais | null = null;
  @Input() hoje = new Date();
  @Input() salvando = false;

  @Output() fechar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<LinhaContasMensais>();

  readonly statusOptions = STATUS_PAGAMENTO_OPTIONS;
  edicao: EdicaoContas | null = null;
  rascunho: RascunhoConta | null = null;
  icone = '';
  cor = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conta']) {
      this.edicao = this.conta ? new EdicaoContas([this.conta]) : null;
      this.rascunho = this.conta ? this.edicao!.rascunho(this.conta.id) : null;
      this.icone = iconeDaCategoria(this.conta?.categoriaNome);
      this.cor = corDaCategoria(this.conta?.categoriaNome);
    }
  }

  get aberto(): boolean {
    return !!this.conta;
  }

  get bloqueada(): boolean {
    return !!this.conta && !!this.edicao?.bloqueada(this.conta.id);
  }

  get camposAlterados(): number {
    return this.conta && this.edicao ? this.edicao.camposAlterados(this.conta.id) : 0;
  }

  get podeSalvar(): boolean {
    return !!this.edicao?.podeSalvar && !this.salvando;
  }

  get previa(): string {
    if (!this.conta || !this.edicao?.foiAlterado(this.conta.id)) return '';
    return previaDoEfeito(this.conta, this.edicao.linhaAtual(this.conta.id), this.hoje);
  }

  alterar(campo: CampoEditavel, valor: unknown): void {
    if (!this.conta || !this.edicao || !this.rascunho) return;
    this.edicao.alterar(this.conta.id, campo, valor);
    (this.rascunho as any)[campo] = valor;
  }

  /** Esc no campo. */
  desfazerCampo(campo: CampoEditavel): void {
    if (!this.conta || !this.edicao) return;
    this.edicao.desfazerCampo(this.conta.id, campo);
    this.rascunho = this.edicao.rascunho(this.conta.id);
  }

  desfazer(): void {
    if (!this.conta || !this.edicao) return;
    this.edicao.desfazerLinha(this.conta.id);
    this.rascunho = this.edicao.rascunho(this.conta.id);
  }

  alterado(campo: CampoEditavel): boolean {
    return !!this.conta && !!this.edicao?.foiAlterado(this.conta.id, campo);
  }

  erro(campo: CampoEditavel): string | undefined {
    return this.conta ? this.edicao?.erros(this.conta.id)[campo] : undefined;
  }

  anterior(campo: CampoEditavel): string {
    return this.conta && this.edicao ? this.edicao.anterior(this.conta.id, campo) : '';
  }

  desbloquear(): void {
    const conta = this.conta;
    if (!conta) return;
    this.confirmacao.confirm({
      header: 'Desbloquear conta paga',
      message: `A conta '${conta.nome}' já está paga. Desbloquear para editar?`,
      icon: 'pi pi-lock-open',
      acceptLabel: 'Desbloquear',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.edicao?.desbloquear(conta.id);
        this.rascunho = this.edicao!.rascunho(conta.id);
      }
    });
  }

  confirmar(): void {
    if (!this.conta || !this.edicao?.podeSalvar) return;
    this.salvar.emit(this.edicao.linhaAtual(this.conta.id));
  }
}
