import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';

/** Compacta depois desta rolagem e só volta perto do topo (folga para não ficar alternando). */
const ROLAGEM_PARA_COMPACTAR = 64;
const ROLAGEM_PARA_EXPANDIR = 8;

/**
 * Cabeçalho das telas (cards #27 e #78). Desktop: breadcrumb pequeno, título (h1) e resumo à esquerda; mês
 * ([periodo]), ação principal ([principal] ou [acoes]) e ⋮ ([mais]) na mesma linha, à direita. Celular: é a única
 * barra do topo — (‹) título e até dois ícones na primeira linha, resumo, e o mês em largura total; ao rolar, gruda
 * no topo compacto, com um chip do mês que volta ao início da página.
 *
 * O ‹ só aparece com `voltarPara` (rota de cima) ou `mostrarVoltar` (a tela trata o evento `voltar`).
 */
@Component({
  selector: 'mf-page-header',
  standalone: true,
  imports: [BreadcrumbModule, ButtonModule],
  host: { '[class.mf-page-header-host--compacto]': 'compacto()', '[class.mf-page-header-host--movel]': 'movel()' },
  template: `
    <div class="mf-page-header" [class.mf-page-header--movel]="movel()" [class.mf-page-header--compacto]="compacto()">
      <div class="mf-ph-esquerda">
        @if (breadcrumb?.length && !movel()) {
          <p-breadcrumb [model]="breadcrumb" [home]="home" />
        }
        <div class="mf-ph-titulo-linha">
          @if (temVoltar) {
            <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" size="small"
              (onClick)="aoVoltar()" [ariaLabel]="rotuloVoltar" />
          }
          <ng-content select="[icone]" />
          <h1 class="mf-page-title">{{ titulo }}</h1>
          @if (compacto() && periodoCurto) {
            <button type="button" class="mf-ph-chip" (click)="irAoTopo()" [attr.aria-label]="'Mês: ' + periodoCurto + '. Voltar ao topo'">
              <i class="pi pi-calendar"></i>{{ periodoCurto }}
            </button>
          }
        </div>
        @if (subtitulo || subtituloAlerta) {
          <small class="mf-page-subtitle mf-ph-subtitulo">{{ subtitulo }}@if (subtitulo && subtituloAlerta) { · }@if (subtituloAlerta) {<span class="mf-ph-alerta">{{ subtituloAlerta }}</span>}</small>
        }
      </div>
      <div class="mf-ph-periodo">
        <ng-content select="[periodo]" />
      </div>
      <div class="mf-page-header__acoes">
        <ng-content select="[acoes]" />
        <ng-content select="[principal]" />
        <ng-content select="[mais]" />
      </div>
    </div>
  `,
  styles: [`
    .mf-page-header {
      display: grid;
      grid-template-areas: "esquerda periodo acoes";
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: end;
      gap: 0.75rem;
    }
    .mf-ph-esquerda { grid-area: esquerda; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .mf-ph-titulo-linha { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
    .mf-ph-titulo-linha .mf-page-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mf-ph-periodo { grid-area: periodo; display: flex; align-items: center; }
    .mf-ph-periodo:empty { display: none; }
    .mf-page-header__acoes { grid-area: acoes; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 0.5rem; }
    .mf-ph-chip {
      display: inline-flex; flex: none; align-items: center; gap: 0.35rem; margin-left: 0.25rem; padding: 0.2rem 0.6rem;
      border: 1px solid var(--surface-border); border-radius: 1rem; background: var(--surface-card); color: var(--text-color);
      font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    :host ::ng-deep .p-breadcrumb { padding: 0; border: none; background: transparent; font-size: 0.78rem; }
    /* Breadcrumb longo quebra linha, sem rolagem lateral. */
    :host ::ng-deep .p-breadcrumb .p-breadcrumb-list { flex-wrap: wrap; row-gap: 0.25rem; }

    /* Celular: (‹) título e ações em cima; resumo; mês em largura total. */
    .mf-page-header--movel {
      grid-template-areas: "esquerda acoes" "periodo periodo";
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.25rem 0.5rem;
    }
    .mf-page-header--movel .mf-page-title { font-size: 1.25rem; }
    .mf-page-header--movel .mf-ph-periodo { margin-top: 0.5rem; }
    .mf-page-header--movel .mf-ph-periodo > ::ng-deep * { flex: 1; min-width: 0; }
    .mf-page-header--movel .mf-page-header__acoes { flex-wrap: nowrap; gap: 0; }

    .mf-ph-alerta { color: var(--mf-despesa); font-weight: 600; }
    .mf-page-title { font-weight: 700; }
    .mf-page-header--movel .mf-page-title { font-weight: 800; }

    /* Celular: o cabeçalho é o topo da tela e fica preso (sticky) com fundo, para o conteúdo não aparecer por trás.
       Ao rolar, compacta (~46px): fundo branco e borda; resumo e mês somem, o chip do mês aparece. */
    :host(.mf-page-header-host--movel) {
      position: sticky; top: 0; z-index: 900; display: block;
      margin-right: -1rem; margin-left: -1rem; padding: 0.5rem 1rem;
      background: var(--surface-ground);
    }
    :host(.mf-page-header-host--compacto) {
      padding: 0.25rem 1rem; border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .mf-page-header--compacto .mf-ph-subtitulo,
    .mf-page-header--compacto .mf-ph-periodo { display: none; }
    .mf-page-header--compacto .mf-page-title { font-size: 1.05rem; }

    @media print { .mf-ph-chip { display: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  @Input({ required: true }) titulo!: string;
  /** Resumo da tela ("10 contas · 15 para classificar"). */
  @Input() subtitulo?: string;
  /** Parte do resumo em vermelho, depois do resto ("15 vencidas"). */
  @Input() subtituloAlerta?: string | null;
  /** Só no desktop. */
  @Input() breadcrumb?: MenuItem[];
  @Input() home?: MenuItem;
  /** Rota de cima: com ela, o ‹ aparece e navega sozinho. */
  @Input() voltarPara?: string | unknown[] | null;
  /** Nome da tela de cima, para o aria-label ("Voltar para Extratos"). */
  @Input() voltarRotulo?: string | null;
  /** Compatível com as telas antigas: mostra o ‹ e só emite `voltar`. */
  @Input() mostrarVoltar = false;
  /** Chip do mês no cabeçalho compacto ("nov/26"). */
  @Input() periodoCurto?: string | null;
  /** Compactar ao rolar no celular (padrão: sim). */
  @Input() compactarAoRolar = true;
  @Output() voltar = new EventEmitter<void>();

  private readonly router = inject(Router);
  readonly movel = inject(LarguraTelaService).movel;
  readonly compacto = signal(false);


  get temVoltar(): boolean {
    return this.mostrarVoltar || !!this.voltarPara;
  }

  get rotuloVoltar(): string {
    return this.voltarRotulo ? `Voltar para ${this.voltarRotulo}` : 'Voltar';
  }

  aoVoltar(): void {
    if (this.voltarPara) {
      if (Array.isArray(this.voltarPara)) this.router.navigate(this.voltarPara);
      else this.router.navigateByUrl(this.voltarPara as string);
    }
    this.voltar.emit();
  }

  @HostListener('window:scroll')
  aoRolar(): void {
    if (!this.compactarAoRolar || !this.movel()) {
      this.compacto.set(false);
      return;
    }
    const y = window.scrollY;
    if (!this.compacto() && y > ROLAGEM_PARA_COMPACTAR) this.compacto.set(true);
    else if (this.compacto() && y < ROLAGEM_PARA_EXPANDIR) this.compacto.set(false);
  }

  irAoTopo(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
