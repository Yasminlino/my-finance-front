import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { dataDe, diasDoMes, doMes, tituloDoMes } from '../../agenda.regras';

/**
 * Calendário compacto do mês (card #69, parte 2): ponto nos dias com item, hoje na cor do planejamento, os dias
 * do período mostrado marcados. É o mini calendário do painel lateral e o Mês do celular (`tamanho="grande"`).
 * Só desenha: quem usa decide o que fazer ao escolher um dia ou trocar o mês.
 */
@Component({
  selector: 'app-agenda-mini-mes',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './agenda-mini-mes.component.html',
  styleUrls: ['./agenda-mini-mes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaMiniMesComponent implements OnChanges {
  /** Qualquer dia do mês mostrado. */
  @Input({ required: true }) mes!: Date;
  @Input() hoje = '';
  /** Dias com item (ponto). */
  @Input() marcados: ReadonlySet<string> = new Set();
  /** Dias realçados: a semana/dia mostrado na agenda, ou o dia escolhido no celular. */
  @Input() realcados: readonly string[] = [];
  @Input() tamanho: 'pequeno' | 'grande' = 'pequeno';
  /** Título e ‹ › do mês; o Mês do celular esconde (a navegação da agenda já tem). */
  @Input() comTopo = true;
  @Output() escolher = new EventEmitter<string>();
  /** -1 = mês anterior; 1 = próximo. */
  @Output() trocarMes = new EventEmitter<number>();

  readonly letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  readonly nomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  dias: string[] = [];
  titulo = '';

  ngOnChanges(): void {
    this.dias = diasDoMes(this.mes);
    const t = tituloDoMes(this.mes);
    this.titulo = t.charAt(0).toUpperCase() + t.slice(1);
  }

  numero(dia: string): number {
    return dataDe(dia).getDate();
  }

  foraDoMes(dia: string): boolean {
    return !doMes(dia, this.mes);
  }

  rotulo(dia: string): string {
    const d = dataDe(dia);
    const partes = [`${d.getDate()}/${d.getMonth() + 1}`];
    if (dia === this.hoje) partes.push('hoje');
    if (this.marcados.has(dia)) partes.push('tem itens');
    return partes.join(', ');
  }
}
