import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';

/**
 * Página /#/ui (card #27): a base de UI inteira numa tela, para conferir no desktop e no celular.
 * A rota só existe fora do build de produção (app-routing.module.ts).
 */
@Component({
  selector: 'app-ui-showcase',
  standalone: true,
  imports: [
    FormsModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectButtonModule, TagModule, TooltipModule,
    CategoryIconComponent, EmptyStateComponent, FabComponent, FieldErrorComponent, FilterBarComponent,
    FormPanelComponent, PageHeaderComponent, StatCardComponent,
  ],
  templateUrl: './ui-showcase.component.html',
  styles: ['.ui-amostra { display: inline-block; width: 1.5rem; height: 1.5rem; border-radius: var(--mf-radius); border: 1px solid var(--surface-border); }'],
})
export class UiShowcaseComponent {
  readonly breadcrumb = [{ label: 'Base de UI' }];
  readonly home = { icon: 'pi pi-home', routerLink: '/home' };

  readonly semanticas = ['primary', 'receita', 'despesa', 'alerta', 'info', 'neutro', 'edicao'];
  readonly tags: { valor: string; severidade: 'success' | 'info' | 'warning' | 'danger' | 'secondary' }[] = [
    { valor: 'PAGO NO PRAZO', severidade: 'success' },
    { valor: 'AGUARDANDO', severidade: 'info' },
    { valor: 'PAGO ATRASADO', severidade: 'warning' },
    { valor: 'PENDENTE', severidade: 'danger' },
    { valor: 'Inativo', severidade: 'secondary' },
  ];
  readonly naturezas: (number | null)[] = [0, 1, 2, 3, 4, 5, null];
  readonly rotuloNatureza = (n: number | null) => (n == null ? 'Sem natureza' : NaturezaOperacaoLabel[n]);

  readonly situacoes = [{ label: 'Todas', value: 'todas' }, { label: 'Vencidas', value: 'vencidas' }];
  situacao = 'todas';

  /** Campo já tocado e vazio: o erro aparece na hora. */
  readonly campoComErro = new FormControl('', Validators.required);

  painel: 'md' | 'lg' | null = null;
  dialogo: 'sm' | 'md' | 'lg' | null = null;

  constructor() {
    this.campoComErro.markAsTouched();
  }
}
