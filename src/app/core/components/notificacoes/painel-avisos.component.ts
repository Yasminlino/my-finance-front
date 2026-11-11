import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { switchMap } from 'rxjs';
import { AvisoDto } from '../../models/notificacao.model';
import { ContaMensalService } from '../../services/conta-mensal.service';
import { NotificacoesService } from '../../services/notificacoes.service';
import { VencidasService } from '../../services/vencidas.service';
import { extrairMensagemErro } from '../../utils/http-error';
import { formatCurrencyBR, isoDate, toDate } from '../../utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { statusAoPagar, vencimentoDe } from 'src/app/views/movimentacao/contas-a-pagar/contas-a-pagar.regras';
import {
  APARENCIA_AVISO, FiltroAvisos, agruparAvisos, destinoDoAviso, linhaDoAviso, podePagar, quandoDoAviso
} from './notificacoes.regras';

/**
 * Card #73 — conteúdo do sino (layout do mockup A): chips Novas | Todas, cards agrupados em Hoje e Esta semana, com
 * "Marcar como paga" e "Abrir" nas contas a vencer, "Ver recentes" nas vencidas e o card inteiro clicável nos outros.
 * O cabeçalho o põe num p-overlayPanel (desktop) ou num mf-modal em tela cheia (celular, com Ler tudo e ⚙ no topo).
 */
@Component({
  selector: 'app-painel-avisos',
  standalone: true,
  imports: [ButtonModule, SkeletonModule],
  templateUrl: './painel-avisos.component.html',
  styleUrls: ['./painel-avisos.component.scss']
})
export class PainelAvisosComponent {
  /** Mostra "Ler tudo" e ⚙ no próprio painel (desktop); no celular eles vão para o topo do modal. */
  @Input() acoesNoPainel = true;
  /** Celular: fundo cinza com os cards brancos (mockup A); o modal vem sem margem. */
  @Input() telaCheia = false;
  /** Depois de Abrir ou de ir às Preferências: quem contém o painel o fecha. */
  @Output() fechar = new EventEmitter<void>();

  readonly notificacoes = inject(NotificacoesService);
  private readonly contaMensalService = inject(ContaMensalService);
  private readonly vencidasService = inject(VencidasService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);

  /** Abre em "Novas" quando há novas; senão, em "Todas". */
  filtro: FiltroAvisos = this.notificacoes.novos() ? 'novas' : 'todas';
  pagandoId: string | null = null;

  get grupos() {
    return agruparAvisos(this.notificacoes.avisos(), this.filtro, new Date());
  }

  /** "Pausar tudo" em vigor: dd/mm. */
  get pausadoAte(): string | null {
    const p = this.notificacoes.pausadoAte();
    return p ? toDate(p).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;
  }

  aparencia(a: AvisoDto) {
    return APARENCIA_AVISO[a.tipo];
  }

  quando(a: AvisoDto): string {
    return quandoDoAviso(a, new Date());
  }

  linha(a: AvisoDto): string {
    return linhaDoAviso(a, v => formatCurrencyBR(v));
  }

  /** Vencidas trazem o total no título ("24 contas vencidas · R$ 8.346,99"). */
  valorNoTitulo(a: AvisoDto): string | null {
    return a.tipo === 'vencidas' && a.valor != null ? formatCurrencyBR(a.valor) : null;
  }

  podePagar(a: AvisoDto): boolean {
    return podePagar(a);
  }

  /** Card inteiro clicável quando não tem botões (fatura, agenda, acertos). */
  cardClicavel(a: AvisoDto): boolean {
    return !podePagar(a) && a.tipo !== 'vencidas';
  }

  marcarTudo(): void {
    this.notificacoes.marcarTudoComoLido().subscribe({
      error: e => this.alert.error(extrairMensagemErro(e, 'Não foi possível marcar como lido.'))
    });
  }

  abrir(a: AvisoDto): void {
    const destino = destinoDoAviso(a, isoDate());
    this.fechar.emit();
    this.router.navigate([destino.url], { queryParams: destino.queryParams });
  }

  irPreferencias(): void {
    this.fechar.emit();
    this.router.navigate(['/preferencias']);
  }

  /** Mesma regra de Contas a Pagar: busca a conta do dia e grava PAGO NO PRAZO / ATRASADO; atualiza o sino e o selo. */
  pagar(a: AvisoDto): void {
    if (this.pagandoId || !a.transacaoId || !a.data) return;
    this.pagandoId = a.id;
    this.contaMensalService.listarDoMes(a.data, true).pipe(
      switchMap(contas => {
        const conta = (contas ?? []).find(c => c.id === a.transacaoId);
        if (!conta) throw new Error('Conta não encontrada.');
        return this.contaMensalService.atualizar({ ...conta, situacao: statusAoPagar(vencimentoDe(conta), new Date()) });
      })
    ).subscribe({
      next: () => {
        this.pagandoId = null;
        this.alert.success(`${a.titulo.replace(/ vence .*$/, '')} paga.`);
        this.notificacoes.atualizar();
        this.vencidasService.atualizar();
      },
      error: e => {
        this.pagandoId = null;
        this.alert.error(extrairMensagemErro(e, 'Não foi possível marcar como paga.'));
      }
    });
  }
}
