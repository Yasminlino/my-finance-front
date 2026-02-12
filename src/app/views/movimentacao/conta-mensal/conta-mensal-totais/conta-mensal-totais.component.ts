import { Component, Input } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

@Component({
  selector: 'app-conta-mensal-totais',
  templateUrl: './conta-mensal-totais.component.html',
  styleUrls: ['./conta-mensal-totais.component.scss']
})
export class ContaMensalTotaisComponent {
  @Input() receita = 0;
  @Input() despesa = 0;
  @Input() saldo = 0;
  @Input() count = 0;

  money(v: any) { return formatCurrencyBR(v); }
}
