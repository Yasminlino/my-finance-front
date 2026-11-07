import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { alteracoesDoRascunho, aplicarPessoa, ehEntrada, rascunhoDe } from '../../extrato.regras';

/**
 * Folha de baixo do Extrato no celular (card #45, parte 1, item 4): tocar num lançamento abre os mesmos campos do
 * Modo edição do desktop, com Salvar e Excluir. Só desenha e devolve: a tela grava e exclui.
 */
@Component({
  selector: 'app-extrato-editar-sheet',
  standalone: true,
  imports: [FormsModule, ButtonModule, DropdownModule, InputTextModule, SidebarModule, PrimeTemplate, CurrencyInputDirective],
  templateUrl: './extrato-editar-sheet.component.html',
  styleUrls: ['./extrato-editar-sheet.component.scss']
})
export class ExtratoEditarSheetComponent implements OnChanges {
  /** O lançamento aberto; null = folha fechada. */
  @Input() item: ExtratoItemDto | null = null;
  @Input() opcoesCategoria: { label: string; value: number }[] = [];
  @Input() opcoesTipoMov: { label: string; value: number }[] = [];
  @Input() nomesPessoas: string[] = [];
  @Input() pessoas: PessoaMovimentacaoDto[] = [];
  @Input() salvando = false;
  @Input() excluindo = false;
  /** Sugestão de categoria do histórico (card #76); some quando o rascunho já tem categoria. */
  @Input() sugestao: { categoriaId: number; nome: string } | null = null;
  @Output() salvar = new EventEmitter<ExtratoItemDto>();
  @Output() excluir = new EventEmitter<ExtratoItemDto>();
  @Output() fechar = new EventEmitter<void>();

  rascunho: ExtratoItemDto | null = null;

  /** Só um item novo recomeça o rascunho: mudar sugestão, salvando ou listas não apaga o que foi digitado. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) this.rascunho = this.item ? rascunhoDe([this.item])[this.item.id] : null;
  }

  get aberta(): boolean {
    return !!this.item;
  }

  /** Algo mudou (o Salvar só liga com alteração). */
  get alterou(): boolean {
    return !!this.item && !!this.rascunho && alteracoesDoRascunho([this.item], { [this.item.id]: this.rascunho }).length > 0;
  }

  get entrada(): boolean {
    return !!this.item && ehEntrada(this.item);
  }

  get titulo(): string {
    return this.item ? `${this.entrada ? 'Entrada' : 'Saída'} de ${formatCurrencyBR(this.item.valor)}` : '';
  }

  usarSugestao(): void {
    if (this.rascunho && this.sugestao) this.rascunho = { ...this.rascunho, categoriaId: this.sugestao.categoriaId };
  }

  editarPessoa(nome: string): void {
    if (this.rascunho) this.rascunho = aplicarPessoa(this.rascunho, nome, this.pessoas);
  }

  aoMudarVisivel(visivel: boolean): void {
    if (!visivel) this.fechar.emit();
  }

  confirmar(): void {
    if (this.rascunho && this.alterou) this.salvar.emit(this.rascunho);
  }
}
