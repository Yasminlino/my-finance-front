import { Component } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'my-finance-front';
  constructor(private primengConfig: PrimeNGConfig) {
    this.primengConfig.setTranslation({
      firstDayOfWeek: 0,

      dayNames: [
        'domingo',
        'segunda-feira',
        'terça-feira',
        'quarta-feira',
        'quinta-feira',
        'sexta-feira',
        'sábado'
      ],

      dayNamesShort: [
        'dom',
        'seg',
        'ter',
        'qua',
        'qui',
        'sex',
        'sáb'
      ],

      dayNamesMin: [
        'd',
        's',
        't',
        'q',
        'q',
        's',
        's'
      ],

      monthNames: [
        'janeiro',
        'fevereiro',
        'março',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro'
      ],

      monthNamesShort: [
        'jan',
        'fev',
        'mar',
        'abr',
        'mai',
        'jun',
        'jul',
        'ago',
        'set',
        'out',
        'nov',
        'dez'
      ]
    });
  }
}
