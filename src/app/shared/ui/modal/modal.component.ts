import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ContentChild, Directive, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, TemplateRef, inject
} from '@angular/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SidebarModule } from 'primeng/sidebar';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';

/** Rodapé do modal (no máximo 2 botões; o 3º vai para o ⋮). */
@Directive({ selector: '[mfModalRodape]', standalone: true })
export class ModalRodapeDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Ações extras: o ⋮ do cabeçalho na tela cheia do celular (no desktop, ao lado do ×). */
@Directive({ selector: '[mfModalMais]', standalone: true })
export class ModalMaisDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

export type TipoModal = 'folha' | 'tela';

const LARGURAS = { sm: '32rem', md: '50rem', lg: '60rem', xl: '76rem' } as const;

/**
 * Card #80 — o modal do app em 2 formatos no celular (≤ 767px): "folha" (formulário curto ou escolha: abre embaixo,
 * altura automática) e "tela" (tela de trabalho: ocupa a tela toda, com ← no cabeçalho). No desktop é sempre o
 * p-dialog centralizado. Abre ao ser criado (a tela o mostra com @if, como o mf-form-panel).
 *
 * Fechar (×, ←, Esc, clique fora, voltar do celular) emite `fechar`; com `temAlteracoes`, pergunta antes. No celular, o
 * voltar do aparelho fecha o modal em vez de sair da página. Nunca arrasta nem redimensiona.
 */
@Component({
  selector: 'mf-modal',
  standalone: true,
  imports: [NgTemplateOutlet, PrimeTemplate, ButtonModule, DialogModule, SidebarModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
  @Input() tipo: TipoModal = 'folha';
  @Input() tamanhoDesktop: keyof typeof LARGURAS = 'md';
  /** Algo mexido e não salvo: fechar pergunta antes. */
  @Input() temAlteracoes = false;
  /** Enquanto grava, nada fecha o modal. */
  @Input() ocupado = false;
  /** Corpo sem margem interna (a tela desenha as próprias bordas). */
  @Input() semMargem = false;
  /** Ícone ao lado do título no desktop (ex.: 'pi pi-bolt'). */
  @Input() icone = '';
  @Output() fechar = new EventEmitter<void>();

  @ContentChild(ModalRodapeDirective) rodape?: ModalRodapeDirective;
  @ContentChild(ModalMaisDirective) mais?: ModalMaisDirective;

  readonly movel = inject(LarguraTelaService).movel;
  /** Só buscado quando há o que confirmar: telas sem alterações não precisam do ConfirmationService. */
  private readonly injector = inject(Injector);

  /** Estado empilhado no histórico ao abrir no celular (o voltar do aparelho o tira). */
  private empilhou = false;
  private fechando = false;
  private readonly aoVoltar = () => {
    this.empilhou = false;
    void this.pedirParaFechar(true);
  };

  get largura(): string {
    return LARGURAS[this.tamanhoDesktop];
  }

  ngOnInit(): void {
    if (this.movel()) {
      history.pushState({ ...(history.state ?? {}), mfModal: true }, '');
      this.empilhou = true;
      window.addEventListener('popstate', this.aoVoltar);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.aoVoltar);
    this.desempilhar();
  }

  /** ×, ←, Esc, clique fora ou voltar do celular. */
  async pedirParaFechar(peloVoltar = false): Promise<void> {
    if (this.ocupado || this.fechando) {
      if (peloVoltar) this.reempilhar();
      return;
    }
    if (this.temAlteracoes) {
      this.fechando = true;
      const sair = await this.injector.get(ConfirmacaoService).confirmar('As alterações que você fez vão se perder.',
        { titulo: 'Sair sem salvar?', aceitar: 'Sair sem salvar', cancelar: 'Continuar editando' });
      this.fechando = false;
      if (!sair) {
        if (peloVoltar) this.reempilhar();
        return;
      }
    }
    this.desempilhar();
    this.fechar.emit();
  }

  /** O p-dialog/p-sidebar avisa que quer fechar (Esc, máscara): a decisão é nossa. */
  aoMudarVisivel(visivel: boolean): void {
    if (!visivel) void this.pedirParaFechar();
  }

  private reempilhar(): void {
    if (!this.movel() || this.empilhou) return;
    history.pushState({ ...(history.state ?? {}), mfModal: true }, '');
    this.empilhou = true;
  }

  /** Fechou sem ser pelo voltar: tira o estado que empilhamos, sem disparar outro fechar. */
  private desempilhar(): void {
    if (!this.empilhou) return;
    this.empilhou = false;
    window.removeEventListener('popstate', this.aoVoltar);
    if (history.state?.mfModal) history.back();
  }
}
