import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

/** Barra fixa do modo edição de Contas a Pagar. Substitui o Cancelar/Salvar do rodapé do grid. */
@Component({
  selector: 'app-barra-edicao',
  standalone: true,
  imports: [ToolbarModule, ButtonModule],
  templateUrl: './barra-edicao.component.html',
  styleUrls: ['./barra-edicao.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarraEdicaoComponent {
  /** Ex.: "outubro de 2026". */
  @Input({ required: true }) mes = '';
  /** Linhas alteradas. */
  @Input() contagem = 0;
  @Input() temErros = false;
  @Input() salvando = false;

  @Output() descartar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
}
