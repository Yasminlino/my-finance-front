import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PALETA_CATEGORIA } from '../aparencia';
import { TODOS_PRIMEICONS } from './primeicons';

/** Quantos ícones a busca mostra de uma vez. */
const MAXIMO_NA_BUSCA = 60;

/** "Carrinho de Compras" -> "carrinho-de-compras", para casar com o nome do ícone. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Ícone e cor de um cadastro (Categorias #23, Planejamento #63): grade curta, busca em todos os ícones do
 * PrimeIcons e a paleta. null = automático (quem usa decide o que isso significa e dá o rótulo).
 * `<mf-icon-picker [icones]="..." [(icone)]="..." [(cor)]="..." />`
 */
@Component({
  selector: 'mf-icon-picker',
  standalone: true,
  imports: [FormsModule, InputTextModule, TooltipModule],
  templateUrl: './icon-picker.component.html',
  styleUrls: ['./icon-picker.component.scss']
})
export class IconPickerComponent {
  /** Grade curta mostrada sempre. */
  @Input() icones: readonly string[] = [];
  @Input() icone: string | null | undefined = null;
  @Input() cor: string | null | undefined = null;
  @Input() rotuloIconeAutomatico = 'Automático';
  @Input() rotuloCorAutomatica = 'Cor automática';
  @Output() iconeChange = new EventEmitter<string | null>();
  @Output() corChange = new EventEmitter<string | null>();

  readonly paleta = PALETA_CATEGORIA;
  @ViewChild('campoBusca') campoBusca?: ElementRef<HTMLInputElement>;
  buscaAberta = false;
  busca = '';

  /** A grade curta, com o ícone escolhido na frente quando ele veio da busca. */
  get grade(): readonly string[] {
    return this.icone && !this.icones.includes(this.icone) ? [this.icone, ...this.icones] : this.icones;
  }

  get resultados(): string[] {
    const termo = normalizar(this.busca);
    return TODOS_PRIMEICONS.filter(i => i.includes(termo)).slice(0, MAXIMO_NA_BUSCA);
  }

  escolherIcone(icone: string | null) {
    this.icone = icone;
    this.iconeChange.emit(icone);
  }

  escolherCor(cor: string | null) {
    this.cor = cor;
    this.corChange.emit(cor);
  }

  abrirBusca() {
    this.buscaAberta = true;
  }

  /** Ao abrir, o foco vai para a busca (o campo só existe depois da detecção de mudanças). */
  alternarBusca() {
    this.buscaAberta = !this.buscaAberta;
    if (!this.buscaAberta) this.busca = '';
    else setTimeout(() => this.campoBusca?.nativeElement.focus());
  }
}
