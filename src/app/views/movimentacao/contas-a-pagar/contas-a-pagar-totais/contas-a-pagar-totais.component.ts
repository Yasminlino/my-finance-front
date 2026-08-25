import { Component, Input } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

@Component({
  selector: 'app-contas-a-pagar-totais',
  templateUrl: './contas-a-pagar-totais.component.html',
  styleUrls: ['./contas-a-pagar-totais.component.scss']
})
export class ContasAPagarTotaisComponent {
  @Input() receita = 0;
  @Input() despesa = 0;
  @Input() saldo = 0;
  @Input() count = 0;

  money(v: any) { return formatCurrencyBR(v); }
}
