import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { Router } from '@angular/router';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { PreferenciasNotificacaoDto } from 'src/app/core/models/notificacao.model';
import { NotificacoesService } from 'src/app/core/services/notificacoes.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { isoDate, toDate } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';

type Chave = 'contasAVencer' | 'vencidas' | 'fatura' | 'agenda' | 'acertos';
type Opcao = { rotulo: string; aplicar: (p: PreferenciasNotificacaoDto) => void; atual: (p: PreferenciasNotificacaoDto) => boolean };

/** Uma linha de "No app": título, o resumo da opção (toque para trocar) e o interruptor. */
type LinhaPreferencia = { chave: Chave; titulo: string; resumo: (p: PreferenciasNotificacaoDto) => string; opcoes: Opcao[] };

const antes = (n: number) => (n === 0 ? 'no dia' : n === 1 ? '1 dia antes' : `${n} dias antes`);

function opcoesDias(chave: 'contasAVencer' | 'fatura' | 'agenda', valores: number[], rotulo = antes): Opcao[] {
  return valores.map(n => ({
    rotulo: rotulo(n),
    aplicar: p => (p[chave].diasAntes = n),
    atual: p => p[chave].diasAntes === n
  }));
}

/** "Pausar tudo": quantos dias a partir de hoje (0 = não pausar). */
const PAUSAS: { rotulo: string; dias: number }[] = [
  { rotulo: 'Não pausar', dias: 0 }, { rotulo: 'Por 1 semana', dias: 7 }, { rotulo: 'Por 2 semanas', dias: 14 }, { rotulo: 'Por 1 mês', dias: 30 }
];

/**
 * Preferências › Notificações (card #73, layout do mockup B). Gravadas na conta (valem em todos os aparelhos) a cada
 * mudança, sem botão Salvar. E-mail diário e push aparecem como "em breve" até as fases 2 e 3.
 */
@Component({
  selector: 'app-preferencias',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputSwitchModule, MenuModule, SkeletonModule, PageHeaderComponent],
  templateUrl: './preferencias.component.html',
  styleUrls: ['./preferencias.component.scss']
})
export class PreferenciasComponent implements OnInit {
  private readonly notificacoes = inject(NotificacoesService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  readonly movel = inject(LarguraTelaService).movel;

  readonly breadcrumb: MenuItem[] = [{ label: 'Preferências' }, { label: 'Notificações' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  readonly linhas: LinhaPreferencia[] = [
    { chave: 'contasAVencer', titulo: 'Contas a vencer', resumo: p => antes(p.contasAVencer.diasAntes),
      opcoes: opcoesDias('contasAVencer', [0, 1, 2, 3]) },
    { chave: 'vencidas', titulo: 'Contas vencidas',
      resumo: p => `resumo · ${p.vencidas.soUltimos90Dias ? 'só últimos 90 dias' : 'todas'}`,
      opcoes: [
        { rotulo: 'Só dos últimos 90 dias', aplicar: p => (p.vencidas.soUltimos90Dias = true), atual: p => p.vencidas.soUltimos90Dias },
        { rotulo: 'Todas, inclusive as antigas', aplicar: p => (p.vencidas.soUltimos90Dias = false), atual: p => !p.vencidas.soUltimos90Dias }
      ] },
    { chave: 'fatura', titulo: 'Fatura do cartão', resumo: p => antes(p.fatura.diasAntes), opcoes: opcoesDias('fatura', [1, 3, 5]) },
    { chave: 'agenda', titulo: 'Agenda', resumo: p => (p.agenda.diasAntes ? 'na véspera' : 'no dia'),
      opcoes: opcoesDias('agenda', [0, 1], n => (n ? 'Na véspera' : 'No dia')) },
    { chave: 'acertos', titulo: 'Acertos com pessoas', resumo: p => `após ${p.acertos.diasEmAberto} dias`,
      opcoes: [15, 30, 60].map(n => ({
        rotulo: `Após ${n} dias`, aplicar: (p: PreferenciasNotificacaoDto) => (p.acertos.diasEmAberto = n),
        atual: (p: PreferenciasNotificacaoDto) => p.acertos.diasEmAberto === n
      })) }
  ];

  carregando = true;
  erro = false;
  salvando = false;
  salvoAgora = false;
  pref: PreferenciasNotificacaoDto | null = null;
  /** Itens do menu aberto (opções de uma linha ou do Pausar tudo). */
  menuItens: MenuItem[] = [];
  private salvo: PreferenciasNotificacaoDto | null = null;
  private pendente = false;

  voltar(): void {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = false;
    this.notificacoes.preferencias().subscribe({
      next: p => {
        this.pref = structuredClone(p);
        this.salvo = structuredClone(p);
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erro = true;
      }
    });
  }

  ativo(chave: Chave): boolean {
    return !!this.pref?.[chave].ativo;
  }

  alternar(chave: Chave, valor: boolean): void {
    if (!this.pref) return;
    this.pref[chave].ativo = valor;
    this.salvar();
  }

  abrirOpcoes(linha: LinhaPreferencia, menu: Menu, evento: Event): void {
    const p = this.pref;
    if (!p || !p[linha.chave].ativo) return;
    this.menuItens = linha.opcoes.map(o => ({
      label: o.rotulo,
      icon: o.atual(p) ? 'pi pi-check' : 'pi pi-fw',
      command: () => { o.aplicar(p); this.salvar(); }
    }));
    menu.toggle(evento);
  }

  /** "Não pausar" ou "até 18/11". */
  get resumoPausa(): string {
    const ate = this.pref?.pausadoAte;
    if (!ate || ate < isoDate()) return 'Não pausar';
    return `Até ${toDate(ate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }

  abrirPausa(menu: Menu, evento: Event): void {
    const p = this.pref;
    if (!p) return;
    this.menuItens = PAUSAS.map(o => ({
      label: o.rotulo,
      command: () => { p.pausadoAte = o.dias ? isoDate(o.dias) : null; this.salvar(); }
    }));
    menu.toggle(evento);
  }

  /** Grava na hora; mudanças durante a gravação saem logo depois. Erro: volta ao que estava salvo. */
  salvar(): void {
    if (!this.pref) return;
    if (this.salvando) {
      this.pendente = true;
      return;
    }
    this.salvando = true;
    this.salvoAgora = false;
    this.notificacoes.salvarPreferencias(this.pref).subscribe({
      next: p => {
        this.salvando = false;
        this.salvo = structuredClone(p);
        if (this.pendente) {
          this.pendente = false;
          this.salvar();
        } else {
          this.salvoAgora = true;
        }
      },
      error: e => {
        this.salvando = false;
        this.pendente = false;
        this.pref = this.salvo ? structuredClone(this.salvo) : this.pref;
        this.alert.error(extrairMensagemErro(e, 'Não foi possível salvar as preferências.'));
      }
    });
  }
}
