import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ListaDto } from 'src/app/core/models/lista.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { TipoResumo, chipsDosCampos, corDaLista, iconeDaLista, percentualFeito, tipoDeResumo } from '../../listas.regras';

/**
 * Card de um planejamento em Meus planejamentos e em Arquivados (card #63): ícone na cor, chips dos campos
 * e o resumo que vale para os campos ligados. As ações ficam com a tela (menu ⋮ ou bottom sheet).
 */
@Component({
  selector: 'app-planejamento-card',
  standalone: true,
  imports: [ButtonModule, ProgressBarModule, CategoryIconComponent],
  templateUrl: './planejamento-card.component.html',
  styleUrls: ['./planejamento-card.component.scss']
})
export class PlanejamentoCardComponent {
  @Input({ required: true }) lista!: ListaDto;
  @Output() abrir = new EventEmitter<void>();
  /** Clique no ⋮: a tela abre o menu ancorado no evento. */
  @Output() menu = new EventEmitter<Event>();

  get cor(): string {
    return corDaLista(this.lista);
  }

  get icone(): string {
    return iconeDaLista(this.lista);
  }

  get chips(): string[] {
    return chipsDosCampos(this.lista);
  }

  get tipo(): TipoResumo {
    return tipoDeResumo(this.lista);
  }

  get itens(): number {
    return this.lista.resumo?.itens ?? 0;
  }

  get feitos(): number {
    return this.lista.resumo?.feitos ?? 0;
  }

  get total(): number {
    return this.lista.resumo?.total ?? 0;
  }

  get totalFeito(): number {
    return this.lista.resumo?.totalFeito ?? 0;
  }

  /** Só com Limite ligado e informado. */
  get disponivel(): number | null {
    return this.lista.usaLimite && this.lista.limite != null ? this.lista.limite - this.total : null;
  }

  get percentual(): number {
    return percentualFeito(this.feitos, this.itens);
  }

  /** Barra do resumo com Valor: quanto do total já está ok. */
  get percentualValor(): number {
    return this.total > 0 ? Math.min(100, Math.round((this.totalFeito / this.total) * 100)) : 0;
  }

  /** "2026-10-30" -> "30/10" (data de calendário, sem fuso). */
  get proximaData(): string | null {
    const data = this.lista.resumo?.proximaData;
    return data ? `${data.slice(8, 10)}/${data.slice(5, 7)}` : null;
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  abrirMenu(evento: Event) {
    evento.stopPropagation();
    this.menu.emit(evento);
  }
}
