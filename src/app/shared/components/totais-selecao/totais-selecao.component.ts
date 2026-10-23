import { Component, Input } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

/**
 * Totais da seleção (receita, despesa, saldo e contagem) — Contas a Pagar, Extrato e Orçamento.
 * Standalone em shared (FE-P2-03): antes ficava em contas-a-pagar e Listas/Extrato importavam o
 * ContasAPagarModule inteiro (rotas e componentes) só para usá-lo.
 */
@Component({
  selector: 'app-totais-selecao',
  standalone: true,
  templateUrl: './totais-selecao.component.html',
  styleUrls: ['./totais-selecao.component.scss']
})
export class TotaisSelecaoComponent {
  @Input() receita = 0;
  @Input() despesa = 0;
  @Input() saldo = 0;
  @Input() count = 0;

  money(v: unknown) { return formatCurrencyBR(v); }
}
